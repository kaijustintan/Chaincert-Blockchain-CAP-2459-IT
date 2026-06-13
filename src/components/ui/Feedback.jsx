// Feedback.jsx
/*
  FILE: Feedback.jsx
  LAYMAN (Tropang Ex): Mga "sandali lang, naglo-load" indicators. Spinner = umiikot
  na bilog para sa actions. Skeleton = kumikislap na kahon na kahawig ng content na
  paparating — mas maganda tingnan kaysa sa "Loading..." na text.

  TECHNICAL: Spinner (.cc-spinner) and Skeleton (.cc-skeleton) loading primitives.
  Skeleton accepts width/height/radius for shaping placeholder blocks.

  RETURNS: loading-indicator elements.
*/
import React from 'react';

export function Spinner({ size = 'md', className = '' }) {
  return <span className={`cc-spinner ${size === 'lg' ? 'cc-spinner--lg' : ''} ${className}`.trim()} role="status" aria-label="Loading" />;
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

export default Spinner;
