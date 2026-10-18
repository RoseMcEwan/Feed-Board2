// Server-side checks for the complete initial farm sent to POST /api/farm.
const CROP_TYPES = ["Fodder beet", "Kale", "Swedes", "Turnips", "Rape", "Maize", "Oats", "Other"];
const COLOURS = ["green", "blue", "amber", "purple"];
const STOCK_CLASSES = ["Mixed age", "Heifers", "Calves", "Beef cattle", "Sheep", "Lambs", "Other"];
const MAX_HERDS = 100;
const MAX_PADDOCKS = 1000;

// Converts a numeric value to a finite number or null.
function numberOrNull(value) {
  if (!["string", "number"].includes(typeof value) || String(value).trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

// Checks that a date is a valid YYYY-MM-DD calendar date.
function isValidDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1000 || year > 9999 || month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  return day <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

// Checks that a value is a plain object.
const record = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
// Returns trimmed text or an empty string.
const text = (value) => (typeof value === "string" ? value.trim() : "");
// Checks whether an optional value is blank.
const blank = (value) => value === "" || value === null || value === undefined;
// Checks that a client-side ID uses the expected format.
const validId = (value) => typeof value === "string" && /^[A-Za-z0-9-]{1,64}$/.test(value);
// Validates numeric measurements and limits them to six decimal places.
function measurement(value, { min = 0, max = 1000000, allowZero = false } = {}) {
  const number = numberOrNull(value);
  return (
    number !== null &&
    (allowZero ? number >= min : number > min) &&
    number <= max &&
    Math.abs(number * 1e6 - Math.round(number * 1e6)) < 0.0001
  );
}

// Validates all farm-wide settings.
function validateSettings(settings) {
  if (!record(settings)) return ["Farm settings are missing."];
  const errors = [];
  if (!text(settings.farmName) || text(settings.farmName).length > 100)
    errors.push("Enter a farm name of 1–100 characters.");
  if (!["dairy", "sheep-beef"].includes(settings.farmType)) errors.push("Choose Dairy or Sheep / beef.");
  if (typeof settings.assignHerds !== "boolean") errors.push("Choose whether paddocks are assigned to herds.");

  for (const [field, label, limit] of [
    ["latitude", "Latitude", 90],
    ["longitude", "Longitude", 180],
  ]) {
    const value = numberOrNull(settings[field]);

    if (value === null || Math.abs(value) > limit || !measurement(Math.abs(value), { allowZero: true })) {
      errors.push(`${label} must be between −${limit} and ${limit}, with at most six decimal places.`);
    }
  }

  const cover = numberOrNull(settings.targetCover);
  const residual = numberOrNull(settings.residualKgDmHa);

  if (!measurement(cover))
    errors.push("Target cover must be greater than zero (maximum 1,000,000; up to six decimal places).");
  if (!measurement(residual))
    errors.push("Target residual must be greater than zero (maximum 1,000,000; up to six decimal places).");
  if (cover !== null && residual !== null && cover < residual)
    errors.push("Target cover cannot be below target residual.");
  if (!measurement(settings.roundLength, { max: 3650 }))
    errors.push("Round length must be greater than zero and at most 3,650 days (up to six decimal places).");
  if (!measurement(settings.paddockToleranceHa, { allowZero: true, max: 1 }))
    errors.push("Paddock tolerance must be between 0 and 1 hectare (up to six decimal places).");

  errors.push(...validateSchedule(settings.schedule));

  return errors;
}

// Validates the farm's AM and PM schedule times.
function validateSchedule(schedule) {
  // Checks that a time uses valid 24-hour HH:mm format.
  const validTime = (value) => typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

  if (!validTime(schedule?.am) || !validTime(schedule?.pm)) return ["Enter one valid AM time and one valid PM time."];
  if (schedule.am >= "12:00" || schedule.pm < "12:00")
    return ["The AM time must be before noon and the PM time must be noon or later."];

  return [];
}

// Validates herd details and relationships.
function validateHerds(farm) {
  if (!Array.isArray(farm?.herds)) return ["Herds must be a list."];
  if (!farm.herds.length) return ["Add at least one herd or mob."];
  if (farm.herds.length > MAX_HERDS) return [`Use no more than ${MAX_HERDS} herds.`];

  const errors = [],
    names = new Set(),
    ids = new Set();

  for (const [index, herd] of farm.herds.entries()) {
    if (!record(herd)) {
      errors.push(`Herd ${index + 1} is invalid.`);
      continue;
    }

    const name = text(herd.name),
      label = name || `Herd ${index + 1}`,
      key = name.toLowerCase();

    if (!validId(herd.id) || ids.has(herd.id)) errors.push(`${label}: herd ID is missing, invalid or duplicated.`);
    ids.add(herd.id);
    if (!name || name.length > 60) errors.push(`${label}: enter a name of 1–60 characters.`);
    else if (names.has(key)) errors.push(`Herd name “${name}” is duplicated.`);
    names.add(key);

    const animals = numberOrNull(herd.animals);

    if (!Number.isInteger(animals) || animals < 1 || animals > 1000000)
      errors.push(`${label}: enter a whole animal count between 1 and 1,000,000.`);
    if (!measurement(herd.targetKgDMDay, { max: 1000 }))
      errors.push(
        `${label}: target intake must be greater than zero and at most 1,000 kgDM (up to six decimal places).`,
      );
    if (!STOCK_CLASSES.includes(herd.stockClass)) errors.push(`${label}: choose a stock class.`);
    if (!COLOURS.includes(herd.colour)) errors.push(`${label}: choose a herd colour.`);
  }

  return errors;
}

// Validates crop type information.
function cropTypeErrors(crop, label) {
  const errors = [];

  if (!crop || !CROP_TYPES.includes(crop.cropType)) errors.push(`${label}: choose the crop type.`);
  if (crop?.cropType === "Other" && (!text(crop.otherCropType) || text(crop.otherCropType).length > 100)) {
    errors.push(`${label}: enter the other crop type (1–100 characters).`);
  }

  return errors;
}

// Validates paddock details, exclusions and herd assignments.
function validatePaddocks(farm, { requireAssignments = true, requireCropTypes = true } = {}) {
  if (!Array.isArray(farm?.paddocks)) return ["Paddocks must be a list."];
  if (!farm.paddocks.length) return ["Add at least one paddock."];
  if (farm.paddocks.length > MAX_PADDOCKS) return [`Use no more than ${MAX_PADDOCKS} paddocks.`];

  const errors = [],
    names = new Set(),
    ids = new Set();
  const herds = new Set((Array.isArray(farm.herds) ? farm.herds : []).map((herd) => herd?.id));
  const crops = Array.isArray(farm.crops) ? farm.crops : [];

  for (const [index, paddock] of farm.paddocks.entries()) {
    if (!record(paddock)) {
      errors.push(`Paddock ${index + 1} is invalid.`);
      continue;
    }

    const name = text(paddock.name),
      label = name || `Paddock ${index + 1}`,
      key = name.toLowerCase();

    if (!validId(paddock.id) || ids.has(paddock.id))
      errors.push(`${label}: paddock ID is missing, invalid or duplicated.`);
    ids.add(paddock.id);
    if (!name || name.length > 80) errors.push(`${label}: enter a name of 1–80 characters.`);
    else if (names.has(key)) errors.push(`Paddock name “${name}” is duplicated.`);
    names.add(key);
    if (!measurement(paddock.hectares))
      errors.push(`${label}: hectares must be greater than zero (maximum 1,000,000; up to six decimal places).`);
    if (typeof paddock.excluded !== "boolean") errors.push(`${label}: choose whether it is excluded.`);
    if (paddock.excluded && !["crop", "young-grass", "other"].includes(paddock.exclusionReason))
      errors.push(`${label}: choose why it is not being grazed.`);
    if (
      paddock.excluded &&
      paddock.exclusionReason === "other" &&
      (!text(paddock.otherReason) || text(paddock.otherReason).length > 200)
    ) {
      errors.push(`${label}: enter the other exclusion reason (1–200 characters).`);
    }
    if (requireCropTypes && paddock.excluded && paddock.exclusionReason === "crop") {
      errors.push(
        ...cropTypeErrors(
          crops.find((crop) => crop?.paddockId === paddock.id),
          label,
        ),
      );
    }

    if (!blank(paddock.herdId) && !herds.has(paddock.herdId)) {
      errors.push(`${label}: the assigned herd no longer exists.`);
    } else if (requireAssignments && farm.settings?.assignHerds && !paddock.excluded && !herds.has(paddock.herdId)) {
      errors.push(`${label}: choose which herd this paddock is assigned to.`);
    }
  }

  return errors;
}

// Validates crop relationships and all required feeding details.
function validateCrops(farm) {
  if (!Array.isArray(farm?.crops)) return ["Crops must be a list."];
  if (farm.crops.length > MAX_PADDOCKS) return ["There are too many crop records."];

  const errors = [],
    ids = new Set(),
    linkedPaddocks = new Set();
  const paddocks = Array.isArray(farm.paddocks) ? farm.paddocks : [];
  const herds = new Set((Array.isArray(farm.herds) ? farm.herds : []).map((herd) => herd?.id));

  for (const crop of farm.crops) {
    if (!record(crop)) {
      errors.push("A crop record is invalid.");
      continue;
    }

    if (!validId(crop.id) || ids.has(crop.id)) errors.push("A crop ID is missing, invalid or duplicated.");
    ids.add(crop.id);
    const paddock = paddocks.find((item) => item?.id === crop.paddockId);
    if (!paddock) {
      errors.push("A crop has no linked paddock in this farm.");
      continue;
    }

    const label = text(paddock.name) || "Crop paddock";
    if (!paddock.excluded || paddock.exclusionReason !== "crop")
      errors.push(`${label}: crop records must link to a paddock excluded for crop.`);
    if (linkedPaddocks.has(paddock.id)) errors.push(`${label}: only one current crop record is allowed.`);
    linkedPaddocks.add(paddock.id);
    errors.push(...cropTypeErrors(crop, label));
    if (!herds.has(crop.herdId)) errors.push(`${label}: choose a herd for this crop.`);
    if (!measurement(crop.yieldKgDMHa))
      errors.push(`${label}: enter a positive crop yield up to 1,000,000 (up to six decimal places).`);
    if (!measurement(crop.kgDMPerAnimalDay, { max: 1000 }))
      errors.push(`${label}: enter a positive crop intake up to 1,000 (up to six decimal places).`);
    if (!isValidDate(crop.startDate)) errors.push(`${label}: enter a valid feeding start date.`);
  }

  for (const paddock of paddocks) {
    if (paddock?.excluded && paddock.exclusionReason === "crop" && !linkedPaddocks.has(paddock.id)) {
      errors.push(`${text(paddock.name) || "Crop paddock"}: add its crop information and herd allocation.`);
    }
  }
  return errors;
}

// Validates queue dates, paddocks and herd relationships.
function validateQueues(farm) {
  if (!record(farm?.planner) || !record(farm.planner.orders)) return ["Planner orders are missing."];
  const errors = [],
    claimed = new Set();
  const herds = Array.isArray(farm.herds) ? farm.herds : [];
  const paddocks = new Map(
    (Array.isArray(farm.paddocks) ? farm.paddocks : []).filter(record).map((paddock) => [paddock.id, paddock]),
  );

  for (const [herdId, order] of Object.entries(farm.planner.orders)) {
    if (order === null) continue;
    const herd = herds.find((item) => item?.id === herdId);
    if (!herd) {
      errors.push("A queue references a herd outside this farm.");
      continue;
    }

    if (!record(order) || !isValidDate(order.startDate) || !Array.isArray(order.paddockIds)) {
      errors.push(`${herd.name}: choose a valid queue start date and paddock list.`);
      continue;
    }

    if (!order.paddockIds.length || order.paddockIds.length > MAX_PADDOCKS)
      errors.push(`${herd.name}: choose at least one queue paddock, or clear the queue.`);
    const seen = new Set();
    for (const id of order.paddockIds) {
      const paddock = paddocks.get(id);

      if (!paddock || paddock.excluded || (farm.settings?.assignHerds && paddock.herdId !== herdId)) {
        errors.push(
          `${herd.name}: remove or replace unavailable paddock ${paddock?.name || id || "(empty selection)"} in the queue.`,
        );
      }

      if (seen.has(id)) errors.push(`${herd.name}: a paddock appears twice in its queue.`);

      if (!farm.settings?.assignHerds && claimed.has(id) && !seen.has(id)) {
        errors.push(`${paddock?.name || id}: already reserved in another herd's queue.`);
      }

      seen.add(id);
      claimed.add(id);
    }
  }

  return errors;
}

// Runs all validation required before a farm is saved.
function validateFarm(farm) {
  if (!record(farm)) return ["Farm data is missing."];

  const errors = [
    ...validateSettings(farm.settings),
    ...validateHerds(farm),
    ...validatePaddocks(farm, { requireCropTypes: false }),
    ...validateCrops(farm),
    ...validateQueues(farm),
  ];

  if (typeof farm.setupCompleted !== "boolean") errors.push("Setup completion must be true or false.");
  if (!Number.isInteger(farm.setupStep) || farm.setupStep < 0 || farm.setupStep > 4)
    errors.push("Setup step must be between 0 and 4.");

  return [...new Set(errors)];
}

module.exports = {
  validateFarm,
  validateSettings,
  validateSchedule,
  validateHerds,
  validatePaddocks,
  validateCrops,
  validateQueues,
  numberOrNull,
  isValidDate,
};
