const DEFAULT_API_BASE_URL = "/api";

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL
).replace(/\/$/, "");

function getStoredAuthToken() {
  return (
    window.localStorage.getItem("dws.auth.token") ||
    window.sessionStorage.getItem("dws.auth.session.token") ||
    ""
  );
}

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
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      ...(body && !isFormData ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(body
      ? { body: isFormData ? body : JSON.stringify(body) }
      : {}),
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

export function logoutUser(token = getStoredAuthToken()) {
  return apiRequest("/auth/logout", {
    method: "POST",
    token,
  });
}

export function getMyDevices(token = getStoredAuthToken()) {
  return apiRequest("/device/my-devices", {
    headers: {
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
    cache: "no-store",
    token,
  });
}

export function searchDevices(query, token = getStoredAuthToken()) {
  const params = new URLSearchParams({ q: query });

  return apiRequest(`/device/search?${params.toString()}`, {
    headers: {
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
    cache: "no-store",
    token,
  });
}

export function generateDeviceCode(
  payload,
  token = getStoredAuthToken(),
) {
  return apiRequest("/device/generate-code", {
    method: "POST",
    body: payload,
    token,
  });
}

export function deleteDevice(id, token = getStoredAuthToken()) {
  return apiRequest(`/device/delete/${id}`, {
    method: "DELETE",
    token,
  });
}

export function toggleDevice(
  id,
  payload,
  token = getStoredAuthToken(),
) {
  return apiRequest(`/device/${id}/toggle`, {
    method: "PATCH",
    body: payload,
    token,
  });
}

export function updateDeviceDetails(
  id,
  payload,
  token = getStoredAuthToken(),
) {
  return apiRequest(`/device/device/${id}`, {
    method: "PUT",
    body: payload,
    token,
  });
}

export function rebootAgent(deviceIdentifier, token = getStoredAuthToken()) {
  return apiRequest(`/device/reboot-agent/${encodeURIComponent(deviceIdentifier)}`, {
    method: "POST",
    token,
  });
}

export function rebootOperatingSystem(
  deviceIdentifier,
  token = getStoredAuthToken(),
) {
  return apiRequest(`/device/reboot-os/${encodeURIComponent(deviceIdentifier)}`, {
    method: "POST",
    token,
  });
}

export function sendTerminalCommand(
  deviceIdentifier,
  command,
  isRawKey = false,
  token = getStoredAuthToken(),
) {
  return apiRequest(`/device/command/${encodeURIComponent(deviceIdentifier)}`, {
    method: "POST",
    body: { command, isRawKey },
    token,
  });
}

export function getUserInfo(token = getStoredAuthToken()) {
  return apiRequest("/auth/info", {
    headers: {
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
    cache: "no-store",
    token,
  });
}

export function updateProfile(payload, token = getStoredAuthToken()) {
  return apiRequest("/update/profile", {
    method: "PUT",
    body: payload,
    token,
  });
}

export function updateEmail(payload, token = getStoredAuthToken()) {
  return apiRequest("/update/email", {
    method: "PUT",
    body: payload,
    token,
  });
}

export function sendEmailOtp(payload, token = getStoredAuthToken()) {
  return apiRequest("/email/send-otp", {
    method: "POST",
    body: payload,
    token,
  });
}

export function verifyEmailOtp(payload, token = getStoredAuthToken()) {
  return apiRequest("/email/verify-otp", {
    method: "POST",
    body: payload,
    token,
  });
}

export function listFilesAndFolders(
  folder = "",
  token = getStoredAuthToken(),
) {
  const params = new URLSearchParams();

  if (folder !== undefined && folder !== null) {
    params.set("folder", folder);
  }

  const query = params.toString();

  return apiRequest(`/files/list${query ? `?${query}` : ""}`, {
    headers: {
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
    cache: "no-store",
    token,
  });
}

export function createFolder(payload, token = getStoredAuthToken()) {
  return apiRequest("/files/create-folder", {
    method: "POST",
    body: payload,
    token,
  });
}

export function uploadFile(formData, token = getStoredAuthToken()) {
  return apiRequest("/files/upload", {
    method: "POST",
    body: formData,
    token,
  });
}

export function deleteStoredFile(payload, token = getStoredAuthToken()) {
  return apiRequest("/files/delete", {
    method: "DELETE",
    body: payload,
    token,
  });
}

export function createGroup(payload, token = getStoredAuthToken()) {
  return apiRequest("/group/create", {
    method: "POST",
    body: payload,
    token,
  });
}

export function getGroups(token = getStoredAuthToken()) {
  return apiRequest("/group", {
    headers: {
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
    cache: "no-store",
    token,
  });
}

export function updateGroup(id, payload, token = getStoredAuthToken()) {
  return apiRequest(`/group/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: payload,
    token,
  });
}

export function deleteGroup(id, token = getStoredAuthToken()) {
  return apiRequest(`/group/${encodeURIComponent(id)}`, {
    method: "DELETE",
    token,
  });
}
