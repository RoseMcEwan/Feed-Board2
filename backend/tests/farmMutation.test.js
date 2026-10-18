const test = require("node:test");
const assert = require("node:assert/strict");
const { applyFarmMutation } = require("../services/farmMutation");
const { exampleFarm } = require("./fixture");
const run = (farm, resource, action, id, body = {}) => applyFarmMutation(farm, { resource, action, id, body });

test("ordinary partial herd and farm updates affect only their resource", () => {
  const farm = exampleFarm();
  const next = run(farm, "herds", "update", "h1", { herd: { animals: 125 } });
  assert.equal(next.herds[0].animals, 125);
  assert.deepEqual(next.paddocks, farm.paddocks);
  assert.equal(farm.herds[0].animals, 100);
  assert.equal(run(farm, "farm", "update", undefined, { settings: { farmName: "Renamed" } }).settings.farmName, "Renamed");
  assert.throws(() => run(farm, "farm", "update", undefined, { settings: {}, herds: [] }), /Invalid farm request/);
});

test("paddock and complete crop transition succeeds together; invalid linked crop rejects both", () => {
  const farm = exampleFarm();
  const crop = { ...farm.crops[0], id: "c2", paddockId: "p1", herdId: "h1" };
  const next = run(farm, "paddocks", "update", "p1", { paddock: { excluded: true, exclusionReason: "crop" }, crop });
  assert.equal(next.crops.length, 2);
  assert.equal(next.planner.orders.h1, undefined);
  assert.throws(() => run(farm, "paddocks", "update", "p1", { paddock: { excluded: true, exclusionReason: "crop" }, crop: { ...crop, yieldKgDMHa: "" } }), { code: "VALIDATION_ERROR" });
  assert.equal(farm.paddocks[0].excluded, false);
  assert.equal(farm.crops.length, 1);
});

test("paddock create/delete atomically includes linked crop and queue cleanup", () => {
  const farm = exampleFarm();
  const next = run(farm, "paddocks", "create", undefined, { paddock: { ...farm.paddocks[2], id: "p5", name: "New crop" }, crop: { ...farm.crops[0], id: "c5", paddockId: "p5" } });
  assert.equal(next.paddocks.length, 5);
  assert.equal(next.crops.length, 2);
  const removed = run(next, "paddocks", "delete", "p5");
  assert.deepEqual(removed, farm);
  assert.equal(run(farm, "paddocks", "delete", "p1").planner.orders.h1, undefined);
});

test("crop create/update/delete use crop endpoints with a scoped paddock companion", () => {
  const farm = exampleFarm();
  const created = run(farm, "crops", "create", undefined, { crop: { ...farm.crops[0], id: "c2", paddockId: "p1" }, paddock: { excluded: true, exclusionReason: "crop" } });
  const updated = run(created, "crops", "update", "c2", { crop: { yieldKgDMHa: 20000 } });
  assert.equal(updated.crops.find((c) => c.id === "c2").yieldKgDMHa, 20000);
  const removed = run(updated, "crops", "delete", "c2", { paddock: { excluded: false, exclusionReason: "" } });
  assert.equal(removed.crops.length, 1);
  assert.throws(() => run(farm, "crops", "delete", "c1"), { code: "VALIDATION_ERROR" });
});

test("herd deletion reassigns only that herd's dependants in the same operation", () => {
  const farm = exampleFarm();
  const next = run(farm, "herds", "delete", "h2", { reassignments: { paddocks: [{ id: "p2", herdId: "h1" }], crops: [{ id: "c1", herdId: "h1" }] } });
  assert.equal(next.herds.length, 1);
  assert.equal(next.crops[0].herdId, "h1");
  assert.equal(next.paddocks[1].herdId, "h1");
  assert.equal(next.planner.orders.h2, undefined);
  assert.throws(() => run(farm, "herds", "delete", "h2", { reassignments: { paddocks: [{ id: "p1", herdId: "h1" }] } }), /Only this herd/);
});

test("queue replacement can atomically move paddocks between overlapping queues", () => {
  const farm = exampleFarm(); farm.settings.assignHerds = false;
  const next = run(farm, "queues", "replace", "h1", { queue: { startDate: "2026-10-05", paddockIds: ["p2"] }, relatedQueues: { h2: { startDate: "2026-10-05", paddockIds: ["p1"] } } });
  assert.deepEqual(next.planner.orders.h1.paddockIds, ["p2"]);
  assert.deepEqual(next.planner.orders.h2.paddockIds, ["p1"]);
  assert.equal(run(next, "queues", "delete", "h1").planner.orders.h1, undefined);
});

test("assignment-mode changes can include only linked paddock assignments", () => {
  const farm = exampleFarm(); farm.settings.assignHerds = false; farm.paddocks[0].herdId = "";
  const next = run(farm, "farm", "update", undefined, { settings: { assignHerds: true }, assignments: [{ id: "p1", herdId: "h1" }] });
  assert.equal(next.paddocks[0].herdId, "h1");
  assert.throws(() => run(farm, "farm", "update", undefined, { settings: { farmName: "Name" }, assignments: [] }), /only an assignment-mode change/);
});

test("record ownership, immutable IDs and strict request fields are enforced", () => {
  const farm = exampleFarm();
  assert.throws(() => run(farm, "herds", "update", "foreign", { herd: { animals: 5 } }), { status: 404 });
  assert.throws(() => run(farm, "herds", "update", "h1", { herd: { id: "new" } }), /Invalid herd/);
  assert.throws(() => run(farm, "paddocks", "update", "p1", { paddock: {}, crop: farm.crops[0] }), /must belong/);
  assert.equal(run(farm, "farm", "delete"), null);
});
