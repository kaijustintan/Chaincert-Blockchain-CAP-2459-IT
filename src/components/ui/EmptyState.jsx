// EmptyState.jsx
/*
  FILE: EmptyState.jsx
  LAYMAN (Tropang Ex): Yung ipinapakita kapag walang laman ang isang lista — imbes
  na blangko o naka-emoji na "📭 wala pa", may malinis na icon + maikling paliwanag +
  optional na action button (e.g. "Create your first template").

  TECHNICAL: Presentational empty/zero-state over .cc-empty. Accepts a lucide icon
  component and an optional action node (typically a <Button>).

  PARAMS: icon (lucide component, default Inbox), title, message, action (node).
  RETURNS: a centered empty-state block.
*/
import React from 'react';
import { Inbox } from 'lucide-react';

export default function EmptyState({ icon: Icon = Inbox, title, message, action, className = '' }) {
  return (
    <div className={`cc-empty ${className}`.trim()}>
      <div className="cc-empty-icon"><Icon size={24} aria-hidden="true" /></div>
      {title && <p className="cc-empty-title">{title}</p>}
      {message && <p className="cc-empty-msg">{message}</p>}
      {action}
    </div>
  );
}
