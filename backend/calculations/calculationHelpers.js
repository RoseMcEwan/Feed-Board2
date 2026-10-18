const { numberOrNull, isValidDate } = require("../middleware/farmValidation");

const DEFAULT_TOLERANCE_HA = 0.3;
const DAY_MS = 24 * 60 * 60 * 1000;

// Checks whether a value is a valid number greater than zero.
function positive(value) {
  const number = numberOrNull(value);
  return number !== null && number > 0;
}

// Returns a non-negative number or a fallback value.
function nonNegative(value, fallback = 0) {
  const number = numberOrNull(value);
  return number !== null && number >= 0 ? number : fallback;
}

// Adds whole calendar days to a YYYY-MM-DD date.
function addCalendarDays(date, amount) {
  if (!isValidDate(date) || !Number.isFinite(amount)) return "";
  const next = new Date(Date.parse(`${date}T00:00:00.000Z`) + Math.trunc(amount) * DAY_MS);
  if (!Number.isFinite(next.getTime()) || next.getUTCFullYear() < 1000 || next.getUTCFullYear() > 9999) return "";
  return next.toISOString().slice(0, 10);
}

// Calculates the number of calendar days between two dates.
function daysBetween(later, earlier) {
  if (!isValidDate(later) || !isValidDate(earlier)) return null;
  return (Date.parse(`${later}T00:00:00.000Z`) - Date.parse(`${earlier}T00:00:00.000Z`)) / DAY_MS;
}

// Returns the supplied date as a YYYY-MM-DD value.
function todayISO(now = new Date()) {
  return now instanceof Date && Number.isFinite(now.getTime()) ? now.toISOString().slice(0, 10) : "";
}

module.exports = { numberOrNull, positive, nonNegative, isValidDate, addCalendarDays, daysBetween, todayISO, DEFAULT_TOLERANCE_HA };
