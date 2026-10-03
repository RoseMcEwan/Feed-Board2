import { useId } from "react";

const controlClasses = [
  "w-full min-w-0 border border-control bg-surface px-3 py-2.5 font-normal text-ink",
  "text-[length:var(--field-control-size,var(--text-sm))]",
  "enabled:hover:border-control-hover",
  "disabled:cursor-not-allowed disabled:bg-wash disabled:text-muted",
  "placeholder:text-caption placeholder:text-faint",
].join(" ");

function Field({
  label,
  id,
  children,
  unit,
  error,
  labelHidden = false,
  wrapperClassName = "",
}) {
  const classes = [
    "grid min-w-0 gap-1.5 text-caption font-semibold text-ink",
    wrapperClassName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      <label htmlFor={id} className={labelHidden ? "sr-only" : undefined}>
        {label}
      </label>

      {unit ? (
        <div className="flex min-w-0">
          {children}

          <span
            id={`${id}-unit`}
            className="flex items-center rounded-r-control border border-l-0 border-control bg-wash px-2.5 text-xs font-medium whitespace-nowrap"
          >
            {unit}
          </span>
        </div>
      ) : (
        children
      )}

      {error && (
        <span id={`${id}-error`} className="text-xs font-medium text-danger">
          {error}
        </span>
      )}
    </div>
  );
}

export function InputField({
  label,
  value,
  type = "text",
  unit,
  error,
  labelHidden,
  wrapperClassName,
  className = "",
  ...props
}) {
  const id = useId();

  // Link unit and error text to the input.
  const describedBy =
    [unit && `${id}-unit`, error && `${id}-error`].filter(Boolean).join(" ") ||
    undefined;

  const classes = [
    controlClasses,
    "h-control",
    unit ? "flex-1 rounded-l-control" : "rounded-control",
    error && "border-danger",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Field
      label={label}
      id={id}
      unit={unit}
      error={error}
      labelHidden={labelHidden}
      wrapperClassName={wrapperClassName}
    >
      <input
        {...props}
        id={id}
        type={type}
        value={value ?? ""}
        className={classes}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
      />
    </Field>
  );
}

export function SelectField({
  label,
  options,
  value,
  labelHidden,
  wrapperClassName,
  className = "",
  ...props
}) {
  const id = useId();

  return (
    <Field
      label={label}
      id={id}
      labelHidden={labelHidden}
      wrapperClassName={wrapperClassName}
    >
      <select
        {...props}
        id={id}
        value={value ?? ""}
        className={[controlClasses, "h-control rounded-control", className]
          .filter(Boolean)
          .join(" ")}
      >
        {options.map((option) => {
          const item =
            typeof option === "object"
              ? option
              : { value: option, label: option };

          return (
            <option
              key={item.value}
              value={item.value}
              disabled={item.disabled}
            >
              {item.label}
            </option>
          );
        })}
      </select>
    </Field>
  );
}

export function TextareaField({
  label,
  value,
  labelHidden,
  wrapperClassName,
  className = "",
  ...props
}) {
  const id = useId();

  return (
    <Field
      label={label}
      id={id}
      labelHidden={labelHidden}
      wrapperClassName={wrapperClassName}
    >
      <textarea
        {...props}
        id={id}
        value={value ?? ""}
        className={[
          controlClasses,
          "min-h-28 resize-y rounded-control",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      />
    </Field>
  );
}

export function CheckboxField({ label, className = "", ...props }) {
  const id = useId();

  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-2.5 text-[length:var(--checkbox-label-size,var(--text-sm))]"
    >
      <input
        {...props}
        id={id}
        type="checkbox"
        className={["mt-0.5 size-4.5 shrink-0 accent-brand", className]
          .filter(Boolean)
          .join(" ")}
      />

      <span>{label}</span>
    </label>
  );
}
