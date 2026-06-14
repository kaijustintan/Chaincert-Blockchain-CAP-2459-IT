// TrendBars.jsx
/*
  FILE: TrendBars.jsx
  LAYMAN (Tropang Ex): Yung bar chart na nagpapakita ng dami kada kategorya o kada buwan —
  halimbawa ilang credential ang na-issue bawat buwan, o ilan bawat type. Mas matangkad,
  mas marami.
  TECHNICAL: Thin Recharts (BarChart) wrapper. Takes data rows + the keys to plot.
  Used for both "by type" and "monthly trend" with different x-axis keys.
*/

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function TrendBars({ data = [], xKey = 'label', yKey = 'count', color = '#9B7BFF', height = 240 }) {
  const rows = Array.isArray(data) ? data : [];
  const hasData = rows.some((r) => Number(r[yKey]) > 0);

  if (!hasData) {
    return (
      <div className="analytics-chart-empty" style={{ height }}>
        No data to display yet.
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 12, left: -12, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
          <XAxis dataKey={xKey} tick={{ fill: '#A8A8B8', fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fill: '#A8A8B8', fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: 'rgba(124,92,252,0.12)' }}
            contentStyle={{ background: '#1B1B29', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 10, color: '#ECECF1' }}
          />
          <Bar dataKey={yKey} fill={color} radius={[6, 6, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
