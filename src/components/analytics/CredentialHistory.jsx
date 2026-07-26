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
  - proofTrailLoading — verification-logs fetch still in flight; shows a spinner in the trail
    section instead of a false "Not independently verified yet." (own-finding #6 fix).
*/
import React, { useMemo } from 'react';
import { computeProvenance, computeProofTrail } from './analytics';
import InterpretationBox from './InterpretationBox';
import { SpinnerBlock } from '../ui';
import { isEffectivelyExpired } from '../../utils/credentialStatus';
import { FileText, GraduationCap, RefreshCw, Pencil, Clock, Ban, Check, X } from 'lucide-react';

// Provenance action → lucide icon (de-emojified UAT). Falls back to Pencil for unknown actions.
const ACTION_ICON = { created: FileText, issued: GraduationCap, reissued: RefreshCw, updated: Pencil, expired: Clock, revoked: Ban };

export default function CredentialHistory({
  history = [],
  verificationLogs = [],
  credentialId,
  credential = null,
  showProofTrail = false,
  loading = false,
  error = null,
  proofTrailLoading = false,
}) {
  const provenance = useMemo(() => computeProvenance(history), [history]);
  const proofTrail = useMemo(
    () => (showProofTrail ? computeProofTrail(verificationLogs, credentialId) : null),
    [showProofTrail, verificationLogs, credentialId]
  );

  // FINAL-REVIEW #3 fix: a credential can read "Expired" on the badge purely from a compute-on-read
  // date check (effectiveCredentialStatus) BEFORE the daily cron submits the real ExpireCredential tx.
  // In that window the ledger genuinely has no Expired event, so the timeline showed only "Issued" and
  // looked broken vs. the badge. Inject a clearly-DERIVED (dashed, no tx hash) marker so the two agree,
  // without ever faking an on-chain transaction. Suppressed once a real expired/revoked event exists.
  const derivedExpired = useMemo(() => {
    if (!credential) return false;
    if (provenance.expired || provenance.revoked) return false;
    return isEffectivelyExpired(credential.expiryDate);
  }, [credential, provenance.expired, provenance.revoked]);

  // Newest-first: the derived expiry is the most recent thing that "happened", so it goes on top.
  const timelineEvents = useMemo(() => {
    if (!derivedExpired) return provenance.events;
    const marker = {
      label: 'Expired (reached expiry date)',
      action: 'expired',
      color: 'var(--warn)',
      when: credential.expiryDate ? `${String(credential.expiryDate).slice(0, 10)}T23:59:59+08:00` : null,
      derived: true,
    };
    return [marker, ...provenance.events];
  }, [derivedExpired, provenance.events, credential]);

  if (loading) return <SpinnerBlock label="Loading history…" minHeight={100} />;
  if (error) return <div className="analytics-chart-empty" style={{ height: 80 }}>{error}</div>;

  const fmt = (w) => (w ? new Date(w).toLocaleString() : '—');

  return (
    <div className="credential-history">
      <div className="analytics-card">
        <h4>Blockchain History — Provenance Timeline</h4>
        {timelineEvents.length === 0 ? (
          <div className="analytics-chart-empty" style={{ height: 80 }}>No on-chain history yet.</div>
        ) : (
          <div className="analytics-timeline">
            {timelineEvents.map((e, i) => (
              <div className="analytics-timeline-item" key={i} style={e.derived ? { opacity: 0.9 } : undefined}>
                <span
                  className="analytics-timeline-dot"
                  style={{
                    background: e.derived ? 'transparent' : e.color,
                    border: e.derived ? `2px dashed ${e.color}` : undefined,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {(() => { const I = ACTION_ICON[e.action] || Pencil; return <I size={13} color={e.derived ? e.color : '#fff'} aria-hidden="true" />; })()}
                </span>
                <div>
                  <div className="analytics-timeline-label">{e.label}</div>
                  <div className="analytics-timeline-when">{fmt(e.when)}</div>
                  {e.derived ? (
                    <div className="ch-reason" style={{ fontStyle: 'italic' }}>
                      Not yet finalized on-chain — the permanent “Expired” record is written automatically by the daily maintenance job.
                    </div>
                  ) : null}
                  {e.txId ? <div className="ch-tx" title="Transaction ID">{e.txId}</div> : null}
                  {e.reason ? <div className="ch-reason">Reason: {e.reason}</div> : null}
                </div>
              </div>
            ))}
          </div>
        )}
        <InterpretationBox>
          {derivedExpired
            ? `${provenance.summary} This credential has passed its expiry date; it already verifies as Expired, and the permanent on-chain expiry record is finalized by the daily maintenance job.`
            : provenance.summary}
        </InterpretationBox>
      </div>

      {showProofTrail && proofTrail && (
        <div className="analytics-card" style={{ marginTop: 14 }}>
          <h4>Verification Proof Trail</h4>
          {proofTrail.count === 0 && proofTrailLoading ? (
            /* Own-finding #6: while the (slow, full-ledger) verification-logs fetch is in
               flight, an empty list means "still loading", NOT "never verified" — showing
               the negative here was a false claim that corrected itself seconds later. */
            <SpinnerBlock label="Loading verification trail…" minHeight={80} />
          ) : proofTrail.count === 0 ? (
            <div className="analytics-chart-empty" style={{ height: 80 }}>Not independently verified yet.</div>
          ) : (
            <div className="analytics-timeline">
              {proofTrail.events.map((e, i) => {
                const color = e.outcome === 'valid' ? 'var(--ok)'
                  : e.outcome === 'not_found' ? 'var(--accent-strong)' : 'var(--danger)';
                const label = e.outcome === 'valid' ? 'Verified valid'
                  : e.outcome === 'not_found' ? 'Forgery rejected (not found)'
                  : e.outcome === 'revoked' ? 'Caught as revoked'
                  : e.outcome === 'expired' ? 'Caught as expired' : 'Checked';
                // Glyph must match the outcome: a check only for a valid check; failed/negative
                // checks (revoked/expired/not-found) show an X, not a check mark. (De-emojified UAT.)
                const Glyph = e.outcome === 'valid' ? Check : X;
                return (
                  <div className="analytics-timeline-item" key={`pt-${i}`}>
                    <span className="analytics-timeline-dot" style={{ background: color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Glyph size={13} color="#fff" aria-hidden="true" /></span>
                    <div>
                      <div className="analytics-timeline-label">{label}</div>
                      <div className="analytics-timeline-when">
                        {fmt(e.when)}
                        {e.verifierEmail ? (
                          <>{' • '}<strong>{e.verifierEmail}</strong> (verified){e.verifierName && e.verifierName !== 'Anonymous' ? ` · ${e.verifierName} (self-reported)` : ''}</>
                        ) : (
                          ` • by ${e.verifierName && e.verifierName !== 'Anonymous' ? e.verifierName : 'an anonymous verifier'} (self-reported)`
                        )}
                      </div>
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
