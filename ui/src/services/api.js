// Authentication cookies are HttpOnly. The CSRF token stays in memory, never localStorage.
let csrfToken = "";
let sessionRequest = null;

export class ApiError extends Error {
  constructor(message, { status = 0, code = "NETWORK_ERROR", errors = [] } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.errors = errors;
  }
}

async function send(path, { method = "GET", body, userId, signal } = {}) {
  if (!path.startsWith("/api/")) throw new Error("Only relative FeedBoard API paths are supported.");
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) controller.abort();
  let timedOut = false;
  const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, 20000);
  try {
    const response = await fetch(path, {
      method, signal: controller.signal, credentials: "include",
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(method !== "GET" ? { "X-CSRF-Token": csrfToken } : {}),
        ...(userId !== undefined ? { "X-FeedBoard-User": String(userId) } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    if (response.status === 204) return null;
    if (!response.headers.get("content-type")?.includes("application/json")) {
      throw new ApiError("The API returned a page instead of JSON. Check that the backend and Vite proxy are running.", { status: response.status });
    }
    const data = await response.json();
    if (!response.ok) throw new ApiError(data.message || `Request failed (${response.status}).`, { status: response.status, code: data.code, errors: data.errors });
    if (data.csrfToken) csrfToken = data.csrfToken;
    return data;
  } catch (error) {
    if (signal?.aborted) throw error;
    if (error instanceof ApiError) throw error;
    throw new ApiError(timedOut ? "The server took too long to respond. Your browser draft is kept." : "Cannot reach the server. Check your connection and that the backend is running.");
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}

export function getSession() {
  // StrictMode and simultaneous API calls share a single initial token request.
  if (!sessionRequest) sessionRequest = send("/api/auth/session").finally(() => { sessionRequest = null; });
  return sessionRequest;
}

export async function apiRequest(path, options = {}) {
  const method = options.method || "GET";
  if (method !== "GET" && !csrfToken) await getSession();
  try { return await send(path, options); }
  catch (error) {
    // A rejected CSRF request has not run its controller, so this one retry is safe.
    if (error.code !== "CSRF_INVALID") throw error;
    const session = await getSession();
    if (options.userId !== undefined && String(session.user?.id) !== String(options.userId)) {
      throw new ApiError("The signed-in account changed. Log in again; your draft is kept.", { status: 409, code: "ACCOUNT_CHANGED" });
    }
    return send(path, options);
  }
}

export const registerAccount = (details) => apiRequest("/api/auth/register", { method: "POST", body: details });
export const loginAccount = (details) => apiRequest("/api/auth/login", { method: "POST", body: details });
export const logoutAccount = (userId) => apiRequest("/api/auth/logout", { method: "POST", userId, body: {} });
export const getFarm = (userId) => apiRequest("/api/farm", { userId });
export const createFarm = (userId, farm) => apiRequest("/api/farm", { method: "POST", userId, body: { farm, expectedVersion: 0 } });

// Each write carries the latest acknowledged farm identity and version.
export const writeFarmResource = (userId, operation, saved) => apiRequest(operation.path, {
  method: operation.method, userId,
  body: { ...operation.body, expectedVersion: saved.version, expectedFarmId: saved.farmId },
});
export const deleteFarm = (userId, saved) => writeFarmResource(userId, { method: "DELETE", path: "/api/farm", body: {} }, saved);

// Calculation previews do not save the draft or change its database version.
export const calculateFarm = (userId, inputs, signal) => apiRequest("/api/farm/calculate", {
  method: "POST", userId, body: inputs, signal,
});
