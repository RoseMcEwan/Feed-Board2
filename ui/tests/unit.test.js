import test from "node:test";
import assert from "node:assert/strict";

import { createEmptyFarm, syncCropRecords } from "../src/data/farmDefaults.js";
import { parsePaddockText } from "../src/utilis/parsePaddocks.js";
import { validateFarm } from "../src/utilis/validation.js";
import { addCalendarDays } from "../src/utilis/calendarDates.js";
import { readDraft, writeDraft, clearDraft } from "../src/services/draftStorage.js";

// Creates a complete valid farm for frontend validation tests.
function exampleFarm() {
  return {
    ...createEmptyFarm(),
    setupCompleted: true,
    setupStep: 4,
    settings: {
      farmName: "Test Farm",
      farmType: "dairy",
      assignHerds: true,
      latitude: -43.5,
      longitude: 172.6,
      targetCover: 2900,
      residualKgDmHa: 1550,
      roundLength: 21,
      paddockToleranceHa: 0.3,
      schedule: {
        am: "05:00",
        pm: "13:30",
      },
    },
    herds: [
      {
        id: "herd-1",
        name: "Heifers",
        animals: 100,
        stockClass: "Heifers",
        colour: "green",
        targetKgDMDay: 16,
      },
    ],
    paddocks: [
      {
        id: "paddock-1",
        name: "Front",
        hectares: 10,
        herdId: "herd-1",
        excluded: false,
        exclusionReason: "",
        otherReason: "",
      },
      {
        id: "paddock-2",
        name: "Crop",
        hectares: 5,
        herdId: "",
        excluded: true,
        exclusionReason: "crop",
        otherReason: "",
      },
    ],
    crops: [
      {
        id: "crop-1",
        paddockId: "paddock-2",
        herdId: "herd-1",
        cropType: "Kale",
        otherCropType: "",
        yieldKgDMHa: 18000,
        kgDMPerAnimalDay: 5,
        startDate: "2026-10-05",
      },
    ],
    planner: {
      orders: {},
    },
  };
}

// Creates a simple in-memory replacement for browser localStorage.
function memoryStorage() {
  const values = new Map();

  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

// Checks that pasted spreadsheet paddocks are converted into farm paddocks.
test("paddock import reads names, hectares and herd assignments", () => {
  const herds = [
    { id: "herd-1", name: "Heifers" },
    { id: "herd-2", name: "Mixed age" },
  ];

  const result = parsePaddockText(
    "Paddock\tHectares\tHerd\nFront\t4.5\tHeifers\nRiver\t8\t2",
    herds,
  );

  assert.equal(result.error, "");
  assert.equal(result.rows.length, 2);
  assert.equal(result.rows[0].name, "Front");
  assert.equal(result.rows[0].hectares, 4.5);
  assert.equal(result.rows[0].herdId, "herd-1");
  assert.equal(result.rows[1].herdId, "herd-2");
});

// Checks that frontend validation accepts complete data and rejects incomplete crops.
test("farm validation requires complete crop information", () => {
  const farm = exampleFarm();

  assert.deepEqual(validateFarm(farm), []);

  farm.crops[0].yieldKgDMHa = "";
  farm.crops[0].kgDMPerAnimalDay = "";
  farm.crops[0].startDate = "";

  const errors = validateFarm(farm);

  assert.ok(errors.some((error) => error.includes("crop yield")));
  assert.ok(errors.some((error) => error.includes("feeding rate")));
  assert.ok(errors.some((error) => error.includes("feeding start date")));
});

// Checks that crop records follow paddocks marked or unmarked as crop.
test("crop records stay in sync with crop paddocks", () => {
  const farm = exampleFarm();

  farm.crops = [];

  const withCrop = syncCropRecords(farm);

  assert.equal(withCrop.crops.length, 1);
  assert.equal(withCrop.crops[0].paddockId, "paddock-2");

  withCrop.paddocks[1].excluded = false;
  withCrop.paddocks[1].exclusionReason = "";

  const withoutCrop = syncCropRecords(withCrop);

  assert.equal(withoutCrop.crops.length, 0);
});

// Checks that unfinished farm edits can be saved, read and removed from browser storage.
test("browser drafts can be saved, read and cleared", () => {
  const storage = memoryStorage();
  const farm = exampleFarm();

  const raw = writeDraft("user-1", farm, 2, null, storage);
  const saved = readDraft("user-1", storage);

  assert.equal(saved.raw, raw);
  assert.equal(saved.draft.userId, "user-1");
  assert.equal(saved.draft.baseVersion, 2);
  assert.equal(saved.draft.farm.settings.farmName, "Test Farm");

  clearDraft("user-1", raw, storage);

  assert.deepEqual(readDraft("user-1", storage), {
    draft: null,
    raw: null,
  });
});