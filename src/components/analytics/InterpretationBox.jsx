// InterpretationBox.jsx
/*
  FILE: InterpretationBox.jsx
  LAYMAN (Tropang Ex): Ito yung "What this means" box na nasa ilalim ng bawat chart.
  Sinasabi sa plain words kung ano'ng ibig sabihin ng numbers — kasi yun mismo ang
  hinihingi ni Sir Danny: interpreted insight, hindi raw na table.
  TECHNICAL: Presentational component. Reuses the existing `.info-message` visual style
  (purple left-border callout). No state, no fetch.
*/

import React from 'react';

export default function InterpretationBox({ children, title = 'What this means' }) {
  return (
    <div className="analytics-interpretation info-message" role="note">
      <strong className="analytics-interpretation-title">💡 {title}</strong>
      <p className="analytics-interpretation-text">{children}</p>
    </div>
  );
}
