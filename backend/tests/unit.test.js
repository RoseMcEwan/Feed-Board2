const test = require("node:test");
const assert = require("node:assert/strict");
const { exampleFarm } = require("./fixture");
const {
  calculateTotalHa24h,
  calculatePastureKgDM,
  calculateFeedDifference,
} = require("../calculations/calculateFeedMetrics");
const { calculateCropMetrics, cropIntakeForHerd } = require("../calculations/CropMetric");
const calculatePaddockPlan = require("../calculations/calculatePaddockPlan");
const { calculateFarm } = require("../calculations/calculateFarm");
const { planningGroups } = require("../calculations/farmSelectors");
const { validateFarm } = require("../middleware/farmValidation");

// Checks hectares offered per 24 hours from farm area and round length.
test("calculateTotalHa24h calculates daily grazing area", () => {
  assert.equal(calculateTotalHa24h(20, 20), 1);
});

// Checks pasture intake per animal from area, cover and residual.
test("calculatePastureKgDM calculates pasture intake per animal", () => {
  const result = calculatePastureKgDM({
    totalHa24h: 1,
    targetCover: 2900,
    residualKgDmHa: 1550,
    animals: 200,
  });

  assert.equal(result, 6.75);
});

// Checks whether offered feed is above or below the herd target.
test("calculateFeedDifference calculates feed surplus or shortfall", () => {
  assert.equal(calculateFeedDifference(18, 11.75), -6.25);
});

// Checks crop duration and today's crop intake for one crop.
test("calculateCropMetrics calculates crop feeding metrics", () => {
  const farm = exampleFarm();

  const result = calculateCropMetrics({
    crop: farm.crops[0],
    paddock: farm.paddocks[2],
    herd: farm.herds[1],
    today: "2026-10-05",
  });

  assert.equal(result.valid, true);
  assert.equal(result.status, "feeding");
  assert.equal(result.daysRemaining, 90);
  assert.equal(result.todayKgDMPerAnimal, 5);
  assert.equal(result.finishDate, "2027-01-03");
});

// Checks the total crop intake supplied to a herd.
test("cropIntakeForHerd totals crop intake for a herd", () => {
  const farm = exampleFarm();

  assert.equal(cropIntakeForHerd(farm, "h2", "2026-10-05"), 5);
});

// Checks that a paddock queue is divided into AM and PM grazing breaks.
test("calculatePaddockPlan creates AM and PM allocations", () => {
  const farm = exampleFarm();
  const group = planningGroups(farm).find((item) => item.id === "h1");

  const plan = calculatePaddockPlan({
    farm,
    group,
    order: farm.planner.orders.h1,
    fromDate: "2026-10-05",
    endDate: "2026-10-05",
  });

  assert.equal(plan["2026-10-05"].length, 2);
  assert.equal(plan["2026-10-05"][0].label, "AM");
  assert.equal(plan["2026-10-05"][0].allocatedHa, 0.25);
  assert.equal(plan["2026-10-05"][1].label, "PM");
  assert.equal(plan["2026-10-05"][1].allocatedHa, 0.25);
});

// Checks the complete calculation result returned to the frontend.
test("calculateFarm combines the FeedBoard calculations", () => {
  const result = calculateFarm({
    farm: exampleFarm(),
    today: "2026-10-05",
    selectedDate: "2026-10-05",
  });

  assert.equal(result.summary.totalHa, 37);
  assert.equal(result.summary.grazingHa, 30);
  assert.equal(result.herdMetrics.h2.pasture, 6.75);
  assert.equal(result.herdMetrics.h2.crop, 5);
  assert.equal(result.herdMetrics.h2.offered, 11.75);
  assert.equal(Object.keys(result.plans.h2).length, 7);
});

// Checks that a complete farm passes validation and incomplete crop details fail.
test("validateFarm rejects incomplete crop information", () => {
  const farm = exampleFarm();

  assert.deepEqual(validateFarm(farm), []);

  farm.crops[0].herdId = "";
  farm.crops[0].yieldKgDMHa = "";
  farm.crops[0].kgDMPerAnimalDay = "";
  farm.crops[0].startDate = "";

  assert.ok(validateFarm(farm).length > 0);
});
