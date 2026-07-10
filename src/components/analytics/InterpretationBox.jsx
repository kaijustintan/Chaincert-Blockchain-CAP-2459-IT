// InterpretationBox.jsx
/*
  FILE: InterpretationBox.jsx
  LAYMAN (Tropang Ex): Ito yung "What this means" box na nasa ilalim ng bawat chart.
  Sinasabi sa plain words kung ano'ng ibig sabihin ng numbers — kasi yun mismo ang
  hinihingi ni Sir Danny: interpreted insight, hindi raw na table.
  TECHNICAL: Presentational component. Token-driven purple left-border callout
  (.analytics-interpretation in analytics.css — self-contained). No state, no fetch.
*/

import React from 'react';
import { Lightbulb } from 'lucide-react';

export default function InterpretationBox({ children, title = 'Summary:' }) {
  return (
    <div className="analytics-interpretation" role="note">
      <strong className="analytics-interpretation-title"><Lightbulb size={13} aria-hidden="true" /> {title}</strong>
      <p className="analytics-interpretation-text">{children}</p>
    </div>
  );
}
