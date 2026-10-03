export default function Metric({ label, value, unit }) {
  return (
    <div className="grid gap-1.5 rounded-control border border-line bg-wash px-2 py-3 text-center">
      <span className="text-tiny font-semibold">
        {label}
      </span>

      <span className="text-2xl font-bold leading-tight text-brand-dark tabular-nums">
        {value}
      </span>

      {unit && (
        <span className="text-micro text-muted">
          {unit}
        </span>
      )}
    </div>
  );
}