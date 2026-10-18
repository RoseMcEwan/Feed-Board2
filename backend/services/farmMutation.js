const { validateFarm } = require("../middleware/farmValidation");

const fields = {
  herds: ["name", "stockClass", "animals", "targetKgDMDay", "colour"],
  paddocks: ["name", "hectares", "herdId", "excluded", "exclusionReason", "otherReason"],
  crops: ["paddockId", "herdId", "cropType", "otherCropType", "yieldKgDMHa", "kgDMPerAnimalDay", "startDate"],
  settings: ["farmName", "farmType", "assignHerds", "latitude", "longitude", "targetCover", "residualKgDmHa", "roundLength", "paddockToleranceHa", "schedule"],
};
const singular = { herds: "herd", paddocks: "paddock", crops: "crop" };
const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const validId = (value) => typeof value === "string" && /^[A-Za-z0-9-]{1,64}$/.test(value);
function fail(message, status = 422, code = "VALIDATION_ERROR") {
  throw Object.assign(new Error(message), { status, code, errors: [message] });
}
function keys(value, allowed, label) {
  if (!object(value) || Object.keys(value).some((key) => !allowed.includes(key))) fail(`Invalid ${label} fields.`);
}
function find(farm, resource, id) {
  const item = farm[resource].find((row) => row.id === id);
  if (!item) fail("This record does not exist in your farm.", 404, "NOT_FOUND");
  return item;
}
function merge(item, patch, allowed, label) {
  keys(patch, allowed, label);
  Object.assign(item, patch);
}
function removePaddock(farm, id) {
  farm.paddocks = farm.paddocks.filter((p) => p.id !== id);
  farm.crops = farm.crops.filter((c) => c.paddockId !== id);
}
// Relationship cleanup belongs to the same transaction as the owning edit.
function pruneQueues(farm, ids = null) {
  const paddocks = new Map(farm.paddocks.map((p) => [p.id, p]));
  for (const [herdId, queue] of Object.entries(farm.planner.orders)) {
    if (!queue) { delete farm.planner.orders[herdId]; continue; }
    queue.paddockIds = queue.paddockIds.filter((id) => {
      if (ids && !ids.has(id)) return true;
      const p = paddocks.get(id);
      return p && !p.excluded && (!farm.settings.assignHerds || p.herdId === herdId);
    });
    if (!queue.paddockIds.length) delete farm.planner.orders[herdId];
  }
}
function position(farm, resource, id, requested) {
  if (requested === undefined) return;
  if (!Number.isInteger(requested) || requested < 0 || requested >= farm[resource].length) fail("Invalid record position.");
  const index = farm[resource].findIndex((item) => item.id === id);
  const [item] = farm[resource].splice(index, 1);
  farm[resource].splice(requested, 0, item);
}
function linkedCrop(farm, paddock, crop) {
  if (crop !== undefined) {
    if (crop !== null) {
      keys(crop, ["id", ...fields.crops], "linked crop");
      if (!validId(crop.id) || crop.paddockId !== paddock.id) fail("The crop must belong to this paddock.");
      if (farm.crops.some((c) => c.id === crop.id && c.paddockId !== paddock.id)) fail("This crop belongs to another paddock.");
    }
    farm.crops = farm.crops.filter((c) => c.paddockId !== paddock.id);
    if (crop) farm.crops.push({ ...crop });
  }
  if (!paddock.excluded || paddock.exclusionReason !== "crop") {
    farm.crops = farm.crops.filter((c) => c.paddockId !== paddock.id);
  }
}

// Pure domain operation: accepts only the endpoint's resource and explicitly linked data.
function applyFarmMutation(saved, { resource, action, id, body }) {
  const farm = structuredClone(saved);
  const common = ["expectedVersion", "expectedFarmId"];
  if (id !== undefined && !validId(id)) fail("Invalid record ID.", 400);
  if (resource === "farm") {
    keys(body, [...common, ...(action === "update" ? ["settings", "assignments"] : [])], "farm request");
    if (action === "delete") return null;
    keys(body.settings, fields.settings, "settings");
    const assignmentChanged = body.settings.assignHerds !== undefined && body.settings.assignHerds !== farm.settings.assignHerds;
    const schedule = body.settings.schedule;
    if (schedule !== undefined) keys(schedule, ["am", "pm"], "schedule");
    farm.settings = { ...farm.settings, ...body.settings, schedule: { ...farm.settings.schedule, ...schedule } };
    if (body.assignments !== undefined) {
      if (!assignmentChanged || !Array.isArray(body.assignments)) fail("Assignments can accompany only an assignment-mode change.");
      for (const patch of body.assignments) {
        keys(patch, ["id", "herdId"], "paddock assignment");
        find(farm, "paddocks", patch.id).herdId = patch.herdId;
      }
    }
    if (assignmentChanged) pruneQueues(farm);
  } else if (resource === "queues") {
    keys(body, [...common, ...(action === "replace" ? ["queue", "relatedQueues"] : [])], "queue request");
    find(farm, "herds", id);
    if (action === "delete") delete farm.planner.orders[id];
    else {
      keys(body.queue, ["startDate", "paddockIds"], "queue");
      const affected = new Set([...(farm.planner.orders[id]?.paddockIds || []), ...(Array.isArray(body.queue.paddockIds) ? body.queue.paddockIds : [])]);
      if (body.relatedQueues !== undefined) {
        if (!object(body.relatedQueues)) fail("Related queues must be an object.");
        for (const [herdId, queue] of Object.entries(body.relatedQueues)) {
          if (herdId === id) fail("Send the primary queue only once.");
          find(farm, "herds", herdId);
          if (queue !== null) keys(queue, ["startDate", "paddockIds"], "related queue");
          const paddockIds = [...(farm.planner.orders[herdId]?.paddockIds || []), ...(Array.isArray(queue?.paddockIds) ? queue.paddockIds : [])];
          if (!paddockIds.some((p) => affected.has(p))) fail("A related queue must share paddocks with the edited queue.");
          if (queue === null) delete farm.planner.orders[herdId];
          else farm.planner.orders[herdId] = structuredClone(queue);
        }
      }
      farm.planner.orders[id] = structuredClone(body.queue);
    }
  } else {
    const label = singular[resource];
    const extras = resource === "paddocks" && action !== "delete" ? ["crop"] : resource === "crops" ? ["paddock"] : resource === "herds" && action === "delete" ? ["reassignments"] : [];
    keys(body, [...common, ...extras, ...(action !== "delete" ? [label, ...(resource !== "crops" ? ["position"] : [])] : [])], `${label} request`);
    let item;
    if (action === "create") {
      keys(body[label], ["id", ...fields[resource]], label);
      item = { ...body[label] };
      if (!validId(item.id)) fail("A valid record ID is required.");
      if (farm[resource].some((row) => row.id === item.id)) fail("This record already exists.", 409, "DUPLICATE_RECORD");
      farm[resource].push(item);
      id = item.id;
    } else {
      item = find(farm, resource, id);
      if (action === "update") {
        if (resource === "crops" && body.crop?.paddockId !== undefined && body.crop.paddockId !== item.paddockId) fail("A crop cannot be moved to a different paddock. Edit the paddock's crop instead.");
        merge(item, body[label], fields[resource], label);
      }
    }
    if (resource === "paddocks") {
      if (action === "delete") removePaddock(farm, id);
      else linkedCrop(farm, item, body.crop);
      pruneQueues(farm, new Set([id]));
    } else if (resource === "crops") {
      const paddock = find(farm, "paddocks", item.paddockId);
      if (body.paddock !== undefined) merge(paddock, body.paddock, ["excluded", "exclusionReason", "otherReason", "herdId"], "linked paddock");
      if (action === "delete") farm.crops = farm.crops.filter((c) => c.id !== id);
      pruneQueues(farm, new Set([paddock.id]));
    } else if (action === "delete") {
      const linked = body.reassignments || {};
      keys(linked, ["paddocks", "crops"], "herd reassignments");
      for (const related of ["paddocks", "crops"]) {
        if (linked[related] !== undefined && !Array.isArray(linked[related])) fail("Reassignments must be a list.");
        for (const patch of linked[related] || []) {
          keys(patch, ["id", "herdId"], "herd reassignment");
          const row = find(farm, related, patch.id);
          if (row.herdId !== id) fail("Only this herd's records can accompany its deletion.");
          row.herdId = patch.herdId;
        }
      }
      farm.herds = farm.herds.filter((h) => h.id !== id);
      farm.paddocks.forEach((p) => { if (p.herdId === id) p.herdId = ""; });
      delete farm.planner.orders[id];
      pruneQueues(farm);
    }
    if (action !== "delete" && resource !== "crops") position(farm, resource, id, body.position);
  }
  const errors = validateFarm(farm);
  if (errors.length) throw Object.assign(new Error("Correct the linked records before saving this change."), { status: 422, code: "VALIDATION_ERROR", errors: errors.slice(0, 50) });
  return farm;
}

module.exports = { applyFarmMutation };
