const { db } = require("../config/db");
const { isDeepStrictEqual } = require("node:util");
const { applyFarmMutation } = require("../services/farmMutation");

const FARM_SCHEMA_VERSION = 5;

// Converts database/input numeric values to numbers or null.
function numberOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;
  return Number(value);
}

// Creates a standard version-conflict error.
function versionConflict() {
  return Object.assign(
    new Error(
      "This farm changed elsewhere. Your browser draft has been kept. Reload the saved version before continuing.",
    ),
    { status: 409, code: "VERSION_CONFLICT" },
  );
}

// Reads a user's complete farm from the relational database tables.
async function readFarm(connection, userId) {
  const [farms] = await connection.execute("SELECT * FROM farms WHERE user_id = ?", [userId]);
  const row = farms[0];

  if (!row) return { farm: null, version: 0, farmId: null };

  const [herds] = await connection.execute(
    `SELECT herd_id AS id, herd_name AS name, stock_class AS stockClass,
    animals, target_intake AS targetKgDMDay, herd_colour AS colour
    FROM herds WHERE farm_id = ? ORDER BY display_order`,
    [row.farm_id],
  );

  const [paddocks] = await connection.execute(
    `SELECT paddock_id AS id, paddock_name AS name, hectares,
    assigned_herd_id AS herdId, excluded, exclusion_reason AS exclusionReason,
    other_exclusion_reason AS otherReason
    FROM paddocks WHERE farm_id = ? ORDER BY display_order`,
    [row.farm_id],
  );

  const [crops] = await connection.execute(
    `SELECT c.crop_id AS id, c.paddock_id AS paddockId, c.herd_id AS herdId,
    c.crop_type AS cropType, c.other_crop_type AS otherCropType,
    c.yield_kgdm_ha AS yieldKgDMHa,
    c.intake_kgdm_animal_day AS kgDMPerAnimalDay,
    c.start_date AS startDate
    FROM crops c
    JOIN paddocks p ON p.paddock_id = c.paddock_id
    WHERE p.farm_id = ? ORDER BY p.display_order`,
    [row.farm_id],
  );

  const [queues] = await connection.execute(
    `SELECT q.queue_id, q.herd_id, q.start_date FROM queues q
    JOIN herds h ON h.herd_id = q.herd_id WHERE h.farm_id = ?`,
    [row.farm_id],
  );

  const [items] = await connection.execute(
    `SELECT i.queue_id, i.paddock_id FROM queue_items i
    JOIN queues q ON q.queue_id = i.queue_id
    JOIN herds h ON h.herd_id = q.herd_id
    WHERE h.farm_id = ? ORDER BY i.queue_id, i.position`,
    [row.farm_id],
  );

  return {
    version: row.version,
    farmId: row.farm_id,
    farm: {
      schemaVersion: FARM_SCHEMA_VERSION,
      setupCompleted: Boolean(row.setup_completed),
      setupStep: row.setup_step,
      settings: {
        farmName: row.farm_name,
        farmType: row.farm_type,
        assignHerds: Boolean(row.use_herd_assignment),
        latitude: Number(row.latitude),
        longitude: Number(row.longitude),
        targetCover: Number(row.target_cover),
        residualKgDmHa: Number(row.target_residual),
        roundLength: Number(row.round_length),
        paddockToleranceHa: Number(row.paddock_tolerance_ha),
        schedule: {
          am: row.am_time.slice(0, 5),
          pm: row.pm_time.slice(0, 5),
        },
      },
      herds: herds.map((herd) => ({
        ...herd,
        animals: Number(herd.animals),
        targetKgDMDay: Number(herd.targetKgDMDay),
      })),
      paddocks: paddocks.map((paddock) => ({
        ...paddock,
        hectares: Number(paddock.hectares),
        excluded: Boolean(paddock.excluded),
        herdId: paddock.herdId ?? "",
        exclusionReason: paddock.exclusionReason ?? "",
        otherReason: paddock.otherReason ?? "",
      })),
      crops: crops.map((crop) => ({
        ...crop,
        otherCropType: crop.otherCropType ?? "",
        yieldKgDMHa: Number(crop.yieldKgDMHa),
        kgDMPerAnimalDay: Number(crop.kgDMPerAnimalDay),
        startDate: crop.startDate,
      })),
      planner: {
        orders: Object.fromEntries(
          queues.map((queue) => [
            queue.herd_id,
            {
              startDate: queue.start_date,
              paddockIds: items.filter((item) => item.queue_id === queue.queue_id).map((item) => item.paddock_id),
            },
          ]),
        ),
      },
    },
  };
}

// Loads one consistent farm snapshot for a user.
async function getFarm(userId) {
  const connection = await db.getConnection();

  try {
    await connection.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ");
    await connection.beginTransaction();

    const result = await readFarm(connection, userId);

    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// Inserts multiple rows into a known table using parameterised values.
async function insertRows(connection, table, columns, rows) {
  if (!rows.length) return;

  const group = `(${columns.map(() => "?").join(", ")})`;

  await connection.execute(
    `INSERT INTO ${table} (${columns.join(", ")}) VALUES ${rows.map(() => group).join(", ")}`,
    rows.flat(),
  );
}

// Creates the complete initial farm in one transaction.
async function createFarm(userId, input, expectedVersion) {
  const farm = normaliseFarm(input);
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [owners] = await connection.execute("SELECT user_id FROM users WHERE user_id = ? FOR UPDATE", [userId]);

    if (!owners.length) {
      throw Object.assign(new Error("Please log in again."), {
        status: 401,
        code: "AUTH_REQUIRED",
      });
    }

    const [rows] = await connection.execute("SELECT farm_id, version FROM farms WHERE user_id = ? FOR UPDATE", [
      userId,
    ]);
    const previous = rows[0];
    if ((previous?.version ?? 0) !== expectedVersion) throw versionConflict();
    const version = expectedVersion + 1;
    const settings = farm.settings;
    const values = [
      settings.farmName,
      settings.farmType,
      settings.roundLength,
      settings.latitude,
      settings.longitude,
      settings.targetCover,
      settings.residualKgDmHa,
      settings.schedule.am,
      settings.schedule.pm,
      settings.paddockToleranceHa,
      settings.assignHerds,
      farm.setupCompleted,
      farm.setupStep,
      version,
    ];

    if (previous) throw Object.assign(new Error("This account already has a farm."), { status: 409, code: "FARM_EXISTS" });
    const [insert] = await connection.execute(
      `INSERT INTO farms (
        farm_name, farm_type, round_length, latitude, longitude,
        target_cover, target_residual, am_time, pm_time, paddock_tolerance_ha,
        use_herd_assignment, setup_completed, setup_step, version, user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [...values, userId],
    );
    const farmId = insert.insertId;

    await insertRows(
      connection,
      "herds",
      ["herd_id", "farm_id", "herd_name", "stock_class", "animals", "target_intake", "herd_colour", "display_order"],
      farm.herds.map((herd, index) => [
        herd.id,
        farmId,
        herd.name,
        herd.stockClass,
        herd.animals,
        herd.targetKgDMDay,
        herd.colour,
        index,
      ]),
    );

    await insertRows(
      connection,
      "paddocks",
      [
        "paddock_id",
        "farm_id",
        "assigned_herd_id",
        "paddock_name",
        "hectares",
        "excluded",
        "exclusion_reason",
        "other_exclusion_reason",
        "display_order",
      ],
      farm.paddocks.map((paddock, index) => [
        paddock.id,
        farmId,
        paddock.herdId || null,
        paddock.name,
        paddock.hectares,
        paddock.excluded,
        paddock.exclusionReason || null,
        paddock.otherReason || null,
        index,
      ]),
    );

    await insertRows(
      connection,
      "crops",
      [
        "crop_id",
        "paddock_id",
        "herd_id",
        "crop_type",
        "other_crop_type",
        "yield_kgdm_ha",
        "intake_kgdm_animal_day",
        "start_date",
      ],
      farm.crops.map((crop) => [
        crop.id,
        crop.paddockId,
        crop.herdId,
        crop.cropType,
        crop.otherCropType || null,
        crop.yieldKgDMHa,
        crop.kgDMPerAnimalDay,
        crop.startDate,
      ]),
    );

    for (const [herdId, order] of Object.entries(farm.planner.orders)) {
      const [queue] = await connection.execute("INSERT INTO queues (herd_id, start_date) VALUES (?, ?)", [
        herdId,
        order.startDate,
      ]);

      await insertRows(
        connection,
        "queue_items",
        ["queue_id", "paddock_id", "position"],
        order.paddockIds.map((paddockId, index) => [queue.insertId, paddockId, index + 1]),
      );
    }

    await connection.commit();

    return { farm, version, farmId };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// Selects and normalises only the farm fields that are persisted to MySQL.
function normaliseFarm(farm) {
  return {
    schemaVersion: FARM_SCHEMA_VERSION,
    setupCompleted: farm.setupCompleted,
    setupStep: farm.setupStep,
    settings: {
      farmName: farm.settings.farmName.trim(),
      farmType: farm.settings.farmType,
      assignHerds: farm.settings.assignHerds,
      latitude: numberOrNull(farm.settings.latitude),
      longitude: numberOrNull(farm.settings.longitude),
      targetCover: numberOrNull(farm.settings.targetCover),
      residualKgDmHa: numberOrNull(farm.settings.residualKgDmHa),
      roundLength: numberOrNull(farm.settings.roundLength),
      paddockToleranceHa: numberOrNull(farm.settings.paddockToleranceHa),
      schedule: {
        am: farm.settings.schedule.am,
        pm: farm.settings.schedule.pm,
      },
    },
    herds: farm.herds.map((herd) => ({
      id: herd.id,
      name: herd.name.trim(),
      animals: numberOrNull(herd.animals),
      stockClass: herd.stockClass,
      colour: herd.colour,
      targetKgDMDay: numberOrNull(herd.targetKgDMDay),
    })),
    paddocks: farm.paddocks.map((paddock) => ({
      id: paddock.id,
      name: paddock.name.trim(),
      hectares: numberOrNull(paddock.hectares),
      herdId: paddock.herdId || "",
      excluded: paddock.excluded,
      exclusionReason: paddock.excluded ? paddock.exclusionReason : "",
      otherReason: paddock.excluded && paddock.exclusionReason === "other" ? paddock.otherReason.trim() : "",
    })),
    crops: [...farm.crops].sort((a, b) => farm.paddocks.findIndex((p) => p.id === a.paddockId) - farm.paddocks.findIndex((p) => p.id === b.paddockId)).map((crop) => ({
      id: crop.id,
      paddockId: crop.paddockId,
      herdId: crop.herdId,
      cropType: crop.cropType,
      otherCropType: crop.cropType === "Other" ? crop.otherCropType.trim() : "",
      yieldKgDMHa: numberOrNull(crop.yieldKgDMHa),
      kgDMPerAnimalDay: numberOrNull(crop.kgDMPerAnimalDay),
      startDate: crop.startDate,
    })),
    planner: {
      orders: Object.fromEntries(
        Object.entries(farm.planner.orders)
          .filter(([, order]) => order !== null)
          .map(([herdId, order]) => [
            herdId,
            {
              startDate: order.startDate,
              paddockIds: [...order.paddockIds],
            },
          ]),
      ),
    },
  };
}

// Fixed SQL identifiers only; all client values are parameters.
const definitions = {
  herds: { key: "herd_id", fields: { name: "herd_name", stockClass: "stock_class", animals: "animals", targetKgDMDay: "target_intake", colour: "herd_colour" } },
  paddocks: { key: "paddock_id", fields: { name: "paddock_name", hectares: "hectares", herdId: "assigned_herd_id", excluded: "excluded", exclusionReason: "exclusion_reason", otherReason: "other_exclusion_reason" } },
  crops: { key: "crop_id", fields: { paddockId: "paddock_id", herdId: "herd_id", cropType: "crop_type", otherCropType: "other_crop_type", yieldKgDMHa: "yield_kgdm_ha", kgDMPerAnimalDay: "intake_kgdm_animal_day", startDate: "start_date" } },
};
function rows(farm, table, farmId) {
  const { key, fields } = definitions[table];
  return farm[table].map((item, index) => ({
    [key]: item.id,
    ...(table === "crops" ? {} : { farm_id: farmId, display_order: index }),
    ...Object.fromEntries(Object.entries(fields).map(([field, column]) => [column, item[field] === "" ? null : item[field]])),
  }));
}
function diff(before, after, key) {
  const old = new Map(before.map((row) => [row[key], row]));
  const ids = new Set(after.map((row) => row[key]));
  return {
    removed: before.filter((row) => !ids.has(row[key])),
    added: after.filter((row) => !old.has(row[key])),
    changed: after.flatMap((row) => {
      const previous = old.get(row[key]);
      if (!previous) return [];
      const fields = Object.keys(row).filter((field) => row[field] !== previous[field]);
      return fields.length ? [{ row, previous, fields }] : [];
    }),
  };
}
async function insert(connection, table, row) {
  await connection.execute(`INSERT INTO ${table} (${Object.keys(row).join(", ")}) VALUES (${Object.keys(row).map(() => "?").join(", ")})`, Object.values(row));
}
async function update(connection, table, key, { row, fields }) {
  await connection.execute(`UPDATE ${table} SET ${fields.map((field) => `${field}=?`).join(", ")} WHERE ${key}=?`, [...fields.map((field) => row[field]), row[key]]);
}
async function remove(connection, table, key, records) {
  for (const row of records) await connection.execute(`DELETE FROM ${table} WHERE ${key}=?`, [row[key]]);
}
async function saveOrdered(connection, table, changes) {
  const { key } = definitions[table];
  // Vacate positions before a swap; final positions remain unique throughout.
  for (const { row, previous, fields } of changes.changed) {
    if (fields.includes("display_order")) await connection.execute(`UPDATE ${table} SET display_order=? WHERE ${key}=?`, [previous.display_order + 1000000, row[key]]);
  }
  for (const change of changes.changed) await update(connection, table, key, change);
  for (const row of changes.added) await insert(connection, table, row);
}
async function saveQueues(connection, farmId, farm) {
  const [queues] = await connection.execute("SELECT q.queue_id, q.herd_id, q.start_date FROM queues q JOIN herds h ON h.herd_id=q.herd_id WHERE h.farm_id=?", [farmId]);
  const existing = new Map(queues.map((q) => [q.herd_id, q]));
  const orders = farm.planner.orders;
  for (const q of queues) if (!orders[q.herd_id]) await connection.execute("DELETE FROM queues WHERE queue_id=?", [q.queue_id]);
  for (const [herdId, order] of Object.entries(orders)) {
    let queue = existing.get(herdId);
    if (!queue) {
      const [result] = await connection.execute("INSERT INTO queues (herd_id, start_date) VALUES (?, ?)", [herdId, order.startDate]);
      queue = { queue_id: result.insertId };
    } else if (queue.start_date !== order.startDate) await connection.execute("UPDATE queues SET start_date=? WHERE queue_id=?", [order.startDate, queue.queue_id]);
    const [items] = await connection.execute("SELECT queue_item_id, paddock_id, position FROM queue_items WHERE queue_id=? ORDER BY position", [queue.queue_id]);
    const changes = diff(items, order.paddockIds.map((id, index) => ({ paddock_id: id, position: index + 1 })), "paddock_id");
    await remove(connection, "queue_items", "queue_item_id", changes.removed);
    for (const { previous } of changes.changed) await connection.execute("UPDATE queue_items SET position=? WHERE queue_item_id=?", [previous.position + 1000000, previous.queue_item_id]);
    for (const { previous, row } of changes.changed) await connection.execute("UPDATE queue_items SET position=? WHERE queue_item_id=?", [row.position, previous.queue_item_id]);
    for (const row of changes.added) await insert(connection, "queue_items", { ...row, queue_id: queue.queue_id });
  }
}

// Called after ownership/version locks and complete validation. 
async function saveRelatedChanges(connection, farmId, before, after) {
  const changes = Object.fromEntries(Object.entries(definitions).map(([table, { key }]) => [table, diff(rows(before, table, farmId), rows(after, table, farmId), key)]));
  const moved = changes.crops.changed.filter(({ fields }) => fields.includes("paddock_id"));
  await remove(connection, "crops", "crop_id", [...changes.crops.removed, ...moved.map(({ previous }) => previous)]);
  await remove(connection, "paddocks", "paddock_id", changes.paddocks.removed);
  for (const row of changes.herds.removed) await connection.execute("UPDATE herds SET display_order=? WHERE herd_id=?", [row.display_order + 2000000, row.herd_id]);
  await saveOrdered(connection, "herds", changes.herds);
  await saveOrdered(connection, "paddocks", changes.paddocks);
  for (const change of changes.crops.changed.filter(({ fields }) => !fields.includes("paddock_id"))) await update(connection, "crops", "crop_id", change);
  for (const row of [...changes.crops.added, ...moved.map(({ row }) => row)]) await insert(connection, "crops", row);
  await saveQueues(connection, farmId, after);
  await remove(connection, "herds", "herd_id", changes.herds.removed);
}

async function mutateFarm(userId, command) {
  const { expectedVersion, expectedFarmId } = command.body || {};
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1 || expectedVersion >= 4294967295 || !Number.isSafeInteger(expectedFarmId) || expectedFarmId < 1) {
    throw Object.assign(new Error("Send the saved farm ID and version with your changes."), { status: 400, code: "VALIDATION_ERROR" });
  }
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [owners] = await connection.execute("SELECT user_id FROM users WHERE user_id=? FOR UPDATE", [userId]);
    if (!owners.length) throw Object.assign(new Error("Please log in again."), { status: 401, code: "AUTH_REQUIRED" });
    const [farms] = await connection.execute("SELECT farm_id, version FROM farms WHERE user_id=? FOR UPDATE", [userId]);
    const row = farms[0];
    if (!row || row.farm_id !== expectedFarmId || row.version !== expectedVersion) {
      throw Object.assign(new Error("This farm changed elsewhere. Your browser draft has been kept. Reload the saved version before continuing."), { status: 409, code: "VERSION_CONFLICT" });
    }
    const saved = await readFarm(connection, userId);
    const changed = applyFarmMutation(saved.farm, command);
    if (!changed) {
// Remove planner records when the entire farm is deleted.
await connection.execute(
  "DELETE FROM queue_items WHERE queue_id IN (SELECT q.queue_id FROM queues q JOIN herds h ON h.herd_id=q.herd_id WHERE h.farm_id=?)",
  [row.farm_id],
);

await connection.execute(
  "DELETE FROM queues WHERE herd_id IN (SELECT herd_id FROM herds WHERE farm_id=?)",
  [row.farm_id],
);
      // Explicit crop deletion avoids the crop->herd RESTRICT cascade ordering issue.
      await connection.execute("DELETE c FROM crops c JOIN paddocks p ON p.paddock_id=c.paddock_id WHERE p.farm_id=?", [row.farm_id]);
      await connection.execute("DELETE FROM farms WHERE farm_id=? AND user_id=?", [row.farm_id, userId]);
      await connection.commit();
      return { farm: null, version: 0, farmId: null };
    }
    const farm = normaliseFarm(changed);
    if (isDeepStrictEqual(saved.farm, farm)) { await connection.commit(); return saved; }
    const version = row.version + 1;
    if (!isDeepStrictEqual(saved.farm.settings, farm.settings)) {
      const s = farm.settings;
      await connection.execute(`UPDATE farms SET farm_name=?, farm_type=?, round_length=?, latitude=?, longitude=?,
        target_cover=?, target_residual=?, am_time=?, pm_time=?, paddock_tolerance_ha=?, use_herd_assignment=?, version=?
        WHERE farm_id=? AND user_id=?`, [s.farmName, s.farmType, s.roundLength, s.latitude, s.longitude, s.targetCover,
        s.residualKgDmHa, s.schedule.am, s.schedule.pm, s.paddockToleranceHa, s.assignHerds, version, row.farm_id, userId]);
    } else await connection.execute("UPDATE farms SET version=? WHERE farm_id=? AND user_id=?", [version, row.farm_id, userId]);
    await saveRelatedChanges(connection, row.farm_id, saved.farm, farm);
    await connection.commit();
    return { farm, version, farmId: row.farm_id };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }
}

module.exports = {
  mutateFarm,
  getFarm,
  createFarm,
  normaliseFarm,
  readFarm,
};