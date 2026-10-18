const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { exampleFarm } = require("./fixture");

// Keeps the test browser's cookie, CSRF token and signed-in user together.
function browser(base, origin) {
  let cookie = "";
  let token = "";
  let userId;

  return {
    async request(method, route, body) {
      const headers = {
        Origin: origin,
        ...(cookie ? { Cookie: cookie } : {}),
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(method !== "GET" ? { "X-CSRF-Token": token } : {}),
        ...(userId ? { "X-FeedBoard-User": String(userId) } : {}),
      };
      const response = await fetch(base + route, {
        method,
        headers,
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
      for (const value of response.headers.getSetCookie()) {
        cookie = value.split(";")[0];
      }
      const data = response.status === 204 ? null : await response.json();

      if (data?.csrfToken) token = data.csrfToken;
      if (data?.user) userId = data.user.id;

      return { status: response.status, data };
    },
  };
}

// Tests each main FeedBoard API feature using real HTTP and the test MySQL database.
test("FeedBoard API features", { timeout: 90000 }, async (t) => {
  assert.match(process.env.DB_NAME || "", /_test$/, "DB_NAME must be a test database ending in _test.");

  assert.equal(process.env.NODE_ENV, "test", "NODE_ENV must be test.");

  const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
  const { db } = require("../config/db");
  const schema = await fs.readFile(path.join(__dirname, "../sql/001_initial.sql"), "utf8");
  const tables = schema.split("-- TABLES")[1].replace(/^\s*--.*$/gm, "");

  for (const statement of tables
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)) {
    await db.query(statement);
  }

  let weatherCalls = 0;
  const originalFetch = global.fetch;

  // Replaces only the external weather provider while keeping local API requests real.
  global.fetch = async (url, options) => {
    if (String(url).startsWith("https://api.met.no/")) {
      weatherCalls += 1;

      return new Response(
        JSON.stringify({
          properties: {
            timeseries: [],
          },
        }),
        {
          headers: {
            "Content-Type": "application/json",
            Expires: new Date(Date.now() + 600000).toUTCString(),
          },
        },
      );
    }

    return originalFetch(url, options);
  };

  const { app } = require("../server");
  const { sessionStore } = require("../config/session");

  await sessionStore.onReady();

  const server = await new Promise((resolve, reject) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
    listening.once("error", reject);
  });

  const base = `http://127.0.0.1:${server.address().port}`;
  const user = browser(base, clientOrigin);
  const suffix = randomUUID();
  const email = `feedboard-${suffix}@example.test`;
  const password = "FeedBoard123!";
  const farm = exampleFarm(`t-${suffix}-`);
  let userId;
  let version;
  let farmId;
  let otherUserId;

  // Cleans up the account and connections created by the API test.
  t.after(async () => {
    global.fetch = originalFetch;

    await new Promise((resolve) => server.close(resolve));

    for (const accountId of [userId, otherUserId].filter(Boolean)) {
      await db.execute(
        `DELETE c FROM crops c
        JOIN paddocks p ON p.paddock_id = c.paddock_id
        JOIN farms f ON f.farm_id = p.farm_id
        WHERE f.user_id = ?`,
        [accountId],
      );

      await db.execute("DELETE FROM users WHERE user_id = ?", [accountId]);
    }

    await sessionStore.close();
    await db.end();
  });

  // Checks the API and initial anonymous session.
  await t.test("health and session endpoints respond", async () => {
    const health = await user.request("GET", "/api/health");
    assert.equal(health.status, 200);
    const session = await user.request("GET", "/api/auth/session");
    assert.equal(session.status, 200);
    assert.equal(session.data.user, null);
  });

  // Checks account registration and automatic sign-in.
  await t.test("register creates and signs in an account", async () => {
    const response = await user.request("POST", "/api/auth/register", {
      name: "FeedBoard Test",
      email,
      password,
    });

    assert.equal(response.status, 201);
    assert.equal(response.data.user.email, email);

    userId = response.data.user.id;
  });

  // Checks that a complete farm can be saved and loaded again.
  await t.test("farm save and load preserve the farm", async () => {
    const save = await user.request("POST", "/api/farm", {
      farm,
      expectedVersion: 0,
    });

    assert.equal(save.status, 201);
    assert.equal(save.data.version, 1);
    version = save.data.version;
    farmId = save.data.farmId;
    const read = await user.request("GET", "/api/farm");
    assert.equal(read.status, 200);
    assert.equal(read.data.farm.settings.farmName, farm.settings.farmName);
    assert.equal(read.data.farm.herds.length, farm.herds.length);
    assert.equal(read.data.farm.paddocks.length, farm.paddocks.length);
    assert.equal(read.data.farm.crops.length, farm.crops.length);
    const conflict = await user.request("PATCH", "/api/farm", {
      settings: { farmName: "Stale" },
      expectedFarmId: farmId,
      expectedVersion: 0,
    });

    assert.equal(conflict.status, 400);
  });

  // Checks that the calculation API returns the expected farm preview.
  await t.test("farm calculation preview returns calculated values", async () => {
    const response = await user.request("POST", "/api/farm/calculate", {
      farm,
      today: "2026-10-05",
      selectedDate: "2026-10-05",
    });
    assert.equal(response.status, 200);
    assert.equal(response.data.summary.grazingHa, 30);
    assert.equal(response.data.herdMetrics[farm.herds[1].id].offered, 11.75);
  });

  // Checks that incomplete crop information cannot be saved.
  await t.test("farm save rejects incomplete crop details", async () => {
    const invalid = structuredClone(farm);

    invalid.crops[0].herdId = "";
    invalid.crops[0].yieldKgDMHa = "";
    invalid.crops[0].kgDMPerAnimalDay = "";
    invalid.crops[0].startDate = "";

    const response = await user.request("PATCH", `/api/farm/crops/${invalid.crops[0].id}`, {
      crop: { herdId: "", yieldKgDMHa: "", kgDMPerAnimalDay: "", startDate: "" },
      expectedVersion: version,
      expectedFarmId: farmId,
    });

    assert.equal(response.status, 422);
    const saved = await user.request("GET", "/api/farm");
    assert.equal(saved.data.version, version);
  });

  await t.test("entity CRUD uses its own routes and preserves unchanged queue IDs", async () => {
    const mutation = async (method, route, body = {}) => {
      const response = await user.request(method, route, { ...body, expectedVersion: version, expectedFarmId: farmId });
      assert.ok([200, 201].includes(response.status), JSON.stringify(response.data));
      version = response.data.version;
      return response.data;
    };
    const [queues] = await db.execute(
      "SELECT q.queue_id FROM queues q JOIN herds h ON h.herd_id=q.herd_id JOIN farms f ON f.farm_id=h.farm_id WHERE f.user_id=? ORDER BY q.queue_id",
      [userId],
    );
    await mutation("PATCH", `/api/farm/herds/${farm.herds[0].id}`, { herd: { animals: 101 } });
    const [after] = await db.execute(
      "SELECT q.queue_id FROM queues q JOIN herds h ON h.herd_id=q.herd_id JOIN farms f ON f.farm_id=h.farm_id WHERE f.user_id=? ORDER BY q.queue_id",
      [userId],
    );
    assert.deepEqual(after, queues);
    await mutation("PATCH", `/api/farm/herds/${farm.herds[0].id}`, { herd: { animals: 100 } });
    await mutation("PATCH", "/api/farm", { settings: { farmName: "Renamed" } });
    await mutation("PATCH", "/api/farm", { settings: { farmName: farm.settings.farmName } });
    const herd = { ...farm.herds[0], id: `new-h-${suffix}`, name: "New herd" };
    const paddock = { ...farm.paddocks[0], id: `new-p-${suffix}`, name: "New paddock", herdId: herd.id };
    const crop = { ...farm.crops[0], id: `new-c-${suffix}`, paddockId: paddock.id, herdId: herd.id };
    await mutation("POST", "/api/farm/herds", { herd });
    await mutation("POST", "/api/farm/paddocks", { paddock });
    await mutation("PUT", `/api/farm/queues/${herd.id}`, {
      queue: { startDate: "2026-10-05", paddockIds: [paddock.id] },
    });
    await mutation("DELETE", `/api/farm/queues/${herd.id}`);
    // Paddock plus crop is one request and transaction.
    await mutation("PATCH", `/api/farm/paddocks/${paddock.id}`, {
      paddock: { excluded: true, exclusionReason: "crop" },
      crop,
    });
    await mutation("PATCH", `/api/farm/crops/${crop.id}`, { crop: { yieldKgDMHa: 19000 } });
    await mutation("DELETE", `/api/farm/crops/${crop.id}`, { paddock: { excluded: false, exclusionReason: "" } });
    await mutation("POST", "/api/farm/crops", { crop, paddock: { excluded: true, exclusionReason: "crop" } });
    await mutation("DELETE", `/api/farm/paddocks/${paddock.id}`);
    await mutation("DELETE", `/api/farm/herds/${herd.id}`);
    assert.deepEqual((await user.request("GET", "/api/farm")).data.farm, farm);
    assert.equal((await user.request("PUT", "/api/farm", { farm, expectedVersion: version })).status, 404);
    const stale = await user.request("PATCH", "/api/farm", {
      settings: { farmName: "Stale" },
      expectedVersion: version - 1,
      expectedFarmId: farmId,
    });
    assert.equal(stale.status, 409);
  });

  await t.test("invalid linked write leaves both paddock and crop unchanged", async () => {
    const response = await user.request("PATCH", `/api/farm/paddocks/${farm.paddocks[0].id}`, {
      expectedVersion: version,
      expectedFarmId: farmId,
      paddock: { excluded: true, exclusionReason: "crop" },
      crop: { ...farm.crops[0], id: `bad-c-${suffix}`, paddockId: farm.paddocks[0].id, yieldKgDMHa: "" },
    });
    assert.equal(response.status, 422);
    const read = await user.request("GET", "/api/farm");
    assert.equal(read.data.version, version);
    assert.deepEqual(read.data.farm, farm);
  });

  await t.test("foreign crop ID collision rolls back the whole linked transaction", async () => {
    const other = browser(base, clientOrigin);
    await other.request("GET", "/api/auth/session");
    const registered = await other.request("POST", "/api/auth/register", {
      name: "Other account",
      email: `other-${suffix}@example.test`,
      password,
    });
    assert.equal(registered.status, 201);
    otherUserId = registered.data.user.id;
    const otherFarm = exampleFarm(`o-${suffix}-`);
    assert.equal((await other.request("POST", "/api/farm", { farm: otherFarm, expectedVersion: 0 })).status, 201);
    const response = await user.request("PATCH", `/api/farm/paddocks/${farm.paddocks[0].id}`, {
      expectedVersion: version,
      expectedFarmId: farmId,
      paddock: { excluded: true, exclusionReason: "crop" },
      crop: { ...farm.crops[0], id: otherFarm.crops[0].id, paddockId: farm.paddocks[0].id },
    });
    assert.equal(response.status, 409);
    assert.equal(response.data.code, "DUPLICATE_RECORD");
    const read = await user.request("GET", "/api/farm");
    assert.equal(read.data.version, version);
    assert.deepEqual(read.data.farm, farm);
    assert.deepEqual((await other.request("GET", "/api/farm")).data.farm, otherFarm);
  });

  // Checks that weather is returned and repeated requests use the cache.
  await t.test("weather returns and caches a forecast", async () => {
    const first = await user.request("GET", "/api/weather?lat=-43.5&lon=172.6");
    const second = await user.request("GET", "/api/weather?lat=-43.5&lon=172.6");
    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.equal(weatherCalls, 1);
  });

  // Checks that logout removes authenticated farm access.
  await t.test("logout removes access to the farm", async () => {
    const logout = await user.request("POST", "/api/auth/logout", {});
    assert.equal(logout.status, 204);
    const farmResponse = await user.request("GET", "/api/farm");
    assert.equal(farmResponse.status, 401);
  });

  // Checks that login restores access to the previously saved farm.
  await t.test("login restores access to the saved farm", async () => {
    await user.request("GET", "/api/auth/session");
    const login = await user.request("POST", "/api/auth/login", {
      email,
      password,
    });

    assert.equal(login.status, 200);
    const read = await user.request("GET", "/api/farm");
    assert.equal(read.status, 200);
    assert.equal(read.data.version, version);
    assert.equal(read.data.farm.settings.farmName, farm.settings.farmName);
  });
  await t.test("farm DELETE and POST cannot let an old tab edit a replacement farm", async () => {
    const oldFarmId = farmId;
    const removed = await user.request("DELETE", "/api/farm", { expectedVersion: version, expectedFarmId: farmId });
    assert.equal(
  removed.status,
  200,
  JSON.stringify(removed.data)
);
    assert.equal((await user.request("GET", "/api/farm")).data.farm, null);
const [leftover] = await db.execute(
  `SELECT
    q.queue_id,
    q.herd_id,
    h.farm_id AS herdFarmId,
    f.user_id AS farmOwner
  FROM queues q
  LEFT JOIN herds h ON h.herd_id = q.herd_id
  LEFT JOIN farms f ON f.farm_id = h.farm_id
  WHERE q.herd_id IN (?, ?)`,
  [farm.herds[0].id, farm.herds[1].id]
);

const [database] = await db.execute(
  "SELECT DATABASE() AS databaseName, @@SESSION.foreign_key_checks AS foreignKeyChecks"
);

assert.deepEqual(
  leftover,
  [],
  `Database: ${JSON.stringify(database[0])}; Remaining queues: ${JSON.stringify(leftover)}`
);
    const created = await user.request("POST", "/api/farm", { farm, expectedVersion: 0 });
    assert.equal(
      created.status,
      201,
      `POST /api/farm after deletion returned ${created.status}: ${JSON.stringify(created.data)}`,
    );
    farmId = created.data.farmId;
    version = created.data.version;
    assert.notEqual(farmId, oldFarmId);
    const stale = await user.request("PATCH", "/api/farm", {
      settings: { farmName: "Old tab" },
      expectedVersion: version,
      expectedFarmId: oldFarmId,
    });
    assert.equal(stale.status, 409);
    assert.equal((await user.request("GET", "/api/farm")).data.farm.settings.farmName, farm.settings.farmName);
  });
});
