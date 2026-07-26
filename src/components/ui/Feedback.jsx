// Feedback.jsx
/*
  FILE: Feedback.jsx
  LAYMAN (Tropang Ex): Mga "sandali lang, naglo-load" indicators. Spinner = umiikot
  na dash-ring para sa section/page loads. Skeleton = kumikislap na kahon na kahawig
  ng content na paparating — mas maganda tingnan kaysa "Loading…" na text.
  SkeletonCardGrid / SkeletonRows = handa nang hugis para sa card grids at table rows.

  TECHNICAL: Spinner (.cc-spinner — SVG dash-ring) and Skeleton (.cc-skeleton —
  shimmer) loading primitives, plus two composed placeholders (SkeletonCardGrid,
  SkeletonRows) so loading states across the app stay consistent and don't layout-jump.

  RETURNS: loading-indicator elements.
*/
import React from 'react';

// Spinner: SVG dash-ring (uiverse L1, recolored to --accent). Same size/className API.
export function Spinner({ size = 'md', className = '' }) {
  return (
    <svg
      className={`cc-spinner ${size === 'lg' ? 'cc-spinner--lg' : ''} ${className}`.trim()}
      viewBox="25 25 50 50"
      role="status"
      aria-label="Loading"
    >
      <circle cx="50" cy="50" r="20" />
    </svg>
  );
}

// SpinnerBlock: centered spinner + optional label — the standard "section is loading" block.
export function SpinnerBlock({ label = 'Loading…', size = 'lg', minHeight = 120, className = '' }) {
  return (
    <div
      className={`cc-spinner-block ${className}`.trim()}
      style={{ minHeight }}
      role="status"
    >
      <Spinner size={size} />
      {label && <span className="cc-spinner-label">{label}</span>}
    </div>
  );
}

export function Skeleton({ width = '100%', height = 16, radius, style = {}, className = '' }) {
  return (
    <span
      className={`cc-skeleton ${className}`.trim()}
      style={{ display: 'block', width, height, ...(radius != null ? { borderRadius: radius } : {}), ...style }}
      aria-hidden="true"
    />
  );
}

// SkeletonCardGrid: N card-shaped placeholders for credential/badge grids.
export function SkeletonCardGrid({ count = 6, className = '' }) {
  return (
    <div className={`cc-skel-grid ${className}`.trim()} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div className="cc-skel-card" key={i}>
          <Skeleton height={90} radius={10} />
          <Skeleton width="70%" height={14} style={{ marginTop: 12 }} />
          <Skeleton width="45%" height={12} style={{ marginTop: 8 }} />
        </div>
      ))}
    </div>
  );
}

// SkeletonRows: skeleton <tr>s to drop inside a <tbody> while a table loads.
export function SkeletonRows({ rows = 5, cols = 4 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="cc-skel-tr" aria-hidden="true">
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c}><Skeleton height={14} /></td>
          ))}
        </tr>
      ))}
    </>
  );
}

export default Spinner;
