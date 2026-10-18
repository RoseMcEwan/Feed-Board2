import { createId } from "../utilis/numbers.js";

export const CROP_TYPES = [
  "Fodder beet",
  "Kale",
  "Swedes",
  "Turnips",
  "Rape",
  "Maize",
  "Oats",
  "Other",
];

export const COLOURS = ["green", "blue", "amber", "purple"];

export const STOCK_CLASSES = [
  "Mixed age",
  "Heifers",
  "Calves",
  "Beef cattle",
  "Sheep",
  "Lambs",
  "Other",
];

export const FARM_SCHEMA_VERSION = 5;
export const DEFAULT_TOLERANCE_HA = 0.3;

export function createHerd(index = 0, farmType = "dairy") {
  return {
    id: createId("herd"),
    name: `Herd ${index + 1}`,
    animals: "",
    stockClass: farmType === "dairy" ? "Mixed age" : "Beef cattle",
    colour: COLOURS[index % COLOURS.length],
    targetKgDMDay: "",
  };
}

export function createPaddock() {
  return {
    id: createId("paddock"),
    name: "",
    hectares: "",
    herdId: "",
    excluded: false,
    exclusionReason: "",
    otherReason: "",
  };
}

export function createCrop(paddockId) {
  return {
    id: createId("crop"),
    paddockId,
    herdId: "",
    cropType: "",
    otherCropType: "",
    yieldKgDMHa: "",
    kgDMPerAnimalDay: "",
    startDate: "",
  };
}

export function createEmptyFarm() {
  return {
    schemaVersion: FARM_SCHEMA_VERSION,
    setupCompleted: false,
    setupStep: 0,
    importText: "",
    settings: {
      farmName: "",
      farmType: "dairy",
      assignHerds: true,
      latitude: "",
      longitude: "",
      targetCover: 2900,
      residualKgDmHa: 1550,
      roundLength: 21,
      paddockToleranceHa: DEFAULT_TOLERANCE_HA,
      schedule: { am: "05:00", pm: "13:30" },
    },
    herds: [],
    paddocks: [],
    crops: [],
    planner: { orders: {} },
  };
}

// Crop area comes from the paddock hectares. Crop-specific fields live on the crop record.
export function syncCropRecords(farm) {
  const cropPaddocks = farm.paddocks.filter(
    (paddock) => paddock.excluded && paddock.exclusionReason === "crop",
  );

  return {
    ...farm,
    schemaVersion: FARM_SCHEMA_VERSION,
    crops: cropPaddocks.map(
      (paddock) =>
        farm.crops.find((crop) => crop.paddockId === paddock.id) ??
        createCrop(paddock.id),
    ),
  };
}
