import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { SelectField, InputField } from "../../components/primaryUI/FormFields.jsx";
import Button from "../../components/primaryUI/buttons/Button.jsx";
import useWeather from "../../hooks/useWeather.js";
import NextDaysTable from "../../components/featureComponents/planner/NextDaysTable.jsx";
import HerdCard from "../../components/featureComponents/planner/HerdCard.jsx";
import PaddockModal from "../../components/featureComponents/planner/PaddockModal.jsx";
import WeekStrip from "../../components/featureComponents/planner/WeekStrip.jsx";
import calculatePaddockPlan from "../../calculations/calculatePaddockPlan.js";
import { getNextDays, getWeekDays, moveDateByDay, addCalendarDays, formatDate } from "../../utilis/calendarDates.js";
import { planningGroups } from "../../utilis/farmSelectors.js";

const weatherEnabled = import.meta.env.VITE_WEATHER_ENABLED === "true";

export default function PlannerPage({ farm, onChange, today }) {
  const [selectedDate, setSelectedDate] = useState(today);
  const [herdFilter, setHerdFilter] = useState("all");
  const [modalGroupId, setModalGroupId] = useState(null);

  const { weather } = useWeather(farm.settings.latitude, farm.settings.longitude, weatherEnabled, 0);

  const groups = useMemo(() => planningGroups(farm), [farm]);

  // Fall back to all herds if the selected herd has been removed.
  const effectiveFilter = groups.some((group) => group.id === herdFilter) ? herdFilter : "all";

  const visibleGroups = effectiveFilter === "all" ? groups : groups.filter((group) => group.id === effectiveFilter);

  // One seven-day plan supplies both today's cards and the week-ahead table.
  const plans = useMemo(
    () =>
      Object.fromEntries(
        groups.map((group) => [
          group.id,
          calculatePaddockPlan({
            farm,
            group,
            order: farm.planner.orders[group.id],
            endDate: addCalendarDays(selectedDate, 6),
          }),
        ]),
      ),
    [farm, groups, selectedDate],
  );

  const modalGroup = groups.find((group) => group.id === modalGroupId);

  function saveOrder(order) {
    onChange({
      ...farm,
      planner: {
        ...farm.planner,
        orders: {
          ...farm.planner.orders,
          [modalGroupId]: order,
        },
      },
    });
  }

  return (
    <>
      <PlannerPageHeader
        groups={groups}
        selectedDate={selectedDate}
        herdFilter={effectiveFilter}
        onChangeHerd={setHerdFilter}
        onSelectDate={setSelectedDate}
        onPreviousDay={() => setSelectedDate((date) => moveDateByDay(date, -1))}
        onToday={() => setSelectedDate(today)}
        onNextDay={() => setSelectedDate((date) => moveDateByDay(date, 1))}
      />

      <WeekStrip
        days={getWeekDays(selectedDate)}
        weather={weather}
        selectedDate={selectedDate}
        today={today}
        onSelectDate={setSelectedDate}
      />

      <section>
        <h2>{selectedDate === today ? "Today’s grazing" : formatDate(selectedDate, "EEEE d MMM")}</h2>

        <div className="grid gap-5 md:grid-cols-2">
          {visibleGroups.map((group) => (
            <HerdCard
              key={group.id}
              group={group}
              periods={plans[group.id]?.[selectedDate]}
              paddocks={farm.paddocks}
              order={farm.planner.orders[group.id]}
              date={selectedDate}
              onChangePaddock={() => setModalGroupId(group.id)}
            />
          ))}
        </div>
      </section>

      <NextDaysTable days={getNextDays(selectedDate)} groups={visibleGroups} paddocks={farm.paddocks} plans={plans} />

      {modalGroup && (
        <PaddockModal
          group={modalGroup}
          farm={farm}
          currentOrder={farm.planner.orders[modalGroup.id]}
          selectedDate={selectedDate}
          onClose={() => setModalGroupId(null)}
          onSave={saveOrder}
        />
      )}
    </>
  );
}

function PlannerPageHeader({
  groups,
  herdFilter,
  onChangeHerd,
  selectedDate,
  onSelectDate,
  onPreviousDay,
  onToday,
  onNextDay,
}) {
  const hasHerdFilter = groups.length > 1;

  return (
    <header className="mb-3 md:mb-6 md:flex md:items-center md:justify-between md:gap-6">
      <h1 className="hidden md:block">Grazing planner</h1>

      <div
        className={`grid w-full min-w-0 items-center gap-1 md:w-auto lg:flex lg:gap-2.5 ${
          hasHerdFilter
            ? "grid-cols-[1.75rem_auto_1.75rem_minmax(0,1.15fr)_minmax(0,0.95fr)]"
            : "grid-cols-[1.75rem_auto_1.75rem_minmax(0,1fr)]"
        }`}
      >
        <Button size="small" className="w-7 min-w-0 px-0" aria-label="Previous day" onClick={onPreviousDay}>
          <ChevronLeft aria-hidden="true" size={16} />
        </Button>

        <Button size="small" className="min-w-0 px-1.5 text-tiny lg:px-2.5 lg:text-xs" onClick={onToday}>
          Today
        </Button>

        <Button size="small" className="w-7 min-w-0 px-0" aria-label="Next day" onClick={onNextDay}>
          <ChevronRight aria-hidden="true" size={16} />
        </Button>

        <InputField
          wrapperClassName="min-w-0 [--spacing-control:2.25rem] [--field-control-size:var(--text-micro)] lg:w-44 lg:flex-none lg:[--field-control-size:var(--text-xs)]"
          className="min-w-0 px-1 lg:px-2"
          label="View date"
          labelHidden
          type="date"
          value={selectedDate}
          onChange={(event) => event.target.value && onSelectDate(event.target.value)}
        />

        {hasHerdFilter && (
          <SelectField
            wrapperClassName="min-w-0 [--spacing-control:2.25rem] [--field-control-size:var(--text-micro)] lg:w-36 lg:flex-none lg:[--field-control-size:var(--text-xs)]"
            className="min-w-0 px-1 lg:px-2"
            label="Filter herds"
            labelHidden
            value={herdFilter}
            onChange={(event) => onChangeHerd(event.target.value)}
            options={[
              {
                value: "all",
                label: "All herds",
              },
              ...groups.map((group) => ({
                value: group.id,
                label: group.name,
              })),
            ]}
          />
        )}
      </div>
    </header>
  );
}
