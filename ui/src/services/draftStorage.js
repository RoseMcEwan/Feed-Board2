// Only unfinished farm edits live here. Profiles, passwords and login sessions never do.
export const draftKey = (userId) => `feedboard.draft.v2.${userId}`;

export function readDraft(userId, storage = localStorage) {
  const raw = storage.getItem(draftKey(userId));
  if (raw === null) return { draft: null, raw: null };
  let draft;
  try {
    draft = JSON.parse(raw);
  } catch {
    throw new Error("The saved browser draft is damaged. Export it before discarding it.");
  }
  if (
    !draft ||
    String(draft.userId) !== String(userId) ||
    !Number.isSafeInteger(draft.baseVersion) ||
    draft.baseVersion < 0 ||
    (draft.baseFarmId != null && (!Number.isSafeInteger(draft.baseFarmId) || draft.baseFarmId < 1)) ||
    !draft.farm?.settings ||
    !Array.isArray(draft.farm.herds) ||
    !Array.isArray(draft.farm.paddocks) ||
    !Array.isArray(draft.farm.crops) ||
    !draft.farm.planner?.orders
  ) {
    throw new Error("The saved browser draft could not be read. Export it before discarding it.");
  }
  return { draft, raw };
}

export function writeDraft(userId, farm, baseVersion, expectedRaw, storage = localStorage, baseFarmId = null) {
  const key = draftKey(userId);
  if (storage.getItem(key) !== expectedRaw) {
    throw new Error("This browser draft changed in another tab. Reload before continuing.");
  }
  const raw = JSON.stringify({ userId, baseVersion, baseFarmId, farm });
  storage.setItem(key, raw);
  return raw;
}

export function clearDraft(userId, expectedRaw, storage = localStorage) {
  const key = draftKey(userId);
  if (expectedRaw !== undefined && storage.getItem(key) !== expectedRaw) {
    throw new Error("This browser draft changed in another tab. Reload before continuing.");
  }
  storage.removeItem(key);
}
