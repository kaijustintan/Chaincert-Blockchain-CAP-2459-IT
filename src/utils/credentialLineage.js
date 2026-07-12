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
