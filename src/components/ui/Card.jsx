// Card.jsx
/*
  FILE: Card.jsx
  LAYMAN (Tropang Ex): Yung "panel" o kahon na may border at konting lalim — dito
  nakapatong ang content (charts, lists, forms). Kapag clickable (gaya ng nav cards),
  gamitin ang `interactive` para may subtle hover lift.

  TECHNICAL: Thin wrapper over .cc-card (ui.css). Card is polymorphic via `as`.
  (CardHeader was removed as dead code — U-7; pages hand-roll their own header rows.)

  RETURNS: styled container element.
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

export default Card;
