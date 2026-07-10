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
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';

// showBreakdown: render a static "name value" row (with color dots) under the donut and
// hide the hover-only recharts legend — so the per-slice counts are readable without a mouse.
export default function DonutChart({ slices = [], centerLabel, centerValue, height = 240, showBreakdown = false }) {
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
    <>
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
            {/* Hover tooltip removed (4.8) — the static center total + breakdown row already
                show every slice's count, so the tooltip was redundant. */}
            {!showBreakdown && <Legend wrapperStyle={{ fontSize: 12 }} />}
          </PieChart>
        </ResponsiveContainer>
        {(centerValue !== undefined || centerLabel) && (
          <div className="analytics-donut-center">
            {centerValue !== undefined && <span className="analytics-donut-center-value">{centerValue}</span>}
            {centerLabel && <span className="analytics-donut-center-label">{centerLabel}</span>}
          </div>
        )}
      </div>
      {showBreakdown && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', justifyContent: 'center', marginTop: 10, fontSize: 12.5 }}>
          {data.map((s, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 9, height: 9, borderRadius: 2, background: s.color, display: 'inline-block', flexShrink: 0 }} />
              <span>{s.name}</span>
              <strong>{s.value}</strong>
            </span>
          ))}
        </div>
      )}
    </>
  );
}
