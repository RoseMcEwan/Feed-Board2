const calculatePaddockPlan = require("./calculatePaddockPlan");
const { calculateTotalHa24h, calculatePastureKgDM, calculateFeedDifference } = require("./calculateFeedMetrics");
const { calculateCropMetrics, cropIntakeForHerd } = require("./CropMetric");
const {
  planningGroups,
  grazingArea,
  totalArea,
  missingAssignments,
  availableQueuePaddocks,
} = require("./farmSelectors");
const { addCalendarDays } = require("./calculationHelpers");

// Calculates all farm metrics, crop results and planner data needed by the UI.
function calculateFarm({ farm, today, selectedDate = null }) {
  const groups = planningGroups(farm);
  const totalHa = totalArea(farm);
  const grazingHa = grazingArea(farm);
  const herdMetrics = {};
  const cropMetrics = {};
  const availablePaddockIds = {};
  const plans = {};

  for (const group of groups) {
    const area = group.totalArea;
    const dailyHa = calculateTotalHa24h(area, farm.settings.roundLength);
    const pasture = calculatePastureKgDM({
      totalHa24h: dailyHa,
      targetCover: farm.settings.targetCover,
      residualKgDmHa: farm.settings.residualKgDmHa,
      animals: group.animals,
    });
    const crop = cropIntakeForHerd(farm, group.id, today);
    const offered = pasture === null ? null : pasture + crop;
    const difference = calculateFeedDifference(group.targetKgDMDay, offered);
    herdMetrics[group.id] = { area, dailyHa, pasture, crop, offered, difference };
    availablePaddockIds[group.id] = availableQueuePaddocks(farm, group.id).map((paddock) => paddock.id);

    if (selectedDate) {
      plans[group.id] = calculatePaddockPlan({
        farm,
        group,
        order: farm.planner.orders[group.id],
        fromDate: selectedDate,
        endDate: addCalendarDays(selectedDate, 6),
      });
    }
  }

  for (const crop of farm.crops) {
    const paddock = farm.paddocks.find((item) => item.id === crop.paddockId);
    const herd = farm.herds.find((item) => item.id === crop.herdId);
    cropMetrics[crop.id] =
      paddock?.excluded && paddock.exclusionReason === "crop"
        ? calculateCropMetrics({ crop, paddock, herd, today })
        : { valid: false, status: "incomplete" };
  }

  return {
    today,
    selectedDate,
    summary: {
      totalHa,
      grazingHa,
      excludedHa: totalHa - grazingHa,
      unassignedPaddockIds: missingAssignments(farm).map((paddock) => paddock.id),
    },
    groups,
    herdMetrics,
    cropMetrics,
    availablePaddockIds,
    plans,
  };
}

module.exports = { calculateFarm };
