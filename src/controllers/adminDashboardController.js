// controllers/adminDashboardController.js

const couchdbService = require('../couchDB_service');
const cron = require('node-cron'); // - polo: expiry cron


const INTEGRITY_FIELDS = [
  'credentialName',
  'credentialType',
  'holderID',
  'status',
  'issuedDate',
  'expiryDate',
  'description',
  'issuerId'
];

/*
  Function Name: normalizeIntegrityValue
  Technical: Normalizes values before CouchDB vs blockchain comparison so null/undefined become empty strings.
  Tropang Ex: Para apples-to-apples ang compare kahit may blank or missing field.

  Step 1: I-check kung null/undefined yung value.
  Step 2: I-convert sa comparable string or empty string.
*/
function normalizeIntegrityValue(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

/*
  Function Name: ensureAdminRequest
  Technical: Reusable admin-only guard for dashboard admin endpoints.
  Tropang Ex: Quick bantay para admin lang ang puwedeng tumawag sa route.

  Step 1: Basahin ang req.user.
  Step 2: I-throw kapag hindi admin.
*/
function ensureAdminRequest(req) {
  const user = req.user;
  if (!user || user.role !== 'admin') {
    const error = new Error('Forbidden: admin access only');
    error.statusCode = 403;
    throw error;
  }
  return user;
}

/*
  Function Name: getAllIssuerCredentialsAdminController

  Technical:
  Express controller na nag-e-expose ng HTTP endpoint para sa
  aggregated credentials across all issuers. Naka-wrap lang siya
  sa CouchDB helper na getAllIssuerCredentialsAdmin.

  Tropang Ex:
  Ito yung API handler para sa Admin Dashboard:
  - Chine-check muna kung admin ka.
  - Kinukuha lahat ng credentials ng lahat ng issuers (optional filters).
  - Ibinabalik sa frontend as JSON.
*/
async function getAllIssuerCredentialsAdminController(req, res) {
  try {
    /* Step 1: Auth / role check

      Technical:
      Requires req.user with role === 'admin'.
      Otherwise, returns 403 Forbidden.

      Tropang Ex:
      Siguraduhin muna na admin talaga yung tumatawag sa endpoint.
    */
    ensureAdminRequest(req);

    /* Step 2: Read optional query filters

      Technical:
      - issuerId: filter for one specific issuer
      - type: 'issued' | 'templates' (or omitted for all)

      Tropang Ex:
      Para ma-filter sa dropdown:
      - Puwede piliin kung isang issuer lang (e.g. DLSU).
      - Puwede piliin kung templates lang o issued lang.
    */
    const issuerId = req.query.issuerId || null;
    const type = req.query.type || null; // 'issued' | 'templates' | null

    /* Step 3: Delegate to CouchDB service

      Technical:
      Calls getAllIssuerCredentialsAdmin({ issuerId, type }) which:
        - Gets all approved issuers
        - Loops each issuer and fetches credentials
        - Applies type/issuer filtering
        - Returns flattened, sorted rows

      Tropang Ex:
      Dito na natin tinatawag yung “master list” logic sa couchDB_service.
    */
    const rows = await couchdbService.getAllIssuerCredentialsAdmin({
      issuerId,
      type
    });

    /* Step 4: Build and send HTTP response

      Technical:
      Wraps the array into a standardized JSON object with:
        - success
        - data
        - count
        - filters used
        - timestamp

      Tropang Ex:
      Ito na yung final payload na babasahin ng Admin Dashboard.
    */
    return res.status(200).json({
      success: true,
      data: rows,
      count: rows.length,
      filters: {
        issuerId: issuerId || null,
        type: type || null
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error in getAllIssuerCredentialsAdminController:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}


/*
  Function Name: runIntegrityCheck
  Technical: Compares issuer CouchDB credential docs against the raw blockchain record field by field.
  Tropang Ex: Audit checker ito kung pareho pa ba ang laman ng CouchDB at blockchain per credential.

  Step 1: Kunin lahat ng issued credentials from issuer DBs.
  Step 2: Basahin ang raw blockchain record gamit Get_CredentialTemplateOrIssuedCredential.
  Step 3: I-compare ang configured fields and collect mismatches.
  Step 4: I-return ang summary counts at detailed results.
*/
async function runIntegrityCheck(getContractAndGateway) {
  console.log('[INTEGRITY] Running CouchDB vs Blockchain integrity check...');
  const rows = await couchdbService.getAllIssuedCredentialsForIntegrity();
  const results = [];
  let matched = 0;
  let mismatched = 0;
  let missing = 0;
  let errors = 0;

  for (const row of rows) {
    const blockchainId = row?.couchDoc?.blockchainId;
    const credentialName = row?.couchDoc?.credentialName || 'Unknown';
    let gateway = null;

    if (row?.error) {
      errors += 1;
      results.push({
        blockchainId: blockchainId || 'N/A',
        credentialName,
        issuerOrgName: row?.issuerOrgName || 'Unknown Issuer',
        verdict: 'error',
        mismatches: [],
        error: row.error
      });
      continue;
    }

    if (!blockchainId) {
      missing += 1;
      results.push({
        blockchainId: 'N/A',
        credentialName,
        issuerOrgName: row?.issuerOrgName || 'Unknown Issuer',
        verdict: 'missing',
        mismatches: []
      });
      continue;
    }

    try {
      const { gateway: gw, contract } = await getContractAndGateway('chaincert-admin', 'Org1');
      gateway = gw;
      const blockchainBuffer = await contract.evaluateTransaction('Get_CredentialTemplateOrIssuedCredential', blockchainId);
      const blockchainRecord = JSON.parse(blockchainBuffer.toString());

      if (!blockchainRecord || (Array.isArray(blockchainRecord) && blockchainRecord.length === 0)) {
        missing += 1;
        results.push({ blockchainId, credentialName, issuerOrgName: row?.issuerOrgName || 'Unknown Issuer', verdict: 'missing', mismatches: [] });
        continue;
      }

      const bcRecord = blockchainRecord.record || blockchainRecord;
      const couchDoc = row.couchDoc || {};
      const mismatchesList = [];

      for (const field of INTEGRITY_FIELDS) {
        const couchValue = normalizeIntegrityValue(couchDoc[field] ?? couchDoc[field === 'issuerId' ? 'issuerID' : field]);
        const blockchainValue = normalizeIntegrityValue(bcRecord[field] ?? bcRecord[field === 'issuerId' ? 'issuerID' : field]);
        if (couchValue !== blockchainValue) {
          mismatchesList.push({ field, couchValue, blockchainValue });
        }
      }

      if (mismatchesList.length > 0) {
        mismatched += 1;
        results.push({ blockchainId, credentialName, issuerOrgName: row?.issuerOrgName || 'Unknown Issuer', verdict: 'mismatched', mismatches: mismatchesList });
      } else {
        matched += 1;
        results.push({ blockchainId, credentialName, issuerOrgName: row?.issuerOrgName || 'Unknown Issuer', verdict: 'matched', mismatches: [] });
      }
    } catch (error) {
      const message = error?.message || String(error);
      if (/not found/i.test(message)) {
        missing += 1;
        results.push({ blockchainId, credentialName, issuerOrgName: row?.issuerOrgName || 'Unknown Issuer', verdict: 'missing', mismatches: [] });
      } else {
        errors += 1;
        results.push({ blockchainId, credentialName, issuerOrgName: row?.issuerOrgName || 'Unknown Issuer', verdict: 'error', mismatches: [], error: message });
      }
    } finally {
      try { if (gateway) await gateway.disconnect(); } catch (_) {}
    }
  }

  return {
    success: true,
    totalChecked: rows.length,
    matched,
    mismatched,
    missing,
    errors,
    results
  };
}

/*
  Function Name: triggerIntegrityCheck
  Technical: Admin-only HTTP wrapper for manual integrity checks.
  Tropang Ex: Ito yung endpoint na tinatawag ng admin button para mag-run ng full integrity scan.

  Step 1: I-check kung admin yung requester.
  Step 2: I-run ang integrity check helper.
  Step 3: Ibalik ang summary + detailed rows.
*/
async function triggerIntegrityCheck(req, res, getContractAndGateway) {
  try {
    ensureAdminRequest(req);
    const result = await runIntegrityCheck(getContractAndGateway);
    return res.status(200).json({
      ...result,
      message: `Integrity check complete. ${result.totalChecked} credential(s) checked.`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[INTEGRITY] Check failed:', error.message);
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
}

/*
  Function Name: getAdminNotificationsController
  Technical: Returns all admin notifications with admin role protection.
  Tropang Ex: Full notif list ni admin para sa bell panel.

  Step 1: I-check kung admin ang requester.
  Step 2: Kunin lahat ng admin notifications.
  Step 3: Ibalik kasama count.
*/
async function getAdminNotificationsController(req, res) {
  try {
    ensureAdminRequest(req);
    const notifications = await couchdbService.getAdminNotifications();
    return res.status(200).json({ success: true, notifications, count: notifications.length });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
}

/*
  Function Name: getUnreadAdminNotificationsController
  Technical: Returns unread admin notifications only.
  Tropang Ex: Source ito ng unread badge count ng admin bell.

  Step 1: I-check kung admin.
  Step 2: Kunin unread notifications.
  Step 3: Ibalik count + docs.
*/
async function getUnreadAdminNotificationsController(req, res) {
  try {
    ensureAdminRequest(req);
    const notifications = await couchdbService.getUnreadAdminNotifications();
    return res.status(200).json({ success: true, notifications, unreadCount: notifications.length });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
}

/*
  Function Name: markAdminNotificationAsReadController
  Technical: Marks one admin notification as read.
  Tropang Ex: Kapag klinick ni admin ang notif, dito ito nagiging read.

  Step 1: I-check kung admin.
  Step 2: Basahin ang notificationId sa params.
  Step 3: I-update ang read flag.
*/
async function markAdminNotificationAsReadController(req, res) {
  try {
    ensureAdminRequest(req);
    const { notificationId } = req.params;
    const result = await couchdbService.markAdminNotificationAsRead(notificationId);
    return res.status(200).json({ success: true, notificationId, result });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
}

/*
  Function Name: markAllAdminNotificationsAsReadController
  Technical: Marks all unread admin notifications as read.
  Tropang Ex: Bulk read-all action ito ng admin panel.

  Step 1: I-check kung admin.
  Step 2: Tawagin ang bulk read helper.
  Step 3: Ibalik ilan ang na-update.
*/
async function markAllAdminNotificationsAsReadController(req, res) {
  try {
    ensureAdminRequest(req);
    const result = await couchdbService.markAllAdminNotificationsAsRead();
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
}

// ==========================================================================================================================================================================
// AUTO EXPIRY LOGIC - polo
// ==========================================================================================================================================================================

/*
  Function Name: runExpiryCheck
  Technical:
  Calls checkAndExpireCredentials() from CouchDB service to find and mark expired credentials.
  For each expired credential, submits ExpireCredential transaction to blockchain
  so it appears in credential history.
  Called by: midnight cron job + manual trigger endpoint via sdk-server-fixed.js
  // - polo
*/
async function runExpiryCheck(getContractAndGateway) {
  console.log('[EXPIRY] Running expiry check...');
  let gateway = null;
  try {
    /* Step 1: Update CouchDB first - polo */
    const expiredList = await couchdbService.checkAndExpireCredentials();
    if (expiredList.length === 0) {
      console.log('[EXPIRY] No credentials to expire.');
      return { expired: 0, results: [] };
    }

    /* Step 2: Log each expired credential to blockchain - polo */
    const results = [];
    for (const item of expiredList) {
      try {
        const { gateway: gw, contract } = await getContractAndGateway('chaincert-admin', 'Org1');
        gateway = gw;
        await contract.submitTransaction('ExpireCredential', item.blockchainId);
        console.log(`[EXPIRY] ✅ Blockchain logged: ${item.blockchainId}`);
        results.push({ blockchainId: item.blockchainId, success: true });
      } catch (bcErr) {
        console.warn(`[EXPIRY] ⚠️ Blockchain log failed for ${item.blockchainId}:`, bcErr.message);
        results.push({ blockchainId: item.blockchainId, success: false, error: bcErr.message });
      } finally {
        try { if (gateway) await gateway.disconnect(); } catch (_) {}
        gateway = null;
      }
    }

    console.log(`[EXPIRY] ✅ Expiry check complete. ${results.length} processed.`);
    return { expired: results.length, results };

  } catch (error) {
    console.error('[EXPIRY] ❌ Expiry check failed:', error.message);
    throw error;
  }
}

/*
  Function Name: triggerExpiryCheck
  Technical: Express handler for POST /api/admin/trigger-expiry-check
  Manual on-demand trigger for demo/testing purposes
  // - polo
*/
async function triggerExpiryCheck(req, res, getContractAndGateway) {
  try {
    console.log('[EXPIRY] Manual trigger by admin...');
    const result = await runExpiryCheck(getContractAndGateway);
    return res.status(200).json({
      success: true,
      message: `Expiry check complete. ${result.expired} credential(s) expired.`,
      results: result.results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[EXPIRY] ❌ Manual trigger failed:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

/*
  Function Name: initExpiryCron
  Technical: Schedules midnight cron job for automatic expiry check
  Called once on server startup from sdk-server-fixed.js
  // - polo
*/
function initExpiryCron(getContractAndGateway) {
  cron.schedule('0 0 * * *', async () => {
    console.log('[CRON] Midnight expiry check triggered...');
    try {
      await runExpiryCheck(getContractAndGateway);
    } catch (err) {
      console.error('[CRON] ❌ Expiry cron failed:', err.message);
    }
  });
  console.log('✅ [CRON] Midnight expiry cron job scheduled');
}

module.exports = {
  getAllIssuerCredentialsAdminController,
  getAdminNotificationsController,
  getUnreadAdminNotificationsController,
  markAdminNotificationAsReadController,
  markAllAdminNotificationsAsReadController,
  runIntegrityCheck,
  triggerIntegrityCheck,
  runExpiryCheck,
  triggerExpiryCheck,
  initExpiryCron
};
