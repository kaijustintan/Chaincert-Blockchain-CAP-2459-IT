// Card.jsx
/*
  FILE: Card.jsx
  LAYMAN (Tropang Ex): Yung "panel" o kahon na may border at konting lalim — dito
  nakapatong ang content (charts, lists, forms). May optional header na may title +
  actions sa tabi. Kapag clickable (gaya ng nav cards), gamitin ang `interactive`
  para may subtle hover lift.

  TECHNICAL: Thin wrappers over .cc-card (ui.css). Card is polymorphic via `as`.
  CardHeader renders a title (optional lucide icon) + subtitle + right-aligned actions.

  RETURNS: styled container / header elements.
*/
import React from 'react';

export function Card({ as: Comp = 'div', interactive = false, flush = false, className = '', children, ...rest }) {
  const classes = [
    'cc-card',
    interactive ? 'cc-card--interactive' : '',
    flush ? 'cc-card--flush' : '',
    className,
  ].filter(Boolean).join(' ');
  return <Comp className={classes} {...rest}>{children}</Comp>;
}

export function CardHeader({ title, subtitle, icon: Icon, actions, className = '' }) {
  return (
    <div className={`cc-card-head ${className}`.trim()}>
      <div>
        <h3 className="cc-card-title">{Icon && <Icon size={18} aria-hidden="true" />}{title}</h3>
        {subtitle && <p className="cc-card-sub">{subtitle}</p>}
      </div>
      {actions && <div className="cc-card-actions">{actions}</div>}
    </div>
  );
}

export default Card;
