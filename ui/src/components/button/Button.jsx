import { buttonClasses } from './buttonStyles.js';

/** Use for actions. Defaults to type="button" so it cannot accidentally submit a form. */
export default function Button({
  children,
  variant,
  size,
  className,
  type = 'button',
  ...props
}) {
  return <button {...props} type={type} className={buttonClasses({
    variant,
    size,
    className
  })}>
      {children}
    </button>;
}
