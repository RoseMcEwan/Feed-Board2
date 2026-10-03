import { Link } from "react-router-dom";
import { buttonClasses } from "./buttonStyles.js";

// Navigation stays a real link
export default function ButtonLink({
  children,
  variant,
  size,
  className,
  ...props
}) {
  return (
    <Link
      {...props}
      className={buttonClasses({
        variant,
        size,
        className,
      })}
    >
      {children}
    </Link>
  );
}
