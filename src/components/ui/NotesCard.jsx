// NotesCard.jsx
/*
  FILE: NotesCard.jsx
  LAYMAN (Tropang Ex): Yung "sticky note" / reminders card sa gilid ng bawat
  section. Naglalaman ng dalawang bagay: (1) "Description:" — ano yung tinitignan
  mo ngayon base sa filter, at (2) "Status key" — paliwanag ng bawat kulay na
  status, naka-vertical list. Para malinis at di nakakalat yung main table.

  TECHNICAL: Presentational aside card. Pairs with a flex wrapper (main column +
  this aside). Both description and legend are optional — renders nothing if both
  are empty. Colors are passed in so the legend matches each section's badges.

  PARAMS:
  - description — optional string shown after a bold "Description:" label.
  - legend — optional array of { label, color, meaning } for the vertical key.
  - legendLabel — caption above the legend (default "Status key").
  - style — optional overrides merged onto the <aside>.

  RETURNS: a vertical notes/reminders card, or null when empty.
*/
import React from 'react';

export default function NotesCard({
  description,
  legend = [],
  legendLabel = 'Status key',
  style = {},
}) {
  if (!description && !legend.length) return null;
  return (
    <aside
      style={{
        flex: '1 1 220px',
        minWidth: 200,
        maxWidth: 280,
        alignSelf: 'flex-start',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 12,
        padding: '12px 14px',
        ...style,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          fontWeight: 700,
          color: 'rgba(255,255,255,0.7)',
          marginBottom: 10,
        }}
      >
        Notes
      </div>

      {description ? (
        <p style={{ fontSize: 12.5, lineHeight: 1.5, margin: 0, color: 'rgba(255,255,255,0.62)' }}>
          <strong style={{ color: 'rgba(255,255,255,0.85)' }}>Description:</strong> {description}
        </p>
      ) : null}

      {legend.length > 0 ? (
        <div
          style={{
            marginTop: description ? 12 : 0,
            borderTop: description ? '1px solid rgba(255,255,255,0.08)' : 'none',
            paddingTop: description ? 10 : 0,
          }}
        >
          <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.7)', margin: '0 0 8px' }}>
            {legendLabel}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {legend.map((it) => (
              <span key={it.label} style={{ fontSize: 12.5, display: 'inline-flex', alignItems: 'flex-start', gap: 6 }}>
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: 2,
                    background: it.color,
                    marginTop: 3,
                    flexShrink: 0,
                  }}
                />
                <span>
                  <strong style={{ color: it.color }}>{it.label}</strong>{' '}
                  <span style={{ color: 'rgba(255,255,255,0.6)' }}>— {it.meaning}</span>
                </span>
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </aside>
  );
}
