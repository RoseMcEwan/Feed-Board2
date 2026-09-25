import { Link } from 'react-router-dom';
import { buttonClasses } from './buttonStyles.js';

/** Navigation stays a real link: keyboard support, open-in-new-tab and browser history. */
export default function ButtonLink({
  children,
  variant,
  size,
  className,
  ...props
}) {
  return <Link {...props} className={buttonClasses({
    variant,
    size,
    className
  })}>{children}</Link>;
}
