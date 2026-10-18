import { addDays, format, isValid, parseISO } from "date-fns";

function validDate(date) {
  const parsed = parseISO(date);

  if (!isValid(parsed)) return null;

  return format(parsed, "yyyy-MM-dd") === date ? parsed : null;
}

export function isValidDate(date) {
  return validDate(date) !== null;
}

export function todayISO(now = new Date()) {
  return format(now, "yyyy-MM-dd");
}

export function addCalendarDays(date, amount) {
  const parsed = validDate(date);

  if (!parsed || !Number.isFinite(amount)) return "";

  return format(addDays(parsed, Math.trunc(amount)), "yyyy-MM-dd");
}

export function formatDate(date, pattern = "d MMM yyyy") {
  const parsed = validDate(date);

  if (!parsed) return "—";

  return format(parsed, pattern);
}

export function getNextDays(selectedDate) {
  return Array.from({ length: 6 }, (_, index) => ({
    date: format(addDays(parseISO(selectedDate), index + 1), "yyyy-MM-dd"),
  }));
}

export function getWeekDays(selectedDate) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(parseISO(selectedDate), index);

    return {
      date: format(date, "yyyy-MM-dd"),
      label: format(date, "EEE d"),
    };
  });
}

export const moveDateByDay = addCalendarDays;