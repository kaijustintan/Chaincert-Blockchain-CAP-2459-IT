// StatusLegend.jsx
/*
  FILE: StatusLegend.jsx
  LAYMAN (Tropang Ex): Yung maliit na "key" / paliwanag box na nagsasabi kung ano
  ibig sabihin ng bawat kulay na status sa screen — gaya ng "Active = berde,
  buhay pa", "Revoked = pula, kinansela". Para hindi na maghula yung user kung
  ano ibig sabihin ng kulay. Reusable sa lahat ng page (holder, issuer, admin,
  verifier) para pare-pareho ang itsura.

  TECHNICAL: Presentational, color-agnostic legend row. Each caller passes items
  with an explicit color string (a hex or a CSS var()) so the legend always
  matches the actual badge colors already rendered in that section. No domain
  logic here — pure display.

  PARAMS:
  - items — array of { label, color, meaning }. color is any CSS color string.
  - label — the leading caption (default "Legend").
  - style — optional style overrides merged onto the container.

  RETURNS: an inline-wrapping legend row.
*/
import React from 'react';

export default function StatusLegend({ items = [], label = 'Legend', style = {} }) {
  if (!items.length) return null;
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 14,
        padding: '10px 14px',
        borderRadius: 10,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.10)',
        ...style,
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>
        {label}:
      </span>
      {items.map((it) => (
        <span
          key={it.label}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 3,
              background: it.color,
              flexShrink: 0,
            }}
          />
          <strong style={{ color: it.color }}>{it.label}</strong>
          <span style={{ color: 'rgba(255,255,255,0.6)' }}>— {it.meaning}</span>
        </span>
      ))}
    </div>
  );
}
