export function positive(value) {
  return Number(value) > 0;
}

export function displayNumber(value, decimals = 1) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return number.toLocaleString("en-NZ", {
    maximumFractionDigits: decimals,
  });
}

export function createId(prefix = "item") {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function numberOrNull(value) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}