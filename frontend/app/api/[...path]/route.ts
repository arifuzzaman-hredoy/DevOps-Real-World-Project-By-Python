import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { Pool } from "pg";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stateKeys = new Set(["cst-study-data-v2", "cst-study-matrix-v1", "cst-hub-v1", "cst-fx-v1"]);
const taskStatuses = new Set(["todo", "in_progress", "done"]);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const latencyBoundaries = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5];
const requestCounts = new Map<number, number>();
const latencyCounts = latencyBoundaries.map(() => 0);
let latencySum = 0;
let latencyCount = 0;

type Session = { auth?: boolean; csrf?: string };
type JsonObject = Record<string, unknown>;
type RouteContext = { params: Promise<{ path: string[] }> };
type ApiHandler = (request: NextRequest, context: RouteContext) => Promise<NextResponse>;

function instrument(handler: ApiHandler): ApiHandler {
  return async (request, context) => {
    const startedAt = performance.now();
    let status = 500;
    try {
      const response = await handler(request, context);
      status = response.status;
      return response;
    } finally {
      requestCounts.set(status, (requestCounts.get(status) ?? 0) + 1);
      const duration = (performance.now() - startedAt) / 1000;
      latencySum += duration;
      latencyCount += 1;
      latencyBoundaries.forEach((boundary, index) => {
        if (duration <= boundary) latencyCounts[index] += 1;
      });
    }
  };
}

function metricsText() {
  const lines = [
    "# HELP cst_api_up Next.js API availability",
    "# TYPE cst_api_up gauge",
    "cst_api_up 1",
    "# HELP taskflow_http_requests_total HTTP requests served by the Node.js API",
    "# TYPE taskflow_http_requests_total counter",
  ];
  for (const [status, count] of requestCounts) {
    lines.push(`taskflow_http_requests_total{status="${status}"} ${count}`);
  }
  lines.push(
    "# HELP taskflow_http_request_duration_seconds HTTP request duration in seconds",
    "# TYPE taskflow_http_request_duration_seconds histogram",
  );
  latencyBoundaries.forEach((boundary, index) => {
    lines.push(`taskflow_http_request_duration_seconds_bucket{le="${boundary}"} ${latencyCounts[index]}`);
  });
  lines.push(
    `taskflow_http_request_duration_seconds_bucket{le="+Inf"} ${latencyCount}`,
    `taskflow_http_request_duration_seconds_sum ${latencySum}`,
    `taskflow_http_request_duration_seconds_count ${latencyCount}`,
  );
  return `${lines.join("\n")}\n`;
}

function sessionSecret() {
  const secret = process.env.SESSION_SECRET || process.env.SECRET_KEY;
  if (process.env.NODE_ENV === "production") {
    if (!secret || Buffer.byteLength(secret) < 32 || secret === "dev-only-change-me" || secret.startsWith("replace-with")) {
      throw new Error("A private signing secret of at least 32 bytes must be configured");
    }
  }
  return secret || "development-only-change-me";
}

function studyPassword() {
  const password = process.env.STUDY_APP_PASSWORD;
  if (process.env.NODE_ENV === "production" && (!password || Buffer.byteLength(password) < 16 || password === "study-matrix-local" || password.startsWith("replace-with"))) {
    throw new Error("A private study password of at least 16 bytes must be configured");
  }
  return password || "study-matrix-local";
}

function validateProductionConfig() {
  if (process.env.NODE_ENV !== "production") return;
  sessionSecret();
  studyPassword();
  const databaseUrl = process.env.DATABASE_URL || "";
  if (!databaseUrl.startsWith("postgresql://") || databaseUrl.includes("change-this-local-password")) {
    throw new Error("A production PostgreSQL DATABASE_URL must be configured");
  }
}

function encode(session: Session) {
  const body = Buffer.from(JSON.stringify(session)).toString("base64url");
  const signature = createHmac("sha256", sessionSecret()).update(body).digest("base64url");
  return `${body}.${signature}`;
}

function decode(value?: string): Session {
  if (!value) return {};
  const [body, signature] = value.split(".");
  if (!body || !signature) return {};
  const expected = createHmac("sha256", sessionSecret()).update(body).digest("base64url");
  const providedBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expected);
  try {
    if (providedBytes.length !== expectedBytes.length || !timingSafeEqual(providedBytes, expectedBytes)) return {};
    return JSON.parse(Buffer.from(body, "base64url").toString()) as Session;
  } catch {
    return {};
  }
}

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const unauthorized = () => json({ error: "authentication required" }, 401);
const sessionOf = (request: NextRequest) => decode(request.cookies.get("cst_session")?.value);

function setSession(response: NextResponse, session: Session) {
  response.cookies.set("cst_session", encode(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
  return response;
}

function csrfIsValid(request: NextRequest, session: Session) {
  const token = request.headers.get("x-csrf-token");
  if (!session.csrf || !token) return false;
  const expected = Buffer.from(session.csrf);
  const provided = Buffer.from(token);
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}

async function parseJson(request: NextRequest): Promise<JsonObject | null> {
  try {
    const body: unknown = await request.json();
    return body !== null && typeof body === "object" && !Array.isArray(body) ? body as JsonObject : null;
  } catch {
    return null;
  }
}

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS task (
      id SERIAL PRIMARY KEY,
      title VARCHAR(160) NOT NULL,
      description VARCHAR(2000) NOT NULL DEFAULT '',
      status VARCHAR(20) NOT NULL DEFAULT 'todo',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS study_states (
      key VARCHAR(64) PRIMARY KEY,
      payload JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

function taskToJson(task: { id: number; title: string; description: string; status: string; created_at: Date; updated_at: Date }) {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    created_at: task.created_at.toISOString(),
    updated_at: task.updated_at.toISOString(),
  };
}

function validTaskId(value?: string) {
  if (!value || !/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

function databaseError(error: unknown, operation: string) {
  console.error(`Database operation failed (${operation})`, error);
  return json({ error: "database unavailable" }, 503);
}

async function getRoute(request: NextRequest, context: RouteContext) {
  const path = (await context.params).path;
  const joinedPath = path.join("/");
  const session = sessionOf(request);

  if (joinedPath === "health") return json({ status: "ok", service: "cst-study-matrix-next" });
  if (joinedPath === "ready") {
    try {
      validateProductionConfig();
    } catch (error) {
      console.error("Production configuration is invalid", error);
      return json({ status: "not_ready", error: "configuration invalid" }, 503);
    }
    try {
      await pool.query("SELECT 1");
      return json({ status: "ready", database: "ok" });
    } catch (error) {
      return databaseError(error, "readiness");
    }
  }
  if (joinedPath === "metrics") {
    return new NextResponse(metricsText(), {
      headers: { "content-type": "text/plain; version=0.0.4" },
    });
  }
  if (joinedPath === "auth/me") return session.auth ? json({ authenticated: true }) : json({ authenticated: false }, 401);
  if (joinedPath === "auth/csrf" || joinedPath === "csrf") {
    const next = { ...session, csrf: randomBytes(32).toString("base64url") };
    return setSession(json({ csrf_token: next.csrf }), next);
  }

  if (joinedPath === "study/state") {
    if (!session.auth) return unauthorized();
    try {
      await ensureSchema();
      const result = await pool.query("SELECT key, payload, updated_at FROM study_states");
      return json({
        states: Object.fromEntries(result.rows.map((row) => [row.key, row.payload])),
        updated_at: Object.fromEntries(result.rows.map((row) => [row.key, row.updated_at?.toISOString() ?? null])),
      });
    } catch (error) {
      return databaseError(error, "read study state");
    }
  }

  if (joinedPath === "tasks") {
    try {
      await ensureSchema();
      const result = await pool.query("SELECT id, title, description, status, created_at, updated_at FROM task ORDER BY id ASC");
      return json(result.rows.map(taskToJson));
    } catch (error) {
      return databaseError(error, "list tasks");
    }
  }

  if (path.length === 2 && path[0] === "tasks") {
    const id = validTaskId(path[1]);
    if (id === null) return json({ error: "route not found" }, 404);
    try {
      await ensureSchema();
      const result = await pool.query("SELECT id, title, description, status, created_at, updated_at FROM task WHERE id = $1", [id]);
      return result.rowCount ? json(taskToJson(result.rows[0])) : json({ error: "task not found" }, 404);
    } catch (error) {
      return databaseError(error, "get task");
    }
  }

  return json({ error: "route not found" }, 404);
}

async function postRoute(request: NextRequest, context: RouteContext) {
  const path = (await context.params).path.join("/");
  const session = sessionOf(request);

  if (path === "auth/login") {
    if (!csrfIsValid(request, session)) return json({ error: "CSRF validation failed" }, 403);
    const body = await parseJson(request);
    const provided = typeof body?.password === "string" ? Buffer.from(body.password) : Buffer.alloc(0);
    const expected = Buffer.from(studyPassword());
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return json({ error: "invalid credentials" }, 401);
    return setSession(json({ authenticated: true }), { auth: true, csrf: randomBytes(32).toString("base64url") });
  }

  if (path === "auth/logout") {
    if (!session.auth) return unauthorized();
    if (!csrfIsValid(request, session)) return json({ error: "CSRF validation failed" }, 403);
    const response = new NextResponse(null, { status: 204 });
    response.cookies.delete("cst_session");
    return response;
  }

  if (path === "tasks") {
    const body = await parseJson(request);
    if (!body || typeof body.title !== "string" || !body.title.trim()) {
      return json({ error: "title is required and must be a non-empty string" }, 400);
    }
    if (body.title.trim().length > 160) return json({ error: "title must be 160 characters or fewer" }, 400);
    const description = body.description ?? "";
    if (typeof description !== "string") return json({ error: "description must be a string" }, 400);
    if (description.length > 2000) return json({ error: "description must be 2000 characters or fewer" }, 400);

    try {
      await ensureSchema();
      const result = await pool.query(
        "INSERT INTO task(title, description) VALUES ($1, $2) RETURNING id, title, description, status, created_at, updated_at",
        [body.title.trim(), description.trim()],
      );
      return json(taskToJson(result.rows[0]), 201);
    } catch (error) {
      return databaseError(error, "create task");
    }
  }

  return json({ error: "route not found" }, 404);
}

async function patchRoute(request: NextRequest, context: RouteContext) {
  const path = (await context.params).path;
  if (path.length !== 2 || path[0] !== "tasks") return json({ error: "route not found" }, 404);
  const id = validTaskId(path[1]);
  if (id === null) return json({ error: "route not found" }, 404);
  const body = await parseJson(request);
  if (!body) return json({ error: "a JSON object is required" }, 400);

  if ("title" in body && (typeof body.title !== "string" || !body.title.trim() || body.title.trim().length > 160)) {
    return json({ error: "title must be a non-empty string of at most 160 characters" }, 400);
  }
  if ("description" in body && (typeof body.description !== "string" || body.description.length > 2000)) {
    return json({ error: "description must be a string of at most 2000 characters" }, 400);
  }
  if ("status" in body && (typeof body.status !== "string" || !taskStatuses.has(body.status))) {
    return json({ error: "status must be todo, in_progress, or done" }, 400);
  }

  try {
    await ensureSchema();
    const result = await pool.query(
      `UPDATE task
       SET title = COALESCE($2, title),
           description = COALESCE($3, description),
           status = COALESCE($4, status),
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, title, description, status, created_at, updated_at`,
      [
        id,
        "title" in body ? (body.title as string).trim() : null,
        "description" in body ? (body.description as string).trim() : null,
        "status" in body ? body.status : null,
      ],
    );
    return result.rowCount ? json(taskToJson(result.rows[0])) : json({ error: "task not found" }, 404);
  } catch (error) {
    return databaseError(error, "update task");
  }
}

async function deleteRoute(request: NextRequest, context: RouteContext) {
  const path = (await context.params).path;
  if (path.length === 3 && path[0] === "study" && path[1] === "state") {
    const session = sessionOf(request);
    if (!session.auth) return unauthorized();
    if (!csrfIsValid(request, session)) return json({ error: "CSRF validation failed" }, 403);
    const key = path[2];
    if (!stateKeys.has(key)) return json({ error: "unknown study state key" }, 404);
    try {
      await ensureSchema();
      await pool.query("DELETE FROM study_states WHERE key = $1", [key]);
      return new NextResponse(null, { status: 204 });
    } catch (error) {
      return databaseError(error, "delete study state");
    }
  }

  if (path.length === 1 && path[0] === "auth/logout") {
    const session = sessionOf(request);
    if (!session.auth) return unauthorized();
    if (!csrfIsValid(request, session)) return json({ error: "CSRF validation failed" }, 403);
    const response = new NextResponse(null, { status: 204 });
    response.cookies.delete("cst_session");
    return response;
  }

  if (path.length !== 2 || path[0] !== "tasks") return json({ error: "route not found" }, 404);
  const id = validTaskId(path[1]);
  if (id === null) return json({ error: "route not found" }, 404);
  try {
    await ensureSchema();
    const result = await pool.query("DELETE FROM task WHERE id = $1", [id]);
    return result.rowCount ? new NextResponse(null, { status: 204 }) : json({ error: "task not found" }, 404);
  } catch (error) {
    return databaseError(error, "delete task");
  }
}

async function putRoute(request: NextRequest, context: RouteContext) {
  const path = (await context.params).path;
  const session = sessionOf(request);
  const key = path[0] === "study" && path[1] === "state" ? path[2] : undefined;

  if (!session.auth) return unauthorized();
  if (!csrfIsValid(request, session)) return json({ error: "CSRF validation failed" }, 403);
  if (!key || path.length !== 3 || !stateKeys.has(key)) return json({ error: "unknown study state key" }, 404);
  const body = await parseJson(request);
  if (!body || !("value" in body)) return json({ error: "JSON object with a value field is required" }, 400);
  if (Buffer.byteLength(JSON.stringify(body.value)) > 4 * 1024 * 1024) return json({ error: "study state is too large" }, 413);

  try {
    await ensureSchema();
    const result = await pool.query(
      "INSERT INTO study_states(key, payload, updated_at) VALUES ($1, $2::jsonb, NOW()) ON CONFLICT(key) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW() RETURNING updated_at",
      [key, JSON.stringify(body.value)],
    );
    return json({ status: "saved", key, updated_at: result.rows[0].updated_at.toISOString() });
  } catch (error) {
    return databaseError(error, "save study state");
  }
}

export const GET = instrument(getRoute);
export const POST = instrument(postRoute);
export const PATCH = instrument(patchRoute);
export const DELETE = instrument(deleteRoute);
export const PUT = instrument(putRoute);
