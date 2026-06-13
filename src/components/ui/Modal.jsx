// Modal.jsx
/*
  FILE: Modal.jsx
  LAYMAN (Tropang Ex): Yung pop-up window na lumalabas sa gitna na may dark na likod.
  Pare-pareho na ang itsura: title sa taas, X button para isara, body sa gitna, at
  optional na footer para sa mga action buttons. Pwedeng isara via X, click sa labas,
  o Escape key.

  TECHNICAL: Portal-based dialog (react-dom createPortal → document.body) over
  .cc-modal. Handles Escape-to-close, click-outside, and body scroll-lock on mount.
  Renders nothing when `open` is false.

  PARAMS:
  - open (bool), onClose (fn), title (node), size ('sm'|'md'|'lg', default 'md'),
    footer (node), children, closeOnOverlay (bool, default true).

  RETURNS: a centered modal dialog portal, or null.
*/
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, size = 'md', footer, closeOnOverlay = true, className = '', children }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="cc-modal-overlay" onClick={closeOnOverlay ? onClose : undefined}>
      <div
        className={`cc-modal cc-modal--${size} ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {(title || onClose) && (
          <div className="cc-modal-head">
            <h3 className="cc-modal-title">{title}</h3>
            {onClose && (
              <button type="button" className="cc-modal-close" onClick={onClose} aria-label="Close">
                <X size={18} aria-hidden="true" />
              </button>
            )}
          </div>
        )}
        <div className="cc-modal-body">{children}</div>
        {footer && <div className="cc-modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
