// controllers/adminDashboardController.js

const couchdbService = require('../couchDB_service');
const cron = require('node-cron'); // - polo: expiry cron

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
    const user = req.user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: admin access only'
      });
    }

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


async function runIntegrityCheck(getContractAndGateway) {
  console.log('[INTEGRITY] Running CouchDB vs Blockchain integrity check...');
  const nano = require('nano');
  const adminCouch = nano('http://admin:adminpw@localhost:5985');
  const userWalletDb = adminCouch.use('wallet_user_credentials');

  const allDocs = await userWalletDb.find({
    selector: {
      blockchainId: { $exists: true },
      _id: { $gt: 'user_cred_', $lt: 'user_cred_￰' },
    },
    limit: 999,
  });

  if (!allDocs.docs || allDocs.docs.length === 0) {
    return { checked: 0, mismatches: [], mismatchCount: 0, message: 'No credentials found in CouchDB.' };
  }

  const mismatches = [];
  let checked = 0;
  let gateway = null;

  for (const doc of allDocs.docs) {
    const blockchainId = doc.blockchainId || doc._id;
    if (!blockchainId || String(blockchainId).includes('template')) continue;

    try {
      const { gateway: gw, contract } = await getContractAndGateway('chaincert-admin', 'Org1');
      gateway = gw;

      const bcResultBuffer = await contract.evaluateTransaction('VerifyCredential', blockchainId);
      const bcResult = JSON.parse(bcResultBuffer.toString());
      const bcCredential = bcResult.credential || {};
      const couchStatus = String(doc.status || '').toLowerCase();
      const blockchainStatus = String(bcCredential.status || '').toLowerCase();
      const blockchainHolderId = bcCredential.holderID || '';
      const blockchainIssuerId = bcCredential.issuerID || bcCredential.issuerName || '';

      checked += 1;

      const fieldMismatches = [];
      if (couchStatus !== blockchainStatus) {
        fieldMismatches.push({ field: 'status', couchDB: couchStatus || 'unknown', blockchain: blockchainStatus || 'unknown' });
      }
      if (String(doc.holderID || '') !== String(blockchainHolderId || '')) {
        fieldMismatches.push({ field: 'holderID', couchDB: doc.holderID || '', blockchain: blockchainHolderId || '' });
      }
      if (String(doc.issuerID || doc.issuerName || '') !== String(blockchainIssuerId || '')) {
        fieldMismatches.push({ field: 'issuerID', couchDB: doc.issuerID || doc.issuerName || '', blockchain: blockchainIssuerId || '' });
      }

      if (fieldMismatches.length > 0) {
        mismatches.push({
          credentialId: blockchainId,
          credentialName: doc.credentialName || bcCredential.credentialName || 'Unknown',
          couchDBStatus: couchStatus || 'unknown',
          blockchainValid: bcResult.valid,
          blockchainStatus: blockchainStatus || 'unknown',
          blockchainReason: bcResult.reason || '',
          fieldMismatches,
        });
      }
    } catch (bcErr) {
      console.warn(`[INTEGRITY] Failed to check ${blockchainId}:`, bcErr.message);
    } finally {
      try { if (gateway) await gateway.disconnect(); } catch (_) {}
      gateway = null;
    }
  }

  console.log(`[INTEGRITY] Check complete. ${checked} checked, ${mismatches.length} mismatches.`);
  return { checked, mismatches, mismatchCount: mismatches.length };
}

async function triggerIntegrityCheck(req, res, getContractAndGateway) {
  try {
    const result = await runIntegrityCheck(getContractAndGateway);
    return res.status(200).json({
      success: true,
      message: `Integrity check complete. ${result.checked} credentials checked, ${result.mismatchCount} mismatches found.`,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[INTEGRITY] Check failed:', error.message);
    return res.status(500).json({ success: false, message: error.message });
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
  runIntegrityCheck,
  triggerIntegrityCheck,
  runExpiryCheck,
  triggerExpiryCheck,
  initExpiryCron
};
