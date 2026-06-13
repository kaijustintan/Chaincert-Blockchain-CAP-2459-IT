// analytics.js
/*
  FILE: analytics.js
  LAYMAN (Tropang Ex): Ito yung "kalkulador" ng Phase 4 reports. Walang UI dito —
  puro pure functions lang na kumukuha ng raw na listahan (credentials, verification
  logs, admin rows) tapos ginagawang malinaw na bilang + isang pangungusap na
  interpretation ("ano'ng ibig sabihin nito"). Hiwalay sa charts para madaling i-test
  at hindi nag-de-depende sa kung anong chart library ang gamit.
  TECHNICAL: Stateless aggregation helpers for the 4 MUST-have analytics reports.
  All functions are pure (no fetch, no side-effects) and tolerate missing/odd fields.
  Thresholds for the Suspicious Activity rule are exported as named constants so the
  rule is fully transparent/defensible (no hidden "anomaly score").
  OUTLINE:
    HOLDER
      - computeHealth(credentials)              non-overlapping health buckets + sentence
      - computeExpirationAlerts(credentials)    actionable renewal list (soonest-first) [NICE]
      - computeHolderVerificationInsights(logs) trust signal + timeline + most-checked + alerts [BACKEND]
    ISSUER
      - computeIssuance(credentials)            issued totals, by-type, monthly trend
      - computeRevocationAudit(credentials)     revoked-by-template + time-to-revoke buckets [GOOD]
    VERIFIER (rendered in admin)
      - computeVerificationOutcomes(logs)       valid/revoked/expired/not-found counts
    ADMIN
      - computeSuspiciousIssuers(rows, opts)    rule-based revocation-rate flags
      - computeDemand(logs, adminRows)          verifications per credential type (real-world demand) [NICE]
      - computeIntegritySummary(integrityResult) last CouchDB-vs-ledger check, processed [NICE]
      - computeProvenance(history)              processed credential lifecycle timeline [GOOD]
      - computeProofTrail(logs, credentialId)   per-credential immutable verification trail [GOOD]
    SHARED
      - EXPIRING_SOON_DAYS, SUSPICIOUS_WINDOW_DAYS, SUSPICIOUS_THRESHOLD, SUSPICIOUS_MIN_SAMPLE
*/

// ── Tunable rule constants (kept visible for panel defensibility) ──────────────
export const EXPIRING_SOON_DAYS = 60;       // a credential "expiring soon" if it lapses within this many days
export const SUSPICIOUS_WINDOW_DAYS = 30;   // look-back window for the revocation-spike rule
export const SUSPICIOUS_THRESHOLD = 0.25;   // flag issuers revoking >= 25% within the window
export const SUSPICIOUS_MIN_SAMPLE = 4;     // ignore issuers with too few credentials (avoids 1/1 = 100% noise)

// Shared chart palette (mirrors existing dashboard color vars)
export const COLORS = {
  green: '#4ade80',
  red: '#f87171',
  amber: '#fbbf24',
  blue: '#60a5fa',
  purple: '#a78bfa',
  gray: '#94a3b8',
};

// Helper: safe date parse → ms, or null
function toTime(value) {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

function lc(v) {
  return String(v || '').toLowerCase();
}

/*
  Function Name: computeHealth

  LAYMAN (Tropang Ex):
  Tinitignan ang lahat ng credentials ng isang holder, tapos hinahati sa apat na grupo:
  malusog (active), malapit nang mag-expire, expired na, at revoked. Nagbabalik din ng
  isang pangungusap na pwedeng basahin agad ("3 sa 8 mo ay malapit nang mag-expire").

  TECHNICAL:
  Buckets are mutually exclusive (priority: revoked > expired > expiringSoon > healthy) so
  the donut slices sum to total. "Expired" = status expired OR expiryDate in the past.
  "Expiring soon" = still active and expiryDate within EXPIRING_SOON_DAYS.

  PARAMS:
  - credentials — array of holder credential objects (status, expiryDate). [] tolerated.

  RETURNS:
  { total, healthy, expiringSoon, expired, revoked, slices:[{name,value,color}], summary }

  EXAMPLE
    computeHealth([{status:'issued',expiryDate:'2026-07-01'}, {status:'revoked'}])
    → { total:2, healthy:0, expiringSoon:1, expired:0, revoked:1, slices:[...], summary:"..." }
*/
export function computeHealth(credentials) {
  const list = Array.isArray(credentials) ? credentials : [];
  const now = Date.now();
  const soonCutoff = now + EXPIRING_SOON_DAYS * 24 * 60 * 60 * 1000;

  let healthy = 0, expiringSoon = 0, expired = 0, revoked = 0;

  for (const c of list) {
    const status = lc(c.status);
    const exp = toTime(c.expiryDate);
    const isExpired = status === 'expired' || (exp !== null && exp < now);

    if (status === 'revoked') revoked++;
    else if (isExpired) expired++;
    else if (exp !== null && exp <= soonCutoff) expiringSoon++;
    else healthy++; // active/issued and not lapsing soon
  }

  const total = list.length;
  const slices = [
    { name: 'Healthy', value: healthy, color: COLORS.green },
    { name: 'Expiring Soon', value: expiringSoon, color: COLORS.amber },
    { name: 'Expired', value: expired, color: COLORS.gray },
    { name: 'Revoked', value: revoked, color: COLORS.red },
  ].filter((s) => s.value > 0);

  let summary;
  if (total === 0) {
    summary = 'You have no credentials yet. Once an issuer awards you a credential, it will appear here.';
  } else if (expiringSoon > 0) {
    summary = `${expiringSoon} of your ${total} credential(s) expire within ${EXPIRING_SOON_DAYS} days — consider requesting a renewal soon.`;
  } else if (revoked > 0 || expired > 0) {
    summary = `${healthy} of your ${total} credential(s) are active and valid. ${revoked} revoked and ${expired} expired credential(s) are kept for your records.`;
  } else {
    summary = `All ${total} of your credentials are active and in good standing.`;
  }

  return { total, healthy, expiringSoon, expired, revoked, slices, summary };
}

/*
  Function Name: computeIssuance

  LAYMAN (Tropang Ex):
  Para sa issuer (paaralan): ilan lahat ang ni-release nila, anong klase ang pinakamarami,
  at paano umakyat/bumaba ang issuance kada buwan. Para makita kung gaano ka-aktibo.

  TECHNICAL:
  Counts only issued instances (excludes templates). Groups by credentialType and by
  YYYY-MM (last 6 calendar months, oldest→newest) using the best available issuance date.

  PARAMS:
  - credentials — array of issuer credential objects (credentialType, status, dates,
    and a type/isTemplate marker). [] tolerated.

  RETURNS:
  { total, byType:[{type,count}], byMonth:[{key,label,count}], topType, summary }
*/
export function computeIssuance(credentials) {
  const list = Array.isArray(credentials) ? credentials : [];

  // keep issued instances only (drop templates)
  const issued = list.filter((c) => {
    if (c.isTemplate === true) return false;
    const t = lc(c.type);
    if (t === 'template') return false;
    return true;
  });

  // by type
  const typeMap = new Map();
  for (const c of issued) {
    const key = c.credentialType || 'Uncategorized';
    typeMap.set(key, (typeMap.get(key) || 0) + 1);
  }
  const byType = [...typeMap.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  // last 6 months scaffold (oldest → newest); built deterministically from "now"
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('en-US', { month: 'short' });
    months.push({ key, label, count: 0 });
  }
  const monthIndex = new Map(months.map((m, i) => [m.key, i]));

  for (const c of issued) {
    const t = toTime(c.createdAt || c.issuedDate || c.savedToCouchDBAt || c.savedToUserWalletAt || c.issueDate);
    if (t === null) continue;
    const d = new Date(t);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (monthIndex.has(key)) months[monthIndex.get(key)].count++;
  }

  const total = issued.length;
  const topType = byType.length ? byType[0].type : null;
  const thisMonth = months[months.length - 1].count;
  const prevMonth = months[months.length - 2] ? months[months.length - 2].count : 0;

  let summary;
  if (total === 0) {
    summary = 'No credentials issued yet. Issue your first credential to start tracking performance.';
  } else {
    let trendNote = '';
    if (prevMonth > 0) {
      const delta = Math.round(((thisMonth - prevMonth) / prevMonth) * 100);
      trendNote = ` Issuance this month is ${delta >= 0 ? 'up' : 'down'} ${Math.abs(delta)}% vs last month.`;
    }
    summary = `You have issued ${total} credential(s)${topType ? `, most commonly "${topType}"` : ''}.${trendNote}`;
  }

  return { total, byType, byMonth: months, topType, summary };
}

/*
  Function Name: computeVerificationOutcomes

  LAYMAN (Tropang Ex):
  Kinukuha lahat ng verification attempts sa blockchain, tapos binibilang kung ilan ang
  valid, ilan ang na-catch na revoked/expired, at ilan ang peke/walang ganun (not-found).
  Ito yung "proof na pumipigil ng fraud" — ang mga peke ay agad na-reject.

  TECHNICAL:
  Each log carries a `result` object (from chaincode LogVerification). Buckets by outcome:
  valid, revoked, expired, not_found, other. Tolerates result being null or string-shaped.

  PARAMS:
  - logs — array of verification log objects (each with a `result` field). [] tolerated.

  RETURNS:
  { total, valid, revoked, expired, notFound, other, fraudCaught, slices, summary }
*/
export function computeVerificationOutcomes(logs) {
  const list = Array.isArray(logs) ? logs : [];
  let valid = 0, revoked = 0, expired = 0, notFound = 0, other = 0;

  for (const log of list) {
    let r = log && log.result;
    if (typeof r === 'string') {
      try { r = JSON.parse(r); } catch { r = { reason: r }; }
    }
    r = r || {};
    const status = lc(r.status);
    const reason = lc(r.reason);
    const isValid = r.valid === true || r.isValid === true;

    if (status === 'not_found' || reason.includes('not found')) notFound++;
    else if (isValid) valid++;
    else if (status === 'revoked' || reason.includes('revoked')) revoked++;
    else if (status === 'expired' || reason.includes('expired')) expired++;
    else other++;
  }

  const total = list.length;
  const fraudCaught = revoked + expired + notFound;
  const slices = [
    { name: 'Valid', value: valid, color: COLORS.green },
    { name: 'Revoked (caught)', value: revoked, color: COLORS.red },
    { name: 'Expired (caught)', value: expired, color: COLORS.amber },
    { name: 'Forged / not found', value: notFound, color: COLORS.purple },
    { name: 'Other', value: other, color: COLORS.gray },
  ].filter((s) => s.value > 0);

  let summary;
  if (total === 0) {
    summary = 'No verifications recorded yet. Each time a credential is checked, the outcome is logged immutably on the blockchain and counted here.';
  } else {
    summary = `Of ${total} verification(s), ${valid} were valid and ${fraudCaught} were rejected as invalid` +
      `${notFound > 0 ? ` — including ${notFound} forged or non-existent credential(s) that ChainCert blocked` : ''}.`;
  }

  return { total, valid, revoked, expired, notFound, other, fraudCaught, slices, summary };
}

/*
  Function Name: computeSuspiciousIssuers

  LAYMAN (Tropang Ex):
  Tinitignan kung may issuer (paaralan) na biglang nag-revoke ng maraming credentials sa
  loob ng nakaraang 30 araw. Kapag lumampas sa threshold (default 25%), nilalagyan ng flag.
  Walang misteryosong "score" — nakikita mo mismo yung dahilan at bilang.

  TECHNICAL:
  Groups admin credential rows by issuer. Per issuer counts issued instances and revocations
  whose revokedAt falls within SUSPICIOUS_WINDOW_DAYS. Flags issuers with at least
  SUSPICIOUS_MIN_SAMPLE issued credentials AND a windowed revocation rate >= SUSPICIOUS_THRESHOLD.
  Returns ALL issuers (ranked by rate) so the admin sees the full picture, flagged ones marked.

  PARAMS:
  - rows — admin credential rows (issuerName/issuerId, type, status, revokedAt). [] tolerated.
  - opts — { windowDays, threshold, minSample } overrides (optional).

  RETURNS:
  { issuers:[{issuerId,issuerName,issued,revokedInWindow,ratePct,flagged,reason}],
    flaggedCount, windowDays, thresholdPct, summary }
*/
export function computeSuspiciousIssuers(rows, opts = {}) {
  const windowDays = opts.windowDays ?? SUSPICIOUS_WINDOW_DAYS;
  const threshold = opts.threshold ?? SUSPICIOUS_THRESHOLD;
  const minSample = opts.minSample ?? SUSPICIOUS_MIN_SAMPLE;

  const list = Array.isArray(rows) ? rows : [];
  const now = Date.now();
  const windowStart = now - windowDays * 24 * 60 * 60 * 1000;

  const map = new Map(); // issuerId -> { issuerName, issued, revokedInWindow }
  for (const row of list) {
    const t = lc(row.type);
    if (t !== 'issued') continue; // ignore templates
    const id = row.issuerId || row.issuerName || 'unknown';
    if (!map.has(id)) {
      map.set(id, { issuerId: id, issuerName: row.issuerName || 'Unknown Issuer', issued: 0, revokedInWindow: 0 });
    }
    const agg = map.get(id);
    agg.issued++;
    if (lc(row.status) === 'revoked') {
      const rt = toTime(row.revokedAt);
      if (rt !== null && rt >= windowStart) agg.revokedInWindow++;
    }
  }

  const issuers = [...map.values()].map((a) => {
    const rate = a.issued > 0 ? a.revokedInWindow / a.issued : 0;
    const flagged = a.issued >= minSample && rate >= threshold;
    const ratePct = Math.round(rate * 100);
    return {
      ...a,
      ratePct,
      flagged,
      reason: flagged
        ? `Revoked ${a.revokedInWindow} of ${a.issued} credential(s) (${ratePct}%) in the last ${windowDays} days — above the ${Math.round(threshold * 100)}% threshold.`
        : `Revoked ${a.revokedInWindow} of ${a.issued} (${ratePct}%) in the last ${windowDays} days — within normal range.`,
    };
  }).sort((a, b) => b.ratePct - a.ratePct || b.issued - a.issued);

  const flaggedCount = issuers.filter((i) => i.flagged).length;
  const thresholdPct = Math.round(threshold * 100);

  let summary;
  if (issuers.length === 0) {
    summary = 'No issued-credential activity to analyze yet.';
  } else if (flaggedCount === 0) {
    summary = `No issuers flagged. All ${issuers.length} active issuer(s) have a ${windowDays}-day revocation rate below the ${thresholdPct}% threshold.`;
  } else {
    summary = `${flaggedCount} issuer(s) flagged for an unusually high revocation rate (≥ ${thresholdPct}% in the last ${windowDays} days). Review the highlighted rows below.`;
  }

  return { issuers, flaggedCount, windowDays, thresholdPct, summary };
}

/*
  Function Name: computeExpirationAlerts

  LAYMAN (Tropang Ex):
  Yung Credential Health donut sinasabi kung ILAN ang malapit nang mag-expire. Ito naman
  yung listahan kung ALIN — "DLSU Diploma, 12 araw na lang", nakaayos mula pinaka-malapit.
  Yung expired na, naka-pin sa taas para agad mapansin. Para may magawa agad ang holder
  (mag-request ng renewal), hindi lang bilang.

  TECHNICAL:
  Pure derive from the holder's already-loaded credentials. Skips revoked and
  never-expiring (no expiryDate) credentials. Urgency tiers: expired (daysLeft < 0) >
  critical (<= 14) > soon (<= EXPIRING_SOON_DAYS). Sorted ascending by daysLeft, so
  overdue (negative) sit at the top, then soonest upcoming. Anything beyond
  EXPIRING_SOON_DAYS is NOT an alert.

  PARAMS:
  - credentials — array of holder credential objects (expiryDate, status, credentialName,
    issuerName, credentialType). [] tolerated.

  RETURNS:
  { alerts:[{credentialName, issuerName, credentialType, daysLeft, urgency}],
    expiringSoonCount, expiredCount, summary }

  EXAMPLE
    computeExpirationAlerts([{credentialName:'Diploma', expiryDate:'<in 12 days>', status:'issued'}])
    → { alerts:[{credentialName:'Diploma', daysLeft:12, urgency:'critical', ...}],
        expiringSoonCount:1, expiredCount:0, summary:"1 credential expires within 60 days..." }
*/
export function computeExpirationAlerts(credentials) {
  const list = Array.isArray(credentials) ? credentials : [];
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  const alerts = [];
  for (const c of list) {
    if (lc(c.status) === 'revoked') continue;     // revoked is not a renewal concern
    const exp = toTime(c.expiryDate);
    if (exp === null) continue;                    // never-expires → not an alert

    const daysLeft = Math.ceil((exp - now) / DAY);
    let urgency;
    if (daysLeft < 0) urgency = 'expired';
    else if (daysLeft <= 14) urgency = 'critical';
    else if (daysLeft <= EXPIRING_SOON_DAYS) urgency = 'soon';
    else continue;                                 // beyond the window → not an alert

    alerts.push({
      credentialName: c.credentialName || 'Unnamed credential',
      issuerName: c.issuerName || 'Unknown issuer',
      credentialType: c.credentialType || '',
      daysLeft,
      urgency,
      cred: c, // original credential object so the UI can open the standard detail view
    });
  }

  alerts.sort((a, b) => a.daysLeft - b.daysLeft);  // overdue (negative) first, then soonest

  const expiredCount = alerts.filter((a) => a.urgency === 'expired').length;
  const expiringSoonCount = alerts.length - expiredCount;

  let summary;
  if (alerts.length === 0) {
    summary = 'None of your credentials are expiring soon. You have nothing to renew right now.';
  } else {
    const parts = [];
    if (expiringSoonCount > 0) parts.push(`${expiringSoonCount} credential(s) expire within ${EXPIRING_SOON_DAYS} days`);
    if (expiredCount > 0) parts.push(`${expiredCount} have already expired`);
    summary = `${parts.join(' and ')} — request a renewal from the issuer to keep them valid.`;
  }

  return { alerts, expiringSoonCount, expiredCount, summary };
}

/*
  Function Name: computeDemand

  LAYMAN (Tropang Ex):
  "Aling klase ng credential ang talagang tinitingnan ng employers?" Binibilang kung ilang
  beses na-verify kada credential type, tapos kinukumpara sa kung ilan ang na-issue. Ito yung
  proof na natatangi sa blockchain — alam natin kung aling credential ang aktwal na gamit at
  pinagkakatiwalaan sa labas, hindi lang kung ilan ang ginawa.

  TECHNICAL:
  Joins verification logs (admin-only, already loaded) to admin credential rows to resolve
  each verification's credential TYPE. Builds credentialId -> type map and an issued-count
  per type from rows where type === 'issued'. Verifications whose credentialId can't be
  resolved fall into "Other". ratio = verifications / max(issued, 1). Ranked by verifications
  desc. Verifier identity is never read — counts only.

  PARAMS:
  - verificationLogs — array of verification log objects (credentialId). [] tolerated.
  - adminCredentials — admin credential rows (credentialId/blockchainId, credentialType, type). [] tolerated.

  RETURNS:
  { byType:[{type, verifications, issued, ratio}], totalVerifications, topType, summary }
*/
export function computeDemand(verificationLogs, adminCredentials) {
  const logs = Array.isArray(verificationLogs) ? verificationLogs : [];
  const rows = Array.isArray(adminCredentials) ? adminCredentials : [];

  // credentialId -> type, and issued count per type
  const idToType = new Map();
  const issuedByType = new Map();
  for (const r of rows) {
    if (lc(r.type) !== 'issued') continue;
    const type = r.credentialType || 'Uncategorized';
    const ids = [r.credentialId, r.blockchainId].filter(Boolean);
    for (const id of ids) idToType.set(String(id), type);
    issuedByType.set(type, (issuedByType.get(type) || 0) + 1);
  }

  // verifications grouped by resolved type
  const verifByType = new Map();
  for (const log of logs) {
    const id = log && (log.credentialId || log.blockchainId);
    const type = (id && idToType.get(String(id))) || 'Other';
    verifByType.set(type, (verifByType.get(type) || 0) + 1);
  }

  const types = new Set([...verifByType.keys(), ...issuedByType.keys()]);
  const byType = [...types].map((type) => {
    const verifications = verifByType.get(type) || 0;
    const issued = issuedByType.get(type) || 0;
    const ratio = Math.round((verifications / Math.max(issued, 1)) * 10) / 10;
    return { type, verifications, issued, ratio };
  }).sort((a, b) => b.verifications - a.verifications || b.ratio - a.ratio);

  const totalVerifications = logs.length;
  const withVerifs = byType.filter((t) => t.verifications > 0);
  const topType = withVerifs.length ? withVerifs[0].type : null;

  let summary;
  if (totalVerifications === 0) {
    summary = 'No verifications recorded yet. Once verifiers start checking credentials, this shows which credential types are most in demand.';
  } else if (withVerifs.length === 1) {
    summary = `All ${totalVerifications} verification(s) so far are for "${topType}" credentials.`;
  } else {
    const lowest = withVerifs[withVerifs.length - 1];
    summary = `"${topType}" credentials are checked most often (${withVerifs[0].ratio}× per issued credential) — the highest real-world demand. ` +
      `"${lowest.type}" is the least verified (${lowest.ratio}×).`;
  }

  return { byType, totalVerifications, topType, summary };
}

/*
  Function Name: computeIntegritySummary

  LAYMAN (Tropang Ex):
  Kinukuha yung resulta ng huling integrity check (CouchDB vs blockchain) tapos ginagawang
  isang malinaw na buod: "142/142 tugma — walang binago." O kaya "⚠️ 3 hindi tugma —
  kailangang i-review." Hindi ito nagpapatakbo ng bagong check; binabasa lang yung huling
  resulta na nasa state na.

  TECHNICAL:
  Null-tolerant reducer over the existing integrityResult object (shape:
  {totalChecked, matched, mismatched, missing, errors, checkedAt|timestamp}). Returns
  available:false when no check has run this session. healthy = mismatched+missing+errors === 0.

  PARAMS:
  - integrityResult — the admin integrity-check response object, or null/undefined.

  RETURNS:
  { available, totalChecked, matched, mismatched, missing, errors,
    slices:[{name,value,color}], healthy, checkedAt, summary }
*/
export function computeIntegritySummary(integrityResult) {
  if (!integrityResult || typeof integrityResult !== 'object') {
    return {
      available: false,
      summary: 'No integrity check has been run this session. Run a CouchDB-vs-blockchain check to confirm no records were tampered with.',
    };
  }

  const totalChecked = Number(integrityResult.totalChecked) || 0;
  const matched = Number(integrityResult.matched) || 0;
  const mismatched = Number(integrityResult.mismatched) || 0;
  const missing = Number(integrityResult.missing) || 0;
  const errors = Number(integrityResult.errors) || 0;
  const checkedAt = integrityResult.checkedAt || integrityResult.timestamp || null;
  const healthy = mismatched + missing + errors === 0;

  const slices = [
    { name: 'Matched', value: matched, color: COLORS.green },
    { name: 'Mismatched', value: mismatched, color: COLORS.red },
    { name: 'Missing', value: missing, color: COLORS.amber },
    { name: 'Errors', value: errors, color: COLORS.purple },
  ].filter((s) => s.value > 0);

  let summary;
  if (totalChecked === 0) {
    summary = 'The last integrity check found no records to compare.';
  } else if (healthy) {
    summary = `Last check: all ${matched}/${totalChecked} record(s) match the blockchain — no tampering detected.`;
  } else {
    const issues = [];
    if (mismatched > 0) issues.push(`${mismatched} mismatched`);
    if (missing > 0) issues.push(`${missing} missing`);
    if (errors > 0) issues.push(`${errors} error(s)`);
    summary = `⚠️ Last check: ${issues.join(', ')} out of ${totalChecked} record(s) — review the flagged records in the integrity report.`;
  }

  return { available: true, totalChecked, matched, mismatched, missing, errors, slices, healthy, checkedAt, summary };
}

/*
  Function Name: computeProvenance

  LAYMAN (Tropang Ex):
  Yung "kwento" ng isang credential mula simula: ginawang template → ni-issue sa holder →
  (kung na-revoke o nag-expire). Sa halip na hilaw na talaan, ginagawang malinis na timeline
  na may icon at isang buod ("Ginawa, ni-issue kay Juan noong DATE, valid pa rin").

  TECHNICAL:
  Derives ordered lifecycle events from the credential's blockchain history (the cleaned
  array already fetched by the admin modal). Each ledger entry is mapped to an action via the
  same derivation the modal already uses (template > issued > revoked > updated). Returns
  events oldest→newest plus a processed one-line summary. Pure; no fetch.

  PARAMS:
  - history — array of blockchain history entries (each with timestamp + value{...}). [] tolerated.

  RETURNS:
  { events:[{label, icon, color, when, status}], created, issued, revoked, expired, summary }
*/
export function computeProvenance(history) {
  const list = Array.isArray(history) ? history : [];

  const deriveAction = (entry) => {
    const v = (entry && entry.value) || {};
    const status = lc(v.status);
    if (status === 'revoked' || v.revokedAt) return 'revoked';
    if (status === 'expired') return 'expired';
    if (v.assignedDate && v.holderID) return 'issued';
    if (v.isTemplate === true || !v.holderID) return 'created';
    return 'updated';
  };

  const META = {
    created:  { label: 'Template created', icon: '📄', color: COLORS.blue },
    issued:   { label: 'Issued to holder', icon: '🎓', color: COLORS.green },
    updated:  { label: 'Updated',          icon: '✏️', color: COLORS.gray },
    expired:  { label: 'Expired',          icon: '⏳', color: COLORS.amber },
    revoked:  { label: 'Revoked',          icon: '🚫', color: COLORS.red },
  };

  // oldest → newest
  const ordered = [...list].sort((a, b) => (toTime(a.timestamp) || 0) - (toTime(b.timestamp) || 0));
  const events = ordered.map((entry) => {
    const action = deriveAction(entry);
    const m = META[action] || META.updated;
    return {
      label: m.label,
      icon: m.icon,
      color: m.color,
      when: entry.timestamp || null,
      status: (entry.value && entry.value.status) || action,
    };
  });

  const has = (a) => events.some((e) => e.label === META[a].label);
  const created = has('created');
  const issued = has('issued');
  const revoked = has('revoked');
  const expired = has('expired');

  let summary;
  if (events.length === 0) {
    summary = 'No on-chain history found for this credential yet.';
  } else {
    const parts = [];
    if (created) parts.push('created as a template');
    if (issued) parts.push('issued to the holder');
    if (revoked) parts.push('later revoked');
    else if (expired) parts.push('expired');
    const tail = revoked || expired ? '' : ' and remains valid';
    summary = `This credential was ${parts.join(', ')}${tail}. Every step is permanently recorded on the blockchain and cannot be altered.`;
  }

  return { events, created, issued, revoked, expired, summary };
}

/*
  Function Name: computeProofTrail

  LAYMAN (Tropang Ex):
  Ilang beses na-check ang credential na ito ng mga employer/third party, kailan, at ano'ng
  resulta. Ito yung "patunay" na hindi lang ginawa ang credential — aktwal itong tinitignan
  at pinagkakatiwalaan sa labas, at lahat ng check ay naka-record sa blockchain.

  TECHNICAL:
  Filters the already-loaded verification logs to one credentialId (matches credentialId or
  blockchainId), oldest→newest. Each event carries timestamp, outcome (valid/revoked/expired/
  not_found), and self-reported verifier name/email (display-only; never aggregated into a
  trust score — verifier identity is unauthenticated). Pure; no fetch.

  PARAMS:
  - verificationLogs — array of verification log objects. [] tolerated.
  - credentialId — the credential to trace (string).

  RETURNS:
  { events:[{when, outcome, valid, verifierName, verifierEmail}], count, validCount, summary }
*/
export function computeProofTrail(verificationLogs, credentialId) {
  const logs = Array.isArray(verificationLogs) ? verificationLogs : [];
  const target = String(credentialId || '');
  if (!target) return { events: [], count: 0, validCount: 0, summary: 'No credential selected.' };

  const matches = logs.filter((log) => {
    const id = String((log && (log.credentialId || log.blockchainId)) || '');
    return id && id === target;
  });

  const events = matches.map((log) => {
    let r = log && log.result;
    if (typeof r === 'string') {
      try { r = JSON.parse(r); } catch { r = { reason: r }; }
    }
    r = r || {};
    const status = lc(r.status);
    const reason = lc(r.reason);
    const valid = r.valid === true || r.isValid === true;
    let outcome = 'other';
    if (status === 'not_found' || reason.includes('not found')) outcome = 'not_found';
    else if (valid) outcome = 'valid';
    else if (status === 'revoked' || reason.includes('revoked')) outcome = 'revoked';
    else if (status === 'expired' || reason.includes('expired')) outcome = 'expired';
    return {
      when: log.verifiedAt || log.timestamp || log.createdAt || null,
      outcome,
      valid,
      verifierName: log.verifierName || 'Anonymous',
      verifierEmail: log.verifierEmail || '',
    };
  }).sort((a, b) => (toTime(a.when) || 0) - (toTime(b.when) || 0));

  const count = events.length;
  const validCount = events.filter((e) => e.valid).length;

  let summary;
  if (count === 0) {
    summary = 'This credential has not been independently verified yet. When a verifier checks it, the event is logged immutably on-chain and appears here.';
  } else {
    summary = `Independently verified ${count} time(s) — ${validCount} confirmed valid. ` +
      `This tamper-proof trail is recorded on the blockchain and cannot be edited or deleted.`;
  }

  return { events, count, validCount, summary };
}

// Helper: parse a verification log's `result` into a normalized outcome string.
function verificationOutcome(log) {
  let r = log && log.result;
  if (typeof r === 'string') {
    try { r = JSON.parse(r); } catch { r = { reason: r }; }
  }
  r = r || {};
  const status = lc(r.status);
  const reason = lc(r.reason);
  const valid = r.valid === true || r.isValid === true;
  if (status === 'not_found' || reason.includes('not found')) return 'not_found';
  if (valid) return 'valid';
  if (status === 'revoked' || reason.includes('revoked')) return 'revoked';
  if (status === 'expired' || reason.includes('expired')) return 'expired';
  return 'other';
}

// Helper: last-6-months scaffold (oldest→newest), deterministic from "now".
function lastSixMonths() {
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('en-US', { month: 'short' });
    months.push({ key, label, count: 0 });
  }
  return months;
}

/*
  Function Name: computeHolderVerificationInsights

  LAYMAN (Tropang Ex):
  Para sa holder: "Sino at ilang beses na-check ang credentials ko, at lahat ba ay lumabas na
  VALID?" Ito yung pinaka-personal na patunay ng halaga ng blockchain — hindi mo magagawa ito
  sa PDF. Apat na cut sa iisang dataset: kabuuang trust signal, trend kada buwan, alin ang
  pinakamadalas i-verify, at alerta kung may nakakita ng revoked/invalid.

  TECHNICAL:
  Operates on the holder's OWN verification logs (already filtered server-side by the
  /api/wallet/my-verifications endpoint). Buckets each log by outcome (reuses verificationOutcome).
  Verifier identity is used only for a distinct-count (display), never as a trust score.

  PARAMS:
  - logs — array of this holder's verification log objects. [] tolerated.

  RETURNS:
  { totalChecks, validCount, invalidCount, allValid, distinctVerifiers,
    slices:[{name,value,color}], byMonth:[{label,count}],
    mostChecked:[{credentialName,count}], alerts:[{credentialName,outcome,when}], summary }
*/
export function computeHolderVerificationInsights(logs) {
  const list = Array.isArray(logs) ? logs : [];

  let valid = 0, revoked = 0, expired = 0, notFound = 0, other = 0;
  const verifiers = new Set();
  const months = lastSixMonths();
  const monthIndex = new Map(months.map((m, i) => [m.key, i]));
  const checkedMap = new Map();   // credentialName -> count
  const alerts = [];

  for (const log of list) {
    const outcome = verificationOutcome(log);
    if (outcome === 'valid') valid++;
    else if (outcome === 'revoked') revoked++;
    else if (outcome === 'expired') expired++;
    else if (outcome === 'not_found') notFound++;
    else other++;

    const who = lc(log.verifierEmail || log.verifierName);
    if (who) verifiers.add(who);

    const t = toTime(log.verifiedAt || log.timestamp || log.createdAt);
    if (t !== null) {
      const d = new Date(t);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (monthIndex.has(key)) months[monthIndex.get(key)].count++;
    }

    const name = log.credentialName || log.credentialId || 'Unknown credential';
    checkedMap.set(name, (checkedMap.get(name) || 0) + 1);

    if (outcome !== 'valid') {
      alerts.push({ credentialName: name, outcome, when: log.verifiedAt || log.timestamp || null });
    }
  }

  const totalChecks = list.length;
  const validCount = valid;
  const invalidCount = revoked + expired + notFound + other;
  const allValid = totalChecks > 0 && invalidCount === 0;
  const distinctVerifiers = verifiers.size;

  const slices = [
    { name: 'Valid', value: valid, color: COLORS.green },
    { name: 'Revoked', value: revoked, color: COLORS.red },
    { name: 'Expired', value: expired, color: COLORS.amber },
    { name: 'Not found', value: notFound, color: COLORS.purple },
    { name: 'Other', value: other, color: COLORS.gray },
  ].filter((s) => s.value > 0);

  const byMonth = months.map((m) => ({ label: m.label, count: m.count }));

  const mostChecked = [...checkedMap.entries()]
    .map(([credentialName, count]) => ({ credentialName, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  let summary;
  if (totalChecks === 0) {
    summary = 'None of your credentials have been verified yet. When an employer or organization checks one, it is recorded immutably on the blockchain and appears here — independent proof you can point to.';
  } else if (allValid) {
    summary = `Your credentials have been independently verified ${totalChecks} time(s) by ${distinctVerifiers} verifier(s) — every check returned VALID. This is third-party-confirmed, tamper-proof evidence your credentials hold up to scrutiny, stronger than any PDF.`;
  } else {
    summary = `Your credentials were checked ${totalChecks} time(s) by ${distinctVerifiers} verifier(s); ${validCount} returned valid. ⚠️ ${invalidCount} check(s) returned a non-valid result — see the alerts below; an employer saw that outcome.`;
  }

  return {
    totalChecks, validCount, invalidCount, allValid, distinctVerifiers,
    slices, byMonth, mostChecked, alerts, summary,
  };
}

/*
  Function Name: computeRevocationAudit

  LAYMAN (Tropang Ex):
  Para sa issuer (paaralan): "Alin sa mga credential ko ang madalas ko nire-revoke, at gaano
  kabilis pagkatapos i-issue?" Kung karamihan ay nire-revoke agad (loob ng 14 araw), ibig sabihin
  may problema sa PAG-ISSUE (maling data/eligibility check) — hindi sa lifecycle. Ito ang
  "self-audit" para makita kung saan sira ang proseso.

  TECHNICAL:
  Filters issued credentials with status 'revoked'. Groups by credentialName (the template the
  holder recognizes) and by time-to-revoke buckets (≤14d / 15–30d / >30d) computed from
  revokedAt − issue date. Logs with missing dates are counted in totals but skipped from the
  speed buckets (noted via fastShare being over determinable revocations only).

  PARAMS:
  - credentials — issuer's credential objects (status, revokedAt, issuedDate/createdAt, credentialType). [] tolerated.

  RETURNS:
  { total, revokedTotal, byTemplate:[{label,count}], bySpeed:[{bucket,count}], topTemplate, fastShare, summary }
*/
export function computeRevocationAudit(credentials) {
  const list = Array.isArray(credentials) ? credentials : [];
  const issued = list.filter((c) => c.isTemplate !== true && lc(c.type) !== 'template');
  const total = issued.length;

  const revoked = issued.filter((c) => lc(c.status) === 'revoked');
  const revokedTotal = revoked.length;

  // by template (credentialName the user recognizes; fallback to type)
  const tmplMap = new Map();
  for (const c of revoked) {
    const label = c.credentialName || c.credentialType || 'Uncategorized';
    tmplMap.set(label, (tmplMap.get(label) || 0) + 1);
  }
  const byTemplate = [...tmplMap.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  // time-to-revoke buckets
  const buckets = { '≤14 days': 0, '15–30 days': 0, '>30 days': 0 };
  let determinable = 0;
  const DAY = 24 * 60 * 60 * 1000;
  for (const c of revoked) {
    const rt = toTime(c.revokedAt || c.rejectedAt);
    const it = toTime(c.issuedDate || c.createdAt || c.savedToCouchDBAt || c.savedToUserWalletAt);
    if (rt === null || it === null) continue;
    determinable++;
    const days = Math.max(0, Math.round((rt - it) / DAY));
    if (days <= 14) buckets['≤14 days']++;
    else if (days <= 30) buckets['15–30 days']++;
    else buckets['>30 days']++;
  }
  const bySpeed = Object.entries(buckets).map(([bucket, count]) => ({ bucket, count }));

  const topTemplate = byTemplate.length ? byTemplate[0] : null;
  const earlyCount = buckets['≤14 days'];
  const fastShare = determinable > 0 ? Math.round((earlyCount / determinable) * 100) : 0;

  let summary;
  if (revokedTotal === 0) {
    summary = total === 0
      ? 'No issued credentials yet to audit.'
      : `None of your ${total} issued credential(s) have been revoked — a clean record.`;
  } else {
    const tmplNote = topTemplate
      ? ` "${topTemplate.label}" accounts for the most revocations (${topTemplate.count} of ${revokedTotal}).`
      : '';
    const speedNote = determinable > 0
      ? (fastShare >= 50
          ? ` ${fastShare}% were revoked within 14 days of issuing — this points to a problem at ISSUANCE (data entry / eligibility checks), not the credential lifecycle.`
          : ` Most revocations happened well after issuance — consistent with normal lifecycle changes rather than issuance errors.`)
      : '';
    summary = `You have revoked ${revokedTotal} of ${total} issued credential(s).${tmplNote}${speedNote}`;
  }

  return { total, revokedTotal, byTemplate, bySpeed, topTemplate, fastShare, summary };
}
