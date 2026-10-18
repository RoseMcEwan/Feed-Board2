import test from "node:test";
import assert from "node:assert/strict";
import { createFarm, writeFarmResource, deleteFarm } from "../src/services/api.js";
import { readDraft, writeDraft } from "../src/services/draftStorage.js";
import { createEmptyFarm } from "../src/data/farmDefaults.js";

test("resource requests carry CSRF and acknowledged identity/version; setup uses POST", async (t) => {
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  const calls = [];
  globalThis.fetch = async (path, options) => {
    calls.push({ path, ...options });
    return new Response(
      JSON.stringify(
        path.endsWith("/session")
          ? { user: { id: 7 }, csrfToken: "test-csrf" }
          : { farm: null, farmId: null, version: 0 },
      ),
      { headers: { "content-type": "application/json" } },
    );
  };
  await createFarm(7, { settings: {} });
  await writeFarmResource(
    7,
    { method: "PATCH", path: "/api/farm/herds/h1", body: { herd: { animals: 123 } } },
    { farmId: 4, version: 8 },
  );
  await deleteFarm(7, { farmId: 4, version: 9 });
  const writes = calls.filter((c) => c.method !== "GET");
  assert.deepEqual(
    writes.map((c) => c.method),
    ["POST", "PATCH", "DELETE"],
  );
  assert.equal(writes[1].headers["X-CSRF-Token"], "test-csrf");
  assert.equal(writes[1].headers["X-FeedBoard-User"], "7");
  assert.deepEqual(JSON.parse(writes[1].body), { herd: { animals: 123 }, expectedVersion: 8, expectedFarmId: 4 });
  assert.deepEqual(JSON.parse(writes[2].body), { expectedVersion: 9, expectedFarmId: 4 });
});

test("draft checkpoints retain the farm incarnation alongside its version", () => {
  const values = new Map();
  const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const farm = createEmptyFarm();
  const raw = writeDraft(7, farm, 8, null, storage, 4);
  assert.equal(readDraft(7, storage).draft.baseFarmId, 4);
  writeDraft(7, farm, 9, raw, storage, 4);
  assert.equal(readDraft(7, storage).draft.baseVersion, 9);
});
