import Card from "../../primaryUI/Card.jsx";
import HerdTitle from "../../primaryUI/HerdTitle.jsx";
import BreakLocations from "./BreakLocations.jsx";
import Button from "../../primaryUI/buttons/Button.jsx";
import { displayNumber } from "../../../utilis/numbers.js";
import { formatDate } from "../../../utilis/calendarDates.js";

// Reuse the same message layout for small states.
function HerdCardMessage({ message, detail }) {
    return (
      <div className="px-6 py-7 text-center text-muted">
        <p className="mb-1.5 text-sm">{message}</p>
        <small className="text-xs">{detail}</small>
      </div>
    );
  }

export default function HerdCard({ group, periods, paddocks, order, date, onChangePaddock }) {

  return (
    <Card padding="none" className="border-t-3 border-t-herd-accent" data-herd-colour={group.colour}>
      <header className="flex flex-wrap items-center justify-between gap-2.5 p-3 sm:gap-3 sm:p-4 sm:px-5">
        <HerdTitle herd={group} />

        <Button size="small" onClick={onChangePaddock}>
          {order ? "Edit paddock order" : "Select paddocks"}
        </Button>
      </header>

      {/* Distinguish a queue that has not started yet from a missing daily plan. */}
      {!order ? (
        <HerdCardMessage
          message="Choose the next paddocks for this herd."
          detail="FeedBoard will allocate each break around your timetable."
        />
      ) : !periods ? (
        <HerdCardMessage
          message={
            date < order.startDate
              ? `This queue starts ${formatDate(order.startDate)}.`
              : "No plan available for this date."
          }
          detail="Check the start date, grazing area and round length."
        />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,var(--container-break)),1fr))]">
          {periods.map((period) => (
            <section
              className="min-w-0 border-b border-line-subtle bg-linear-to-b from-herd-soft to-surface p-3 sm:p-5"
              key={period.key}
            >
              <div className="mb-3 flex items-center justify-between gap-2 sm:mb-5">
                <strong className="text-sm text-herd">
                  {period.label} · {period.time}
                </strong>

                <span className="text-micro text-muted">{displayNumber(period.hours)} hours</span>
              </div>

              <BreakLocations allocations={period.allocations} paddocks={paddocks} />

              <div className="mt-2 flex flex-col gap-0.5 text-micro text-muted sm:mt-4">
                Target {displayNumber(period.targetHa, 2)} ha
                {/* Ignore tiny floating-point differences before showing a rounding adjustment. */}
                {Math.abs(period.differenceHa) > 0.0001 && (
                  <span className="text-warning">
                    {period.differenceHa >= 0 ? "+" : "−"}
                    {displayNumber(Math.abs(period.differenceHa), 2)} ha rounded
                  </span>
                )}
              </div>

              {period.exhausted && (
                <p className="mt-1 mb-0 text-xs font-medium text-warning">Queue used up</p>
              )}
            </section>
          ))}
        </div>
      )}
    </Card>
  );
}
