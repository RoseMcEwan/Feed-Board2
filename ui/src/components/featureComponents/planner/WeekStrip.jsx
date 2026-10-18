// Finds the weather record for the requested day.
function getWeatherForDay(date, weather) {
  const middayWeather = weather.find((item) => item.time.startsWith(`${date}T00`));

  if (middayWeather) return middayWeather;

  return weather.find((item) => item.time.startsWith(date));
}

// Matches the Yr/MET weather symbol code to the same emoji used in the old FeedBoard.
function getWeatherEmoji(symbolCode) {
  const emojis = {
    clearsky_day: "☀️",
    fair_day: "🌤️",
    partlycloudy_day: "⛅",
    cloudy: "☁️",
    fog: "🌫️",
    lightrain: "🌦️",
    rain: "🌧️",
    heavyrain: "🌧️",
    lightrainshowers_day: "🌦️",
    rainshowers_day: "🌦️",
    heavyrainshowers_day: "🌧️",
    lightsnow: "🌨️",
    snow: "🌨️",
    heavysnow: "❄️",
    lightsnowshowers_day: "🌨️",
    snowshowers_day: "🌨️",
    heavysnowshowers_day: "❄️",
    sleet: "🌨️",
    lightsleet: "🌨️",
    heavysleet: "🌨️",
    thunderstorm: "⛈️",
    rainandthunder: "⛈️",
  };

  return emojis[symbolCode] ?? "☁️";
}

// Displays the seven-day planner strip with Yr/MET weather data.
export default function WeekStrip({ days, weather, selectedDate, onSelectDate, today }) {
  return (
    <nav className="mb-8 grid grid-cols-7 gap-1 sm:gap-2.5" aria-label="Choose a day">
      {days.map((day) => {
        const dayWeather = getWeatherForDay(day.date, weather);
        const temperature = dayWeather?.data?.instant?.details?.air_temperature;
        const symbolCode = dayWeather?.data?.next_6_hours?.summary?.symbol_code;
        const weatherEmoji = symbolCode ? getWeatherEmoji(symbolCode) : "";
        const [weekday, ...dayLabel] = day.label.split(" ");

        return (
          <button
            key={day.date}
            type="button"
            className="group/day flex min-h-24 min-w-0 flex-col items-center gap-1 rounded-panel border border-line bg-surface px-0.5 py-2.5 text-ink hover:border-control-hover sm:min-h-28 sm:px-2 sm:py-4 aria-[current=date]:border-brand aria-[current=date]:bg-brand aria-[current=date]:shadow-selection"
            aria-current={day.date === selectedDate ? "date" : undefined}
            onClick={() => onSelectDate(day.date)}
          >
            <span className="text-micro text-muted group-aria-[current=date]/day:text-inverse-muted sm:text-xs">
              {weekday}
            </span>

            <strong className="text-xl font-semibold text-brand-dark group-aria-[current=date]/day:text-inverse sm:text-metric">
              {dayLabel.join(" ")}
            </strong>

 <span className="mt-1 flex flex-col items-center justify-center gap-0.5 sm:flex-row sm:gap-1.5">
  {temperature !== undefined ? (
    <>
      <span className="text-sm leading-none sm:text-lg" aria-hidden="true">
        {weatherEmoji}
      </span>
      <span className="whitespace-nowrap text-micro font-medium text-muted group-aria-[current=date]/day:text-inverse sm:text-sm">
        {Math.round(temperature)}°C
      </span>
    </>
  ) : day.date === today ? (
    <span className="text-micro text-muted group-aria-[current=date]/day:text-inverse sm:text-xs">
      Today
    </span>
  ) : (
    <span className="text-micro text-muted sm:text-xs">
      View day
    </span>
  )}
</span>
          </button>
        );
      })}
    </nav>
  );
}
