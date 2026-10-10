const { numberOrNull, isValidDate } = require("./farmValidation");
const { addCalendarDays, daysBetween } = require("../calculations/calculationHelpers");

const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const validId = (value) => typeof value === "string" && /^[A-Za-z0-9-]{1,64}$/.test(value);
const optionalId = (value) => value === "" || value === null || validId(value);
const shortText = (value, max = 200) => typeof value === "string" && value.length <= max;
const optionalDate = (value) => value === "" || value === null || isValidDate(value);
const measurement = (value, max = 1000000) => {
  if (value === "" || value === null) return true;
  const number = numberOrNull(value);
  return number !== null && Math.abs(number) <= max && String(value).length <= 40;
};

// Validates an incomplete farm draft before running backend calculations.
function validateCalculation(body) {
  if (!isRecord(body) || !isRecord(body.farm)) return ["Send a farm draft as JSON."];
  const { farm, today, selectedDate } = body;
  const errors = [];
  if (!isValidDate(today)) errors.push("Send a valid evaluation date as YYYY-MM-DD.");
  if (selectedDate !== undefined && !optionalDate(selectedDate)) errors.push("Choose a valid planner date.");
  if (selectedDate && isValidDate(selectedDate) && !addCalendarDays(selectedDate, 6)) {
    errors.push("The seven-day planner window is outside the supported calendar.");
  }

  if (!isRecord(farm.settings) || !isRecord(farm.settings.schedule))
    return [...errors, "Farm settings and schedule are required."];
  const settings = farm.settings;
  if (typeof settings.assignHerds !== "boolean") errors.push("Herd assignment mode must be true or false.");
  for (const key of ["targetCover", "residualKgDmHa", "roundLength", "paddockToleranceHa"]) {
    if (key === "paddockToleranceHa" && settings[key] === undefined) continue;
    if (!measurement(settings[key])) errors.push(`Invalid ${key} value.`);
  }
  if (!shortText(settings.schedule.am, 5) || !shortText(settings.schedule.pm, 5))
    errors.push("Schedule times must be short strings.");

  const lists = [
    ["herds", 100],
    ["paddocks", 1000],
    ["crops", 1000],
  ];
  for (const [key, maximum] of lists) {
    if (!Array.isArray(farm[key]) || farm[key].length > maximum)
      return [...errors, `${key} must be a list with at most ${maximum} records.`];
    const ids = new Set();
    for (const item of farm[key]) {
      if (!isRecord(item) || !validId(item.id) || ids.has(item.id))
        return [...errors, `${key} contain an invalid or duplicate record ID.`];
      ids.add(item.id);
    }
  }

  for (const herd of farm.herds) {
    if (!shortText(herd.name, 60) || !measurement(herd.animals) || !measurement(herd.targetKgDMDay, 1000)) {
      errors.push("A herd has invalid name, animal count or target intake values.");
    }
  }
  for (const paddock of farm.paddocks) {
    if (
      !shortText(paddock.name, 80) ||
      !measurement(paddock.hectares) ||
      !optionalId(paddock.herdId) ||
      typeof paddock.excluded !== "boolean" ||
      !shortText(paddock.exclusionReason, 30)
    ) {
      errors.push("A paddock has invalid area, assignment or exclusion values.");
    }
  }
  for (const crop of farm.crops) {
    if (
      !validId(crop.paddockId) ||
      !optionalId(crop.herdId) ||
      !measurement(crop.yieldKgDMHa) ||
      !measurement(crop.kgDMPerAnimalDay, 1000) ||
      !optionalDate(crop.startDate)
    ) {
      errors.push("A crop has invalid paddock, herd, yield, intake or date values.");
    }
  }

  if (!isRecord(farm.planner) || !isRecord(farm.planner.orders))
    return [...errors, "Planner orders must be an object."];
  const orders = Object.entries(farm.planner.orders);
  if (orders.length > 100) return [...errors, "Use no more than 100 herd queues."];
  let herdDays = 0;
  const endDate = selectedDate && isValidDate(selectedDate) ? addCalendarDays(selectedDate, 6) : null;
  const herdIds = new Set(farm.herds.map((herd) => herd.id));
  for (const [herdId, order] of orders) {
    if (!validId(herdId)) {
      errors.push("A queue has an invalid herd ID.");
      continue;
    }
    if (order === null) continue;
    if (
      !isRecord(order) ||
      !optionalDate(order.startDate) ||
      !Array.isArray(order.paddockIds) ||
      order.paddockIds.length > 1000 ||
      order.paddockIds.some((id) => !optionalId(id))
    ) {
      errors.push("A queue has invalid dates or paddock IDs.");
      continue;
    }
    const days = endDate ? daysBetween(endDate, order.startDate) : null;

    if (herdIds.has(herdId) && days !== null && days >= 0 && days <= 3650) herdDays += days + 1;
  }
  if (herdDays > 100000)
    errors.push("This preview spans too many herd-days. Choose a date closer to the queue start dates.");
  return [...new Set(errors)];
}

module.exports = { validateCalculation };
