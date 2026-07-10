// InfoHint.jsx
/*
  FILE: InfoHint.jsx
  LAYMAN (Tropang Ex): Yung maliit na "?" na katabi ng isang label. Naka-tago yung
  paliwanag — pag hinover mo (o naka-focus), saka lang lalabas yung description sa
  isang maliit na bubble. Ginawa para malinis tignan ang mga dashboard: wala nang
  mahabang description na nakakalat, nasa "?" na lang.
  TECHNICAL: Presentational, self-contained (InfoHint.css). Pure-CSS hover/focus
  tooltip — no JS state. Keyboard-reachable (tabIndex + focus-visible). Renders
  nothing if no text is passed.

  PROPS:
  - text  — the description shown in the bubble (required; renders null if empty).
  - label — accessible aria-label for the trigger (optional; defaults "More info").
  - size  — icon size in px (optional; default 14).
*/
import React from 'react';
import { HelpCircle } from 'lucide-react';
import './InfoHint.css';

export default function InfoHint({ text, label, size = 14 }) {
  if (!text) return null;
  return (
    <span className="cc-infohint" tabIndex={0} aria-label={label || 'More info'} role="button">
      <HelpCircle size={size} aria-hidden="true" />
      <span className="cc-infohint-bubble" role="tooltip">{text}</span>
    </span>
  );
}
