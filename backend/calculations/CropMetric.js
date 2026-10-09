const { addCalendarDays, daysBetween, todayISO, isValidDate, positive } = require("./calculationHelpers");

// Calculates the feeding status and remaining feed for one crop, paddock and herd.
function calculateCropMetrics({ crop, paddock, herd, today = todayISO() }) {
  if (
    !crop ||
    !paddock ||
    !herd ||
    !positive(paddock.hectares) ||
    !positive(crop.yieldKgDMHa) ||
    !positive(crop.kgDMPerAnimalDay) ||
    !positive(herd.animals) ||
    !isValidDate(crop.startDate) ||
    !isValidDate(today)
  ) {
    return {
      valid: false,
      status: "incomplete",
    };
  }

  const totalKgDM = Number(crop.yieldKgDMHa) * Number(paddock.hectares);
  const dailyKgDM = Number(crop.kgDMPerAnimalDay) * Number(herd.animals);
  const totalDays = totalKgDM / dailyKgDM;
  const daysSinceStart = daysBetween(today, crop.startDate);

  if (
    !Number.isFinite(totalDays) ||
    !Number.isFinite(totalKgDM) ||
    !Number.isFinite(dailyKgDM) ||
    daysSinceStart === null
  ) {
    return { valid: false, status: "incomplete" };
  }

  const elapsedDays = Math.max(0, daysSinceStart);
  const daysRemaining = Math.max(0, totalDays - elapsedDays);
  const remainingKgDM = Math.max(0, totalKgDM - dailyKgDM * elapsedDays);
  const status = daysSinceStart < 0 ? "scheduled" : daysRemaining <= 0 ? "finished" : "feeding";

  return {
    valid: true,
    status,
    daysRemaining,
    elapsedDays,
    finishDate: addCalendarDays(crop.startDate, Math.ceil(totalDays)),
    lastFeedingDate: addCalendarDays(crop.startDate, Math.ceil(totalDays) - 1),
    todayKgDMPerAnimal:
      status === "feeding" ? Math.min(Number(crop.kgDMPerAnimalDay), remainingKgDM / Number(herd.animals)) : 0,
  };
}

// Calculates today's total crop intake per animal for a herd.
function cropIntakeForHerd(farm, herdId, today = todayISO()) {
  const herd = farm.herds.find((herd) => herd.id === herdId);

  return farm.crops
    .filter((crop) => crop.herdId === herdId)
    .reduce((sum, crop) => {
      const paddock = farm.paddocks.find((paddock) => paddock.id === crop.paddockId);

      if (!paddock?.excluded || paddock.exclusionReason !== "crop") return sum;

      const result = calculateCropMetrics({
        crop,
        paddock,
        herd,
        today,
      });

      return sum + (result.todayKgDMPerAnimal ?? 0);
    }, 0);
}

module.exports = { calculateCropMetrics, cropIntakeForHerd };
