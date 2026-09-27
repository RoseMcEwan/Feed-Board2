const variants = {
  info: "border-info-line bg-info-soft text-ink",
  warning: "border-warning-line bg-warning-soft text-warning",
  error: "border-danger-line bg-danger-soft text-danger",
  success: "border-success-line bg-success-soft text-success",
  muted: "border-line bg-wash text-muted",
};

export default function Notice({
  children,
  variant = "info",
  compact = false,
  role,
  className = "",
  ...props
}) {
  const variantClasses = variants[variant] ?? variants.info;

  const classes = [
    "rounded-control border [&_ul]:mt-1.5 [&_ul]:list-disc [&_ul]:pl-5",
    variantClasses,
    compact
      ? "p-3 text-tiny leading-relaxed"
      : "px-4 py-3 text-caption leading-relaxed",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      {...props}
      role={role ?? (variant === "error" ? "alert" : undefined)}
      className={classes}
    >
      {children}
    </div>
  );
}
