// Badge.jsx
/*
  FILE: Badge.jsx
  LAYMAN (Tropang Ex): Maliit na kulay-coded na label — gaya ng "Active" (green),
  "Revoked" (red), "Expired" (amber). StatusPill ang sumasalo ng raw status strings
  ng system (active/revoked/expired/pending/...) at iko-convert sa tamang kulay +
  malinis na text automatically, para hindi na mag-isip kada page.

  TECHNICAL: Badge = generic tone chip over .cc-badge. StatusPill maps domain status
  strings → tone via STATUS_TONE and humanizes the label. Used by holder/issuer/admin
  for credential + issuer lifecycle states.

  PARAMS:
  - Badge: tone ('neutral'|'ok'|'warn'|'danger'|'info'|'accent'), dot (bool), children.
  - StatusPill: status (string), label (optional override).

  RETURNS: an inline status chip.
*/
import React from 'react';

export function Badge({ tone = 'neutral', dot = false, className = '', children }) {
  return (
    <span className={`cc-badge cc-badge--${tone} ${className}`.trim()}>
      {dot && <span className="cc-badge-dot" aria-hidden="true" />}
      {children}
    </span>
  );
}

const STATUS_TONE = {
  active: 'ok', issued: 'ok', approved: 'ok', enabled: 'ok', valid: 'ok',
  revoked: 'danger', rejected: 'danger', invalid: 'danger', not_found: 'danger',
  expired: 'warn',
  disabled: 'neutral',
  pending: 'info', pending_review: 'info', pending_root_approval: 'info',
  root_approved: 'info', root_rejected: 'danger',
};

function humanize(status) {
  if (!status) return 'Unknown';
  // "issued" reads as "Active" to holders; keep system-wide convention.
  const normalized = status === 'issued' ? 'active' : status;
  return normalized
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function StatusPill({ status, label }) {
  const key = (status || '').toLowerCase();
  const tone = STATUS_TONE[key] || 'neutral';
  return <Badge tone={tone} dot>{label || humanize(key)}</Badge>;
}

export default Badge;
