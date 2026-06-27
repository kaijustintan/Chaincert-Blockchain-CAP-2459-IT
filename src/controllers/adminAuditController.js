// adminAuditController.js
/*
  FILE: adminAuditController.js
  LAYMAN (Tropang Ex): Ito yung "audit + user-account" desk ng admin. Dalawang trabaho: (1) i-disable
  o i-enable ang isang HOLDER account (may dahilan, naka-record sa blockchain), at i-change ang sariling
  admin password; at (2) basahin mula sa blockchain ang lahat ng immutable logs — status changes,
  issuer approve/reject decisions, at root↔subordinate decisions — para sa Audit Logs view ng admin.

  TECHNICAL: Express controller. Every handler is admin-gated (req.user.role === 'admin') except the
  pure log readers which assume the admin-only /api/admin mount (M2) already enforced auth. The two
  user-status mutations + the admin password change follow the dual-write pattern: CouchDB first, then
  an immutable on-chain Log* (LogUserStatusChange / LogAdminChangePassword) via the injected
  getContractAndGateway('chaincert-admin','Org1'); a blockchain failure returns partial success with a
  warning, never a rollback. All read handlers evaluateTransaction against the chaincode and null-safe
  JSON.parse the result; the gateway is always disconnected in finally.

  OUTLINE:
    USER ACCOUNT STATUS (write — dual-write CouchDB → LogUserStatusChange)
      - Disable_User(req,res,getCAG)              disable a holder (reason required)
      - Enable_User(req,res,getCAG)               re-enable a holder (reason required)
    ADMIN SELF-SERVICE (write — dual-write → LogAdminChangePassword)
      - changeAdminPasswordSecure(req,res,getCAG) change own admin password
    BLOCKCHAIN LOG READERS (read — evaluateTransaction)
      - getAllStatusLogs / getAllIssuerStatusLogs / getAllUserStatusLogs
      - getAllIssuerDecisionLogs / getAllIssuerApprovalLogs / getAllIssuerRejectionLogs
      - getIssuerDecisionLogs(email) / getIssuerStatusLogs(email) / getUserStatusLogs(email)
      - GetAllRootSubordinateLogs / GetAllRootSubordinateApprovalLogs / GetAllRootSubordinateRejectionLogs
*/

const couchDB = require('../couchDB_service');
const { sendServerError } = require('../securityHelpers'); // Phase 5 Tier 2 (M9)

const adminAuditController = {
  /*
    Function Name: Disable_User

    LAYMAN (Tropang Ex):
    Dito pinapatay ng admin ang account ng isang holder na may kailangang dahilan. Pagkatapos, hindi na
    makaka-login yung user. Naka-record ang aksyon sa blockchain kung sino ang admin at bakit.

    TECHNICAL:
    Dual-write. Admin-gated; requires a non-empty reason. Loads the user, guards against already-disabled,
    writes the CouchDB status change first, then submits LogUserStatusChange (active→disabled) on-chain.
    Blockchain failure surfaces as a warning (no rollback). Gateway disconnected in finally.

    PARAMS:
    - req — req.params.userId, req.body.reason (required), req.user (admin, supplies adminEmail).
    - res — Express response.
    - getContractAndGateway — injected; opens the Fabric gateway/contract as chaincert-admin/Org1.

    RETURNS:
    200 { success, message, warning? }; 400 missing reason / already disabled / no admin email;
    401 unauth; 403 non-admin; 404 user not found; else 500 via sendServerError.

    STEPS
      Step 1 — Authorize + validate
        Technical : Reject if !req.user / role !== 'admin'; 400 if reason blank or no adminEmail.
      Step 2 — Load + guard
        Technical : couchDB.getUser(userId); 404 if missing; 400 if already !isActive.
      Step 3 — CouchDB disable (written first)
        Technical : couchDB.Disable_User(userId, adminEmail, reason).
      Step 4 — On-chain log
        Technical : submitTransaction('LogUserStatusChange', email, prev, 'disabled', reason, adminEmail).

    EXAMPLE
      POST /api/admin/users/user_42/disable  body { reason: "Policy violation" }
      → 200 { success:true, message:"User disabled successfully." }
  */
  Disable_User: async (req, res, getContractAndGateway) => {
    let gateway;

    try {
      const { userId } = req.params;
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

      const user = await couchDB.getUser(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }

      const previousStatus = user.isActive ? 'active' : 'disabled';

      if (!user.isActive) {
        return res.status(400).json({ success: false, message: 'User is already disabled.' });
      }

      await couchDB.Disable_User(userId, adminEmail, reason);

      let blockchainLogWarning = null;
      const identityName = 'chaincert-admin';
      const orgName = 'Org1';

      if (typeof getContractAndGateway === 'function') {
        const cg = await getContractAndGateway(identityName, orgName);
        gateway = cg.gateway;
        const contract = cg.contract;

        await contract.submitTransaction(
          'LogUserStatusChange',
          user.email,
          previousStatus,
          'disabled',
          reason,
          adminEmail
        );
      }

      return res.status(200).json({
        success: true,
        message: blockchainLogWarning
          ? 'User disabled successfully, but blockchain log failed.'
          : 'User disabled successfully.',
        warning: blockchainLogWarning
      });
    } catch (error) {
      console.error('Disable_User error:', error);
      if (res.headersSent) return;
      return sendServerError(res, error, 'ADMIN-AUDIT'); // M9
    } finally {
      try { if (gateway) await gateway.disconnect(); } catch (_) {}
    }
  },

  /*
    Function Name: Enable_User

    LAYMAN (Tropang Ex):
    Kabaligtaran ng Disable_User — binubuhay ulit ng admin ang isang naka-disable na holder account,
    may dahilan, at naka-record sa blockchain.

    TECHNICAL:
    Dual-write. Admin-gated; reason required. Loads the user, guards against already-active, writes the
    CouchDB enable first, then LogUserStatusChange (disabled→active) on-chain. Warning on blockchain
    failure (no rollback); gateway disconnected in finally.

    PARAMS:
    - req — req.params.userId, req.body.reason (required), req.user (admin).
    - res — Express response.
    - getContractAndGateway — injected; chaincert-admin/Org1.

    RETURNS:
    200 { success, message, warning? }; 400 missing reason / already active; 401; 403; 404; else 500.

    STEPS
      Step 1 — Authorize + validate (admin, non-empty reason, adminEmail present).
      Step 2 — Load user (404) + guard already-active (400).
      Step 3 — couchDB.Enable_User(userId, adminEmail, reason) (written first).
      Step 4 — submitTransaction('LogUserStatusChange', email, prev, 'active', reason, adminEmail).

    EXAMPLE
      POST /api/admin/users/user_42/enable  body { reason: "Appeal approved" }
      → 200 { success:true, message:"User re-enabled successfully." }
  */
  Enable_User: async (req, res, getContractAndGateway) => {
    let gateway;

    try {
      const { userId } = req.params;
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

      const user = await couchDB.getUser(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }

      const previousStatus = user.isActive ? 'active' : 'disabled';

      if (user.isActive) {
        return res.status(400).json({ success: false, message: 'User is already active.' });
      }

      await couchDB.Enable_User(userId, adminEmail, reason);

      let blockchainLogWarning = null;
      const identityName = 'chaincert-admin';
      const orgName = 'Org1';

      if (typeof getContractAndGateway === 'function') {
        const cg = await getContractAndGateway(identityName, orgName);
        gateway = cg.gateway;
        const contract = cg.contract;

        await contract.submitTransaction(
          'LogUserStatusChange',
          user.email,
          previousStatus,
          'active',
          reason,
          adminEmail
        );
      }

      return res.status(200).json({
        success: true,
        message: blockchainLogWarning
          ? 'User re-enabled successfully, but blockchain log failed.'
          : 'User re-enabled successfully.',
        warning: blockchainLogWarning
      });
    } catch (error) {
      console.error('Enable_User error:', error);
      if (res.headersSent) return;
      return sendServerError(res, error, 'ADMIN-AUDIT'); // M9
    } finally {
      try { if (gateway) await gateway.disconnect(); } catch (_) {}
    }
  },

  /*
    Function Name: getAllStatusLogs
    LAYMAN (Tropang Ex): Kinukuha mula sa blockchain ang LAHAT ng status-change logs (issuer + user).
    TECHNICAL: Read wrapper — evaluateTransaction('GetAllStatusLogs') via chaincert-admin/Org1; null-safe parse.
    PARAMS: req, res, getContractAndGateway (injected).
    RETURNS: 200 { success, logs:[], count } | 500 on gateway/parse error.
  */
  getAllStatusLogs: async (req, res, getContractAndGateway) => {
    let gateway;
    try {
      if (typeof getContractAndGateway !== 'function') {
        return res.status(500).json({ success: false, message: 'Blockchain gateway is not available' });
      }

      const cg = await getContractAndGateway('chaincert-admin', 'Org1');
      gateway = cg.gateway;
      const contract = cg.contract;

      const resultBuffer = await contract.evaluateTransaction('GetAllStatusLogs');
      const raw = resultBuffer.toString();
      let logs;

      try {
        logs = JSON.parse(raw || '[]');
      } catch (_) {
        logs = [];
      }

      return res.status(200).json({
        success: true,
        logs: Array.isArray(logs) ? logs : [],
        count: Array.isArray(logs) ? logs.length : 0
      });
    } catch (error) {
      console.error('getAllStatusLogs error:', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch status logs' });
    } finally {
      try { if (gateway) await gateway.disconnect(); } catch (_) {}
    }
  },

  /*
    Function Name: changeAdminPasswordSecure

    LAYMAN (Tropang Ex):
    Pinapalitan ng admin ang sarili niyang password (kailangan ang lumang password). Naka-record sa
    blockchain na nag-change ng password ang admin na ito (hindi ang password mismo — yung event lang).

    TECHNICAL:
    Dual-write. Admin-gated; requires currentPassword + newPassword. couchDB.changeAdminPassword verifies
    the old password and applies the new one (with audit metadata: via/ip/userAgent), then
    LogAdminChangePassword(adminEmail, 'self_change', '', adminEmail) is submitted on-chain. Blockchain
    failure → warning (no rollback). Password strength is enforced upstream (M8) / in the service.

    PARAMS:
    - req — req.body.currentPassword, req.body.newPassword; req.user (admin → adminEmail), req.ip, UA.
    - res — Express response.
    - getContractAndGateway — injected; chaincert-admin/Org1.

    RETURNS:
    200 { success, message, warning? }; 400 missing fields / no admin email; 403 non-admin; else 500.

    STEPS
      Step 1 — Authorize (admin) + require both passwords + adminEmail.
      Step 2 — couchDB.changeAdminPassword(email, current, new, email, {via,ip,userAgent}) (verifies old).
      Step 3 — submitTransaction('LogAdminChangePassword', email, 'self_change', '', email); warn on failure.

    EXAMPLE
      POST /api/admin/change-password  body { currentPassword:"old", newPassword:"NewStrongPass1!" }
      → 200 { success:true, message:"Password changed successfully." }
  */
  changeAdminPasswordSecure: async (req, res, getContractAndGateway) => {
    let gateway = null;

    try {
      const { currentPassword, newPassword } = req.body;

      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Admin access required.' });
      }

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'currentPassword and newPassword are required.'
        });
      }

      const adminEmail = req.user.email;
      if (!adminEmail) {
        return res.status(400).json({ success: false, message: 'Admin email is required.' });
      }

      await couchDB.changeAdminPassword(
        adminEmail,
        currentPassword,
        newPassword,
        adminEmail,
        {
          via: 'ui',
          ip: req.ip,
          userAgent: req.headers['user-agent']
        }
      );

      let blockchainWarning = null;
      const changeType = 'self_change';
      const reason = '';

      try {
        if (typeof getContractAndGateway !== 'function') {
          throw new Error('getContractAndGateway not provided');
        }

        const cg = await getContractAndGateway('chaincert-admin', 'Org1');

        if (!cg || !cg.gateway || !cg.contract) {
          throw new Error('getContractAndGateway returned an invalid connection object');
        }

        gateway = cg.gateway;
        const contract = cg.contract;

        await contract.submitTransaction('LogAdminChangePassword', adminEmail, changeType, reason, adminEmail);
      } catch (bcErr) {
        blockchainWarning = bcErr?.message || String(bcErr);
        console.error('[changeAdminPasswordSecure] Blockchain log failed:', blockchainWarning);
      } finally {
        try { if (gateway) await gateway.disconnect(); } catch (_) {}
        gateway = null;
      }

      return res.status(200).json({
        success: true,
        message: blockchainWarning
          ? 'Password changed, but blockchain log failed.'
          : 'Password changed successfully.',
        warning: blockchainWarning
      });
    } catch (error) {
      console.error('changeAdminPasswordSecure error:', error);
      if (res.headersSent) return;
      return sendServerError(res, error, 'ADMIN-AUDIT'); // M9
    }
  },

  /*
    Function Name: getAllIssuerStatusLogs
    LAYMAN (Tropang Ex): Lahat ng status-change logs ng mga ISSUER mula sa blockchain.
    TECHNICAL: Read wrapper — evaluateTransaction('GetAllIssuerStatusLogs'); null-safe parse.
    PARAMS: req, res, getContractAndGateway (injected). RETURNS: 200 { success, logs:[], count } | 500.
  */
  getAllIssuerStatusLogs: async (req, res, getContractAndGateway) => {
    let gateway;

    try {
      if (typeof getContractAndGateway !== 'function') {
        return res.status(500).json({ success: false, message: 'Blockchain gateway is not available' });
      }

      const cg = await getContractAndGateway('chaincert-admin', 'Org1');
      gateway = cg.gateway;
      const contract = cg.contract;

      const resultBuffer = await contract.evaluateTransaction('GetAllIssuerStatusLogs');
      const raw = resultBuffer.toString();

      let logs;
      try {
        logs = JSON.parse(raw || '[]');
      } catch (_) {
        logs = [];
      }

      return res.status(200).json({
        success: true,
        logs: Array.isArray(logs) ? logs : [],
        count: Array.isArray(logs) ? logs.length : 0
      });
    } catch (error) {
      console.error('getAllIssuerStatusLogs error:', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch issuer status logs' });
    } finally {
      try { if (gateway) await gateway.disconnect(); } catch (_) {}
    }
  },

  /*
    Function Name: getAllUserStatusLogs
    LAYMAN (Tropang Ex): Lahat ng status-change logs ng mga USER/holder mula sa blockchain.
    TECHNICAL: Read wrapper — evaluateTransaction('GetAllUserStatusLogs'); null-safe parse.
    PARAMS: req, res, getContractAndGateway (injected). RETURNS: 200 { success, logs:[], count } | 500.
  */
  getAllUserStatusLogs: async (req, res, getContractAndGateway) => {
    let gateway;

    try {
      if (typeof getContractAndGateway !== 'function') {
        return res.status(500).json({ success: false, message: 'Blockchain gateway is not available' });
      }

      const cg = await getContractAndGateway('chaincert-admin', 'Org1');
      gateway = cg.gateway;
      const contract = cg.contract;

      const resultBuffer = await contract.evaluateTransaction('GetAllUserStatusLogs');
      const raw = resultBuffer.toString();

      let logs;
      try {
        logs = JSON.parse(raw || '[]');
      } catch (_) {
        logs = [];
      }

      return res.status(200).json({
        success: true,
        logs: Array.isArray(logs) ? logs : [],
        count: Array.isArray(logs) ? logs.length : 0
      });
    } catch (error) {
      console.error('getAllUserStatusLogs error:', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch user status logs' });
    } finally {
      try { if (gateway) await gateway.disconnect(); } catch (_) {}
    }
  },

  /*
    Function Name: getAllIssuerDecisionLogs
    LAYMAN (Tropang Ex): Lahat ng approve/reject decisions ng admin sa mga issuer application (blockchain).
    TECHNICAL: Read wrapper — evaluateTransaction('GetAllIssuerDecisionLogs'); null-safe parse.
    PARAMS: req, res, getContractAndGateway (injected). RETURNS: 200 { success, logs:[], count } | 500.
  */
  getAllIssuerDecisionLogs: async (req, res, getContractAndGateway) => {
    let gateway;

    try {
      if (typeof getContractAndGateway !== 'function') {
        return res.status(500).json({ success: false, message: 'Blockchain gateway is not available' });
      }

      const cg = await getContractAndGateway('chaincert-admin', 'Org1');
      gateway = cg.gateway;
      const contract = cg.contract;

      const resultBuffer = await contract.evaluateTransaction('GetAllIssuerDecisionLogs');
      const raw = resultBuffer.toString();

      let logs;
      try { logs = JSON.parse(raw || '[]'); } catch (_) { logs = []; }
      if (!Array.isArray(logs)) logs = [];

      return res.status(200).json({ success: true, logs, count: logs.length });
    } catch (error) {
      console.error('getAllIssuerDecisionLogs error:', error);
      if (res.headersSent) return;
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch issuer decision logs' });
    } finally {
      try { if (gateway) await gateway.disconnect(); } catch (_) {}
    }
  },

  /*
    Function Name: getAllIssuerApprovalLogs
    LAYMAN (Tropang Ex): Mga APPROVAL-only decisions ng admin sa issuer applications (blockchain).
    TECHNICAL: Read wrapper — evaluateTransaction('GetAllIssuerApprovalLogs'); null-safe parse.
    PARAMS: req, res, getContractAndGateway (injected). RETURNS: 200 { success, logs:[], count } | 500.
  */
  getAllIssuerApprovalLogs: async (req, res, getContractAndGateway) => {
    let gateway;

    try {
      if (typeof getContractAndGateway !== 'function') {
        return res.status(500).json({ success: false, message: 'Blockchain gateway is not available' });
      }

      const cg = await getContractAndGateway('chaincert-admin', 'Org1');
      gateway = cg.gateway;
      const contract = cg.contract;

      const resultBuffer = await contract.evaluateTransaction('GetAllIssuerApprovalLogs');
      const raw = resultBuffer.toString();

      let logs;
      try { logs = JSON.parse(raw || '[]'); } catch (_) { logs = []; }
      if (!Array.isArray(logs)) logs = [];

      return res.status(200).json({ success: true, logs, count: logs.length });
    } catch (error) {
      console.error('getAllIssuerApprovalLogs error:', error);
      if (res.headersSent) return;
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch issuer approval logs' });
    } finally {
      try { if (gateway) await gateway.disconnect(); } catch (_) {}
    }
  },

  /*
    Function Name: getAllIssuerRejectionLogs
    LAYMAN (Tropang Ex): Mga REJECTION-only decisions ng admin sa issuer applications (blockchain).
    TECHNICAL: Read wrapper — evaluateTransaction('GetAllIssuerRejectionLogs'); null-safe parse.
    PARAMS: req, res, getContractAndGateway (injected). RETURNS: 200 { success, logs:[], count } | 500.
  */
  getAllIssuerRejectionLogs: async (req, res, getContractAndGateway) => {
    let gateway;

    try {
      if (typeof getContractAndGateway !== 'function') {
        return res.status(500).json({ success: false, message: 'Blockchain gateway is not available' });
      }

      const cg = await getContractAndGateway('chaincert-admin', 'Org1');
      gateway = cg.gateway;
      const contract = cg.contract;

      const resultBuffer = await contract.evaluateTransaction('GetAllIssuerRejectionLogs');
      const raw = resultBuffer.toString();

      let logs;
      try { logs = JSON.parse(raw || '[]'); } catch (_) { logs = []; }
      if (!Array.isArray(logs)) logs = [];

      return res.status(200).json({ success: true, logs, count: logs.length });
    } catch (error) {
      console.error('getAllIssuerRejectionLogs error:', error);
      if (res.headersSent) return;
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch issuer rejection logs' });
    } finally {
      try { if (gateway) await gateway.disconnect(); } catch (_) {}
    }
  },

  /*
    Function Name: getIssuerDecisionLogs
    LAYMAN (Tropang Ex): Approve/reject decisions para sa ISANG specific issuer (by email).
    TECHNICAL: Read wrapper — evaluateTransaction('GetIssuerDecisionLogs', issuerEmail); 400 if email missing.
    PARAMS: req (req.params.issuerEmail), res, getContractAndGateway. RETURNS: 200 { success, logs, count } | 400 | 500.
  */
  getIssuerDecisionLogs: async (req, res, getContractAndGateway) => {
    let gateway = null;

    try {
      const { issuerEmail } = req.params;

      if (!issuerEmail) {
        return res.status(400).json({ success: false, message: 'issuerEmail is required' });
      }

      if (typeof getContractAndGateway !== 'function') {
        return res.status(500).json({ success: false, message: 'Blockchain gateway is not available' });
      }

      const cg = await getContractAndGateway('chaincert-admin', 'Org1');
      gateway = cg.gateway;
      const contract = cg.contract;

      const resultBuffer = await contract.evaluateTransaction('GetIssuerDecisionLogs', issuerEmail);
      const raw = resultBuffer.toString();

      let logs;
      try {
        logs = JSON.parse(raw || '[]');
      } catch (_) {
        logs = [];
      }

      if (!Array.isArray(logs)) logs = [];

      return res.status(200).json({ success: true, logs, count: logs.length });
    } catch (error) {
      console.error('getIssuerDecisionLogs error:', error);
      if (res.headersSent) return;
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch issuer decision logs' });
    } finally {
      try { if (gateway) await gateway.disconnect(); } catch (_) {}
    }
  },

  /*
    Function Name: getIssuerStatusLogs
    LAYMAN (Tropang Ex): Status-change history para sa ISANG specific issuer (by email).
    TECHNICAL: Read wrapper — evaluateTransaction('GetIssuerStatusLogs', issuerEmail); 400 if email missing.
    PARAMS: req (req.params.issuerEmail), res, getContractAndGateway. RETURNS: 200 { success, logs, count } | 400 | 500.
  */
  getIssuerStatusLogs: async (req, res, getContractAndGateway) => {
    let gateway = null;

    try {
      const { issuerEmail } = req.params;

      if (!issuerEmail) {
        return res.status(400).json({ success: false, message: 'issuerEmail is required' });
      }

      if (typeof getContractAndGateway !== 'function') {
        return res.status(500).json({ success: false, message: 'Blockchain gateway is not available' });
      }

      const cg = await getContractAndGateway('chaincert-admin', 'Org1');
      gateway = cg.gateway;
      const contract = cg.contract;

      const resultBuffer = await contract.evaluateTransaction('GetIssuerStatusLogs', issuerEmail);
      const raw = resultBuffer.toString();

      let logs;
      try {
        logs = JSON.parse(raw || '[]');
      } catch (_) {
        logs = [];
      }

      if (!Array.isArray(logs)) logs = [];

      return res.status(200).json({ success: true, logs, count: logs.length });
    } catch (error) {
      console.error('getIssuerStatusLogs error:', error);
      if (res.headersSent) return;
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch issuer status logs' });
    } finally {
      try { if (gateway) await gateway.disconnect(); } catch (_) {}
    }
  },

  /*
    Function Name: getUserStatusLogs
    LAYMAN (Tropang Ex): Status-change history para sa ISANG specific user/holder (by email).
    TECHNICAL: Read wrapper — evaluateTransaction('GetUserStatusLogs', userEmail); 400 if email missing.
    PARAMS: req (req.params.userEmail), res, getContractAndGateway. RETURNS: 200 { success, logs, count } | 400 | 500.
  */
  getUserStatusLogs: async (req, res, getContractAndGateway) => {
    let gateway = null;

    try {
      const { userEmail } = req.params;

      if (!userEmail) {
        return res.status(400).json({ success: false, message: 'userEmail is required' });
      }

      if (typeof getContractAndGateway !== 'function') {
        return res.status(500).json({ success: false, message: 'Blockchain gateway is not available' });
      }

      const cg = await getContractAndGateway('chaincert-admin', 'Org1');
      gateway = cg.gateway;
      const contract = cg.contract;

      const resultBuffer = await contract.evaluateTransaction('GetUserStatusLogs', userEmail);
      const raw = resultBuffer.toString();

      let logs;
      try {
        logs = JSON.parse(raw || '[]');
      } catch (_) {
        logs = [];
      }

      if (!Array.isArray(logs)) logs = [];

      return res.status(200).json({ success: true, logs, count: logs.length });
    } catch (error) {
      console.error('getUserStatusLogs error:', error);
      if (res.headersSent) return;
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch user status logs' });
    } finally {
      try { if (gateway) await gateway.disconnect(); } catch (_) {}
    }
  },

  // =========================================================================================================
// ROOT SUBORDINATE DECISION LOGS (ADMIN AUDIT)
// =========================================================================================================

/*
  Function Name: GetAllRootSubordinateLogs
  LAYMAN (Tropang Ex): Lahat ng root↔subordinate decisions (approve + reject) sa buong sistema (blockchain).
  TECHNICAL: Admin-gated read — evaluateTransaction('GetAllRootSubordinateLogs'); gateway closed in finally.
  PARAMS: req, res, getContractAndGateway (injected). RETURNS: 200 { success, message, logs:[], count } | 403 | 500.
*/
GetAllRootSubordinateLogs: async (req, res, getContractAndGateway) => {
  let gateway = null;

  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required.'
      });
    }

    if (typeof getContractAndGateway !== 'function') {
      return res.status(500).json({
        success: false,
        message: 'getContractAndGateway not provided.'
      });
    }

    const cg = await getContractAndGateway('chaincert-admin', 'Org1');
    gateway = cg.gateway;
    const contract = cg.contract;

    const result = await contract.evaluateTransaction('GetAllRootSubordinateLogs');
    const logs = JSON.parse(result.toString());

    return res.status(200).json({
      success: true,
      message: 'Root subordinate logs retrieved successfully.',
      logs: Array.isArray(logs) ? logs : [],
      count: Array.isArray(logs) ? logs.length : 0
    });

  } catch (error) {
    console.error('Error fetching all root subordinate logs:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  } finally {
    try { if (gateway) await gateway.disconnect(); } catch (_) {}
  }
},

/*
  Function Name: GetAllRootSubordinateApprovalLogs
  LAYMAN (Tropang Ex): APPROVAL-only root↔subordinate decisions sa buong sistema (blockchain).
  TECHNICAL: Admin-gated read — evaluateTransaction('GetAllRootSubordinateApprovalLogs'); finally disconnect.
  PARAMS: req, res, getContractAndGateway (injected). RETURNS: 200 { success, message, logs:[], count } | 403 | 500.
*/
GetAllRootSubordinateApprovalLogs: async (req, res, getContractAndGateway) => {
  let gateway = null;

  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required.'
      });
    }

    if (typeof getContractAndGateway !== 'function') {
      return res.status(500).json({
        success: false,
        message: 'getContractAndGateway not provided.'
      });
    }

    const cg = await getContractAndGateway('chaincert-admin', 'Org1');
    gateway = cg.gateway;
    const contract = cg.contract;

    const result = await contract.evaluateTransaction('GetAllRootSubordinateApprovalLogs');
    const logs = JSON.parse(result.toString());

    return res.status(200).json({
      success: true,
      message: 'Root subordinate approval logs retrieved successfully.',
      logs: Array.isArray(logs) ? logs : [],
      count: Array.isArray(logs) ? logs.length : 0
    });

  } catch (error) {
    console.error('Error fetching all root subordinate approval logs:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  } finally {
    try { if (gateway) await gateway.disconnect(); } catch (_) {}
  }
},

/*
  Function Name: GetAllRootSubordinateRejectionLogs
  LAYMAN (Tropang Ex): REJECTION-only root↔subordinate decisions sa buong sistema (blockchain).
  TECHNICAL: Admin-gated read — evaluateTransaction('GetAllRootSubordinateRejectionLogs'); finally disconnect.
  PARAMS: req, res, getContractAndGateway (injected). RETURNS: 200 { success, message, logs:[], count } | 403 | 500.
*/
GetAllRootSubordinateRejectionLogs: async (req, res, getContractAndGateway) => {
  let gateway = null;

  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required.'
      });
    }

    if (typeof getContractAndGateway !== 'function') {
      return res.status(500).json({
        success: false,
        message: 'getContractAndGateway not provided.'
      });
    }

    const cg = await getContractAndGateway('chaincert-admin', 'Org1');
    gateway = cg.gateway;
    const contract = cg.contract;

    const result = await contract.evaluateTransaction('GetAllRootSubordinateRejectionLogs');
    const logs = JSON.parse(result.toString());

    return res.status(200).json({
      success: true,
      message: 'Root subordinate rejection logs retrieved successfully.',
      logs: Array.isArray(logs) ? logs : [],
      count: Array.isArray(logs) ? logs.length : 0
    });

  } catch (error) {
    console.error('Error fetching all root subordinate rejection logs:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  } finally {
    try { if (gateway) await gateway.disconnect(); } catch (_) {}
  }
}
};

module.exports = adminAuditController;
