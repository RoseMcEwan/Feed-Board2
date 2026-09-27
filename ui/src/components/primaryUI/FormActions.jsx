const alignments = {
  start: "justify-start",
  end: "justify-end",
};

export default function FormActions({
  children,
  align = "end",
  className = "",
  ...props
}) {
  const alignmentClasses = alignments[align] ?? alignments.end;

  const classes = [
    "flex flex-wrap items-center gap-2 sm:gap-3",
    alignmentClasses,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div {...props} className={classes}>

      {children}
    </div>
  );
}
