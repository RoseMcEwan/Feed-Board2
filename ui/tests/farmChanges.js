import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { nextFarmOperation, saveFarmChanges, accountFarm } from "../src/services/farmChanges.js";
const require = createRequire(import.meta.url);
const { exampleFarm } = require("../../backend/tests/fixture.js");
const { applyFarmMutation } = require("../../backend/services/farmMutation.js");
const { normaliseFarm } = require("../../backend/models/farmModel.js");

function writer(calls, failAt = 0) {
  return async (_userId, operation, saved) => {
    calls.push({ ...operation, version: saved.version });
    if (failAt && calls.length === failAt) throw new Error("Network failure");
    const parts = operation.path.split("/");
    const resource = parts[3] || "farm";
    const action = { POST: "create", PATCH: "update", DELETE: "delete", PUT: "replace" }[operation.method];
    const farm = applyFarmMutation(saved.farm, { resource, action, id: parts[4], body: operation.body });
    return { farm: normaliseFarm(farm), version: saved.version + 1, farmId: saved.farmId };
  };
}
const state = () => ({ farm: exampleFarm(), farmId: 5, version: 1 });

test("ordinary herd edit uses PATCH herd and no whole-farm request", async () => {
  const saved = state(),
    draft = structuredClone(saved.farm),
    calls = [];
  draft.herds[0].animals = "123";
  const result = await saveFarmChanges(7, saved, draft, { write: writer(calls) });
  assert.equal(result.complete, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, "/api/farm/herds/h1");
  assert.deepEqual(calls[0].body, { herd: { animals: "123" } });
});

test("valid edit saves while an unrelated incomplete new paddock remains local", async () => {
  const saved = state(),
    draft = structuredClone(saved.farm),
    calls = [];
  draft.herds[0].animals = 123;
  draft.paddocks.push({
    id: "new",
    name: "",
    hectares: "",
    herdId: "",
    excluded: false,
    exclusionReason: "",
    otherReason: "",
  });
  const result = await saveFarmChanges(7, saved, draft, { write: writer(calls) });
  assert.equal(result.complete, false);
  assert.equal(result.farm.herds[0].animals, 123);
  assert.equal(result.farm.paddocks.length, saved.farm.paddocks.length);
  assert.equal(calls.length, 1);
  assert.equal(draft.paddocks.length, 5);
});

test("linked crop transition is exactly one paddock PATCH", async () => {
  const saved = state(),
    draft = structuredClone(saved.farm),
    calls = [];
  draft.paddocks[0].excluded = true;
  draft.paddocks[0].exclusionReason = "crop";
  draft.crops.push({ ...draft.crops[0], id: "c2", paddockId: "p1" });
  const result = await saveFarmChanges(7, saved, draft, { write: writer(calls) });
  assert.equal(result.complete, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, "/api/farm/paddocks/p1");
  assert.equal(calls[0].body.crop.id, "c2");
  assert.equal(result.farm.planner.orders.h1, undefined);
});

test("herd removal groups reassignments; crop-only edits use the crop endpoint", async () => {
  const saved = state(),
    draft = structuredClone(saved.farm),
    calls = [];
  draft.herds.pop();
  draft.paddocks[1].herdId = "h1";
  draft.crops[0].herdId = "h1";
  delete draft.planner.orders.h2;
  const result = await saveFarmChanges(7, saved, draft, { write: writer(calls) });
  assert.equal(result.complete, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, "/api/farm/herds/h2");
  assert.equal(calls[0].body.reassignments.crops[0].herdId, "h1");
  const cropDraft = structuredClone(result.farm);
  cropDraft.crops[0].yieldKgDMHa = 19000;
  assert.equal(nextFarmOperation(result.farm, cropDraft).path, "/api/farm/crops/c1");
});

test("failed second operation preserves acknowledged version and retry skips the first", async () => {
  const saved = state(),
    draft = structuredClone(saved.farm),
    calls = [];
  draft.herds[0].animals = 125;
  draft.herds[1].animals = 250;
  let checkpoint = saved;
  await assert.rejects(
    saveFarmChanges(7, saved, draft, {
      write: writer(calls, 2),
      onSaved: (value) => {
        checkpoint = value;
      },
    }),
    /Network failure/,
  );
  assert.equal(checkpoint.version, 2);
  const retryCalls = [];
  const result = await saveFarmChanges(7, checkpoint, draft, { write: writer(retryCalls) });
  assert.equal(result.complete, true);
  assert.equal(retryCalls.length, 1);
  assert.equal(retryCalls[0].path, "/api/farm/herds/h2");
  assert.equal(retryCalls[0].version, 2);
});

test("new edits stop a batch after the current response; setup remains one POST", async () => {
  const saved = state(),
    draft = structuredClone(saved.farm),
    calls = [];
  draft.herds[0].animals = 125;
  draft.herds[1].animals = 250;
  let proceed = true;
  const result = await saveFarmChanges(7, saved, draft, {
    write: writer(calls),
    shouldContinue: () => proceed,
    onSaved: () => {
      proceed = false;
    },
  });
  assert.equal(calls.length, 1);
  assert.equal(result.complete, false);
  let created = 0;
  const setup = await saveFarmChanges(7, { farm: null, version: 0, farmId: null }, saved.farm, {
    create: async (_id, farm) => {
      created++;
      return { farm, version: 1, farmId: 8 };
    },
  });
  assert.equal(created, 1);
  assert.equal(setup.complete, true);
});

test("queues use PUT and DELETE; local import fields do not enter requests", async () => {
  const saved = state(),
    draft = structuredClone(saved.farm),
    calls = [];
  draft.planner.orders.h1.startDate = "2026-10-06";
  delete draft.planner.orders.h2;
  draft.importText = "unsaved preview";
  const result = await saveFarmChanges(7, saved, draft, { write: writer(calls) });
  assert.equal(result.complete, true);
  assert.deepEqual(
    calls.map((c) => c.method),
    ["DELETE", "PUT"],
  );
  assert.equal("importText" in accountFarm(draft), false);
});

test("incomplete linked crop keeps both paddock and queue changes local", async () => {
  const saved = state(),
    draft = structuredClone(saved.farm),
    calls = [];
  draft.paddocks[0].excluded = true;
  draft.paddocks[0].exclusionReason = "crop";
  draft.crops.push({ ...draft.crops[0], id: "c2", paddockId: "p1", yieldKgDMHa: "" });
  draft.herds[1].animals = 210;
  const result = await saveFarmChanges(7, saved, draft, { write: writer(calls) });
  assert.equal(result.complete, false);
  assert.deepEqual(
    calls.map((c) => c.path),
    ["/api/farm/herds/h2"],
  );
  assert.equal(result.farm.paddocks[0].excluded, false);
  assert.deepEqual(result.farm.planner.orders.h1, saved.farm.planner.orders.h1);
});
