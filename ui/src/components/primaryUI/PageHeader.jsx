export default function PageHeader({
  title,
  subtitle,
  children,
}) {
  return (
    <header className="mb-6 flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-end">
      <div>

        <h1 className="mt-1.5 mb-2">
          {title}
        </h1>

        {subtitle && (
          <p className="mb-0 text-sm text-muted">
            {subtitle}
          </p>
        )}
      </div>

      {children}
    </header>
  );
}