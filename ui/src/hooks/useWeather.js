import { useEffect, useState } from "react";
import { numberOrNull } from "../utilis/numbers.js";
import { apiRequest } from "../services/api.js";

export default function useWeather(latitude, longitude, enabled = false, attempt = 0, userId) {
  const [result, setResult] = useState({ weather: [], status: "idle", error: "", key: "" });
  const key = `${latitude},${longitude},${attempt},${userId}`;
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    async function load() {
      setResult({ weather: [], status: "loading", error: "", key });
      const lat = numberOrNull(latitude), lon = numberOrNull(longitude);
      if (lat === null || lon === null || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
        setResult({ weather: [], status: "error", error: "Add valid coordinates in Settings.", key }); return;
      }
      try {
        const query = new URLSearchParams({ lat: String(lat), lon: String(lon) });
        const data = await apiRequest(`/api/weather?${query}`, { userId, signal: controller.signal });
        if (!Array.isArray(data?.properties?.timeseries)) throw new Error("The weather service returned an unexpected format.");
        if (!controller.signal.aborted) setResult({ weather: data.properties.timeseries, status: "ready", error: "", key });
      } catch (error) {
        if (!controller.signal.aborted) setResult({ weather: [], status: "error", error: error.message, key });
      }
    }
    load();
    return () => controller.abort();
  }, [latitude, longitude, enabled, attempt, userId, key]);
  if (!enabled) return { weather: [], status: "idle", error: "" };
  return result.key === key ? result : { weather: [], status: "loading", error: "" };
}
