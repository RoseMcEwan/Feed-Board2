const variants = {
  surface: "border-line bg-surface",
  subtle: "border-line bg-subtle",
  info: "border-info-line bg-info-soft",
  dashed: "border-accent-line border-dashed bg-surface",
}

const paddings = {
  normal: "p-4 sm:p-6",
  small: "p-4",
  none: "p-0",
}

export default function Card({
  children,
  variant = "surface",
  padding = "normal",
  className = "",
  ...props
}) {
  const classes = [
    "min-w-0 rounded-card border",
    variants[variant] ?? variants.surface,
    paddings[padding] ?? paddings.normal,
    className,
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <div {...props} className={classes}>
      {children}
    </div>
  )
}
