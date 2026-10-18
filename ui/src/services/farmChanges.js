//This file is required due to the autosave set up
import { createFarm, writeFarmResource, ApiError } from "./api.js";
import {
  validateFarm,
  validateSettings,
  validateHerds,
  validatePaddocks,
  validateCrops,
} from "../utilis/validation.js";

const numeric = new Set([
  "animals",
  "targetKgDMDay",
  "hectares",
  "yieldKgDMHa",
  "kgDMPerAnimalDay",
  "latitude",
  "longitude",
  "targetCover",
  "residualKgDmHa",
  "roundLength",
  "paddockToleranceHa",
]);
const fields = {
  herds: ["name", "stockClass", "animals", "targetKgDMDay", "colour"],
  paddocks: ["name", "hectares", "herdId", "excluded", "exclusionReason", "otherReason"],
  crops: ["paddockId", "herdId", "cropType", "otherCropType", "yieldKgDMHa", "kgDMPerAnimalDay", "startDate"],
};
function comparable(value, key = "") {
  if (numeric.has(key) && value !== "" && value !== null && value !== undefined) return Number(value);
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return value.map((item) => comparable(item));
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((name) => [name, comparable(value[name], name)]),
    );
  return value;
}
export const sameData = (a, b) => JSON.stringify(comparable(a)) === JSON.stringify(comparable(b));
const pick = (item, names) => Object.fromEntries(names.map((field) => [field, item[field]]));
const patch = (before, after, names) =>
  Object.fromEntries(
    names
      .filter((field) => !sameData({ [field]: before[field] }, { [field]: after[field] }))
      .map((field) => [field, after[field]]),
  );
const byId = (items, id) => items.find((item) => item.id === id);
const operation = (method, path, body = {}) => ({ method, path, body });

// Local import previews never go to the API. Availability cleanup mirrors the
// linked deletion/exclusion the server commits in the owning entity transaction.
export function accountFarm(farm) {
  const { importText: _text, importDraft: _draft, ...data } = farm;
  const paddocks = new Map(data.paddocks.map((p) => [p.id, p]));
  const herds = new Set(data.herds.map((h) => h.id));
  const orders = Object.fromEntries(
    Object.entries(data.planner.orders).flatMap(([herdId, queue]) => {
      if (!queue || !herds.has(herdId)) return [];
      const paddockIds = queue.paddockIds.filter((id) => {
        const p = paddocks.get(id);
        return p && !p.excluded && (!data.settings.assignHerds || p.herdId === herdId);
      });
      return paddockIds.length ? [[herdId, { ...queue, paddockIds }]] : [];
    }),
  );
  return {
    ...data,
    crops: [...data.crops].sort(
      (a, b) =>
        data.paddocks.findIndex((p) => p.id === a.paddockId) - data.paddocks.findIndex((p) => p.id === b.paddockId),
    ),
    planner: { ...data.planner, orders },
  };
}
function validHerd(herd) {
  return !validateHerds({ herds: [herd] }).length;
}
function validPaddock(saved, target, paddock) {
  const crop = target.crops.find((c) => c.paddockId === paddock.id);
  const context = { ...saved, paddocks: [paddock], crops: crop ? [crop] : [] };
  return !validatePaddocks(context).length && !validateCrops(context).length;
}
function nameAvailable(rows, item) {
  return !rows.some((row) => row.id !== item.id && row.name.trim().toLowerCase() === item.name.trim().toLowerCase());
}

// Choose one valid entity operation. Incomplete unrelated draft records are not
// included and cannot block valid edits. Called again after every acknowledged write.
export function nextFarmOperation(saved, rawTarget) {
  const target = accountFarm(rawTarget);
  for (const herd of target.herds) {
    if (!byId(saved.herds, herd.id) && validHerd(herd) && nameAvailable(saved.herds, herd)) {
      return operation("POST", "/api/farm/herds", { herd: pick(herd, ["id", ...fields.herds]) });
    }
  }
  // Assignment mode and its linked assignments are a single settings transaction.
  if (!sameData(saved.settings, target.settings) && !validateSettings(target.settings).length) {
    const settings = patch(saved.settings, target.settings, Object.keys(saved.settings));
    const modeChanged = settings.assignHerds !== undefined;
    const assignments = modeChanged
      ? saved.paddocks.flatMap((p) => {
          const next = byId(target.paddocks, p.id);
          return next && next.herdId !== p.herdId ? [{ id: p.id, herdId: next.herdId }] : [];
        })
      : [];
    const proposed = saved.paddocks.map((p) => ({
      ...p,
      herdId: assignments.find((a) => a.id === p.id)?.herdId ?? p.herdId,
    }));
    if (!validatePaddocks({ ...saved, settings: target.settings, paddocks: proposed }).length) {
      return operation("PATCH", "/api/farm", { settings, ...(modeChanged ? { assignments } : {}) });
    }
  }
  for (const herd of target.herds) {
    const before = byId(saved.herds, herd.id);
    if (before && validHerd(herd) && nameAvailable(saved.herds, herd)) {
      const changes = patch(before, herd, fields.herds);
      if (Object.keys(changes).length) return operation("PATCH", `/api/farm/herds/${herd.id}`, { herd: changes });
    }
  }
  // A herd and its dependent reassignments are removed together, never as a series
  // of individual PATCH calls that could leave half the action saved.
  for (const herd of saved.herds) {
    if (byId(target.herds, herd.id) || saved.herds.length <= 1) continue;
    const reassignments = { paddocks: [], crops: [] };
    let ready = true;
    for (const resource of ["paddocks", "crops"]) {
      for (const item of saved[resource].filter((row) => row.herdId === herd.id)) {
        const next = byId(target[resource], item.id);
        if (
          !next ||
          (next.herdId && !byId(saved.herds, next.herdId)) ||
          next.herdId === herd.id ||
          (resource === "crops" && !next.herdId) ||
          (resource === "paddocks" && saved.settings.assignHerds && !item.excluded && !next.herdId)
        ) {
          ready = false;
          break;
        }
        reassignments[resource].push({ id: item.id, herdId: next.herdId });
      }
    }
    if (ready) return operation("DELETE", `/api/farm/herds/${herd.id}`, { reassignments });
  }
  for (const p of saved.paddocks) {
    if (!byId(target.paddocks, p.id) && saved.paddocks.length > 1)
      return operation("DELETE", `/api/farm/paddocks/${p.id}`);
  }
  for (const p of target.paddocks) {
    if (!nameAvailable(saved.paddocks, p) || !validPaddock(saved, target, p)) continue;
    const before = byId(saved.paddocks, p.id);
    if (before && saved.settings.assignHerds !== target.settings.assignHerds && before.herdId !== p.herdId) continue;
    const crop = target.crops.find((c) => c.paddockId === p.id);
    const oldCrop = saved.crops.find((c) => c.paddockId === p.id);
    if (!before)
      return operation("POST", "/api/farm/paddocks", {
        paddock: pick(p, ["id", ...fields.paddocks]),
        ...(crop ? { crop } : {}),
      });
    const changes = patch(before, p, fields.paddocks);
    if (Object.keys(changes).length || crop?.id !== oldCrop?.id) {
      return operation("PATCH", `/api/farm/paddocks/${p.id}`, {
        paddock: changes,
        ...(!sameData(crop, oldCrop) ? { crop: crop || null } : {}),
      });
    }
    if (crop && oldCrop && !sameData(crop, oldCrop))
      return operation("PATCH", `/api/farm/crops/${crop.id}`, { crop: patch(oldCrop, crop, fields.crops) });
  }
  // Preserve list order only after the same records exist on both sides.
  for (const resource of ["herds", "paddocks"]) {
    if (
      saved[resource].length !== target[resource].length ||
      target[resource].some((row) => !byId(saved[resource], row.id))
    )
      continue;
    for (const [position, item] of target[resource].entries()) {
      if (saved[resource][position].id !== item.id)
        return operation("PATCH", `/api/farm/${resource}/${item.id}`, {
          [resource === "herds" ? "herd" : "paddock"]: {},
          position,
        });
    }
  }
  const desired = target.planner.orders;
  // A queue consequence must not escape an unfinished owning paddock/herd edit.
  const queueReady = (herdId) => {
    if (!byId(target.herds, herdId) || saved.settings.assignHerds !== target.settings.assignHerds) return false;
    const ids = new Set([...(saved.planner.orders[herdId]?.paddockIds || []), ...(desired[herdId]?.paddockIds || [])]);
    return [...ids].every((id) => {
      const before = byId(saved.paddocks, id),
        after = byId(target.paddocks, id);
      return (
        before &&
        after &&
        before.excluded === after.excluded &&
        (!saved.settings.assignHerds || before.herdId === after.herdId)
      );
    });
  };
  for (const [herdId, old] of Object.entries(saved.planner.orders)) {
    if (!desired[herdId] && queueReady(herdId)) return operation("DELETE", `/api/farm/queues/${herdId}`);
    if (sameData(old, desired[herdId])) continue;
  }
  for (const [herdId, queue] of Object.entries(desired)) {
    if (!byId(saved.herds, herdId) || !queueReady(herdId) || sameData(saved.planner.orders[herdId], queue)) continue;
    if (
      queue.paddockIds.some((id) => {
        const p = byId(saved.paddocks, id);
        return !p || p.excluded || (saved.settings.assignHerds && p.herdId !== herdId);
      })
    )
      continue;
    const affected = new Set([...(saved.planner.orders[herdId]?.paddockIds || []), ...queue.paddockIds]);
    const relatedQueues = Object.fromEntries(
      Object.entries(saved.planner.orders)
        .filter(
          ([other, old]) =>
            other !== herdId &&
            !sameData(old, desired[other]) &&
            [...old.paddockIds, ...(desired[other]?.paddockIds || [])].some((id) => affected.has(id)),
        )
        .map(([other]) => [other, desired[other] || null]),
    );
    if (Object.keys(relatedQueues).some((other) => !queueReady(other))) continue;
    return operation("PUT", `/api/farm/queues/${herdId}`, {
      queue,
      ...(Object.keys(relatedQueues).length ? { relatedQueues } : {}),
    });
  }
  return null;
}

// Persist each acknowledged response before sending the next operation. If a
// later operation fails, retries diff against that checkpoint rather than replaying it.
export async function saveFarmChanges(
  userId,
  saved,
  draft,
  { onSaved, shouldContinue = () => true, create = createFarm, write = writeFarmResource } = {},
) {
  const target = accountFarm(draft);
  if (!saved.farm) {
    if (!target.setupCompleted || validateFarm(target).length) return { ...saved, complete: false };
    const result = await create(userId, target);
    onSaved?.(result);
    return { ...result, complete: true };
  }
  let latest = saved;
  let count = 0;
  while (shouldContinue()) {
    const change = nextFarmOperation(latest.farm, target);
    if (!change) return { ...latest, complete: sameData(accountFarm(latest.farm), target) };
    const result = await write(userId, change, latest);
    onSaved?.(result);
    if (sameData(result.farm, latest.farm))
      throw new ApiError("This edit could not be applied. Your remaining draft is kept.", { code: "VALIDATION_ERROR" });
    latest = result;
    if (++count > 5000) throw new ApiError("Too many changes in one save. Your remaining draft is kept.");
  }
  return { ...latest, complete: false };
}
