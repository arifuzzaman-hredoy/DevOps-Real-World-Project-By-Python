import assert from "node:assert/strict";

const baseUrl = process.env.API_BASE_URL ?? "http://127.0.0.1:3000";
let sessionCookie = "";

async function request(path, { method = "GET", payload, csrf, cookie = sessionCookie } = {}) {
  const headers = { accept: "application/json" };
  if (cookie) headers.cookie = cookie;
  if (csrf) headers["x-csrf-token"] = csrf;
  if (payload !== undefined) headers["content-type"] = "application/json";

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: payload === undefined ? undefined : JSON.stringify(payload),
    signal: AbortSignal.timeout(5000),
  });
  const setCookie = response.headers.get("set-cookie");
  if (setCookie) sessionCookie = setCookie.split(";", 1)[0];
  const text = await response.text();
  let body = text;
  if (response.headers.get("content-type")?.includes("json") && text) body = JSON.parse(text);
  return { status: response.status, body };
}

async function expectStatus(label, path, expected, options) {
  const result = await request(path, options);
  assert.equal(result.status, expected, `${label}: unexpected HTTP status; response=${JSON.stringify(result.body)}`);
  console.log(`PASS: ${label} (HTTP ${expected})`);
  return result.body;
}

const anonymous = await expectStatus(
  "unauthenticated study-state access rejected",
  "/api/study/state",
  401,
  { cookie: "" },
);
assert.equal(anonymous.error, "authentication required");

const legacyTasks = await expectStatus("legacy task API data remains readable", "/api/tasks", 200, { cookie: "" });
assert.ok(legacyTasks.some((task) => task.title === "legacy Flask task" && task.status === "done"));

const loginCsrf = await expectStatus("login CSRF token retrieval", "/api/auth/csrf", 200, { cookie: "" });
assert.equal(typeof loginCsrf.csrf_token, "string");
await expectStatus("invalid password rejected", "/api/auth/login", 401, {
  method: "POST",
  payload: { password: "invalid" },
  csrf: loginCsrf.csrf_token,
});
await expectStatus("login establishes authenticated session", "/api/auth/login", 200, {
  method: "POST",
  payload: { password: "validation-only-password" },
  csrf: loginCsrf.csrf_token,
});
assert.ok(sessionCookie.startsWith("cst_session="));

const initialState = await expectStatus("authenticated study-state GET", "/api/study/state", 200);
assert.equal(typeof initialState.states, "object");

const writeCsrf = await expectStatus("authenticated CSRF token retrieval", "/api/csrf", 200);
assert.equal(typeof writeCsrf.csrf_token, "string");
const stateValue = { release_smoke_test: "disposable-database-only" };
await expectStatus("study-state write rejects missing CSRF", "/api/study/state/cst-study-matrix-v1", 403, {
  method: "PUT",
  payload: { value: stateValue },
});
const saved = await expectStatus("CSRF-protected study-state write", "/api/study/state/cst-study-matrix-v1", 200, {
  method: "PUT",
  payload: { value: stateValue },
  csrf: writeCsrf.csrf_token,
});
assert.equal(saved.status, "saved");
const persisted = await expectStatus("study-state persists in PostgreSQL", "/api/study/state", 200);
assert.deepEqual(persisted.states["cst-study-matrix-v1"], stateValue);
await expectStatus("study-state cleanup", "/api/study/state/cst-study-matrix-v1", 204, {
  method: "DELETE",
  csrf: writeCsrf.csrf_token,
});

await expectStatus("CSRF-protected logout", "/api/auth/logout", 204, {
  method: "POST",
  csrf: writeCsrf.csrf_token,
});
sessionCookie = "";
await expectStatus("post-logout access rejected", "/api/study/state", 401);
