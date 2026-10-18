import { useEffect, useMemo, useState } from "react";
import { calculateFarm } from "../services/api.js";

// One request supplies all calculated results needed by the active page.
export default function useFarmCalculations({ farm, userId, today, selectedDate = null, enabled = true, delay = 300 }) {
  const [result, setResult] = useState(null);
  const [attempt, setAttempt] = useState(0);

  const { settings, herds, paddocks, crops, planner } = farm;

  const request = useMemo(
    () =>
      JSON.stringify({
        farm: {
          settings,
          herds,
          paddocks,
          crops,
          planner,
        },
        today,
        selectedDate: selectedDate || null,
      }),
    [settings, herds, paddocks, crops, planner, today, selectedDate],
  );

  const key = `${userId}:${attempt}:${request}`;

  useEffect(() => {
    if (!enabled || userId === undefined || userId === null) {
      return;
    }

    const controller = new AbortController();

    let cancelled = false;

    const timer = setTimeout(async () => {
      try {
        const data = await calculateFarm(userId, JSON.parse(request), controller.signal);

        if (!cancelled) {
          setResult({
            key,
            data,
            error: "",
            problems: [],
          });
        }
      } catch (error) {
        if (!cancelled) {
          setResult({
            key,
            data: null,
            error: error.message,
            problems: error.errors || [],
          });
        }
      }
    }, delay);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [request, key, userId, enabled, delay]);

  // Only expose results that belong to the current farm/date request.
  const current = enabled && result?.key === key ? result : null;

  return {
    data: current?.data ?? null,
    loading: enabled && !current,
    error: current?.error || "",
    problems: current?.problems || [],
    retry: () => setAttempt((value) => value + 1),
  };
}
