// adminIssuerController.js
/*
  FILE: adminIssuerController.js
  LAYMAN (Tropang Ex): Ito yung "issuer management queue" ng admin. Dito niya nakikita ang mga
  naghihintay (root at subordinate), approved, rejected, at disabled na issuer; at dito niya
  ina-approve, rine-reject, dini-disable, o ina-enable ang isang issuer. Bawat desisyon ay naka-record
  sa blockchain, may abiso/email sa issuer. Para sa subordinate, hindi pwedeng i-approve ng admin
  hangga't hindi pa ito na-approve ng root authority nito (subordinate gate). At bago i-approve, tinitiyak
  munang existing na ang Fabric identity ng issuer sa wallet — kung wala, hindi pa pwede (manual setup).

  TECHNICAL: Express controller, admin-gated for mutations (req.user.role === 'admin'); read lists
  assume the admin-only /api/admin mount (M2). The four lifecycle actions (Approve/Reject/Disable/
  Enable_Issuer) follow the dual-write pattern: CouchDB status change first, then an immutable on-chain
  Log* (LogIssuerApproval / LogIssuerRejection / LogIssuerStatusChange) via getContractAndGateway(
  'chaincert-admin','Org1'); a blockchain failure returns partial success with a `warning`, never a
  rollback. Notifications + emails are best-effort (fire-and-forget). List getters project a SAFE subset
  of fields. Module-level helpers verify/derive the issuer's Fabric wallet identity before approval.

  OUTLINE:
    FABRIC IDENTITY HELPERS (module-level)
      - normalizeFabricIdentityPart(value)        slug a name part for an identity string
      - getExpectedIssuerIdentityName(issuerDoc)  derive '<org>-admin' or '<root>-subordinate-<org>'
      - ensureIssuerFabricIdentityExists(doc)     assert the wallet identity exists (else 400)
    QUEUES (read)
      - getPendingIssuers / getPendingRootIssuers / getPendingSubordinateIssuers
      - getPendingSubordinateIssuersAwaitingRootApproval / getPendingSubordinateIssuersRootApproved
      - getAdminActionablePendingIssuers
      - getApprovedIssuers / getRejectedIssuers / getDisabledIssuers   (safe-field projections)
    LIFECYCLE (write — dual-write CouchDB → chaincode Log*, + notify + email)
      - Approve_Issuer(req,res,getCAG)   (subordinate gate + Fabric identity check)
      - Reject_Issuer(req,res,getCAG)
      - Disable_Issuer(req,res,getCAG)
      - Enable_Issuer(req,res,getCAG)
*/

const couchDB = require('../couchDB_service');
const mailerService = require('../mailerService');
const fs = require('fs');
const path = require('path');
const { Wallets } = require('fabric-network');
const { sendServerError } = require('../securityHelpers'); // Phase 5 Tier 2 (M9)

/*
  Function Name: normalizeFabricIdentityPart
  LAYMAN (Tropang Ex): Nililinis ang isang pangalan para gawing bahagi ng Fabric identity (maliit na
  letra, walang space).
  TECHNICAL: Pure helper. Lowercases, trims, strips whitespace from a string.
  PARAMS: value — any string-ish. RETURNS: normalized string ('' if falsy).
*/
const normalizeFabricIdentityPart = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');

/*
  Function Name: getExpectedIssuerIdentityName
  LAYMAN (Tropang Ex): Hinuhulaan/binubuo ang dapat na pangalan ng Fabric identity ng issuer base sa
  uri nito — root: '<org>-admin'; subordinate: '<rootAuthority>-subordinate-<org>'.
  TECHNICAL: Pure helper. Builds the canonical identity name from issuerDoc fields; throws if required
  fields (orgName, or rootAuthorityName for subordinates) are missing.
  PARAMS: issuerDoc — { issuerType, orgName, rootAuthorityName? }.
  RETURNS: identity-name string. THROWS: Error if required name parts are absent.
*/
const getExpectedIssuerIdentityName = (issuerDoc) => {
  const issuerType = String(issuerDoc?.issuerType || 'root').trim().toLowerCase();

  if (issuerType === 'subordinate') {
    if (!issuerDoc?.rootAuthorityName || !issuerDoc?.orgName) {
      throw new Error('Subordinate issuer is missing rootAuthorityName or orgName for Fabric identity verification.');
    }

    return `${normalizeFabricIdentityPart(issuerDoc.rootAuthorityName)}-subordinate-${normalizeFabricIdentityPart(issuerDoc.orgName)}`;
  }

  if (!issuerDoc?.orgName) {
    throw new Error('Issuer orgName is required for Fabric identity verification.');
  }

  return `${normalizeFabricIdentityPart(issuerDoc.orgName)}-admin`;
};

/*
  Function Name: ensureIssuerFabricIdentityExists
  LAYMAN (Tropang Ex): Tinitiyak na may Fabric identity na talaga ang issuer sa wallet BAGO siya
  i-approve. Kung wala, hindi pwede — kailangan munang gawin/i-enroll ang identity (manual setup).
  TECHNICAL: Resolves the expected identity name, then checks the file-system wallet (~/chaincert-api/
  wallet) for a matching .id file/dir or a Wallets.get() entry. Throws a 400-tagged error if absent.
  PARAMS: issuerDoc — the issuer record.
  RETURNS: the verified identityName (string). THROWS: Error{statusCode:400} if not found.
*/
const ensureIssuerFabricIdentityExists = async (issuerDoc) => {
  const identityName = getExpectedIssuerIdentityName(issuerDoc);
  const walletPath = path.join(__dirname, '../../chaincert-api/wallet');
  const identityFilePath = path.join(walletPath, `${identityName}.id`);
  const identityDirPath = path.join(walletPath, identityName);

  console.log('[Approve_Issuer][FabricCheck] Checking identity:', identityName);
  console.log('[Approve_Issuer][FabricCheck] Resolved wallet path:', walletPath);
  console.log('[Approve_Issuer][FabricCheck] File exists:', fs.existsSync(identityFilePath), identityFilePath);
  console.log('[Approve_Issuer][FabricCheck] Directory exists:', fs.existsSync(identityDirPath), identityDirPath);

  if (fs.existsSync(identityFilePath) || fs.existsSync(identityDirPath)) {
    return identityName;
  }

  const wallet = await Wallets.newFileSystemWallet(walletPath);
  const identity = await wallet.get(identityName);

  if (!identity) {
    const availableWalletEntries = fs.existsSync(walletPath)
      ? fs.readdirSync(walletPath).filter((entry) => entry.includes(identityName) || entry.endsWith('.id'))
      : [];
    console.log('[Approve_Issuer][FabricCheck] Matching wallet entries:', availableWalletEntries);

    const err = new Error(`Fabric identity '${identityName}' was not found in the wallet. Please create/enroll this identity before approving the issuer.`);
    err.statusCode = 400;
    throw err;
  }

  return identityName;
};

const adminIssuerController = {
  /*
    Function Name: getPendingIssuers
    LAYMAN (Tropang Ex): Lahat ng naghihintay-ng-approval na issuer (anumang uri).
    TECHNICAL: Read wrapper — couchDB.getPendingIssuers().
    PARAMS: req, res. RETURNS: 200 { success, data:[issuer] } | 500 via sendServerError.
  */
  getPendingIssuers: async (req, res) => {
    try {
      const pendingIssuers = await couchDB.getPendingIssuers();
      res.status(200).json({
        success: true,
        data: pendingIssuers
      });
    } catch (error) {
      console.error('Error fetching pending issuers:', error);
      return sendServerError(res, error, 'ADMIN-ISSUER'); // M9
    }
  },

  /*
    Function Name: getPendingRootIssuers
    LAYMAN (Tropang Ex): Naghihintay na ROOT authority applicants lang.
    TECHNICAL: Read wrapper — couchDB.getPendingRootIssuers().
    PARAMS: req, res. RETURNS: 200 { success, data, count } | 500.
  */
  getPendingRootIssuers: async (req, res) => {
    try {
      const rows = await couchDB.getPendingRootIssuers();
      return res.status(200).json({ success: true, data: rows, count: rows.length });
    } catch (error) {
      console.error('Error fetching pending root issuers:', error);
      return sendServerError(res, error, 'ADMIN-ISSUER'); // M9
    }
  },

  /*
    Function Name: getPendingSubordinateIssuers
    LAYMAN (Tropang Ex): Naghihintay na SUBORDINATE applicants lang (anumang root-approval status).
    TECHNICAL: Read wrapper — couchDB.getPendingSubordinateIssuers().
    PARAMS: req, res. RETURNS: 200 { success, data, count } | 500.
  */
  getPendingSubordinateIssuers: async (req, res) => {
    try {
      const rows = await couchDB.getPendingSubordinateIssuers();
      return res.status(200).json({ success: true, data: rows, count: rows.length });
    } catch (error) {
      console.error('Error fetching pending subordinate issuers:', error);
      return sendServerError(res, error, 'ADMIN-ISSUER'); // M9
    }
  },

  /*
    Function Name: getPendingSubordinateIssuersAwaitingRootApproval
    LAYMAN (Tropang Ex): Mga subordinate na naghihintay pa ng desisyon ng ROOT authority nila.
    TECHNICAL: Read wrapper — couchDB.getPendingSubordinateIssuersAwaitingRootApproval().
    PARAMS: req, res. RETURNS: 200 { success, data, count } | 500.
  */
  getPendingSubordinateIssuersAwaitingRootApproval: async (req, res) => {
    try {
      const rows = await couchDB.getPendingSubordinateIssuersAwaitingRootApproval();
      return res.status(200).json({ success: true, data: rows, count: rows.length });
    } catch (error) {
      console.error('Error fetching subordinate issuers awaiting root approval:', error);
      return sendServerError(res, error, 'ADMIN-ISSUER'); // M9
    }
  },

  /*
    Function Name: getPendingSubordinateIssuersRootApproved
    LAYMAN (Tropang Ex): Mga subordinate na approved na ng root, naghihintay na lang ng admin.
    TECHNICAL: Read wrapper — couchDB.getPendingSubordinateIssuersRootApproved().
    PARAMS: req, res. RETURNS: 200 { success, data, count } | 500.
  */
  getPendingSubordinateIssuersRootApproved: async (req, res) => {
    try {
      const rows = await couchDB.getPendingSubordinateIssuersRootApproved();
      return res.status(200).json({ success: true, data: rows, count: rows.length });
    } catch (error) {
      console.error('Error fetching root-approved subordinate issuers:', error);
      return sendServerError(res, error, 'ADMIN-ISSUER'); // M9
    }
  },

  /*
    Function Name: getAdminActionablePendingIssuers
    LAYMAN (Tropang Ex): Mga pending na PWEDE nang aksyunan ng admin ngayon (root applicants +
    subordinates na root-approved na) — yung talagang nasa admin queue na.
    TECHNICAL: Read wrapper — couchDB.getAdminActionablePendingIssuers().
    PARAMS: req, res. RETURNS: 200 { success, data, count } | 500.
  */
  getAdminActionablePendingIssuers: async (req, res) => {
    try {
      const rows = await couchDB.getAdminActionablePendingIssuers();
      return res.status(200).json({ success: true, data: rows, count: rows.length });
    } catch (error) {
      console.error('Error fetching admin-actionable pending issuers:', error);
      return sendServerError(res, error, 'ADMIN-ISSUER'); // M9
    }
  },

  /*
    Function Name: getApprovedIssuers
    LAYMAN (Tropang Ex): Lahat ng approved/active na issuer (kasama ang infra fields na kailangan ng
    admin dashboard tulad ng fabricIdentity/couchDBUrl/walletId).
    TECHNICAL: Read + SAFE-field projection — maps each doc to an explicit subset (no password/docs).
    PARAMS: req, res. RETURNS: 200 { success, message, data:[safeIssuer], count } | 500.
  */
  getApprovedIssuers: async (req, res) => {
    try {
      const approvedIssuers = await couchDB.getApprovedIssuers();
      const safeIssuers = approvedIssuers.map(doc => ({
        id: doc._id,
        orgName: doc.orgName,
        contactName: doc.contactName,
        email: doc.email,
        status: doc.status,
        createdAt: doc.createdAt,
        approvedAt: doc.approvedAt,
        approvedBy: doc.approvedBy,
        walletId: doc.walletId,
        fabricIdentity: doc.fabricIdentity,
        couchDBUrl: doc.couchDBUrl,
        issuerType: doc.issuerType || 'root',
        rootAuthorityId: doc.rootAuthorityId || null,
        rootAuthorityName: doc.rootAuthorityName || null
      }));

      return res.status(200).json({
        success: true,
        message: 'Approved issuers retrieved successfully',
        data: safeIssuers,
        count: safeIssuers.length
      });
    } catch (error) {
      console.error('Error fetching approved issuers:', error);
      return sendServerError(res, error, 'ADMIN-ISSUER'); // M9
    }
  },

  /*
    Function Name: getRejectedIssuers
    LAYMAN (Tropang Ex): Lahat ng na-reject na issuer, kasama ang dahilan at sino/kailan nag-reject.
    TECHNICAL: Read + SAFE-field projection (adds rejectedAt/rejectedBy/rejectionReason).
    PARAMS: req, res. RETURNS: 200 { success, message, data:[safeIssuer], count } | 500.
  */
  getRejectedIssuers: async (req, res) => {
    try {
      const rejectedIssuers = await couchDB.getRejectedIssuers();
      const safeIssuers = rejectedIssuers.map(doc => ({
        id: doc._id,
        orgName: doc.orgName,
        contactName: doc.contactName,
        email: doc.email,
        status: doc.status,
        createdAt: doc.createdAt,
        rejectedAt: doc.rejectedAt || null,
        rejectedBy: doc.rejectedBy || null,
        rejectionReason: doc.rejectionReason || null,
        approvedAt: doc.approvedAt || null,
        approvedBy: doc.approvedBy || null,
        walletId: doc.walletId,
        fabricIdentity: doc.fabricIdentity,
        couchDBUrl: doc.couchDBUrl,
        issuerType: doc.issuerType || 'root',
        rootAuthorityId: doc.rootAuthorityId || null,
        rootAuthorityName: doc.rootAuthorityName || null
      }));

      return res.status(200).json({
        success: true,
        message: 'Rejected issuers retrieved successfully',
        data: safeIssuers,
        count: safeIssuers.length
      });
    } catch (error) {
      console.error('Error fetching rejected issuers:', error);
      return sendServerError(res, error, 'ADMIN-ISSUER'); // M9
    }
  },

  /*
    Function Name: getDisabledIssuers
    LAYMAN (Tropang Ex): Lahat ng na-disable na issuer, kasama ang dahilan at sino/kailan nag-disable.
    TECHNICAL: Read + SAFE-field projection (adds disabledAt/disabledBy/disableReason).
    PARAMS: req, res. RETURNS: 200 { success, message, data:[safeIssuer], count } | 500.
  */
  getDisabledIssuers: async (req, res) => {
    try {
      const disabledIssuers = await couchDB.getDisabledIssuers();
      const safeIssuers = disabledIssuers.map(doc => ({
        id: doc._id,
        orgName: doc.orgName,
        contactName: doc.contactName,
        email: doc.email,
        status: doc.status,
        createdAt: doc.createdAt,
        approvedAt: doc.approvedAt || null,
        approvedBy: doc.approvedBy || null,
        disabledAt: doc.disabledAt || null,
        disabledBy: doc.disabledBy || null,
        disableReason: doc.disableReason || null,
        walletId: doc.walletId,
        fabricIdentity: doc.fabricIdentity,
        couchDBUrl: doc.couchDBUrl,
        issuerType: doc.issuerType || 'root',
        rootAuthorityId: doc.rootAuthorityId || null,
        rootAuthorityName: doc.rootAuthorityName || null
      }));

      return res.status(200).json({
        success: true,
        message: 'Disabled issuers retrieved successfully',
        data: safeIssuers,
        count: safeIssuers.length
      });
    } catch (error) {
      console.error('Error fetching disabled issuers:', error);
      return sendServerError(res, error, 'ADMIN-ISSUER'); // M9
    }
  },

  /*
    Function Name: Approve_Issuer

    LAYMAN (Tropang Ex):
    Inaaprubahan ng admin ang isang issuer. Para sa subordinate, dapat na-approve na muna ito ng root
    authority nito (kung hindi pa, blocked). Bago aprubahan, tinitiyak na may Fabric identity na ito sa
    wallet (kung wala, 400 — kailangan ng manual setup). Pag-approve: na-update ang status, naka-log sa
    blockchain, may abiso (in-app) at email sa issuer na pwede na siyang mag-issue.

    TECHNICAL:
    Dual-write + preconditions. Admin-gated. Loads the issuer (404). SUBORDINATE GATE: if issuerType
    'subordinate' and rootApprovalStatus !== 'approved' → 403. Calls ensureIssuerFabricIdentityExists
    (400 if the wallet identity is missing). couchDB.Approve_Issuer flips status + assigns
    fabricIdentity/couchDBUrl/walletId, then LogIssuerApproval on-chain (warning on failure, no
    rollback). Admin notification + issuer in-app notification + approval email are best-effort.

    PARAMS:
    - req — req.params.issuerId, req.body.approvalReason (optional), req.user (admin → adminEmail).
    - res — Express response.
    - getContractAndGateway — injected; chaincert-admin/Org1.

    RETURNS:
    200 { success, message, warning?, data } on success (warning if on-chain log failed); 400 (no admin
    email / missing Fabric identity via error.statusCode); 401; 403 (non-admin OR subordinate gate);
    404 issuer not found; else 500 via sendServerError.

    STEPS
      Step 1 — Authorize (admin) + require adminEmail.
      Step 2 — Load issuer (404) + SUBORDINATE GATE (403 until root-approved).
      Step 3 — ensureIssuerFabricIdentityExists (400 if wallet identity missing).
      Step 4 — couchDB.Approve_Issuer (status + identity/couchDBUrl/walletId assignment).
      Step 5 — submitTransaction('LogIssuerApproval', ...); warn on failure.
      Step 6 — Notify admin + issuer (in-app) + email (fire-and-forget).

    EXAMPLE
      POST /api/admin/issuers/issuer_55/approve  body { approvalReason: "Docs verified" }
      → 200 { success:true, message:"Issuer approved successfully.", data:{...} }
      → 403 { success:false, message:"Cannot approve subordinate issuer until root authority approves first." }
  */
  Approve_Issuer: async (req, res, getContractAndGateway) => {
    let gateway = null;
    try {
      const { issuerId } = req.params;
      const { approvalReason } = req.body;

      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Unauthorized.' });
      }
      if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Admin access required.' });
      }

      const adminEmail = req.user.email;
      if (!adminEmail) {
        return res.status(400).json({ success: false, message: 'Admin email is required.' });
      }

      const issuerDoc = await couchDB.getIssuerById(issuerId);
      if (!issuerDoc) {
        return res.status(404).json({ success: false, message: 'Issuer not found.' });
      }

      const issuerType = String(issuerDoc.issuerType || 'root').toLowerCase();
      const rootApprovalStatus = String(issuerDoc.rootApprovalStatus || 'not_required').toLowerCase();

      if (issuerType === 'subordinate' && rootApprovalStatus !== 'approved') {
        return res.status(403).json({
          success: false,
          message: 'Cannot approve subordinate issuer until root authority approves first.',
          issuerType,
          rootApprovalStatus
        });
      }

      await ensureIssuerFabricIdentityExists(issuerDoc);

      const result = await couchDB.Approve_Issuer(issuerId, adminEmail);

      const issuerEmail = result.email;
      const orgName = result.orgName;
      const reason = approvalReason || 'Issuer application approved by admin';
      let blockchainWarning = null;

      try {
        if (typeof getContractAndGateway !== 'function') {
          throw new Error('getContractAndGateway not provided');
        }

        const { gateway: gw, contract } = await getContractAndGateway('chaincert-admin', 'Org1');
        gateway = gw;

        await contract.submitTransaction('LogIssuerApproval', issuerId, issuerEmail, orgName, reason, adminEmail);
      } catch (bcErr) {
        blockchainWarning = bcErr?.message || String(bcErr);
        console.error('[Approve_Issuer] Blockchain log failed:', blockchainWarning);
      } finally {
        try { if (gateway) await gateway.disconnect(); } catch (_) {}
        gateway = null;
      }

      try {
        await couchDB.createAdminNotification({
          category: 'issuer_approved',
          title: 'Issuer Approved',
          message: `${orgName} was approved by admin ${adminEmail}.`,
          issuerId,
          issuerEmail
        });
      } catch (notificationError) {
        console.warn('[ADMIN NOTIFICATION] Failed to create issuer approval notification:', notificationError.message);
      }

      // N1: notify the issuer (their own account) in-app.
      try {
        await couchDB.createNotification({
          targetRole: 'issuer', issuerId, issuerEmail,
          category: 'issuer_approved',
          title: 'Your issuer application was approved',
          message: 'Your issuer account has been approved. You can now log in and issue credentials.'
        });
      } catch (e) { console.warn('[ISSUER NOTIFICATION] approve:', e.message); }

      // F28 + G3: fire-and-forget so approval responds immediately (no emailWarning in
      // the response anymore — the send completes after we've already replied).
      mailerService.sendMailFireAndForget({
        to: issuerEmail,
        subject: 'Your ChainCert Issuer Application Has Been Approved',
        html: mailerService.renderEmail({
          heading: '✅ Issuer Application Approved',
          bodyHtml: `
              <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.6;">Dear <strong>${orgName}</strong>,</p>
              <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.6;">Great news &mdash; your issuer application on ChainCert has been <strong style="color:#16a34a;">approved</strong>. You may now log in and begin issuing verifiable credentials to your holders.</p>
              <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">Log in using the email and password you registered with.</p>`
        }),
        text: `Dear ${orgName},\n\nYour issuer application on ChainCert has been approved. You may now log in and begin issuing credentials.`
      }, '[Approve_Issuer]');

      const warnings = [];
      if (blockchainWarning) warnings.push('blockchain log failed');

      return res.status(200).json({
        success: true,
        message: warnings.length
          ? `Issuer approved, but ${warnings.join(' and ')}.`
          : 'Issuer approved successfully.',
        warning: blockchainWarning,
        data: result
      });
    } catch (error) {
      console.error('Error approving issuer:', error);
      if (res.headersSent) return;
      if (error.statusCode) {
        return res.status(error.statusCode).json({ success: false, message: error.message });
      }
      return sendServerError(res, error, 'ADMIN-ISSUER'); // M9
    }
  },

  /*
    Function Name: Reject_Issuer

    LAYMAN (Tropang Ex):
    Rine-reject ng admin ang isang issuer application — kailangan may dahilan. Na-update ang status,
    naka-log sa blockchain, at may email sa applicant kasama ang dahilan. Walang in-app notice dahil
    hindi na makaka-login ang rejected issuer.

    TECHNICAL:
    Dual-write. Admin-gated; requires non-empty rejectionReason (400). couchDB.Reject_Issuer first, then
    LogIssuerRejection on-chain (warning on failure, no rollback). Admin notification + applicant email
    are best-effort. error.statusCode is passed through if set.

    PARAMS:
    - req — req.params.issuerId, req.body.rejectionReason (REQUIRED), req.user (admin → adminEmail).
    - res — Express response.
    - getContractAndGateway — injected; chaincert-admin/Org1.

    RETURNS:
    200 { success, message, warning?, data }; 400 missing reason / no admin email; 401; 403; else 500.

    STEPS
      Step 1 — Authorize (admin) + require adminEmail + non-empty reason.
      Step 2 — couchDB.Reject_Issuer(issuerId, reason, adminEmail) (written first).
      Step 3 — submitTransaction('LogIssuerRejection', ...); warn on failure.
      Step 4 — Admin notification + applicant rejection email (fire-and-forget).

    EXAMPLE
      POST /api/admin/issuers/issuer_55/reject  body { rejectionReason: "Unverifiable accreditation" }
      → 200 { success:true, message:"Issuer rejected successfully.", data:{...} }
  */
  Reject_Issuer: async (req, res, getContractAndGateway) => {
    let gateway = null;
    try {
      const { issuerId } = req.params;
      const { rejectionReason } = req.body;

      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Unauthorized.' });
      }
      if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Admin access required.' });
      }

      const adminEmail = req.user.email;
      if (!adminEmail) {
        return res.status(400).json({ success: false, message: 'Admin email is required.' });
      }

      if (!rejectionReason || rejectionReason.trim() === '') {
        return res.status(400).json({ success: false, message: 'Rejection reason is required.' });
      }

      const result = await couchDB.Reject_Issuer(
        issuerId,
        rejectionReason,
        adminEmail
      );

      const issuerDoc = await couchDB.getIssuerById(issuerId);
      const issuerEmail = issuerDoc?.email || '';
      const orgName = issuerDoc?.orgName || '';

      let blockchainWarning = null;

      try {
        if (typeof getContractAndGateway !== 'function') {
          throw new Error('getContractAndGateway not provided');
        }

        const { gateway: gw, contract } = await getContractAndGateway('chaincert-admin', 'Org1');
        gateway = gw;

        await contract.submitTransaction(
          'LogIssuerRejection',
          issuerId,
          issuerEmail,
          orgName,
          rejectionReason,
          adminEmail
        );
      } catch (bcErr) {
        blockchainWarning = bcErr?.message || String(bcErr);
        console.error('[Reject_Issuer] Blockchain log failed:', blockchainWarning);
      } finally {
        try { if (gateway) await gateway.disconnect(); } catch (_) {}
        gateway = null;
      }

      try {
        await couchDB.createAdminNotification({
          category: 'issuer_rejected',
          title: 'Issuer Rejected',
          message: `${orgName || issuerEmail || issuerId} was rejected by admin ${adminEmail}.`,
          issuerId,
          issuerEmail
        });
      } catch (notificationError) {
        console.warn('[ADMIN NOTIFICATION] Failed to create issuer rejection notification:', notificationError.message);
      }
      // N1: no in-app notification for the issuer here — a rejected issuer can't log in,
      // so they'd never see it. The rejection EMAIL (above) is the right channel.

      // F28 + G3: notify the issuer by email, fire-and-forget so rejection responds
      // immediately (no emailWarning in the response — send completes after we reply).
      if (issuerEmail) {
        mailerService.sendMailFireAndForget({
          to: issuerEmail,
          subject: 'Update on Your ChainCert Issuer Application',
          html: mailerService.renderEmail({
            heading: 'Issuer Application Not Approved',
            bodyHtml: `
                <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.6;">Dear <strong>${orgName || 'Applicant'}</strong>,</p>
                <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.6;">After review, your issuer application on ChainCert was <strong style="color:#b91c1c;">not approved</strong> at this time.</p>
                <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.6;"><strong>Reason:</strong> ${rejectionReason}</p>
                <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">You may address the points above and submit a new application.</p>`
          }),
          text: `Dear ${orgName || 'Applicant'},\n\nYour issuer application on ChainCert was not approved.\nReason: ${rejectionReason}\n\nYou may address the points above and submit a new application.`
        }, '[Reject_Issuer]');
      }

      const warnings = [];
      if (blockchainWarning) warnings.push('blockchain log failed');

      return res.status(200).json({
        success: true,
        message: warnings.length
          ? `Issuer rejected, but ${warnings.join(' and ')}.`
          : 'Issuer rejected successfully.',
        warning: blockchainWarning,
        data: result
      });
    } catch (error) {
      console.error('Error rejecting issuer:', error);
      if (res.headersSent) return;
      if (error.statusCode) {
        return res.status(error.statusCode).json({ success: false, message: error.message });
      }
      return sendServerError(res, error, 'ADMIN-ISSUER'); // M9
    }
  },

  /*
    Function Name: Disable_Issuer

    LAYMAN (Tropang Ex):
    Dini-disable ng admin ang isang approved na issuer (may dahilan). Habang disabled, hindi makaka-login
    o makaka-issue. Na-update sa DB, naka-log sa blockchain, may email sa issuer. Reversible via Enable_Issuer.

    TECHNICAL:
    Dual-write. Admin-gated; reason required. Loads issuer (404), guards already-disabled (400), writes
    CouchDB disable first, then LogIssuerStatusChange (prev→'disabled') on-chain (warning on failure, no
    rollback). Admin notification + issuer email best-effort. (Verbose debug logging around the gateway call.)

    PARAMS:
    - req — req.params.issuerId, req.body.reason (required), req.user (admin → adminEmail).
    - res — Express response.
    - getContractAndGateway — injected; chaincert-admin/Org1.

    RETURNS:
    200 { success, message, warning? }; 400 missing reason / already disabled / no admin email; 401; 403;
    404 issuer not found; else 500.

    STEPS
      Step 1 — Authorize (admin) + adminEmail + non-empty reason.
      Step 2 — Load issuer (404) + guard already 'disabled' (400).
      Step 3 — couchDB.Disable_Issuer(issuerId, adminEmail, reason) (written first).
      Step 4 — submitTransaction('LogIssuerStatusChange', email, prev, 'disabled', reason, adminEmail).
      Step 5 — Admin notification + issuer email (fire-and-forget).

    EXAMPLE
      POST /api/admin/issuers/issuer_55/disable  body { reason: "Reported misuse" }
      → 200 { success:true, message:"Issuer disabled successfully." }
  */
  Disable_Issuer: async (req, res, getContractAndGateway) => {
    let gateway = null;
    try {
      const { issuerId } = req.params;
      const { reason } = req.body;

      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Unauthorized.' });
      }
      if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Admin access required.' });
      }

      const adminEmail = req.user.email;
      if (!adminEmail) {
        return res.status(400).json({ success: false, message: 'Admin email is required.' });
      }

      if (!reason || reason.trim() === '') {
        return res.status(400).json({ success: false, message: 'Disabling reason is required.' });
      }

      const issuer = await couchDB.getIssuerById(issuerId);
      if (!issuer) {
        return res.status(404).json({ success: false, message: 'Issuer not found.' });
      }

      const previousStatus = issuer.status || '';

      if (previousStatus === 'disabled') {
        return res.status(400).json({ success: false, message: 'Issuer is already disabled.' });
      }

      await couchDB.Disable_Issuer(issuerId, adminEmail, reason);

      let blockchainLogWarning = null;

      try {
        if (typeof getContractAndGateway !== 'function') {
          throw new Error('getContractAndGateway function not provided');
        }

        const identityName = 'chaincert-admin';
        const orgName = 'Org1';

        console.log('\n[Disable_Issuer][DEBUG] typeof getContractAndGateway =', typeof getContractAndGateway);
        console.log('[Disable_Issuer][DEBUG] identityName =', identityName, '| orgName =', orgName);
        console.log('[Disable_Issuer][DEBUG] issuerId =', issuerId, '| issuerEmail =', issuer.email);
        console.log('[Disable_Issuer][DEBUG] about to call getContractAndGateway...\n');

        const cg = await getContractAndGateway(identityName, orgName);

        console.log('\n[Disable_Issuer][DEBUG] getContractAndGateway returned:', cg);
        console.log('[Disable_Issuer][DEBUG] cg type =', typeof cg);
        console.log('[Disable_Issuer][DEBUG] cg keys =', cg ? Object.keys(cg) : null);
        console.log('[Disable_Issuer][DEBUG] cg.gateway exists =', !!(cg && cg.gateway));
        console.log('[Disable_Issuer][DEBUG] cg.contract exists =', !!(cg && cg.contract), '\n');

        if (!cg || !cg.gateway || !cg.contract) {
          throw new Error('getContractAndGateway returned an invalid connection object');
        }

        gateway = cg.gateway;
        const contract = cg.contract;

        await contract.submitTransaction(
          'LogIssuerStatusChange',
          issuer.email,
          previousStatus,
          'disabled',
          reason,
          adminEmail
        );
      } catch (bcErr) {
        blockchainLogWarning = bcErr?.message || String(bcErr);
        console.error('[Disable_Issuer] Blockchain log failed:', blockchainLogWarning);
      } finally {
        try { if (gateway) await gateway.disconnect(); } catch (_) {}
        gateway = null;
      }

      try {
        await couchDB.createAdminNotification({
          category: 'issuer_disabled',
          title: 'Issuer Disabled',
          message: `${issuer.orgName || issuer.email || issuerId} was disabled by admin ${adminEmail}.`,
          issuerId,
          issuerEmail: issuer.email || null
        });
      } catch (notificationError) {
        console.warn('[ADMIN NOTIFICATION] Failed to create issuer disable notification:', notificationError.message);
      }
      // N1: no in-app notification — a disabled issuer can't log in (authController blocks
      // disabled logins), so they'd never see it. The disable EMAIL (above) is the channel.

      // F28 + G3: notify the issuer their account was disabled, fire-and-forget so the
      // action responds immediately (no emailWarning in the response anymore).
      if (issuer.email) {
        mailerService.sendMailFireAndForget({
          to: issuer.email,
          subject: 'Your ChainCert Issuer Account Has Been Disabled',
          html: mailerService.renderEmail({
            heading: 'Issuer Account Disabled',
            bodyHtml: `
                <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.6;">Dear <strong>${issuer.orgName || 'Issuer'}</strong>,</p>
                <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.6;">Your issuer account on ChainCert has been <strong style="color:#b91c1c;">disabled</strong> by an administrator. While disabled, you cannot log in or issue credentials.</p>
                <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.6;"><strong>Reason:</strong> ${reason}</p>
                <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">If you believe this was in error, please contact the ChainCert administration team.</p>`
          }),
          text: `Dear ${issuer.orgName || 'Issuer'},\n\nYour issuer account on ChainCert has been disabled by an administrator.\nReason: ${reason}\n\nIf you believe this was in error, please contact the ChainCert administration team.`
        }, '[Disable_Issuer]');
      }

      const warnings = [];
      if (blockchainLogWarning) warnings.push('blockchain log failed');

      return res.status(200).json({
        success: true,
        message: warnings.length
          ? `Issuer disabled successfully, but ${warnings.join(' and ')}.`
          : 'Issuer disabled successfully.',
        warning: blockchainLogWarning
      });
    } catch (error) {
      console.error('Disable_Issuer error:', error);
      if (res.headersSent) return;
      return sendServerError(res, error, 'ADMIN-ISSUER'); // M9
    }
  },

  /*
    Function Name: Enable_Issuer

    LAYMAN (Tropang Ex):
    Binubuhay ulit ng admin ang isang naka-disable na issuer (may dahilan). Pagkatapos, pwede na ulit
    siyang mag-login at mag-issue. Na-update sa DB, naka-log sa blockchain, may email sa issuer at sa
    buong admin team, at may in-app notice sa issuer.

    TECHNICAL:
    Dual-write. Admin-gated; reason required. Loads issuer (404), guards already-approved (400), writes
    CouchDB enable first, then LogIssuerStatusChange (prev→'approved') on-chain (warning on failure, no
    rollback). Best-effort: issuer email, admin notification + issuer in-app notification, and a
    fire-and-forget email to every admin (via couchDB.getAdminEmails).

    PARAMS:
    - req — req.params.issuerId, req.body.reason (required), req.user (admin → adminEmail).
    - res — Express response.
    - getContractAndGateway — injected; chaincert-admin/Org1.

    RETURNS:
    200 { success, message, warning? }; 400 missing reason / already approved / no admin email; 401; 403;
    404 issuer not found; else 500.

    STEPS
      Step 1 — Authorize (admin) + adminEmail + non-empty reason.
      Step 2 — Load issuer (404) + guard already 'approved' (400).
      Step 3 — couchDB.Enable_Issuer(issuerId, adminEmail, reason) (written first).
      Step 4 — submitTransaction('LogIssuerStatusChange', email, prev, 'approved', reason, adminEmail).
      Step 5 — Issuer email + admin notification + issuer in-app + admin-team broadcast (fire-and-forget).

    EXAMPLE
      POST /api/admin/issuers/issuer_55/enable  body { reason: "Issue resolved" }
      → 200 { success:true, message:"Issuer re-enabled successfully." }
  */
  Enable_Issuer: async (req, res, getContractAndGateway) => {
    let gateway = null;
    try {
      const { issuerId } = req.params;
      const { reason } = req.body;

      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Unauthorized.' });
      }
      if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Admin access required.' });
      }

      const adminEmail = req.user.email;
      if (!adminEmail) {
        return res.status(400).json({ success: false, message: 'Admin email is required.' });
      }

      if (!reason || reason.trim() === '') {
        return res.status(400).json({ success: false, message: 'Re-enable reason is required.' });
      }

      const issuer = await couchDB.getIssuerById(issuerId);
      if (!issuer) {
        return res.status(404).json({ success: false, message: 'Issuer not found.' });
      }

      const previousStatus = issuer.status || '';

      if (previousStatus === 'approved') {
        return res.status(400).json({
          success: false,
          message: 'Issuer is already enabled (approved).'
        });
      }

      await couchDB.Enable_Issuer(issuerId, adminEmail, reason);

      let blockchainLogWarning = null;

      try {
        if (typeof getContractAndGateway !== 'function') {
          throw new Error('getContractAndGateway function not provided');
        }

        const cg = await getContractAndGateway('chaincert-admin', 'Org1');
        if (!cg || !cg.gateway || !cg.contract) {
          throw new Error('getContractAndGateway returned an invalid connection object');
        }

        gateway = cg.gateway;
        const contract = cg.contract;

        await contract.submitTransaction(
          'LogIssuerStatusChange',
          issuer.email,
          previousStatus,
          'approved',
          reason,
          adminEmail
        );
      } catch (bcErr) {
        blockchainLogWarning = bcErr?.message || String(bcErr);
        console.error('[Enable_Issuer] Blockchain log failed:', blockchainLogWarning);
      } finally {
        try { if (gateway) await gateway.disconnect(); } catch (_) {}
        gateway = null;
      }

      // F28 + G3: notify the issuer their account was re-enabled, fire-and-forget so the
      // action responds immediately (no emailWarning in the response anymore).
      if (issuer.email) {
        mailerService.sendMailFireAndForget({
          to: issuer.email,
          subject: 'Your ChainCert Issuer Account Has Been Re-enabled',
          html: mailerService.renderEmail({
            heading: 'Issuer Account Re-enabled',
            bodyHtml: `
                <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.6;">Dear <strong>${issuer.orgName || 'Issuer'}</strong>,</p>
                <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.6;">Good news &mdash; your issuer account on ChainCert has been <strong style="color:#16a34a;">re-enabled</strong>. You may log in again and resume issuing credentials.</p>
                <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">Log in using the email and password you registered with.</p>`
          }),
          text: `Dear ${issuer.orgName || 'Issuer'},\n\nYour issuer account on ChainCert has been re-enabled. You may log in again and resume issuing credentials.`
        }, '[Enable_Issuer]');
      }

      // F28 / R41: Enable had no admin notification — add the in-app one, and
      // email the whole admin team that this issuer was re-enabled (best-effort).
      try {
        await couchDB.createAdminNotification({
          category: 'issuer_enabled',
          title: 'Issuer Re-enabled',
          message: `${issuer.orgName || issuer.email || issuerId} was re-enabled by admin ${adminEmail}.`,
          issuerId,
          issuerEmail: issuer.email || null
        });
      } catch (notifErr) {
        console.warn('[ADMIN NOTIFICATION] Failed to create issuer enable notification:', notifErr.message);
      }

      // N1: notify the issuer (their own account) in-app.
      try {
        await couchDB.createNotification({
          targetRole: 'issuer', issuerId, issuerEmail: issuer.email || null,
          category: 'issuer_enabled',
          title: 'Your issuer account was re-enabled',
          message: 'Your issuer account has been re-enabled. You can log in and resume issuing credentials.'
        });
      } catch (e) { console.warn('[ISSUER NOTIFICATION] enable:', e.message); }
      // G3: fire-and-forget each send; the try/catch stays because getAdminEmails()
      // above is a DB read that can throw.
      try {
        const adminEmails = await couchDB.getAdminEmails();
        for (const aEmail of adminEmails) {
          mailerService.sendMailFireAndForget({
            to: aEmail,
            subject: 'ChainCert Issuer Re-enabled',
            html: mailerService.renderEmail({
              heading: 'Issuer Re-enabled',
              bodyHtml: `<p style="margin:0;color:#374151;font-size:14px;line-height:1.6;"><strong>${issuer.orgName || issuer.email || issuerId}</strong> was re-enabled by admin <strong>${adminEmail}</strong>.</p>`
            }),
            text: `${issuer.orgName || issuer.email || issuerId} was re-enabled by admin ${adminEmail}.`
          }, '[Enable_Issuer]');
        }
      } catch (adminEmailErr) {
        console.error('[Enable_Issuer] Admin email lookup failed (non-fatal):', adminEmailErr?.message || adminEmailErr);
      }

      const warnings = [];
      if (blockchainLogWarning) warnings.push('blockchain log failed');

      return res.status(200).json({
        success: true,
        message: warnings.length
          ? `Issuer re-enabled successfully, but ${warnings.join(' and ')}.`
          : 'Issuer re-enabled successfully.',
        warning: blockchainLogWarning
      });
    } catch (error) {
      console.error('Enable_Issuer error:', error);
      if (res.headersSent) return;
      return sendServerError(res, error, 'ADMIN-ISSUER'); // M9
    }
  }
};

module.exports = adminIssuerController;
