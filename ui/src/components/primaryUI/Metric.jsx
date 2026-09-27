const tones = {
  default: {
    container: "border-line bg-wash",
    value: "text-brand-dark",
  },
  warning: {
    container: "border-warning-line bg-warning-soft",
    value: "text-warning",
  },
};

export default function Metric({
  label,
  value,
  unit,
  tone = "default",
  compactOnMobile = false,
}) {
  const toneClasses = tones[tone] ?? tones.default;

  const containerClasses = [
    "rounded-control border px-2 py-3",
    toneClasses.container,
    compactOnMobile
      ? "flex items-center gap-2.5 text-left sm:grid sm:gap-1.5 sm:text-center"
      : "grid gap-1.5 text-center",
  ].join(" ");

  const labelClasses = [
    "text-tiny font-semibold",
    compactOnMobile ? "mr-auto sm:mr-0" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const valueClasses = [
    "font-bold leading-tight tabular-nums",
    toneClasses.value,
    compactOnMobile ? "text-xl sm:text-2xl" : "text-2xl",
  ].join(" ");

  return (
    <div className={containerClasses}>
      <span className={labelClasses}>{label}</span>

      <span className={valueClasses}>{value}</span>

      {unit && <span className="text-micro text-muted">{unit}</span>}
    </div>
  );
}
