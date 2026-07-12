// CredentialHistory.jsx
/*
  FILE: CredentialHistory.jsx
  LAYMAN (Tropang Ex): Iisang "kasaysayan" ng credential — pinagsama ang Provenance
  Timeline at ang raw na Blockchain History sa isang malinis na lista (bawat step:
  icon + label + tx hash + petsa + dahilan kung revoked) + isang "what this means".
  Kung may proof trail (ilang beses na-verify), idinadagdag din sa baba. Reusable sa
  holder / issuer / admin para pare-pareho (BCHIST2 + INSIGHT5).

  TECHNICAL: Presentational. Derives the timeline from computeProvenance(history)
  (now incl. txId + reason) and, when showProofTrail is set, the verification trail
  from computeProofTrail(verificationLogs, credentialId). Pure rendering — fetching is
  the caller's job (pass history/verificationLogs/loading/error in).

  PROPS:
  - history — cleaned blockchain history entries.
  - verificationLogs — verification logs for the proof trail (caller-scoped).
  - credentialId — credential to trace in the proof trail.
  - showProofTrail — render the Verification Proof Trail (holder/admin: true; issuer: false — no endpoint).
  - loading / error — pass-through states.
*/
import React, { useMemo } from 'react';
import { computeProvenance, computeProofTrail } from './analytics';
import InterpretationBox from './InterpretationBox';
import { SpinnerBlock } from '../ui';
import { FileText, GraduationCap, RefreshCw, Pencil, Clock, Ban, Check, X } from 'lucide-react';

// Provenance action → lucide icon (de-emojified UAT). Falls back to Pencil for unknown actions.
const ACTION_ICON = { created: FileText, issued: GraduationCap, reissued: RefreshCw, updated: Pencil, expired: Clock, revoked: Ban };

export default function CredentialHistory({
  history = [],
  verificationLogs = [],
  credentialId,
  showProofTrail = false,
  loading = false,
  error = null,
}) {
  const provenance = useMemo(() => computeProvenance(history), [history]);
  const proofTrail = useMemo(
    () => (showProofTrail ? computeProofTrail(verificationLogs, credentialId) : null),
    [showProofTrail, verificationLogs, credentialId]
  );

  if (loading) return <SpinnerBlock label="Loading history…" minHeight={100} />;
  if (error) return <div className="analytics-chart-empty" style={{ height: 80 }}>{error}</div>;

  const fmt = (w) => (w ? new Date(w).toLocaleString() : '—');

  return (
    <div className="credential-history">
      <div className="analytics-card">
        <h4>Blockchain History — Provenance Timeline</h4>
        {provenance.events.length === 0 ? (
          <div className="analytics-chart-empty" style={{ height: 80 }}>No on-chain history yet.</div>
        ) : (
          <div className="analytics-timeline">
            {provenance.events.map((e, i) => (
              <div className="analytics-timeline-item" key={i}>
                <span className="analytics-timeline-dot" style={{ background: e.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  {(() => { const I = ACTION_ICON[e.action] || Pencil; return <I size={13} color="#fff" aria-hidden="true" />; })()}
                </span>
                <div>
                  <div className="analytics-timeline-label">{e.label}</div>
                  <div className="analytics-timeline-when">{fmt(e.when)}</div>
                  {e.txId ? <div className="ch-tx" title="Transaction ID">{e.txId}</div> : null}
                  {e.reason ? <div className="ch-reason">Reason: {e.reason}</div> : null}
                </div>
              </div>
            ))}
          </div>
        )}
        <InterpretationBox>{provenance.summary}</InterpretationBox>
      </div>

      {showProofTrail && proofTrail && (
        <div className="analytics-card" style={{ marginTop: 14 }}>
          <h4>Verification Proof Trail</h4>
          {proofTrail.count === 0 ? (
            <div className="analytics-chart-empty" style={{ height: 80 }}>Not independently verified yet.</div>
          ) : (
            <div className="analytics-timeline">
              {proofTrail.events.map((e, i) => {
                const color = e.outcome === 'valid' ? 'var(--ok)'
                  : e.outcome === 'not_found' ? 'var(--accent-strong)' : 'var(--danger)';
                const label = e.outcome === 'valid' ? 'Verified valid'
                  : e.outcome === 'not_found' ? 'Not found'
                  : e.outcome === 'revoked' ? 'Revoked'
                  : e.outcome === 'expired' ? 'Expired' : 'Checked';
                // Glyph must match the outcome: a check only for a valid check; failed/negative
                // checks (revoked/expired/not-found) show an X, not a check mark. (De-emojified UAT.)
                const Glyph = e.outcome === 'valid' ? Check : X;
                return (
                  <div className="analytics-timeline-item" key={`pt-${i}`}>
                    <span className="analytics-timeline-dot" style={{ background: color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Glyph size={13} color="#fff" aria-hidden="true" /></span>
                    <div>
                      <div className="analytics-timeline-label">{label}</div>
                      <div className="analytics-timeline-when">{fmt(e.when)}</div>
                      {e.verifierEmail ? <div className="analytics-timeline-when">Checked by {e.verifierEmail}</div> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <InterpretationBox>{proofTrail.summary}</InterpretationBox>
        </div>
      )}
    </div>
  );
}
