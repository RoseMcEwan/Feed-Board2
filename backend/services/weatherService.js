// Forecast requests/caching run only on the server; the UI calls /api/weather.
const userAgent = process.env.WEATHER_USER_AGENT?.trim() || "";
const cache = new Map();
const pending = new Map();
const MAX_ENTRIES = 100;
const error = (message, status = 502) => Object.assign(new Error(message), { status, code: "WEATHER_UNAVAILABLE" });

async function request(key, previous) {
  try {
    const headers = { "User-Agent": userAgent, Accept: "application/json" };
    if (previous?.lastModified) headers["If-Modified-Since"] = previous.lastModified;
    const response = await fetch(`https://api.met.no/weatherapi/locationforecast/2.0/compact?${key}`, {
      headers,
      signal: AbortSignal.timeout(10000),
    });
    const expires = Date.parse(response.headers.get("expires"));
    const expiresAt = Number.isFinite(expires) ? expires : Date.now() + 10 * 60 * 1000;
    if (response.status === 304 && previous) {
      previous.expiresAt = expiresAt;
      return previous.data;
    }
    if (!response.ok) throw error("The weather provider is unavailable. Please try again later.");
    const data = await response.json();
    if (!Array.isArray(data?.properties?.timeseries))
      throw error("The weather provider returned an unexpected response.");
    if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value);
    cache.set(key, { data, expiresAt, lastModified: response.headers.get("last-modified") });
    return data;
  } catch (failure) {
    if (failure.name === "TimeoutError") throw error("The weather request timed out.", 504);
    if (failure.status) throw failure;
    throw error("Unable to retrieve weather. Please try again later.");
  } finally {
    pending.delete(key);
  }
}
async function getForecast({ lat, lon }) {
  if (!userAgent) throw error("Weather is not configured. Set WEATHER_USER_AGENT on the server.", 503);
  const key = new URLSearchParams({ lat, lon }).toString();
  const previous = cache.get(key);
  if (previous && previous.expiresAt > Date.now()) return previous.data;
  if (!pending.has(key)) pending.set(key, request(key, previous));
  return pending.get(key);
}
module.exports = { getForecast };
