// InfoHint.jsx
/*
  FILE: InfoHint.jsx
  LAYMAN (Tropang Ex): Yung maliit na "?" na katabi ng isang label. Naka-tago yung
  paliwanag — pag hinover mo (o naka-focus), saka lang lalabas yung description sa
  isang maliit na bubble. Ginawa para malinis tignan ang mga dashboard: wala nang
  mahabang description na nakakalat, nasa "?" na lang.
  TECHNICAL: Presentational, self-contained (InfoHint.css). The bubble is rendered in a
  PORTAL to <body> with position:fixed, positioned from the trigger's bounding rect on
  hover/focus. This escapes any `overflow:hidden/auto` ancestor (modals, cards, table
  wraps) that used to CLIP the old position:absolute bubble (report 4.14). The trigger
  also SWALLOWS its own click (stopPropagation + preventDefault) so clicking the "?"
  inside a <label> or a clickable card header never toggles/activates the parent
  (report 4.1 — the renewable checkbox flipping when the hint was clicked).

  PROPS:
  - text  — the description shown in the bubble (required; renders null if empty).
  - label — accessible aria-label for the trigger (optional; defaults "More info").
  - size  — icon size in px (optional; default 14).
*/
import React, { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle } from 'lucide-react';
import './InfoHint.css';

export default function InfoHint({ text, label, size = 14 }) {
  const triggerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, placement: 'top' });

  const show = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    // Flip below the icon when it sits too near the top of the viewport to open upward.
    const placement = r.top < 140 ? 'bottom' : 'top';
    setPos({
      top: placement === 'top' ? r.top - 8 : r.bottom + 8,
      left: r.left + r.width / 2,
      placement,
    });
    setOpen(true);
  }, []);
  const hide = useCallback(() => setOpen(false), []);

  if (!text) return null;

  // Clicking the "?" should only reveal the tip — never reach a parent <label>/onClick
  // (e.g. a checkbox row or a collapsible card header).
  const swallow = (e) => { e.preventDefault(); e.stopPropagation(); };

  return (
    <span
      ref={triggerRef}
      className="cc-infohint"
      tabIndex={0}
      aria-label={label || 'More info'}
      role="button"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      onClick={swallow}
      onMouseDown={swallow}
    >
      <HelpCircle size={size} aria-hidden="true" />
      {open && createPortal(
        <span
          className={`cc-infohint-bubble cc-infohint-bubble--${pos.placement}`}
          role="tooltip"
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            transform: pos.placement === 'top' ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
          }}
        >
          {text}
        </span>,
        document.body
      )}
    </span>
  );
}
