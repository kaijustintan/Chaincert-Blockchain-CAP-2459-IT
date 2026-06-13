// DonutChart.jsx
/*
  FILE: DonutChart.jsx
  LAYMAN (Tropang Ex): Yung donut/pie na nagpapakita ng hatian — halimbawa ilan ang
  active vs expired vs revoked. May gitna na may total number para isang tingin lang,
  alam mo na agad ang kabuuan.
  TECHNICAL: Thin Recharts (PieChart) wrapper. Takes pre-aggregated slices
  [{name, value, color}] from analytics.js helpers. Renders empty-state text if no data.
*/

import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function DonutChart({ slices = [], centerLabel, centerValue, height = 240 }) {
  const data = Array.isArray(slices) ? slices.filter((s) => s.value > 0) : [];
  const hasData = data.length > 0;

  if (!hasData) {
    return (
      <div className="analytics-chart-empty" style={{ height }}>
        No data to display yet.
      </div>
    );
  }

  return (
    <div className="analytics-donut-wrap" style={{ position: 'relative', width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="60%"
            outerRadius="85%"
            paddingAngle={2}
            stroke="none"
          >
            {data.map((s, i) => (
              <Cell key={i} fill={s.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: '#1e1b2e', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 10, color: '#fff' }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
      {(centerValue !== undefined || centerLabel) && (
        <div className="analytics-donut-center">
          {centerValue !== undefined && <span className="analytics-donut-center-value">{centerValue}</span>}
          {centerLabel && <span className="analytics-donut-center-label">{centerLabel}</span>}
        </div>
      )}
    </div>
  );
}
