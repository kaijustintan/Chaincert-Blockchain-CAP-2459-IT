const couchDB = require('../couchDB_service');
const { sendServerError } = require('../securityHelpers'); // Phase 5 Tier 2 (M9)

// ==========================================================================================
// M1 (Phase 5 hardening): OWNERSHIP HELPERS  (fixes BOLA / IDOR — KB Z-3, CWE-639)
// ------------------------------------------------------------------------------------------
// LAYMAN (Tropang Ex): Dati, basta nag-request ka ng "credentials ni user X", binibigay agad —
// kahit hindi ikaw si X. Pwede mong palitan yung ID sa URL at makita ang buong wallet ng iba.
// Ngayon, kinukuha natin kung sino ka galing sa TOKEN mo (req.user.id), hindi sa ID na pinasa
// ng browser, tapos cinecheck kung sa'yo nga ba talaga yung hinihingi mong record.
// TECHNICAL: The authenticated identity is the JWT subject (req.user.id), which equals the
// holderID stored on credential/notification docs. Reads are scoped to req.user.id; mutations
// verify the target object belongs to req.user.id before touching it. Never trust the URL/body id.
// ==========================================================================================

// Strip the storage-prefix so blockchainId / _id / cred-id forms all compare equal.
const stripCredPrefix = (value) =>
  String(value || '').replace(/^user_cred_/, '').replace(/^issuer_cred_/, '');

// Returns true only if `credentialId` (in any of its id forms) belongs to `holderId`.
async function holderOwnsCredential(holderId, credentialId) {
  const target = stripCredPrefix(credentialId);
  if (!holderId || !target) return false;

  const ownDocs = await couchDB.getUserCredentialsByHolderId(holderId);
  return (ownDocs || []).some((doc) => {
    const ids = [doc._id, doc.blockchainId, doc.credentialId, doc.id]
      .filter(Boolean)
      .map(stripCredPrefix);
    return ids.includes(target);
  });
}

// Returns true only if `notificationId` belongs to `holderId`.
async function holderOwnsNotification(holderId, notificationId) {
  if (!holderId || !notificationId) return false;
  const notifs = await couchDB.getUserNotifications(holderId);
  return (notifs || []).some((n) => n && n._id === notificationId);
}

const walletController = {
  getUserCredentials: async (req, res) => {
    try {
      const { holderID } = req.params;
      const authedId = req.user?.id;

      // M1: identity comes from the token, not the URL.
      if (!authedId) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }
      if (holderID && holderID !== authedId) {
        return res.status(403).json({ success: false, message: 'You can only access your own credentials.' });
      }

      const credentials = await couchDB.getUserCredentialsByHolderId(authedId);

      return res.status(200).json({
        success: true,
        credentials: credentials || [],
        count: (credentials || []).length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      return sendServerError(res, error, 'WALLET'); // M9
    }
  },

  /*
    Function Name: getMyVerifications

    LAYMAN (Tropang Ex):
    Ibinabalik nito kung ILANG beses na-verify ang credentials NG NAKA-LOGIN na holder lang —
    ang "sino ang nag-check sa credential ko, kailan, at ano ang resulta." Galing ito sa
    parehong immutable verification log na nasa blockchain, pero sinasala sa server para
    HINDI mo makita ang verification ng ibang tao (privacy boundary).

    TECHNICAL:
    Phase 4 holder Verification Insights. Identity comes from the JWT (req.user.id) — never a
    URL param (no IDOR). Resolves the holder's own credential IDs via
    getUserCredentialsByHolderId, then reads the global on-chain verification log
    (GetAllVerificationLogs) and filters server-side to ONLY this holder's credentialIds.
    Mirrors verifierController.getAllVerificationLogs for the gateway call.

    PARAMS:
    - req, res — Express.
    - getContractAndGateway — injected by the route from req.app.locals.

    RETURNS:
    200 { success, logs:[...own logs...], count, timestamp } | 401 if unauthenticated.
  */
  getMyVerifications: async (req, res, getContractAndGateway) => {
    let gateway;
    try {
      const holderId = req.user?.id;
      if (!holderId) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }

      // Resolve this holder's own credential IDs (all id forms, prefix-stripped).
      const ownDocs = await couchDB.getUserCredentialsByHolderId(holderId);
      const ownIds = new Set();
      (ownDocs || []).forEach((doc) => {
        [doc._id, doc.blockchainId, doc.credentialId, doc.id]
          .filter(Boolean)
          .forEach((id) => ownIds.add(stripCredPrefix(id)));
      });

      // No credentials → no verifications. Skip the ledger round-trip.
      if (ownIds.size === 0) {
        return res.status(200).json({ success: true, logs: [], count: 0, timestamp: new Date().toISOString() });
      }

      // Read the immutable verification log (read-only), then filter server-side.
      // Same gateway identity selection as verifierController.getAllVerificationLogs.
      const identityName = req.user.role === 'admin' ? 'chaincert-admin' : 'admin';
      const orgName = 'Org1';
      const conn = await getContractAndGateway(identityName, orgName);
      gateway = conn.gateway;
      const resultBuffer = await conn.contract.evaluateTransaction('GetAllVerificationLogs');
      const allLogs = JSON.parse(resultBuffer.toString()) || [];

      // PRIVACY BOUNDARY: keep only logs for credentials this holder owns.
      const myLogs = allLogs.filter((log) => {
        const id = stripCredPrefix(log && log.credentialId);
        return id && ownIds.has(id);
      });

      return res.status(200).json({
        success: true,
        logs: myLogs,
        count: myLogs.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return sendServerError(res, error, 'WALLET'); // M9
    } finally {
      if (gateway) {
        try { await gateway.disconnect(); } catch (_) { /* best-effort */ }
      }
    }
  },

  updateCredentialVisibility: async (req, res) => {
    try {
      const { credentialId } = req.params;
      const { visibility } = req.body;
      const authedId = req.user?.id;

      if (!authedId) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }
      if (!credentialId) {
        return res.status(400).json({ success: false, message: 'credentialId is required' });
      }
      if (!visibility || !['public', 'private'].includes(visibility)) {
        return res.status(400).json({ success: false, message: 'visibility must be "public" or "private"' });
      }

      // M1: only the credential's owner may change its visibility.
      const owns = await holderOwnsCredential(authedId, credentialId);
      if (!owns) {
        return res.status(403).json({ success: false, message: 'You can only modify your own credentials.' });
      }

      await couchDB.updateCredentialVisibility(credentialId, visibility);

      return res.status(200).json({
        success: true,
        message: `Credential visibility updated to ${visibility}`,
        credentialId,
        visibility,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      return sendServerError(res, error, 'WALLET'); // M9
    }
  },

  updateIssuerTemplateVisibility: async (req, res) => {
    try {
      const { credentialId } = req.params;
      const { visibility } = req.body;
      const issuerId = req.user?.id;

      if (!issuerId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      if (!credentialId) {
        return res.status(400).json({ success: false, message: 'credentialId is required' });
      }
      if (!visibility || !['public', 'private'].includes(visibility)) {
        return res.status(400).json({ success: false, message: 'visibility must be "public" or "private"' });
      }

      // Already owner-scoped: the service looks up the template under THIS issuer's CouchDB.
      const result = await couchDB.updateIssuerTemplateVisibility(issuerId, credentialId, visibility);

      return res.status(200).json({
        success: true,
        message: `Issuer template visibility updated to ${visibility}`,
        credentialId,
        issuerId,
        visibility,
        doc: result?.doc || null,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      return sendServerError(res, error, 'WALLET'); // M9
    }
  },

  updateCredentialOrder: async (req, res) => {
    try {
      const { credentialId } = req.params;
      const { newOrder } = req.body;
      const authedId = req.user?.id;

      if (!authedId) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }
      if (!credentialId) {
        return res.status(400).json({ success: false, message: 'credentialId is required' });
      }
      if (newOrder === undefined || newOrder === null || typeof newOrder !== 'number') {
        return res.status(400).json({ success: false, message: 'newOrder must be a number' });
      }

      // M1: only the credential's owner may reorder it.
      const owns = await holderOwnsCredential(authedId, credentialId);
      if (!owns) {
        return res.status(403).json({ success: false, message: 'You can only modify your own credentials.' });
      }

      await couchDB.updateCredentialOrder(credentialId, newOrder);

      return res.status(200).json({
        success: true,
        message: `Credential order updated to ${newOrder}`,
        credentialId,
        newOrder,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      return sendServerError(res, error, 'WALLET'); // M9
    }
  },

  getUserNotifications: async (req, res) => {
    try {
      const { holderID } = req.params;
      const authedId = req.user?.id;

      if (!authedId) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }
      if (holderID && holderID !== authedId) {
        return res.status(403).json({ success: false, message: 'You can only access your own notifications.' });
      }

      const notifications = await couchDB.getUserNotifications(authedId);

      return res.status(200).json({
        success: true,
        notifications: notifications || [],
        count: (notifications || []).length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      return sendServerError(res, error, 'WALLET'); // M9
    }
  },

  getUnreadUserNotifications: async (req, res) => {
    try {
      const { holderID } = req.params;
      const authedId = req.user?.id;

      if (!authedId) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }
      if (holderID && holderID !== authedId) {
        return res.status(403).json({ success: false, message: 'You can only access your own notifications.' });
      }

      const notifications = await couchDB.getUnreadUserNotifications(authedId);

      return res.status(200).json({
        success: true,
        notifications: notifications || [],
        unreadCount: (notifications || []).length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      return sendServerError(res, error, 'WALLET'); // M9
    }
  },

  markNotificationAsRead: async (req, res) => {
    try {
      const { notificationId } = req.params;
      const authedId = req.user?.id;

      if (!authedId) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }
      if (!notificationId) {
        return res.status(400).json({
          success: false,
          message: 'notificationId is required'
        });
      }

      // M1: only the notification's owner may mark it read.
      const owns = await holderOwnsNotification(authedId, notificationId);
      if (!owns) {
        return res.status(403).json({ success: false, message: 'You can only modify your own notifications.' });
      }

      await couchDB.markNotificationAsRead(notificationId);

      return res.status(200).json({
        success: true,
        message: 'Notification marked as read',
        notificationId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      return sendServerError(res, error, 'WALLET'); // M9
    }
  },

  /*
    Function Name: requestCredentialRenewal  (C11)

    LAYMAN (Tropang Ex):
    "Paki-renew naman itong credential ko" — padadala ng holder sa issuer. Hindi ito
    automatic na renewal: ang issuer ang magdedesisyon gamit ang SARILI nilang records
    (attendance, bayad, CPD hours). ChainCert ang nagre-route lang ng request.

    TECHNICAL:
    Identity from the JWT (req.user.id) — never the body (no IDOR). Ownership check reuses
    the same owned-docs matching as holderOwnsCredential, but keeps the matched doc so we can
    copy issuerID/templateId/names into the request. One PENDING request per credential (409).
    Creates a type:'renewal_request' doc + a best-effort in-app notification for the issuer.

    PARAMS:
    - req.body.credentialId — any id form of the holder's own credential (blockchainId/_id/id).

    RETURNS:
    201 { success, request } | 400 no id | 403 not yours | 409 already pending.
  */
  requestCredentialRenewal: async (req, res) => {
    try {
      const holderId = req.user?.id;
      if (!holderId) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }
      const { credentialId } = req.body || {};
      if (!credentialId) {
        return res.status(400).json({ success: false, message: 'credentialId is required.' });
      }
      const target = stripCredPrefix(credentialId);

      // Ownership + resolve the credential doc in one pass (issuer/template/names ride along).
      const ownDocs = await couchDB.getUserCredentialsByHolderId(holderId);
      const cred = (ownDocs || []).find((doc) =>
        [doc._id, doc.blockchainId, doc.credentialId, doc.id]
          .filter(Boolean).map(stripCredPrefix).includes(target)
      );
      if (!cred) {
        return res.status(403).json({ success: false, message: 'You can only request renewal for your own credentials.' });
      }

      // One pending request per credential.
      const existing = await couchDB.getRenewalRequestsByHolder(holderId);
      const alreadyPending = (existing || []).some(
        (r) => r.status === 'pending' && stripCredPrefix(r.credentialId) === target
      );
      if (alreadyPending) {
        return res.status(409).json({ success: false, message: 'A renewal request for this credential is already pending with the issuer.' });
      }

      const issuerId = cred.issuerID || cred.issuerId || '';
      const request = await couchDB.createRenewalRequest({
        holderId,
        holderName: cred.holderName || req.user?.email || '',
        holderEmail: cred.holderEmail || req.user?.email || '',
        issuerId,
        issuerName: cred.issuerName || '',
        credentialId: target,
        templateId: cred.templateId || '',
        credentialName: cred.credentialName || '',
        credentialType: cred.credentialType || '',
      });

      // Best-effort in-app notification for the issuer (targetRole:'issuer' reaches their bell).
      if (issuerId) {
        try {
          await couchDB.createNotification({
            targetRole: 'issuer',
            issuerId,
            issuerEmail: cred.issuerEmail || '',
            category: 'renewal_request',
            title: 'Credential renewal requested',
            message: `${request.holderName || 'A holder'} requested renewal of "${request.credentialName || target}". Review it under Issue Credentials → Renewal Requests.`,
          });
        } catch (nErr) {
          console.warn('[RENEWAL] issuer notification failed (non-fatal):', nErr.message);
        }
      }

      return res.status(201).json({ success: true, request });
    } catch (error) {
      return sendServerError(res, error, 'WALLET'); // M9
    }
  },

  // C11: the holder's own renewal requests (drives the persistent "Requested" button state).
  getMyRenewalRequests: async (req, res) => {
    try {
      const holderId = req.user?.id;
      if (!holderId) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }
      const requests = await couchDB.getRenewalRequestsByHolder(holderId);
      return res.status(200).json({ success: true, requests, count: requests.length });
    } catch (error) {
      return sendServerError(res, error, 'WALLET'); // M9
    }
  }
};

module.exports = walletController;
