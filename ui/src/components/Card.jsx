const variants = {
  surface: "border-line bg-surface",
  subtle: "border-line bg-subtle",
  info: "border-info-line bg-info-soft",
  dashed: "border-accent-line border-dashed bg-surface",
};
const paddings = {
  normal: "p-4 sm:p-6",
  small: "p-4",
  none: "p-0",
};

/** Shared container appearance. The parent owns content and placement. */
export default function Card({
  as: Element = "div",
  children,
  variant = "surface",
  padding = "normal",
  className = "",
  ...props
}) {
  const classes = [
    "@container min-w-0 rounded-card border",
    Object.hasOwn(variants, variant) ? variants[variant] : variants.surface,
    Object.hasOwn(paddings, padding) ? paddings[padding] : paddings.normal,
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <Element {...props} className={classes}>
      {children}
    </Element>
  );
}
