// credentialStatus.js
/*
  FILE: credentialStatus.js
  LAYMAN (Tropang Ex): Maliit na helper para sa expiry ng credential. Dito naka-set
  yung "tamang" rule: ang credential ay valid hanggang KATAPUSAN ng araw ng expiry
  niya sa oras ng Manila (+08:00). Ginagamit ito para tumugma ang nakikita sa
  dashboard (badge) sa sinasabi ng verification — para hindi na mangyari yung
  "Active sa dashboard pero Expired pag ni-verify."

  TECHNICAL: Front-end mirror of the backend isExpiredManila() helper and the
  chaincode VerifyCredential boundary. A bare "YYYY-MM-DD" expiryDate is valid
  through 23:59:59.999 of that day in Asia/Manila. Compute-on-read so badges stay
  correct even before the daily expiry cron flips the stored status.
*/

// True if the credential is past its end-of-day-Manila expiry instant.
export function isEffectivelyExpired(expiryDate) {
  if (!expiryDate || String(expiryDate).trim() === '') return false;
  const datePart = String(expiryDate).slice(0, 10);
  const endOfDayManila = Date.parse(`${datePart}T23:59:59.999+08:00`);
  if (Number.isNaN(endOfDayManila)) return false;
  return Date.now() > endOfDayManila;
}

// Display status for a credential: a credential past its expiry reads as
// "expired" even if its stored status is still issued/active (cron lag).
// Revoked/expired stored statuses are always respected.
export function effectiveCredentialStatus(credential) {
  if (!credential) return 'unknown';
  const status = String(credential.status || '').toLowerCase();
  if (status === 'revoked' || status === 'expired') return status;
  if (isEffectivelyExpired(credential.expiryDate)) return 'expired';
  return credential.status || 'active';
}

// Earliest selectable expiry date (YYYY-MM-DD) for the issue form: tomorrow in
// Manila, since same-day expiry is blocked (a credential must be valid for at
// least one full day). 32h = 8h Manila offset + 24h.
export function minIssueExpiryDate() {
  return new Date(Date.now() + 32 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
