const DEFAULT_API_BASE_URL = "/api";

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL
).replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

async function apiRequest(path, options = {}) {
  const { method = "GET", body, token, headers = {}, ...rest } = options;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    ...rest,
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof data === "object" && data?.message
        ? data.message
        : `Request failed with status ${response.status}`;

    throw new ApiError(message, response.status, data);
  }

  return data;
}

export function signupUser(payload) {
  return apiRequest("/auth/signup", {
    method: "POST",
    body: payload,
  });
}

export function loginUser(payload) {
  return apiRequest("/auth/login", {
    method: "POST",
    body: payload,
  });
}

export function forgotPassword(payload) {
  return apiRequest("/auth/forgot-password", {
    method: "POST",
    body: payload,
  });
}

export function resetPassword(payload) {
  return apiRequest("/auth/reset-password", {
    method: "POST",
    body: payload,
  });
}
