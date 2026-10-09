const { numberOrNull, positive } = require("./calculationHelpers");

// Calculates how many hectares need to be grazed every 24 hours.
function calculateTotalHa24h(totalArea, roundLength) {
  const area = numberOrNull(totalArea);
  if (area === null || area < 0 || !positive(roundLength)) return null;
  const result = area / Number(roundLength);
  return Number.isFinite(result) ? result : null;
}

// Calculates the pasture kgDM available per animal each day.
function calculatePastureKgDM({ totalHa24h, targetCover, residualKgDmHa, animals }) {
  const area = numberOrNull(totalHa24h),
    cover = numberOrNull(targetCover),
    residual = numberOrNull(residualKgDmHa);
  if (area === null || area < 0 || !positive(cover) || !positive(residual) || cover < residual || !positive(animals))
    return null;
  const result = (area * (cover - residual)) / Number(animals);
  return Number.isFinite(result) ? result : null;
}

// Calculates the feed surplus or shortfall compared with the herd's target intake..
function calculateFeedDifference(targetKgDM, offeredKgDM) {
  const offered = numberOrNull(offeredKgDM);
  return !positive(targetKgDM) || offered === null || offered < 0 ? null : offered - Number(targetKgDM);
}

module.exports = { calculateTotalHa24h, calculatePastureKgDM, calculateFeedDifference };
