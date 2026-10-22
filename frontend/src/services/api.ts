import type { ApiError, StudyStateResponse } from "../types/study";

const API_BASE = "/api";

export class ApiRequestError extends Error {
  public readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: "same-origin",
  });

  if (response.status === 401) {
    const next = `${window.location.pathname}${window.location.search}`;
    window.location.assign(`/login?next=${encodeURIComponent(next || "/")}`);
    throw new ApiRequestError("Authentication required", 401);
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const payload = (await response.json()) as ApiError;
      if (payload.error) message = payload.error;
    } catch {
      // Keep the HTTP status message.
    }
    throw new ApiRequestError(message, response.status);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export interface CsrfResponse {
  csrf_token: string;
}

export type StudyStateKey =
  | "cst-study-data-v2"
  | "cst-study-matrix-v1"
  | "cst-hub-v1"
  | "cst-fx-v1";

export const STUDY_STATE_KEYS: StudyStateKey[] = [
  "cst-study-data-v2",
  "cst-study-matrix-v1",
  "cst-hub-v1",
  "cst-fx-v1",
];

export const studyApi = {
  getLoginCsrf(): Promise<CsrfResponse> {
    return request<CsrfResponse>("/auth/csrf");
  },

  async login(password: string, csrfToken: string): Promise<void> {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
      body: JSON.stringify({ password }),
    });

    if (!response.ok) {
      let message = `Sign-in failed with status ${response.status}`;
      try {
        const payload = (await response.json()) as ApiError;
        if (payload.error) message = payload.error;
      } catch {
        // Keep the HTTP status message.
      }
      throw new ApiRequestError(message, response.status);
    }
  },

  getCsrf(): Promise<CsrfResponse> {
    return request<CsrfResponse>("/csrf");
  },

  getState(): Promise<StudyStateResponse> {
    return request<StudyStateResponse>("/study/state");
  },

  saveState(
    key: StudyStateKey,
    value: unknown,
    csrfToken: string,
  ): Promise<{ status: string; key: string; updated_at: string | null }> {
    return request(`/study/state/${key}`, {
      method: "PUT",
      headers: { "X-CSRF-Token": csrfToken },
      body: JSON.stringify({ value }),
    });
  },

  async logout(csrfToken: string): Promise<void> {
    await request<{ status: string }>("/auth/logout", {
      method: "POST",
      headers: { "X-CSRF-Token": csrfToken },
    });
    window.location.assign("/login");
  },
};
