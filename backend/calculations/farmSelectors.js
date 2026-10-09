const { nonNegative } = require("./calculationHelpers");

// Checks whether a paddock is available for normal grazing.
function isGrazable(paddock) {
  return !paddock.excluded && nonNegative(paddock.hectares) > 0;
}
// Returns the grazable paddocks available to a herd.
function eligiblePaddocks(farm, herdId) {
  return farm.paddocks.filter(
    (paddock) =>
      isGrazable(paddock) &&
      (!farm.settings.assignHerds || paddock.herdId === herdId),
  );
}

// Returns paddocks that can still be added to a herd's grazing queue.
function availableQueuePaddocks(farm, herdId) {
  const eligible = eligiblePaddocks(farm, herdId);

  if (farm.settings.assignHerds) {
    return eligible;
  }

  const claimedByOtherHerds = new Set(
    Object.entries(farm.planner?.orders ?? {})
      .filter(([otherHerdId]) => otherHerdId !== herdId && farm.herds.some((herd) => herd.id === otherHerdId))
      .flatMap(([, order]) => order?.paddockIds ?? [])
      .filter(Boolean),
  );

  return eligible.filter(
    (paddock) =>
      !claimedByOtherHerds.has(paddock.id),
  );
}
// Calculates the farm's total grazable hectares.
function grazingArea(farm) {
  return farm.paddocks
    .filter(isGrazable)
    .reduce(
      (sum, paddock) =>
        sum + nonNegative(paddock.hectares),
      0,
    );
}
// Calculates the total hectares across all paddocks.
function totalArea(farm) {
  return farm.paddocks.reduce(
    (sum, paddock) =>
      sum + nonNegative(paddock.hectares),
    0,
  );
}
// Calculates the total number of animals across all herds.
function totalAnimals(farm) {
  return farm.herds.reduce(
    (sum, herd) =>
      sum + nonNegative(herd.animals),
    0,
  );
}
// Builds each herd's planning data and calculates the grazing area available to it.
function planningGroups(farm) {
  const sharedArea = grazingArea(farm);
  const animals = totalAnimals(farm);

  return farm.herds.map((herd) => {
    const assignedArea = farm.paddocks
      .filter(
        (paddock) =>
          isGrazable(paddock) &&
          paddock.herdId === herd.id,
      )
      .reduce(
        (sum, paddock) =>
          sum + nonNegative(paddock.hectares),
        0,
      );

    const area = farm.settings.assignHerds
      ? assignedArea
      : animals > 0
        ? sharedArea *
          (nonNegative(herd.animals) / animals)
        : 0;

    return {
      ...herd,
      totalArea: area,
    };
  });
}
// Returns grazable paddocks that still need a herd assignment.
function missingAssignments(farm) {
  if (!farm.settings.assignHerds) {
    return [];
  }

  const herdIds = new Set(
    farm.herds.map((herd) => herd.id),
  );

  return farm.paddocks.filter(
    (paddock) =>
      isGrazable(paddock) &&
      !herdIds.has(paddock.herdId),
  );
}
module.exports = { eligiblePaddocks, availableQueuePaddocks, grazingArea, totalArea, planningGroups, missingAssignments };
