// passwordCriteria.jsx
/*
  FILE: passwordCriteria.jsx
  LAYMAN (Tropang Ex): Maliit na checklist SA TABI ng password box — para alam agad ng user yung
    mga rules BAGO pa siya mag-submit. Yung "at least 10 characters" nagcha-check kapag sapat na
    ang haba. Kapag binigay yung confirm-password, may extra line na nagsasabi kung TUGMA ba sila
    (green) o hindi pa (red) — para di na kailangan i-submit muna bago malaman. Yung "avoid common
    passwords" ay PAALALA lang (hindi tsine-check box) — kaya may Info icon + italic "Tip:", para
    hindi ito mamali-mali bilang isang tsi-check na kahon.
  TECHNICAL: Presentational, controlled hint. Live-ticks the length rule; optionally live-ticks a
    password-match rule when the parent passes `confirmPassword`. The "avoid common passwords" line
    is advisory (the authoritative blocklist stays server-side in
    securityHelpers.validatePasswordStrength — we do NOT duplicate the 27-item list here). Rendered
    with an Info glyph + italic "Tip:" so it no longer reads as a tickable checkbox (UAT feedback).
    Theme-aware via `tone`. Inline-styled (no new stylesheet).
  OUTLINE:
    HINT
      - PasswordCriteria({ password, confirmPassword, tone })   password-rule checklist
*/

import React from 'react';
import { Check, Circle, Info, X } from 'lucide-react';

/*
  Function Name: PasswordCriteria

  LAYMAN (Tropang Ex):
  Ilagay mo lang sa ilalim ng password input, tapos ibigay yung kasalukuyang password value (at
  optional na confirm value). Magpapakita ng rules; may check mark kapag pasado, may match line
  kapag may confirm.

  TECHNICAL:
  Pure/controlled component. Derives `lenMet = password.length >= 10` and (when `confirmPassword`
  is provided AND non-empty) a `matchMet` boolean, swapping Check/X/Circle icons + colors.

  PARAMS:
  - password        — the current password string (controlled by the parent form).
  - confirmPassword — optional confirm-password string; when passed and non-empty, a live
                      "Passwords match / don't match" row is shown.
  - tone            — 'light' (default) or 'dark' — palette for the surrounding card.
  - className       — optional extra class on the <ul>.
  - style           — optional style overrides merged onto the <ul>.

  RETURNS:
  JSX <ul> checklist. Never null.
*/
export default function PasswordCriteria({ password = '', confirmPassword, tone = 'light', className = '', style }) {
  const value = String(password || '');
  const lenMet = value.length >= 10;

  // Only nag about matching once the parent opts in (passes confirmPassword) AND the user has
  // actually started typing the confirmation — otherwise the row would show red on an empty field.
  const showMatch = confirmPassword !== undefined && String(confirmPassword).length > 0;
  const matchMet = showMatch && value.length > 0 && value === String(confirmPassword);

  const palette = tone === 'dark'
    ? { met: '#4ade80', pending: '#94a3b8', text: '#cbd5e1', danger: '#f87171' }
    : { met: 'var(--ok)', pending: 'var(--border-strong)', text: 'var(--text-muted)', danger: 'var(--danger)' };

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
      {showMatch && (
        <li style={{ ...rowStyle(matchMet), color: matchMet ? palette.met : palette.danger }}>
          {matchMet
            ? <Check size={13} strokeWidth={3} style={{ color: palette.met, flexShrink: 0 }} aria-hidden="true" />
            : <X size={13} strokeWidth={3} style={{ color: palette.danger, flexShrink: 0 }} aria-hidden="true" />}
          <span>{matchMet ? 'Passwords match' : "Passwords don't match yet"}</span>
        </li>
      )}
      <li style={{ ...rowStyle(false), color: palette.text, fontStyle: 'italic' }}>
        <Info size={13} style={{ color: palette.pending, flexShrink: 0 }} aria-hidden="true" />
        <span>Tip: avoid common or easily-guessed passwords</span>
      </li>
    </ul>
  );
}
