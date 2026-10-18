import { numberOrNull, positive } from "./numbers.js";
import { CROP_TYPES, STOCK_CLASSES } from "../data/farmDefaults.js";
import { isValidDate } from "./calendarDates.js";

// Validates farm-wide settings needed for planning and saving.
export function validateSettings(settings) {
  const errors = [];

  if (!settings.farmName.trim()) {
    errors.push("Enter your farm name.");
  }
  if (!["dairy", "sheep-beef"].includes(settings.farmType)) {
    errors.push("Choose Dairy or Sheep / beef.");
  }

  const latitude = numberOrNull(settings.latitude);
  const longitude = numberOrNull(settings.longitude);

  if (latitude === null || latitude < -90 || latitude > 90) {
    errors.push("Latitude must be a number between −90 and 90.");
  }
  if (longitude === null || longitude < -180 || longitude > 180) {
    errors.push("Longitude must be a number between −180 and 180.");
  }

  const targetCover = numberOrNull(settings.targetCover);
  const residual = numberOrNull(settings.residualKgDmHa);

  if (!positive(targetCover)) {
    errors.push("Target cover must be greater than zero.");
  }
  if (!positive(residual)) {
    errors.push("Target residual must be greater than zero.");
  }
  if (positive(targetCover) && positive(residual) && targetCover < residual) {
    errors.push("Target cover cannot be below target residual.");
  }
  if (!positive(settings.roundLength)) {
    errors.push("Round length must be greater than zero.");
  }

  errors.push(...validateSchedule(settings.schedule));

  const tolerance = numberOrNull(settings.paddockToleranceHa);

  if (tolerance === null || tolerance < 0 || tolerance > 1) {
    errors.push("Paddock tolerance must be between 0 and 1 hectare.");
  }

  return errors;
}


// Checks that a time uses valid 24-hour HH:mm format.
function validTime(time) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time ?? "");
}

// Validates the AM and PM grazing schedule times.
export function validateSchedule(schedule) {
  if (!validTime(schedule?.am) || !validTime(schedule?.pm)) {
    return ["Enter one valid AM time and one valid PM time."];
  }
  if (schedule.am >= "12:00" || schedule.pm < "12:00") {
    return ["The AM time must be before noon and the PM time must be noon or later."];
  }

  return [];
}

// Validates herd names, animal numbers, intake targets and stock classes.
export function validateHerds(farm) {
  const errors = [];
  const names = new Set();

  if (!farm.herds.length) {
    errors.push("Add at least one herd or mob.");
  }

  for (const [index, herd] of farm.herds.entries()) {
    const name = herd.name.trim();
    const label = name || `Herd ${index + 1}`;
    const key = name.toLowerCase();

    if (!key) {
      errors.push(`Enter a name for herd ${index + 1}.`);
    } else if (names.has(key)) {
      errors.push(`Herd name “${label}” is duplicated.`);
    }

    names.add(key);

    if (!positive(herd.animals) || !Number.isInteger(Number(herd.animals))) {
      errors.push(`${label}: enter a whole animal count greater than zero.`);
    }
    if (!positive(herd.targetKgDMDay)) {
      errors.push(`${label}: target intake must be greater than zero.`);
    }
    if (!STOCK_CLASSES.includes(herd.stockClass)) {
      errors.push(`${label}: choose a stock class.`);
    }
  }

  return errors;
}

// Validates paddock details, exclusions, crop types and herd assignments
export function validatePaddocks(farm, { requireAssignments = true, requireCropTypes = true } = {}) {
  const errors = [];
  const names = new Set();
  const herds = new Set(farm.herds.map((herd) => herd.id));

  if (!farm.paddocks.length) {
    errors.push("Add at least one paddock.");
  }

  farm.paddocks.forEach((paddock, index) => {
    const name = paddock.name.trim();
    const label = name || `Paddock ${index + 1}`;
    const key = name.toLowerCase();

    if (!name) {
      errors.push(`Enter a name for paddock ${index + 1}.`);
    } else if (names.has(key)) {
      errors.push(`Paddock name “${name}” is duplicated.`);
    }

    names.add(key);

    if (!positive(paddock.hectares)) {
      errors.push(`${label}: hectares must be greater than zero.`);
    }
    if (paddock.excluded && !["crop", "young-grass", "other"].includes(paddock.exclusionReason)) {
      errors.push(`${label}: choose why it is not being grazed.`);
    }
    if (paddock.excluded && paddock.exclusionReason === "other" && !paddock.otherReason.trim()) {
      errors.push(`${label}: enter the exclusion reason.`);
    }
    if (requireCropTypes && paddock.excluded && paddock.exclusionReason === "crop") {
      const crop = farm.crops.find((item) => item.paddockId === paddock.id);

      if (!crop || !CROP_TYPES.includes(crop.cropType)) {
        errors.push(`${label}: choose the crop type.`);
      }
      if (crop?.cropType === "Other" && !crop.otherCropType?.trim()) {
        errors.push(`${label}: enter the crop type.`);
      }
    }
    if (requireAssignments && farm.settings.assignHerds && !paddock.excluded && !herds.has(paddock.herdId)) {
      errors.push(`${label}: choose which herd this paddock is assigned to.`);
    }
  });

  return errors;
}

// Validates all required crop feeding details and herd relationships.
export function validateCrops(farm) {
  const errors = [];

  for (const crop of farm.crops) {
    const paddock = farm.paddocks.find((paddock) => paddock.id === crop.paddockId);

    if (!paddock) {
      errors.push("A crop has no linked paddock.");

      continue;
    }
    if (!CROP_TYPES.includes(crop.cropType)) {
      errors.push(`${paddock.name}: choose the crop type.`);
    }
    if (crop.cropType === "Other" && !crop.otherCropType?.trim()) {
      errors.push(`${paddock.name}: enter the crop type.`);
    }
    if (!farm.herds.some((herd) => herd.id === crop.herdId)) {
      errors.push(`${paddock.name}: choose a herd for this crop.`);
    }
    if (!positive(crop.yieldKgDMHa)) {
      errors.push(`${paddock.name}: crop yield must be greater than zero.`);
    }
    if (!positive(crop.kgDMPerAnimalDay)) {
      errors.push(`${paddock.name}: feeding rate must be greater than zero.`);
    }
    if (!isValidDate(crop.startDate)) {
      errors.push(`${paddock.name}: enter a valid feeding start date.`);
    }
  }

  return errors;
}

// Runs all validation required before a complete farm can be saved.
export function validateFarm(farm) {
  return [
    ...validateSettings(farm.settings),
    ...validateHerds(farm),
    ...validatePaddocks(farm, {
      requireCropTypes: false,
    }),

    ...validateCrops(farm),
  ];
}
