const headerStyles = {
  col: "bg-wash font-bold text-muted",
  row: "border-t border-line-subtle bg-surface font-semibold whitespace-nowrap text-ink",
};

export default function DataTable({
  children,
  className = "",
  compact = false,
  fixed = false,
  label,
  caption,
  ...props
}) {
  const tableClasses = [
    "w-full border-separate border-spacing-0 bg-surface text-caption",
    compact && "[--field-control-size:var(--text-caption)] [--checkbox-label-size:var(--text-xs)]",
    fixed && "table-fixed",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="relative w-full min-w-0 rounded-panel border border-line">
      <table className={tableClasses} aria-label={label} {...props}>
        {caption && <caption className="sr-only">{caption}</caption>}

        {children}
      </table>
    </div>
  );
}

export function TableHeader({ children, scope = "col", className = "", ...props }) {
  const headerClasses = headerStyles[scope] ?? headerStyles.col;

  const classes = ["px-4 py-3 text-left text-xs", headerClasses, className].filter(Boolean).join(" ");

  return (
    <th {...props} scope={scope} className={classes}>
      {children}
    </th>
  );
}

export function TableCell({ children, className = "", ...props }) {
  const classes = ["border-t border-line-subtle px-4 py-3 align-top", className].filter(Boolean).join(" ");

  return (
    <td {...props} className={classes}>
      {children}
    </td>
  );
}
