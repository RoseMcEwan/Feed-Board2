import { Link } from "react-router-dom"

export default function Brand({
  to,
  className = "",
  ...props
}) {
  const classes = [
    "flex items-end gap-1 text-brand-dark no-underline",
    className,
  ]
    .filter(Boolean)
    .join(" ")

  const content = (
    <>
      <img
        src="/logo.svg"
        alt=""
        className="h-10 w-auto md:h-12"
      />

      <span className="text-lg font-extrabold tracking-tight md:text-2xl">
        FeedBoard
      </span>
    </>
  )

  return to ? (
    <Link {...props} to={to} className={classes}>
      {content}
    </Link>
  ) : (
    <div {...props} className={classes}>
      {content}
    </div>
  )
}