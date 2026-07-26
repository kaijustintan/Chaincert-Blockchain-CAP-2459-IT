// credentialLineage.js
/*
  FILE: credentialLineage.js
  LAYMAN (Tropang Ex): Tinitipon nito lahat ng "buhay" ng iisang credential — kahit
  ilang beses na-reissue / revoke / expire. Same template + same holder = iisang lineage.
  Kaya makikita mo sa isang lugar: "Award #1 kay Kyle" — issued, na-revoke, ni-reissue,
  nag-expire, in-issue ulit. Walang bagong backend o chaincode — hinahanap lang ang mga
  kapatid na credential sa listahan na nakuha na.

  TECHNICAL: Pure client-side. An issued credential's id is `${templateId}_${holderID}_${ts}`,
  so every reissue to the same holder from the same template shares (templateId, holderID).
  We group the already-fetched credential list by that pair — no extra fetch, no redeploy.
*/

/*
  Function Name: getCredentialLineage

  LAYMAN (Tropang Ex):
  Bigyan mo ng isang credential + ang buong listahan; ibabalik niya lahat ng instances
  ng SAME credential sa SAME holder (lahat ng reissue), naka-ayos mula pinakaluma → bago.

  TECHNICAL:
  Filters allCredentials to those matching the given credential's templateId AND holderID,
  sorted ascending by actual issuance time (assignedDate, falling back to issuedDate/createdAt).
  Falls back to [credential] if it lacks templateId/holderID or nothing matches.

  PARAMS:
  - credential     — the focal credential (must carry templateId + holderID).
  - allCredentials — the full list already loaded on the page (issuer or holder).

  RETURNS:
  Array of credential instances (oldest → newest). At least [credential].
*/
export function getCredentialLineage(credential, allCredentials) {
  if (!credential) return [];
  const tid = credential.templateId || "";
  const hid = credential.holderID || "";
  if (!tid || !hid) return [credential];
  const matches = (allCredentials || []).filter(
    (c) => (c.templateId || "") === tid && (c.holderID || "") === hid
  );
  const list = matches.length ? matches : [credential];
  // UAT: newest issuance first — history displays read latest-at-top.
  return [...list].sort(
    (a, b) =>
      new Date(b.assignedDate || b.issuedDate || b.createdAt || 0) -
      new Date(a.assignedDate || a.issuedDate || a.createdAt || 0)
  );
}

// True if a credential is the same instance as the focal one (by blockchain id).
export function isSameInstance(a, b) {
  if (!a || !b) return false;
  return (a.blockchainId || a.id) === (b.blockchainId || b.id);
}

/*
  Function Name: getRenewalCount

  LAYMAN (Tropang Ex):
  Ilang beses na na-renew itong credential? Kung isa lang siya sa listahan, 0 —
  hindi pa na-renew. Kung tatlo silang magkakapatid (same credential, same tao),
  ibig sabihin dalawang beses na na-reissue, kaya 2 ang isasauli.

  TECHNICAL:
  Counts sibling instances sharing (templateId, holderID) and subtracts the
  original issuance. Tolerates both holderID and holderId casings, which the
  wallet and profile payloads use inconsistently.

  PARAMS:
  - cred           — the focal credential.
  - allCredentials — the full list already loaded on the page.

  RETURNS:
  Integer >= 0. 0 when the credential has no templateId or has never been reissued.
*/
export function getRenewalCount(cred, allCredentials) {
  if (!cred || !cred.templateId) return 0;
  const key = `${cred.templateId}|${cred.holderID || cred.holderId || ''}`;
  return (allCredentials || []).filter(
    (c) => `${c.templateId || ''}|${c.holderID || c.holderId || ''}` === key
  ).length - 1;
}

/*
  Function Name: getRenewalDates

  LAYMAN (Tropang Ex):
  Para sa PDF export ng na-renew na credential: kailan siya UNANG na-issue, at
  kailan yung kasalukuyang kopya. Hindi buong history — dalawang petsa lang,
  para masabi ng PDF na "Originally issued X, current since Y".

  TECHNICAL:
  Resolves the oldest and newest instance in the lineage by actual issuance time.
  Returns {} when there is no reissue (fewer than 2 instances), so callers can
  spread it without emitting empty PDF rows.

  PARAMS:
  - cred           — the focal credential.
  - allCredentials — the full list already loaded on the page.

  RETURNS:
  { originalIssuedDate, currentSinceDate } or {} when not renewed.
*/
export function getRenewalDates(cred, allCredentials) {
  if (!cred || !cred.templateId) return {};
  const key = `${cred.templateId}|${cred.holderID || cred.holderId || ''}`;
  const line = (allCredentials || []).filter(
    (c) => `${c.templateId || ''}|${c.holderID || c.holderId || ''}` === key
  );
  if (line.length < 2) return {};
  const t = (c) => new Date(c.assignedDate || c.savedToUserWalletAt || c.createdAt || 0).getTime();
  const sorted = [...line].sort((a, b) => t(a) - t(b));
  const first = sorted[0], last = sorted[sorted.length - 1];
  return {
    originalIssuedDate: first.assignedDate || first.savedToUserWalletAt || first.createdAt || null,
    currentSinceDate: last.assignedDate || last.savedToUserWalletAt || last.createdAt || null,
  };
}
