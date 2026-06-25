// Sparkline.jsx
/*
  FILE: Sparkline.jsx
  LAYMAN (Tropang Ex): Yung maliit na "trend line" na nakikita mo sa loob ng stat
  card — walang axis, walang label, kurba lang na nagpapakita ng galaw ng numero
  sa paglipas ng panahon. Halo-inspired stat-tile accent.

  TECHNICAL: Tiny recharts AreaChart (no axes/grid/tooltip). SVG fill/stroke can't
  read CSS var() reliably, so colors are passed as literal token hex. Returns null
  when there are fewer than 2 points (nothing meaningful to draw).

  PARAMS:
  - data — array of objects (the time series).
  - dataKey — numeric field to plot (default 'count').
  - height — px height (default 36).
  - color — literal hex (default --accent-strong #9B7BFF).
*/
import React from 'react';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';

export default function Sparkline({ data = [], dataKey = 'count', height = 36, color = '#9B7BFF' }) {
  if (!Array.isArray(data) || data.length < 2) return null;
  return (
    <div style={{ height, width: '100%', marginTop: 8 }} aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="ccSparkFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.30} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={1.75}
            fill="url(#ccSparkFill)"
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
