// passwordInput.jsx
/*
  FILE: passwordInput.jsx
  LAYMAN (Tropang Ex): Password box na may maliit na "mata" (eye) sa gilid — pindutin mo para
    makita o itago yung tinype mong password. Dati walang paraan i-reveal kung tama ba yung
    nilagay mo, kaya madalas mali. Isang shared component na lang para pare-pareho sa login,
    register, at reset-password forms — hindi na inuulit-ulit per form.
  TECHNICAL: Thin controlled wrapper around a native <input>. Forwards ALL props (...rest) so it
    is a drop-in for the existing password inputs (keeps their name/value/onChange/required/etc.),
    only owning the show/hide state and swapping type between 'password' and 'text'. Eye/EyeOff
    from lucide-react (already a dep). Inline-styled (no new stylesheet); reserves right padding so
    the toggle never overlaps typed text. Safe under the app's `.input-group input` (descendant)
    CSS — wrapping the input in a <div> does not break those selectors.
  OUTLINE:
    INPUT
      - PasswordInput({ ...rest })   password field with a reveal toggle
*/

import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/*
  Function Name: PasswordInput

  LAYMAN (Tropang Ex):
  Palitan mo lang yung dating <input type="password" .../> ng <PasswordInput .../> — pareho lang
  ang props na ibibigay mo. May eye button na sa gilid para i-toggle ang visibility.

  TECHNICAL:
  Owns a `show` boolean; renders the forwarded input with type={show?'text':'password'} plus an
  absolutely-positioned toggle button vertically centered over the field. Merges any caller
  `style` over a reserved right-padding so the icon never sits on top of the text.

  PARAMS:
  - ...rest — every prop is spread onto the native <input> (name, value, onChange, required, …).

  RETURNS:
  A relative-positioned <div> wrapping the input + eye toggle. Never null.
*/
export default function PasswordInput({ ...rest }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <input {...rest} type={show ? 'text' : 'password'} style={{ paddingRight: 42, ...(rest.style || {}) }} />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? 'Hide password' : 'Show password'}
        title={show ? 'Hide password' : 'Show password'}
        tabIndex={-1}
        style={{
          position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          display: 'inline-flex', color: 'var(--text-muted)',
        }}
      >
        {show ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
      </button>
    </div>
  );
}
