// passwordCriteria.jsx
/*
  FILE: passwordCriteria.jsx
  LAYMAN (Tropang Ex): Maliit na checklist na nakalagay SA TABI ng password box — para
    alam agad ng user yung mga rules BAGO pa siya mag-submit (hindi na yung "mali pala"
    na lang after niya i-click). Yung "at least 10 characters" nagcha-check kapag sapat na
    ang haba. Dati kasi hindi malinaw — sabi 6, tapos server naman 10 pala, magulo.
  TECHNICAL: Presentational, controlled hint. Takes the current password string and live-
    ticks the length rule; the "avoid common passwords" line is advisory (the authoritative
    blocklist stays server-side in securityHelpers.validatePasswordStrength — we do NOT
    duplicate the 27-item list here to avoid drift). Theme-aware via `tone` so it reads on
    both the dark reset card (loginPage.css) and the light register form (createAccount.css).
    Inline-styled (no new stylesheet) so it drops into any form.
  OUTLINE:
    HINT
      - PasswordCriteria({ password, tone })   always-visible password-rule checklist
*/

import React from 'react';
import { Check, Circle } from 'lucide-react';

/*
  Function Name: PasswordCriteria

  LAYMAN (Tropang Ex):
  Ilagay mo lang sa ilalim ng password input, tapos ibigay yung kasalukuyang password value.
  Magpapakita ng listahan ng rules; yung haba (10+) may check mark kapag pasado na.

  TECHNICAL:
  Pure/controlled component. Derives `lenMet = password.length >= 10` on each render and
  swaps a Check/Circle icon + color. `tone='dark'` uses light-on-dark colors for the reset
  card; default 'light' uses design tokens with hex fallbacks.

  PARAMS:
  - password  — the current password string (controlled by the parent form).
  - tone      — 'light' (default) or 'dark' — palette for the surrounding card.
  - className — optional extra class on the <ul>.
  - style     — optional style overrides merged onto the <ul>.

  RETURNS:
  JSX <ul> checklist. Never null.
*/
export default function PasswordCriteria({ password = '', tone = 'light', className = '', style }) {
  const value = String(password || '');
  const lenMet = value.length >= 10;

  const palette = tone === 'dark'
    ? { met: '#4ade80', pending: '#94a3b8', text: '#cbd5e1' }
    : { met: 'var(--ok, #16a34a)', pending: 'var(--border-strong, #9aa0aa)', text: 'var(--text-muted, #6b7280)' };

  const rowStyle = (met) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: '12px',
    lineHeight: 1.5,
    color: met ? palette.met : palette.text,
  });

  return (
    <ul
      aria-live="polite"
      className={className}
      style={{ listStyle: 'none', margin: '8px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 4, ...style }}
    >
      <li style={rowStyle(lenMet)}>
        {lenMet
          ? <Check size={13} strokeWidth={3} style={{ color: palette.met, flexShrink: 0 }} aria-hidden="true" />
          : <Circle size={13} style={{ color: palette.pending, flexShrink: 0 }} aria-hidden="true" />}
        <span>At least 10 characters</span>
      </li>
      <li style={{ ...rowStyle(false), color: palette.text }}>
        <Circle size={13} style={{ color: palette.pending, flexShrink: 0 }} aria-hidden="true" />
        <span>Avoid common or easily-guessed passwords</span>
      </li>
    </ul>
  );
}
