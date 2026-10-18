import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { SelectField, InputField } from "../../components/primaryUI/FormFields.jsx";

import Button from "../../components/primaryUI/buttons/Button.jsx";
import Notice from "../../components/primaryUI/Notice.jsx";

import useWeather from "../../hooks/useWeather.js";
import useFarmCalculations from "../../hooks/useFarmCalculations.js";

import NextDaysTable from "../../components/featureComponents/planner/NextDaysTable.jsx";
import HerdCard from "../../components/featureComponents/planner/HerdCard.jsx";
import PaddockModal from "../../components/featureComponents/planner/PaddockModal.jsx";
import WeekStrip from "../../components/featureComponents/planner/WeekStrip.jsx";

import { getNextDays, getWeekDays, moveDateByDay, formatDate } from "../../utilis/calendarDates.js";

const weatherEnabled = import.meta.env.VITE_WEATHER_ENABLED === "true";

export default function PlannerPage({ farm, onChange, today, userId }) {
  const [selectedDate, setSelectedDate] = useState(today);

  const [herdFilter, setHerdFilter] = useState("all");

  const [modalGroupId, setModalGroupId] = useState(null);

  const { weather } = useWeather(farm.settings.latitude, farm.settings.longitude, weatherEnabled, 0, userId);

  // Planner calculations run immediately so the planner
  // does not disappear behind a temporary loading message.
  const calculations = useFarmCalculations({
    farm,
    userId,
    today,
    selectedDate,
    delay: 0,
  });

  const groups = calculations.data?.groups ?? farm.herds;

  const plans = calculations.data?.plans ?? {};

  const calculationsReady = Boolean(calculations.data);

  // Fall back to all herds if the selected herd has been removed.
  const effectiveFilter = groups.some((group) => group.id === herdFilter) ? herdFilter : "all";

  const visibleGroups = effectiveFilter === "all" ? groups : groups.filter((group) => group.id === effectiveFilter);

  const modalGroup = groups.find((group) => group.id === modalGroupId);

  const availableIds = modalGroup ? (calculations.data?.availablePaddockIds?.[modalGroup.id] ?? []) : [];

  const availablePaddocks = farm.paddocks.filter((paddock) => availableIds.includes(paddock.id));

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
      <header className="mb-3 md:mb-6 md:flex md:items-center md:justify-between md:gap-6">
        <h1 className="hidden md:block">Grazing planner</h1>

        <div
          className={`grid w-full min-w-0 items-center gap-1 md:w-auto lg:flex lg:gap-2.5 ${
            groups.length > 1
              ? "grid-cols-[1.75rem_auto_1.75rem_minmax(0,1.15fr)_minmax(0,0.95fr)]"
              : "grid-cols-[1.75rem_auto_1.75rem_minmax(0,1fr)]"
          }`}
        >
          <Button
            size="small"
            className="w-7 min-w-0 px-0"
            aria-label="Previous day"
            onClick={() => setSelectedDate((date) => moveDateByDay(date, -1))}
          >
            <ChevronLeft aria-hidden="true" size={16} />
          </Button>

          <Button
            size="small"
            className="min-w-0 px-1.5 text-tiny lg:px-2.5 lg:text-xs"
            onClick={() => setSelectedDate(today)}
          >
            Today
          </Button>

          <Button
            size="small"
            className="w-7 min-w-0 px-0"
            aria-label="Next day"
            onClick={() => setSelectedDate((date) => moveDateByDay(date, 1))}
          >
            <ChevronRight aria-hidden="true" size={16} />
          </Button>

          <InputField
            wrapperClassName="min-w-0 [--spacing-control:2.25rem] [--field-control-size:var(--text-micro)] lg:w-44 lg:flex-none lg:[--field-control-size:var(--text-xs)]"
            className="min-w-0 px-1 lg:px-2"
            label="View date"
            labelHidden
            type="date"
            value={selectedDate}
            onChange={(event) => event.target.value && setSelectedDate(event.target.value)}
          />

          {groups.length > 1 && (
            <SelectField
              wrapperClassName="min-w-0 [--spacing-control:2.25rem] [--field-control-size:var(--text-micro)] lg:w-36 lg:flex-none lg:[--field-control-size:var(--text-xs)]"
              className="min-w-0 px-1 lg:px-2"
              label="Filter herds"
              labelHidden
              value={effectiveFilter}
              onChange={(event) => setHerdFilter(event.target.value)}
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

      {calculations.error && (
        <Notice variant="warning" className="mb-5">
          Grazing calculations are unavailable: {calculations.error}
        </Notice>
      )}

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

      {modalGroup && calculationsReady && (
        <PaddockModal
          group={modalGroup}
          farm={farm}
          currentOrder={farm.planner.orders[modalGroup.id]}
          selectedDate={selectedDate}
          availablePaddocks={availablePaddocks}
          onClose={() => setModalGroupId(null)}
          onSave={saveOrder}
        />
      )}
    </>
  );
}
