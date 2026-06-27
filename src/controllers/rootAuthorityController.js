// rootAuthorityController.js
/*
  FILE: rootAuthorityController.js
  LAYMAN (Tropang Ex): Ito yung "tanggapan" ng isang Root Authority (hal. DLSU) para sa mga
  subordinate issuer na nag-aapply sa ilalim nila (hal. isang department o bootcamp). Dito niya
  nakikita yung mga naghihintay na aplikante, na-approve, na-reject, at na-disable; at dito rin niya
  pinapayagan o tinatanggihan ang isang subordinate BAGO pa ito makarating sa ChainCert admin para
  sa final approval. Bawat desisyon ay naka-record sa blockchain at may email sa aplikante.

  TECHNICAL: Express controller for the root-authority tier of the consortium governance model.
  All handlers require an authenticated issuer (req.user.role === 'issuer') and derive the root
  authority from req.user.id — they never trust an id from the request body/params for ownership.
  Read handlers delegate to couchDB_service queries scoped by rootAuthorityId. The two decision
  handlers follow the platform dual-write pattern: CouchDB status change first, then an immutable
  on-chain Log* via getContractAndGateway() (injected, not imported); a blockchain failure returns
  partial success with a `warning` rather than rolling back. Notifications + applicant emails are
  best-effort (fire-and-forget / try-caught). Log getters evaluateTransaction against the chaincode.

  OUTLINE:
    SUBORDINATE QUEUES (read, scoped by rootAuthorityId)
      - getPendingSubordinatesForRoot(req,res)            awaiting this root's decision
      - getAllSubordinatesForRoot(req,res)                every subordinate under this root
      - getRootApprovedSubordinatesForRoot(req,res)       root-approved (awaiting admin)
      - getRootRejectedSubordinatesForRoot(req,res)       root-rejected
      - getApprovedSubordinatesForRoot(req,res)           fully approved / active
      - getDisabledSubordinatesForRoot(req,res)           admin-disabled
    DECISIONS (write — dual-write: CouchDB → chaincode Log*, + notify + email)
      - rootApproveSubordinateIssuer(req,res,getContractAndGateway)
      - rootRejectSubordinateIssuer(req,res,getContractAndGateway)
    BLOCKCHAIN LOGS (read — evaluateTransaction)
      - GetRootSubordinateLogsByRootAuthority(req,res,getContractAndGateway)
      - GetRootSubordinateApprovalLogsByRootAuthority(req,res,getContractAndGateway)
      - GetRootSubordinateRejectionLogsByRootAuthority(req,res,getContractAndGateway)
*/

const couchDB = require('../couchDB_service');
const { sendServerError } = require('../securityHelpers'); // Phase 5 Tier 2 (M9)
const mailerService = require('../mailerService'); // F28: subordinate decision emails

const rootAuthorityController = {
  /*
    Function Name: getPendingSubordinatesForRoot
    LAYMAN (Tropang Ex): Ibinabalik ang listahan ng mga subordinate na naghihintay ng desisyon ng
    nakalogin na root authority.
    TECHNICAL: GET handler. Requires req.user.role === 'issuer'; queries couchDB by req.user.id.
    PARAMS: req, res (Express). Root authority taken from req.user.id (never from the request).
    RETURNS: 200 { success, data:[issuer], count } | 401 unauth | 403 non-issuer | 500 via sendServerError.
  */
  getPendingSubordinatesForRoot: async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Unauthorized.' });
      }

      if (req.user.role !== 'issuer') {
        return res.status(403).json({ success: false, message: 'Issuer access required.' });
      }

      const rootAuthorityId = req.user.id;
      const rows = await couchDB.getPendingSubordinatesForRoot(rootAuthorityId);

      return res.status(200).json({ success: true, data: rows, count: rows.length });
    } catch (error) {
      console.error('Error fetching pending subordinates for root:', error);
      return sendServerError(res, error, 'ROOT-AUTHORITY'); // M9
    }
  },

  /*
    Function Name: getAllSubordinatesForRoot
    LAYMAN (Tropang Ex): Lahat ng subordinate sa ilalim ng root authority na ito, anuman ang status.
    TECHNICAL: GET handler. Issuer-only; couchDB.getAllSubordinatesForRoot(req.user.id).
    PARAMS: req, res. Root authority from req.user.id.
    RETURNS: 200 { success, message, data:[issuer], count } | 403 non-issuer | 500 via sendServerError.
  */
  getAllSubordinatesForRoot: async (req, res) => {
    try {
      if (!req.user || req.user.role !== 'issuer') {
        return res.status(403).json({ success: false, message: 'Issuer access required.' });
      }

      const rootAuthorityId = req.user.id;
      const rows = await couchDB.getAllSubordinatesForRoot(rootAuthorityId);

      return res.status(200).json({
        success: true,
        message: 'All subordinates retrieved successfully.',
        data: rows,
        count: rows.length
      });
    } catch (error) {
      console.error('Error fetching all subordinates for root:', error);
      return sendServerError(res, error, 'ROOT-AUTHORITY'); // M9
    }
  },

  /*
    Function Name: getRootApprovedSubordinatesForRoot
    LAYMAN (Tropang Ex): Mga subordinate na na-approve na ng root pero naghihintay pa ng final
    approval ng ChainCert admin.
    TECHNICAL: GET handler. Issuer-only; couchDB.getRootApprovedSubordinatesForRoot(req.user.id).
    PARAMS: req, res. Root authority from req.user.id.
    RETURNS: 200 { success, message, data:[issuer], count } | 403 non-issuer | 500 via sendServerError.
  */
  getRootApprovedSubordinatesForRoot: async (req, res) => {
    try {
      if (!req.user || req.user.role !== 'issuer') {
        return res.status(403).json({ success: false, message: 'Issuer access required.' });
      }

      const rootAuthorityId = req.user.id;
      const rows = await couchDB.getRootApprovedSubordinatesForRoot(rootAuthorityId);

      return res.status(200).json({
        success: true,
        message: 'Root-approved subordinates retrieved successfully.',
        data: rows,
        count: rows.length
      });
    } catch (error) {
      console.error('Error fetching root-approved subordinates for root:', error);
      return sendServerError(res, error, 'ROOT-AUTHORITY'); // M9
    }
  },

  /*
    Function Name: getRootRejectedSubordinatesForRoot
    LAYMAN (Tropang Ex): Mga subordinate na tinanggihan ng root authority na ito.
    TECHNICAL: GET handler. Issuer-only; couchDB.getRootRejectedSubordinatesForRoot(req.user.id).
    PARAMS: req, res. Root authority from req.user.id.
    RETURNS: 200 { success, message, data:[issuer], count } | 403 non-issuer | 500 via sendServerError.
  */
  getRootRejectedSubordinatesForRoot: async (req, res) => {
    try {
      if (!req.user || req.user.role !== 'issuer') {
        return res.status(403).json({ success: false, message: 'Issuer access required.' });
      }

      const rootAuthorityId = req.user.id;
      const rows = await couchDB.getRootRejectedSubordinatesForRoot(rootAuthorityId);

      return res.status(200).json({
        success: true,
        message: 'Root-rejected subordinates retrieved successfully.',
        data: rows,
        count: rows.length
      });
    } catch (error) {
      console.error('Error fetching root-rejected subordinates for root:', error);
      return sendServerError(res, error, 'ROOT-AUTHORITY'); // M9
    }
  },

  /*
    Function Name: getApprovedSubordinatesForRoot
    LAYMAN (Tropang Ex): Mga subordinate na fully approved / active na (pasado na sa admin).
    TECHNICAL: GET handler. Issuer-only; couchDB.getApprovedSubordinatesForRoot(req.user.id).
    PARAMS: req, res. Root authority from req.user.id.
    RETURNS: 200 { success, message, data:[issuer], count } | 403 non-issuer | 500 via sendServerError.
  */
  getApprovedSubordinatesForRoot: async (req, res) => {
    try {
      if (!req.user || req.user.role !== 'issuer') {
        return res.status(403).json({ success: false, message: 'Issuer access required.' });
      }

      const rootAuthorityId = req.user.id;
      const rows = await couchDB.getApprovedSubordinatesForRoot(rootAuthorityId);

      return res.status(200).json({
        success: true,
        message: 'Approved subordinates retrieved successfully.',
        data: rows,
        count: rows.length
      });
    } catch (error) {
      console.error('Error fetching approved subordinates for root:', error);
      return sendServerError(res, error, 'ROOT-AUTHORITY'); // M9
    }
  },

  /*
    Function Name: getDisabledSubordinatesForRoot
    LAYMAN (Tropang Ex): Mga subordinate na na-disable ng ChainCert admin.
    TECHNICAL: GET handler. Issuer-only; couchDB.getDisabledSubordinatesForRoot(req.user.id).
    PARAMS: req, res. Root authority from req.user.id.
    RETURNS: 200 { success, message, data:[issuer], count } | 403 non-issuer | 500 via sendServerError.
  */
  getDisabledSubordinatesForRoot: async (req, res) => {
    try {
      if (!req.user || req.user.role !== 'issuer') {
        return res.status(403).json({ success: false, message: 'Issuer access required.' });
      }

      const rootAuthorityId = req.user.id;
      const rows = await couchDB.getDisabledSubordinatesForRoot(rootAuthorityId);

      return res.status(200).json({
        success: true,
        message: 'Disabled subordinates retrieved successfully.',
        data: rows,
        count: rows.length
      });
    } catch (error) {
      console.error('Error fetching disabled subordinates for root:', error);
      return sendServerError(res, error, 'ROOT-AUTHORITY'); // M9
    }
  },

  /*
    Function Name: rootApproveSubordinateIssuer

    LAYMAN (Tropang Ex):
    Dito pinapayagan ng root authority ang isang subordinate na nag-apply sa ilalim niya. Pag-approve,
    ina-update ang status sa database, naka-record sa blockchain, may abiso sa admin at sa subordinate
    (in-app), at may email sa subordinate. Pagkatapos nito, ang aplikasyon ay aakyat sa ChainCert
    admin para sa final approval.

    TECHNICAL:
    Dual-write decision handler. Verifies issuer auth, resolves the root authority from req.user.id,
    flips the subordinate's status in CouchDB (rootApproveSubordinateIssuer), then submits the
    immutable LogRootSubordinateApproval transaction using the ROOT's Fabric identity/org. Blockchain
    failure is caught → response carries a `warning` (no rollback — ledger-first dual-write policy).
    Admin + subordinate notifications and the applicant email are best-effort.

    PARAMS:
    - req — Express request; req.params.issuerId (subordinate), req.body.approvalReason (optional),
      req.user.id (root authority, trusted source).
    - res — Express response.
    - getContractAndGateway — injected (app.locals); opens the Fabric gateway/contract.

    RETURNS:
    200 { success, message, warning?, data } on success (warning set if the on-chain log failed);
    401 unauth; 403 non-issuer; 404 root-authority record not found; error.statusCode passthrough;
    else 500 via sendServerError.

    STEPS
      Step 1 — Authorize
        Layman    : Tinitingnan kung issuer nga at sino ang root authority.
        Technical : Reject if !req.user or role !== 'issuer'; rootAuthorityId = req.user.id; load its doc.
      Step 2 — CouchDB status change (source of truth mirror, written first)
        Layman    : I-mark na approved-by-root ang subordinate sa database.
        Technical : couchDB.rootApproveSubordinateIssuer(issuerId, rootAuthorityId, approvalReason).
      Step 3 — On-chain immutable log
        Layman    : Itatak sa blockchain ang approval gamit ang identity ng root authority.
        Technical : submitTransaction('LogRootSubordinateApproval', ...); failure → blockchainWarning,
                    gateway disconnected in finally.
      Step 4 — Notify + email (best-effort)
        Layman    : Abisuhan ang admin at ang subordinate; mag-email sa subordinate.
        Technical : createAdminNotification + createNotification (try-caught) + sendMailFireAndForget.

    EXAMPLE
      POST /api/admin/root/subordinates/issuer_123/approve  body { approvalReason: "Valid MOA" }
      → 200 { success:true, message:"Subordinate issuer root-approved successfully.", data:{...} }
      → 200 { success:true, message:"...but blockchain log failed.", warning:"<err>", data:{...} }
  */
  rootApproveSubordinateIssuer: async (req, res, getContractAndGateway) => {
    let gateway = null;

    try {
      const { issuerId } = req.params;
      const { approvalReason } = req.body;

      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Unauthorized.' });
      }

      if (req.user.role !== 'issuer') {
        return res.status(403).json({ success: false, message: 'Issuer access required.' });
      }

      const rootAuthorityId = req.user.id;
      const rootAuthorityDoc = await couchDB.getIssuerById(rootAuthorityId);
      if (!rootAuthorityDoc) {
        return res.status(404).json({ success: false, message: 'Root authority issuer record not found.' });
      }

      const result = await couchDB.rootApproveSubordinateIssuer(
        issuerId,
        rootAuthorityId,
        approvalReason || ''
      );

      const subordinateDoc = await couchDB.getIssuerById(issuerId);

      let blockchainWarning = null;

      try {
        if (typeof getContractAndGateway !== 'function') {
          throw new Error('getContractAndGateway not provided');
        }

        const identityName = rootAuthorityDoc.fabricIdentity;
        const orgName = rootAuthorityDoc.orgName;

        const cg = await getContractAndGateway(identityName, orgName);
        gateway = cg.gateway;
        const contract = cg.contract;

        await contract.submitTransaction(
          'LogRootSubordinateApproval',
          issuerId,
          subordinateDoc.email,
          subordinateDoc.orgName,
          rootAuthorityId,
          rootAuthorityDoc.orgName || rootAuthorityDoc.contactName || rootAuthorityDoc.email,
          approvalReason || 'Approved by root authority'
        );
      } catch (bcErr) {
        blockchainWarning = bcErr?.message || String(bcErr);
        console.error('[rootApproveSubordinateIssuer] Blockchain log failed:', blockchainWarning);
      } finally {
        try { if (gateway) await gateway.disconnect(); } catch (_) {}
        gateway = null;
      }

      try {
        await couchDB.createAdminNotification({
          category: 'subordinate_root_approved',
          title: 'Subordinate Approved by Root',
          message: `${subordinateDoc?.orgName || issuerId} was approved by root authority ${rootAuthorityDoc.orgName || rootAuthorityDoc.email}.`,
          issuerId,
          issuerEmail: subordinateDoc?.email || null
        });
      } catch (notificationError) {
        console.warn('[ADMIN NOTIFICATION] Failed to create root approval notification:', notificationError.message);
      }

      // N1: notify the SUBORDINATE issuer (their own account) in-app.
      try {
        await couchDB.createNotification({
          targetRole: 'issuer', issuerId, issuerEmail: subordinateDoc?.email || null,
          category: 'subordinate_root_approved',
          title: 'Your root authority approved you',
          message: 'Your root authority approved your application. It now awaits final approval by the ChainCert admin.'
        });
      } catch (e) { console.warn('[ISSUER NOTIFICATION] root-approve:', e.message); }

      // F28 + G3: email the subordinate that its root authority approved it,
      // fire-and-forget so the action responds immediately.
      if (subordinateDoc?.email) {
        mailerService.sendMailFireAndForget({
          to: subordinateDoc.email,
          subject: 'Your ChainCert Subordinate Application Was Approved by Your Root Authority',
          html: mailerService.renderEmail({
            heading: 'Approved by Root Authority',
            bodyHtml: `
                <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.6;">Dear <strong>${subordinateDoc.orgName || 'Applicant'}</strong>,</p>
                <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.6;">Your subordinate issuer application has been <strong style="color:#16a34a;">approved</strong> by your root authority, <strong>${rootAuthorityDoc.orgName || rootAuthorityDoc.email}</strong>.</p>
                <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">Your application now moves to the ChainCert administration team for final approval. You will be notified once a decision is made.</p>`
          }),
          text: `Dear ${subordinateDoc.orgName || 'Applicant'},\n\nYour subordinate issuer application was approved by your root authority (${rootAuthorityDoc.orgName || rootAuthorityDoc.email}). It now awaits final approval by the ChainCert administration team.`
        }, '[rootApproveSubordinateIssuer]');
      }

      return res.status(200).json({
        success: true,
        message: blockchainWarning
          ? 'Subordinate issuer root-approved, but blockchain log failed.'
          : 'Subordinate issuer root-approved successfully.',
        warning: blockchainWarning,
        data: result
      });
    } catch (error) {
      console.error('Error root-approving subordinate issuer:', error);

      if (error.statusCode) {
        return res.status(error.statusCode).json({ success: false, message: error.message });
      }

      return sendServerError(res, error, 'ROOT-AUTHORITY'); // M9
    }
  },

  /*
    Function Name: rootRejectSubordinateIssuer

    LAYMAN (Tropang Ex):
    Dito tinatanggihan ng root authority ang isang subordinate applicant. Kailangang may dahilan
    (rejectionReason). Ina-update sa database, naka-record sa blockchain, may abiso sa admin, at may
    email sa subordinate kasama ang dahilan. Walang in-app notice sa subordinate dahil hindi na ito
    makakapag-login kapag rejected — email na lang ang channel.

    TECHNICAL:
    Dual-write decision handler mirroring rootApproveSubordinateIssuer but for rejection. Requires a
    non-empty rejectionReason (400 otherwise). CouchDB rejection first, then LogRootSubordinateRejection
    on-chain with the ROOT's identity/org; blockchain failure → `warning`, no rollback.

    PARAMS:
    - req — req.params.issuerId, req.body.rejectionReason (REQUIRED), req.user.id (root authority).
    - res — Express response.
    - getContractAndGateway — injected; opens the Fabric gateway/contract.

    RETURNS:
    200 { success, message, warning?, data }; 400 missing reason; 401 unauth; 403 non-issuer;
    404 root-authority record not found; error.statusCode passthrough; else 500 via sendServerError.

    STEPS
      Step 1 — Authorize + validate reason
        Layman    : Issuer ba? May dahilan ba ng rejection?
        Technical : Reject if !req.user / role !== 'issuer'; 400 if rejectionReason blank.
      Step 2 — CouchDB rejection (written first)
        Technical : couchDB.rootRejectSubordinateIssuer(issuerId, rootAuthorityId, rejectionReason).
      Step 3 — On-chain immutable log
        Technical : submitTransaction('LogRootSubordinateRejection', ...); failure → warning; finally disconnect.
      Step 4 — Notify admin + email subordinate (best-effort; no in-app notice for the subordinate)
        Technical : createAdminNotification (try-caught) + sendMailFireAndForget with the reason.

    EXAMPLE
      POST /api/admin/root/subordinates/issuer_123/reject  body { rejectionReason: "Incomplete docs" }
      → 200 { success:true, message:"Subordinate issuer root-rejected successfully.", data:{...} }
      → 400 { success:false, message:"Rejection reason is required." }
  */
  rootRejectSubordinateIssuer: async (req, res, getContractAndGateway) => {
    let gateway = null;

    try {
      const { issuerId } = req.params;
      const { rejectionReason } = req.body;

      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Unauthorized.' });
      }

      if (req.user.role !== 'issuer') {
        return res.status(403).json({ success: false, message: 'Issuer access required.' });
      }

      if (!rejectionReason || rejectionReason.trim() === '') {
        return res.status(400).json({ success: false, message: 'Rejection reason is required.' });
      }

      const rootAuthorityId = req.user.id;
      const rootAuthorityDoc = await couchDB.getIssuerById(rootAuthorityId);
      if (!rootAuthorityDoc) {
        return res.status(404).json({ success: false, message: 'Root authority issuer record not found.' });
      }

      const result = await couchDB.rootRejectSubordinateIssuer(
        issuerId,
        rootAuthorityId,
        rejectionReason
      );

      const subordinateDoc = await couchDB.getIssuerById(issuerId);

      let blockchainWarning = null;

      try {
        if (typeof getContractAndGateway !== 'function') {
          throw new Error('getContractAndGateway not provided');
        }

        const identityName = rootAuthorityDoc.fabricIdentity;
        const orgName = rootAuthorityDoc.orgName;

        const cg = await getContractAndGateway(identityName, orgName);
        gateway = cg.gateway;
        const contract = cg.contract;

        await contract.submitTransaction(
          'LogRootSubordinateRejection',
          issuerId,
          subordinateDoc.email,
          subordinateDoc.orgName,
          rootAuthorityId,
          rootAuthorityDoc.orgName || rootAuthorityDoc.contactName || rootAuthorityDoc.email,
          rejectionReason
        );
      } catch (bcErr) {
        blockchainWarning = bcErr?.message || String(bcErr);
        console.error('[rootRejectSubordinateIssuer] Blockchain log failed:', blockchainWarning);
      } finally {
        try { if (gateway) await gateway.disconnect(); } catch (_) {}
        gateway = null;
      }

      try {
        await couchDB.createAdminNotification({
          category: 'subordinate_root_rejected',
          title: 'Subordinate Rejected by Root',
          message: `${subordinateDoc?.orgName || issuerId} was rejected by root authority ${rootAuthorityDoc.orgName || rootAuthorityDoc.email}.`,
          issuerId,
          issuerEmail: subordinateDoc?.email || null
        });
      } catch (notificationError) {
        console.warn('[ADMIN NOTIFICATION] Failed to create root rejection notification:', notificationError.message);
      }
      // N1: no in-app notification — a root-rejected subordinate can't log in, so it would
      // never be seen. The rejection EMAIL (above) is the channel.

      // F28 + G3: email the subordinate that its root authority rejected it,
      // fire-and-forget so the action responds immediately.
      if (subordinateDoc?.email) {
        mailerService.sendMailFireAndForget({
          to: subordinateDoc.email,
          subject: 'Update on Your ChainCert Subordinate Application',
          html: mailerService.renderEmail({
            heading: 'Not Approved by Root Authority',
            bodyHtml: `
                <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.6;">Dear <strong>${subordinateDoc.orgName || 'Applicant'}</strong>,</p>
                <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.6;">Your subordinate issuer application was <strong style="color:#b91c1c;">not approved</strong> by your root authority, <strong>${rootAuthorityDoc.orgName || rootAuthorityDoc.email}</strong>.</p>
                <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.6;"><strong>Reason:</strong> ${rejectionReason}</p>
                <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">You may address the points above and submit a new application.</p>`
          }),
          text: `Dear ${subordinateDoc.orgName || 'Applicant'},\n\nYour subordinate issuer application was not approved by your root authority (${rootAuthorityDoc.orgName || rootAuthorityDoc.email}).\nReason: ${rejectionReason}\n\nYou may submit a new application.`
        }, '[rootRejectSubordinateIssuer]');
      }

      return res.status(200).json({
        success: true,
        message: blockchainWarning
          ? 'Subordinate issuer root-rejected, but blockchain log failed.'
          : 'Subordinate issuer root-rejected successfully.',
        warning: blockchainWarning,
        data: result
      });
    } catch (error) {
      console.error('Error root-rejecting subordinate issuer:', error);

      if (error.statusCode) {
        return res.status(error.statusCode).json({ success: false, message: error.message });
      }

      return sendServerError(res, error, 'ROOT-AUTHORITY'); // M9
    }
  },

  // =========================================================================================================
// ROOT AUTHORITY BLOCKCHAIN LOGS
// =========================================================================================================

/*
  Function Name: GetRootSubordinateLogsByRootAuthority
  LAYMAN (Tropang Ex): Kinukuha mula sa blockchain ang LAHAT ng desisyon (approve + reject) na ginawa
  ng nakalogin na root authority sa mga subordinate niya.
  TECHNICAL: Read handler. Issuer-only; resolves the root's Fabric identity/org from its CouchDB doc,
  then evaluateTransaction('GetRootSubordinateLogsByRootAuthority', rootAuthorityId). Gateway closed in finally.
  PARAMS: req, res, getContractAndGateway (injected). Root authority from req.user.id.
  RETURNS: 200 { success, message, logs:[], count } | 401 | 403 | 404 root record/getCAG missing | 500.
*/
GetRootSubordinateLogsByRootAuthority: async (req, res, getContractAndGateway) => {
  let gateway = null;

  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    if (req.user.role !== 'issuer') {
      return res.status(403).json({ success: false, message: 'Issuer access required.' });
    }

    const rootAuthorityId = req.user.id;
    const rootAuthorityDoc = await couchDB.getIssuerById(rootAuthorityId);

    if (!rootAuthorityDoc) {
      return res.status(404).json({
        success: false,
        message: 'Root authority issuer record not found.'
      });
    }

    if (typeof getContractAndGateway !== 'function') {
      return res.status(500).json({
        success: false,
        message: 'getContractAndGateway not provided.'
      });
    }

    const identityName = rootAuthorityDoc.fabricIdentity;
    const orgName = rootAuthorityDoc.orgName;

    const cg = await getContractAndGateway(identityName, orgName);
    gateway = cg.gateway;
    const contract = cg.contract;

    const result = await contract.evaluateTransaction(
      'GetRootSubordinateLogsByRootAuthority',
      rootAuthorityId
    );

    const logs = JSON.parse(result.toString());

    return res.status(200).json({
      success: true,
      message: 'Root subordinate logs retrieved successfully.',
      logs: Array.isArray(logs) ? logs : [],
      count: Array.isArray(logs) ? logs.length : 0
    });

  } catch (error) {
    console.error('Error fetching root subordinate logs by root authority:', error);
    return sendServerError(res, error, 'ROOT-AUTHORITY'); // M9
  } finally {
    try { if (gateway) await gateway.disconnect(); } catch (_) {}
  }
},

/*
  Function Name: GetRootSubordinateApprovalLogsByRootAuthority
  LAYMAN (Tropang Ex): Tulad ng nasa taas pero APPROVALS lang ang kinukuha sa blockchain.
  TECHNICAL: Read handler. Issuer-only; evaluateTransaction('GetRootSubordinateApprovalLogsByRootAuthority',
  rootAuthorityId) using the root's identity/org. Gateway closed in finally.
  PARAMS: req, res, getContractAndGateway (injected). Root authority from req.user.id.
  RETURNS: 200 { success, message, logs:[], count } | 401 | 403 | 404 | 500 via sendServerError.
*/
GetRootSubordinateApprovalLogsByRootAuthority: async (req, res, getContractAndGateway) => {
  let gateway = null;

  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    if (req.user.role !== 'issuer') {
      return res.status(403).json({ success: false, message: 'Issuer access required.' });
    }

    const rootAuthorityId = req.user.id;
    const rootAuthorityDoc = await couchDB.getIssuerById(rootAuthorityId);

    if (!rootAuthorityDoc) {
      return res.status(404).json({
        success: false,
        message: 'Root authority issuer record not found.'
      });
    }

    if (typeof getContractAndGateway !== 'function') {
      return res.status(500).json({
        success: false,
        message: 'getContractAndGateway not provided.'
      });
    }

    const identityName = rootAuthorityDoc.fabricIdentity;
    const orgName = rootAuthorityDoc.orgName;

    const cg = await getContractAndGateway(identityName, orgName);
    gateway = cg.gateway;
    const contract = cg.contract;

    const result = await contract.evaluateTransaction(
      'GetRootSubordinateApprovalLogsByRootAuthority',
      rootAuthorityId
    );

    const logs = JSON.parse(result.toString());

    return res.status(200).json({
      success: true,
      message: 'Root subordinate approval logs retrieved successfully.',
      logs: Array.isArray(logs) ? logs : [],
      count: Array.isArray(logs) ? logs.length : 0
    });

  } catch (error) {
    console.error('Error fetching root subordinate approval logs by root authority:', error);
    return sendServerError(res, error, 'ROOT-AUTHORITY'); // M9
  } finally {
    try { if (gateway) await gateway.disconnect(); } catch (_) {}
  }
},

/*
  Function Name: GetRootSubordinateRejectionLogsByRootAuthority
  LAYMAN (Tropang Ex): Tulad ng nasa taas pero REJECTIONS lang ang kinukuha sa blockchain.
  TECHNICAL: Read handler. Issuer-only; evaluateTransaction('GetRootSubordinateRejectionLogsByRootAuthority',
  rootAuthorityId) using the root's identity/org. Gateway closed in finally.
  PARAMS: req, res, getContractAndGateway (injected). Root authority from req.user.id.
  RETURNS: 200 { success, message, logs:[], count } | 401 | 403 | 404 | 500 via sendServerError.
*/
GetRootSubordinateRejectionLogsByRootAuthority: async (req, res, getContractAndGateway) => {
  let gateway = null;

  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    if (req.user.role !== 'issuer') {
      return res.status(403).json({ success: false, message: 'Issuer access required.' });
    }

    const rootAuthorityId = req.user.id;
    const rootAuthorityDoc = await couchDB.getIssuerById(rootAuthorityId);

    if (!rootAuthorityDoc) {
      return res.status(404).json({
        success: false,
        message: 'Root authority issuer record not found.'
      });
    }

    if (typeof getContractAndGateway !== 'function') {
      return res.status(500).json({
        success: false,
        message: 'getContractAndGateway not provided.'
      });
    }

    const identityName = rootAuthorityDoc.fabricIdentity;
    const orgName = rootAuthorityDoc.orgName;

    const cg = await getContractAndGateway(identityName, orgName);
    gateway = cg.gateway;
    const contract = cg.contract;

    const result = await contract.evaluateTransaction(
      'GetRootSubordinateRejectionLogsByRootAuthority',
      rootAuthorityId
    );

    const logs = JSON.parse(result.toString());

    return res.status(200).json({
      success: true,
      message: 'Root subordinate rejection logs retrieved successfully.',
      logs: Array.isArray(logs) ? logs : [],
      count: Array.isArray(logs) ? logs.length : 0
    });

  } catch (error) {
    console.error('Error fetching root subordinate rejection logs by root authority:', error);
    return sendServerError(res, error, 'ROOT-AUTHORITY'); // M9
  } finally {
    try { if (gateway) await gateway.disconnect(); } catch (_) {}
  }
}
};

module.exports = rootAuthorityController;
