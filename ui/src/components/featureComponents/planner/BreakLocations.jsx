import { displayNumber } from "../../../utilis/numbers.js";

export default function BreakLocations({ allocations, paddocks, compact = false, inline = false }) {

  return (
    <div className={compact ? "grid gap-1" : "grid gap-2"}>
      {allocations.map((allocation, index) => (
        <div
          key={`${allocation.paddockId}-${index}`}
          className={
            inline
              ? "flex items-baseline gap-1 @3xl/week:gap-3"
              : `flex items-baseline gap-3 ${compact ? "justify-start" : "justify-between"}`
          }
        >
          <strong
            className={
              inline
                ? "min-w-0 text-xs font-semibold text-herd wrap-anywhere @3xl/week:min-w-10 @3xl/week:text-sm"
                : `font-semibold text-herd wrap-anywhere ${compact ? "min-w-10 text-sm" : "min-w-0 text-feature"}`
            }
          >
            {paddocks.find((paddock) => paddock.id === allocation.paddockId)?.name || "Removed paddock"}
          </strong>

          {inline && (
            <span aria-hidden="true" className="text-muted @3xl/week:hidden">
              ·
            </span>
          )}

          <span
            className={`shrink-0 whitespace-nowrap tabular-nums font-bold ${
              inline ? "text-xs @3xl/week:text-sm" : compact ? "text-sm" : "text-lg"
            }`}
          >
            {displayNumber(allocation.hectares, 2)} <small className="text-tiny text-muted">ha</small>
          </span>
        </div>
      ))}
    </div>
  );
}
