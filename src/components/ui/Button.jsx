// Button.jsx
/*
  FILE: Button.jsx
  LAYMAN (Tropang Ex): Isang button na pare-pareho ang itsura kahit saan. May apat na
  klase: primary (yung mahalaga, kulay purple), secondary (pang-alalay), ghost
  (transparent, pang-minor actions), danger (pula, pang-revoke/delete). Pwede mo
  lagyan ng icon sa kaliwa o kanan, at may built-in loading spinner.

  TECHNICAL: Token-driven button wrapper over .cc-btn (ui.css). Polymorphic via `as`
  (e.g. render as a react-router <Link> by passing as={Link} to="/x"). lucide icon
  components passed as `icon`/`iconRight` props. `loading` disables + shows a spinner.

  PARAMS:
  - variant — 'primary' | 'secondary' | 'ghost' | 'danger' (default 'primary').
  - size — 'md' | 'sm' (default 'md').
  - as — element/component to render (default 'button').
  - icon / iconRight — lucide icon component (optional).
  - loading — boolean; disables and shows spinner.
  - ...rest — forwarded (onClick, type, to, disabled, etc.).

  RETURNS: a styled clickable element.
*/
import React from 'react';

export default function Button({
  variant = 'primary',
  size = 'md',
  as: Comp = 'button',
  icon: Icon,
  iconRight: IconRight,
  loading = false,
  className = '',
  children,
  ...rest
}) {
  const classes = [
    'cc-btn',
    `cc-btn--${variant}`,
    size === 'sm' ? 'cc-btn--sm' : '',
    loading ? 'is-loading' : '',
    className,
  ].filter(Boolean).join(' ');

  const iconSize = size === 'sm' ? 15 : 16;

  return (
    <Comp className={classes} aria-busy={loading || undefined} {...rest}>
      {Icon && <Icon size={iconSize} aria-hidden="true" />}
      <span className="cc-btn-label">{children}</span>
      {IconRight && <IconRight size={iconSize} aria-hidden="true" />}
    </Comp>
  );
}
