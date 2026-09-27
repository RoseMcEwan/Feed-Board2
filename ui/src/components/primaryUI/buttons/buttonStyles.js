// Full literal class names let Tailwind discover every supported variant at build time.
// className is for placement (e.g. mt-4, w-full), not overriding variant/size styles.
const variants = {
  primary:
    "border-brand bg-brand text-inverse [&:not(:disabled)]:hover:border-brand-dark [&:not(:disabled)]:hover:bg-brand-dark",
  secondary:
    "border-info-line bg-surface text-ink [&:not(:disabled)]:hover:border-accent-line [&:not(:disabled)]:hover:bg-info-soft",
  danger:
    "border-danger bg-danger text-inverse [&:not(:disabled)]:hover:bg-danger-soft [&:not(:disabled)]:hover:text-danger",
  text: "border-transparent bg-transparent text-brand [&:not(:disabled)]:hover:bg-brand-subtle",
};
const sizes = {
  small: "min-h-9 px-2.5 py-1.5 text-xs",
  medium: "min-h-11 px-4 py-2.5 text-caption",
  large: "min-h-12 px-4 py-3 text-sm",
  icon: "size-10 shrink-0 p-1 text-lg",
};

export function buttonClasses({
  variant = "secondary",
  size = "medium",
  className = "",
} = {}) {
  const colours = Object.hasOwn(variants, variant)
    ? variants[variant]
    : variants.secondary;
  const dimensions = Object.hasOwn(sizes, size) ? sizes[size] : sizes.medium;
  return [
    "inline-flex items-center justify-center gap-2 rounded-control border text-center font-semibold leading-snug no-underline transition-colors duration-150",
    colours,
    dimensions,
    className,
  ]
    .filter(Boolean)
    .join(" ");
}
