import json
import os
import sys
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

BASE_URL = "http://127.0.0.1:5000"
PASSWORD = os.environ["TASKFLOW_SMOKE_PASSWORD"]
session_cookie = ""


def request(path, method="GET", payload=None, csrf=None, cookie=None):
    global session_cookie
    headers = {"Accept": "application/json"}
    active_cookie = session_cookie if cookie is None else cookie
    if active_cookie:
        headers["Cookie"] = active_cookie
    if csrf:
        headers["X-CSRF-Token"] = csrf
    data = None
    if payload is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(payload).encode("utf-8")

    outgoing = Request(
        BASE_URL + path,
        data=data,
        headers=headers,
        method=method,
    )
    try:
        response = urlopen(outgoing, timeout=5)
    except HTTPError as error:
        response = error
    except URLError as error:
        raise RuntimeError(f"{method} {path}: transport error: {error.reason}") from error

    set_cookie = response.headers.get("Set-Cookie")
    if set_cookie:
        session_cookie = set_cookie.split(";", 1)[0]
    body = response.read()
    if "json" not in response.headers.get("Content-Type", ""):
        return response.status, body
    try:
        result = json.loads(body) if body else None
    except json.JSONDecodeError:
        result = body.decode("utf-8", errors="replace")
    return response.status, result


def verify_step(label, path, expected_status, **kwargs):
    status, body = request(path, **kwargs)
    if status != expected_status:
        raise RuntimeError(
            f"{label}: expected HTTP {expected_status}, got HTTP {status}; "
            f"response={body!r}"
        )
    return body


try:
    anonymous_state = verify_step(
        "unauthenticated state access",
        "/api/study/state",
        401,
        cookie="",
    )
    assert anonymous_state["error"] == "authentication required"
    print("PASS: unauthenticated study-state access rejected (401)", flush=True)

    login_page_status, login_page = request("/login", cookie="")
    if login_page_status != 200 or not isinstance(login_page, bytes):
        raise RuntimeError(f"login frontend: unexpected response {login_page_status}")
    if b'id="root"' not in login_page:
        raise RuntimeError("login frontend: React root element is missing")
    print("PASS: release image serves the frontend login page", flush=True)

    csrf_payload = verify_step(
        "login CSRF retrieval",
        "/api/auth/csrf",
        200,
        cookie="",
    )
    login_csrf = csrf_payload.get("csrf_token")
    if not isinstance(login_csrf, str) or not login_csrf:
        raise RuntimeError("login CSRF retrieval: token missing from response")
    print("PASS: login CSRF token retrieval", flush=True)

    verify_step(
        "login",
        "/api/auth/login",
        200,
        method="POST",
        payload={"password": PASSWORD},
        csrf=login_csrf,
    )
    if not session_cookie:
        raise RuntimeError("login: authenticated session cookie was not set")
    print("PASS: login with CSRF establishes an authenticated session", flush=True)

    initial_state = verify_step(
        "authenticated study-state GET",
        "/api/study/state",
        200,
    )
    if not isinstance(initial_state.get("states"), dict):
        raise RuntimeError("authenticated study-state GET: states is not an object")
    print("PASS: authenticated study-state GET", flush=True)

    csrf_payload = verify_step("write CSRF retrieval", "/api/csrf", 200)
    write_csrf = csrf_payload.get("csrf_token")
    if not isinstance(write_csrf, str) or not write_csrf:
        raise RuntimeError("write CSRF retrieval: token missing from response")
    print("PASS: authenticated write CSRF token retrieval", flush=True)

    state_value = {"release_smoke_test": "disposable-database-only"}
    verify_step(
        "CSRF rejection",
        "/api/study/state/cst-study-matrix-v1",
        403,
        method="PUT",
        payload={"value": state_value},
    )
    print("PASS: study-state update without CSRF is rejected (403)", flush=True)

    saved = verify_step(
        "CSRF-protected study-state update",
        "/api/study/state/cst-study-matrix-v1",
        200,
        method="PUT",
        payload={"value": state_value},
        csrf=write_csrf,
    )
    if saved.get("status") != "saved":
        raise RuntimeError("CSRF-protected study-state update: save confirmation missing")
    print("PASS: study-state update with valid CSRF", flush=True)

    persisted = verify_step("saved state reload", "/api/study/state", 200)
    if persisted["states"].get("cst-study-matrix-v1") != state_value:
        raise RuntimeError("saved state reload: persisted test value did not match")
    print("PASS: study-state update persists in disposable database", flush=True)

    verify_step(
        "logout",
        "/api/auth/logout",
        200,
        method="POST",
        csrf=write_csrf,
    )
    session_cookie = ""
    print("PASS: CSRF-protected logout", flush=True)

    verify_step(
        "post-logout state access",
        "/api/study/state",
        401,
        cookie="",
    )
    print("PASS: unauthenticated access rejected after logout (401)", flush=True)
except Exception as error:
    print(f"FAIL: {type(error).__name__}: {error}", file=sys.stderr, flush=True)
    sys.exit(1)
