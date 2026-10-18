const { addCalendarDays, daysBetween, nonNegative, DEFAULT_TOLERANCE_HA } = require("./calculationHelpers");
const { availableQueuePaddocks } = require("./farmSelectors");
const { calculateTotalHa24h } = require("./calculateFeedMetrics");
const { validateSchedule } = require("../middleware/farmValidation");

// Creates the AM and PM paddock grazing plan from the herd's paddock queue.
function calculatePaddockPlan({ farm, group, order, endDate, fromDate }) {
  if (!order?.startDate || !Array.isArray(order.paddockIds) || !group) {
    return {};
  }

  const dayCount = daysBetween(endDate, order.startDate);
  const dailyHa = calculateTotalHa24h(group.totalArea, farm.settings.roundLength);

  if (
    dayCount === null ||
    dayCount < 0 ||
    dayCount > 3650 ||
    !Number.isFinite(dailyHa) ||
    dailyHa <= 0 ||
    validateSchedule(farm.settings.schedule).length
  ) {
    return {};
  }

  const available = availableQueuePaddocks(farm, group.id);
  const queue = [...new Set(order.paddockIds)]
    .map((id) => available.find((paddock) => paddock.id === id))
    .filter(Boolean);
  const tolerance = nonNegative(farm.settings.paddockToleranceHa ?? DEFAULT_TOLERANCE_HA);
  const { am, pm } = farm.settings.schedule;
  const minutes = (time) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  const amHours = (minutes(pm) - minutes(am)) / 60;

  let paddockIndex = 0;
  let remainingHa = nonNegative(queue[0]?.hectares);

  function allocate(targetHa) {
    let needed = targetHa;
    const allocations = [];

    while (needed > 1e-9 && paddockIndex < queue.length) {
      const paddock = queue[paddockIndex];

      if (remainingHa <= 1e-9) {
        paddockIndex += 1;
        remainingHa = nonNegative(queue[paddockIndex]?.hectares);
        continue;
      }
      if (remainingHa >= needed) {
        const use = remainingHa - needed <= tolerance ? remainingHa : needed;
        allocations.push({
          paddockId: paddock.id,
          hectares: use,
        });
        remainingHa -= use;
        needed = 0;
      } else {
        allocations.push({
          paddockId: paddock.id,
          hectares: remainingHa,
        });
        needed -= remainingHa;
        remainingHa = 0;
        if (needed <= tolerance) {
          needed = 0;
        }
      }
      if (remainingHa <= 1e-9) {
        paddockIndex += 1;
        remainingHa = nonNegative(queue[paddockIndex]?.hectares);
      }
    }

    const allocatedHa = allocations.reduce((sum, allocation) => sum + allocation.hectares, 0);

    return {
      allocations,
      allocatedHa,
      differenceHa: allocatedHa - targetHa,
      exhausted: paddockIndex >= queue.length && targetHa - allocatedHa > 1e-9,
    };
  }

  const plan = {};

  for (let day = 0; day <= dayCount; day += 1) {
    const date = addCalendarDays(order.startDate, day);
    const periods = [
      {
        key: `${date}-am`,
        label: "AM",
        time: am,
        nextTime: pm,
        nextDate: date,
        hours: amHours,
      },
      {
        key: `${date}-pm`,
        label: "PM",
        time: pm,
        nextTime: am,
        nextDate: addCalendarDays(date, 1),
        hours: 24 - amHours,
      },
    ];

    const breaks = periods.map((period) => {
      const targetHa = (dailyHa * period.hours) / 24;

      return {
        ...period,
        targetHa,
        ...allocate(targetHa),
      };
    });

    if (!fromDate || date >= fromDate) plan[date] = breaks;
  }

  return plan;
}

module.exports = calculatePaddockPlan;
