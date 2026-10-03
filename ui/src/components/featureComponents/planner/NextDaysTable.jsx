import DataTable, { TableHeader, TableCell } from "../../primaryUI/DataTable.jsx";
import { formatDate } from "../../../utilis/calendarDates.js";
import BreakLocations from "./BreakLocations.jsx";

export default function NextDaysTable({ days, groups, paddocks, plans }) {
  return (
    <section className="@container/week mt-8 min-w-0">
      <h2>Week ahead</h2>

      <DataTable
        label="Week ahead grazing plan"
        caption="Upcoming grazing breaks by group and day"
        fixed
        style={{ minWidth: `${3 + groups.length * 4.5}rem` }}
        className="@max-3xl/week:[&_th]:px-2 @max-3xl/week:[&_th]:py-2 @max-3xl/week:[&_td]:px-2 @max-3xl/week:[&_td]:py-2"
      >
        <thead>
          <tr>
            <TableHeader className="w-12 @3xl/week:w-36">Day</TableHeader>
            {groups.map((group) => (
              <TableHeader key={group.id} className="border-l border-line-subtle align-top">
                <span data-herd-colour={group.colour} className="flex items-start gap-1 @3xl/week:gap-2">
                  <span className="mt-1 inline-block size-1.5 shrink-0 rounded-full bg-herd-accent @3xl/week:size-2.25" />
                  <span className="min-w-0 wrap-anywhere">{group.name}</span>
                </span>
              </TableHeader>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.length ? (
            days.map((day) => (
              <tr key={day.date}>
                <TableHeader scope="row">
                  <span className="@3xl/week:hidden">
                    <span className="block">{formatDate(day.date, "EEE")}</span>

                    <span className="block text-micro">{formatDate(day.date, "d MMM")}</span>
                  </span>

                  <span className="hidden @3xl/week:inline">{formatDate(day.date, "EEE d MMM")}</span>
                </TableHeader>
                {groups.map((group) => (
                  <TableCell key={group.id} data-herd-colour={group.colour} className="border-l border-line-subtle">
                    <GroupBreaks periods={plans[group.id]?.[day.date]} paddocks={paddocks} />
                  </TableCell>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <TableCell>No herds to display.</TableCell>
            </tr>
          )}
        </tbody>
      </DataTable>
    </section>
  );
}

function GroupBreaks({ periods, paddocks }) {
  if (!periods?.length) {
    return <span className="text-xs text-muted">{periods ? "No shift scheduled" : "No saved plan"}</span>;
  }

  // Show only the first exhausted empty period so AM/PM do not repeat the same warning.
  const firstEmptyExhaustedIndex = periods.findIndex((period) => period.exhausted && !period.allocations?.length);

  return (
    <div className="grid min-w-0 gap-2 @3xl/week:gap-4">
      {periods.map((period, index) => {
        const noAllocations = !period.allocations?.length;

        const duplicateQueueWarning = period.exhausted && noAllocations && index !== firstEmptyExhaustedIndex;

        if (duplicateQueueWarning) {
          return null;
        }

        return (
          <div
            key={period.key}
            className="grid min-w-0 grid-cols-[2.25rem_minmax(0,1fr)] items-start gap-x-2 gap-y-1 @3xl/week:grid-cols-1"
          >
            {/* Use a shorter stacked date for responspive layout */}
            <span className="text-micro font-semibold text-muted">
              <span className="@3xl/week:hidden">{period.label}</span>
              <span className="hidden @3xl/week:inline">
                {period.label} · {period.time} </span>
            </span>

            <div className="min-w-0">
              {period.exhausted && noAllocations ? (
                <span className="text-xs font-medium text-warning">Queue used up</span>
              ) : (
                <>
                  <BreakLocations allocations={period.allocations} paddocks={paddocks} compact />

                  {period.exhausted && (
                    <small className="mt-1 block text-xs font-medium text-warning">Queue used up</small>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
