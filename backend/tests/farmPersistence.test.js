const test = require("node:test");
const assert = require("node:assert/strict");
const { DatabaseSync } = require("node:sqlite");
const { db } = require("../config/db");
const { createFarm, getFarm, mutateFarm } = require("../models/farmModel");
const { exampleFarm } = require("./fixture");

// Execute production model SQL under real uniqueness/FK constraints. 
async function setup(t) {
  const sql = new DatabaseSync(":memory:");
  sql.exec(`
    PRAGMA foreign_keys=ON;
    CREATE TABLE users (user_id INTEGER PRIMARY KEY);
    INSERT INTO users VALUES (1), (2);
    CREATE TABLE farms (farm_id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER UNIQUE REFERENCES users(user_id),
      farm_name TEXT, farm_type TEXT, round_length REAL, latitude REAL, longitude REAL, target_cover REAL,
      target_residual REAL, am_time TEXT, pm_time TEXT, paddock_tolerance_ha REAL, use_herd_assignment INTEGER,
      setup_completed INTEGER, setup_step INTEGER, version INTEGER);
    CREATE TABLE herds (herd_id TEXT PRIMARY KEY, farm_id INTEGER REFERENCES farms(farm_id) ON DELETE CASCADE,
      herd_name TEXT, stock_class TEXT, animals INTEGER, target_intake REAL, herd_colour TEXT, display_order INTEGER,
      UNIQUE(farm_id,display_order));
    CREATE TABLE paddocks (paddock_id TEXT PRIMARY KEY, farm_id INTEGER REFERENCES farms(farm_id) ON DELETE CASCADE,
      assigned_herd_id TEXT REFERENCES herds(herd_id) ON DELETE SET NULL, paddock_name TEXT, hectares REAL,
      excluded INTEGER, exclusion_reason TEXT, other_exclusion_reason TEXT, display_order INTEGER,
      UNIQUE(farm_id,display_order));
    CREATE TABLE crops (crop_id TEXT PRIMARY KEY, paddock_id TEXT UNIQUE REFERENCES paddocks(paddock_id) ON DELETE CASCADE,
      herd_id TEXT REFERENCES herds(herd_id) ON DELETE RESTRICT, crop_type TEXT, other_crop_type TEXT,
      yield_kgdm_ha REAL, intake_kgdm_animal_day REAL, start_date TEXT);
    CREATE TABLE queues (queue_id INTEGER PRIMARY KEY AUTOINCREMENT, herd_id TEXT UNIQUE REFERENCES herds(herd_id) ON DELETE CASCADE, start_date TEXT);
    CREATE TABLE queue_items (queue_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
      queue_id INTEGER REFERENCES queues(queue_id) ON DELETE CASCADE, paddock_id TEXT REFERENCES paddocks(paddock_id) ON DELETE CASCADE,
      position INTEGER CHECK(position>=1), UNIQUE(queue_id,position), UNIQUE(queue_id,paddock_id));
  `);
  const calls = [];
  const connection = {
    async beginTransaction() { calls.push("BEGIN"); sql.exec("BEGIN"); },
    async commit() { calls.push("COMMIT"); sql.exec("COMMIT"); },
    async rollback() { calls.push("ROLLBACK"); sql.exec("ROLLBACK"); },
    release() { calls.push("RELEASE"); },
    async query(query) { if (!query.startsWith("SET TRANSACTION")) throw new Error("Unexpected query"); },
    async execute(query, values = []) {
      calls.push(query);
      query = query.replace(/ FOR UPDATE/g, "");
      if (query.startsWith("DELETE c FROM crops")) query = "DELETE FROM crops WHERE paddock_id IN (SELECT paddock_id FROM paddocks WHERE farm_id=?)";
      const statement = sql.prepare(query);
      const params = values.map((value) => typeof value === "boolean" ? Number(value) : value);
      if (query.startsWith("SELECT")) return [statement.all(...params)];
      const result = statement.run(...params);
      return [{ insertId: Number(result.lastInsertRowid), affectedRows: Number(result.changes) }];
    },
  };
  const original = db.getConnection;
  db.getConnection = async () => connection;
  t.after(() => { db.getConnection = original; sql.close(); });
  let saved = await createFarm(1, exampleFarm(), 0);
  const mutate = async (resource, action, id, body = {}) => {
    saved = await mutateFarm(1, { resource, action, id, body: { expectedVersion: saved.version, expectedFarmId: saved.farmId, ...body } });
    return saved;
  };
  const rows = (table) => sql.prepare(`SELECT * FROM ${table} ORDER BY 1`).all().map((row) => ({ ...row }));
  calls.length = 0;
  return { sql, calls, mutate, rows, initial: saved };
}

test("initial creation and aggregate read match; creation never overwrites a farm", async (t) => {
  const { initial } = await setup(t);
  assert.deepEqual(await getFarm(1), initial);
  await assert.rejects(createFarm(1, exampleFarm(), 1), { code: "FARM_EXISTS" });
  assert.deepEqual(await getFarm(1), initial);
});

test("entity update writes only its changed row and preserves queue identities", async (t) => {
  const { mutate, rows, calls } = await setup(t);
  const queues = rows("queues"), items = rows("queue_items");
  await mutate("herds", "update", "h1", { herd: { animals: 125 } });
  assert.deepEqual(rows("queues"), queues);
  assert.deepEqual(rows("queue_items"), items);
  assert.equal(calls.filter((q) => q.startsWith("UPDATE herds")).length, 1);
  assert.equal(calls.some((q) => /^(DELETE|INSERT)/.test(q)), false);
});

test("linked crop insertion failure rolls back paddock, version and queue changes", async (t) => {
  const { initial, mutate, rows, calls } = await setup(t);
  await createFarm(2, exampleFarm("foreign-"), 0);
  const queues = rows("queues"), items = rows("queue_items");
  await assert.rejects(mutate("paddocks", "update", "p1", {
    paddock: { excluded: true, exclusionReason: "crop" },
    crop: { ...initial.farm.crops[0], id: "foreign-c1", paddockId: "p1" },
  }), /UNIQUE/);
  assert.ok(calls.includes("ROLLBACK"));
  assert.deepEqual(await getFarm(1), initial);
  assert.deepEqual(rows("queues"), queues);
  assert.deepEqual(rows("queue_items"), items);
  assert.equal((await getFarm(2)).farm.crops[0].paddockId, "foreign-p3");
});

test("invalid linked crop rejects before database writes", async (t) => {
  const { initial, mutate, calls } = await setup(t);
  await assert.rejects(mutate("paddocks", "update", "p1", {
    paddock: { excluded: true, exclusionReason: "crop" },
    crop: { ...initial.farm.crops[0], id: "c2", paddockId: "p1", yieldKgDMHa: "" },
  }), { code: "VALIDATION_ERROR" });
  assert.equal(calls.some((q) => /^(UPDATE|DELETE|INSERT)/.test(q)), false);
  assert.deepEqual(await getFarm(1), initial);
});

test("herd deletion reassigns dependants before FK-restricted removal", async (t) => {
  const { mutate } = await setup(t);
  const saved = await mutate("herds", "delete", "h2", { reassignments: { paddocks: [{ id: "p2", herdId: "h1" }], crops: [{ id: "c1", herdId: "h1" }] } });
  assert.equal(saved.farm.herds.length, 1);
  assert.equal((await getFarm(1)).farm.crops[0].herdId, "h1");
});

test("ordered updates keep constraints enabled; unchanged PATCH leaves the version alone", async (t) => {
  const { mutate, rows } = await setup(t);
  await mutate("paddocks", "update", "p4", { paddock: {}, position: 0 });
  assert.equal(rows("paddocks").find((p) => p.paddock_id === "p4").display_order, 0);
  const before = await getFarm(1);
  const same = await mutate("herds", "update", "h1", { herd: { animals: 100 } });
  assert.equal(same.version, before.version);
});

test("farm delete/recreate and stale versions reject old tab writes", async (t) => {
  const { initial, mutate } = await setup(t);
  await mutate("farm", "delete");
  assert.deepEqual(await getFarm(1), { farm: null, version: 0, farmId: null });
  const replacement = await createFarm(1, exampleFarm(), 0);
  await assert.rejects(mutateFarm(1, { resource: "herds", action: "update", id: "h1", body: { herd: { animals: 333 }, expectedVersion: replacement.version, expectedFarmId: initial.farmId } }), { code: "VERSION_CONFLICT" });
  await assert.rejects(mutateFarm(1, { resource: "herds", action: "update", id: "h1", body: { herd: { animals: 333 }, expectedVersion: replacement.version + 1, expectedFarmId: replacement.farmId } }), { code: "VERSION_CONFLICT" });
  assert.deepEqual(await getFarm(1), replacement);
});
