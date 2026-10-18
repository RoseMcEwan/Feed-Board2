import { displayNumber } from "../../../utilis/numbers.js";

// Displays paddock names and allocated hectares for a grazing break.
export default function BreakLocations({ allocations, paddocks, compact = false, inline = false }) {
  return (
    <div className={compact ? "grid gap-1" : "grid gap-2"}>
      {allocations.map((allocation, index) => (
        <div
          key={`${allocation.paddockId}-${index}`}
          className={
            inline
              ? "flex items-baseline gap-1 @3xl/week:gap-3"
              : compact
                ? "flex min-w-0 items-baseline gap-[clamp(0.125rem,4cqw,0.5rem)] @3xl/week:justify-between @3xl/week:gap-3"
                : "flex items-baseline justify-between gap-3"
          }
        >
          <strong
            className={
              compact
                ? "shrink-0 whitespace-nowrap text-xs font-semibold text-herd @3xl/week:text-sm"
                : "min-w-0 text-feature font-semibold text-herd wrap-anywhere"
            }
          >
            {paddocks.find((paddock) => paddock.id === allocation.paddockId)?.name || "Removed paddock"}
          </strong>

          {inline && (
            <span aria-hidden="true" className="text-muted">
              ·
            </span>
          )}

          <span
            className={`shrink-0 whitespace-nowrap tabular-nums font-bold ${
              compact ? "text-xs @3xl/week:text-sm" : "text-lg"
            }`}
          >
            {displayNumber(allocation.hectares, 2)} <small className="text-tiny text-muted">ha</small>
          </span>
        </div>
      ))}
    </div>
  );
}
