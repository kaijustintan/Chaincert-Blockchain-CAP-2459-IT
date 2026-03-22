// ==========================================================================================================================================================================
//                                                               verifierController.js 
// ==========================================================================================================================================================================

/*
  verifierController.js

  Technical:
  Centralizes all credential verification logic for the verifier module, using CouchDB as the primary data source
  (admin wallet DB: wallet_user_credentials) with optional blockchain VerifyCredential() cross-check.

  Tropang Ex:
  Ito yung “utak” ng verification feature. Kapag may nag-input ng credential ID para i-check kung legit, dito napupunta yung trabaho:
  - hahanapin sa CouchDB
  - kukunin status (active, revoked, expired)
  - optionally magtatanong sa blockchain VerifyCredential()
  - magbabalik ng malinaw na verification result.

  NOTE:
  - CouchDB is still the fast path.
  - Blockchain verify is added mainly for end-to-end testing and high-trust checks.
*/

const nano = require('nano');
const couchdbService = require('../couchDB_service'); // for future issuer/admin lookups if needed

// couchDB connection where wallet_user_credentials is
const COUCHDB_URL = 'http://admin:adminpw@localhost:5985';

/**
 * Helper: normalize credential ID to user_cred_<cleanId> (CouchDB convention)
 */
function normalizeCredentialId(credentialId) {
  const cleanId = credentialId.replace(/^user_cred_/, '');
  return `user_cred_${cleanId}`;
}

/**
 * Function Name: Verify_Credential
 *
 * Technical:
 * Verifies a credential by its ID using:
 *  - Step 1: CouchDB (admin wallet_user_credentials) as primary source.
 *  - Step 2: Optional blockchain VerifyCredential() cross-check using a generic Org1 admin identity.
 *
 * Validation rules on the CouchDB side mirror the chaincode VerifyCredential logic:
 *  - Not found           -> verified false, isValid false
 *  - status === 'revoked' -> invalid
 *  - expiryDate in past   -> invalid
 *  - status not in ['active','issued'] -> invalid
 *
 * Expected req.params:
 * {
 *   credentialId: "user_cred_12345" // or similar
 * }
 *
 * Expected extra param injected from router:
 *   getContractAndGateway(identityName, orgName) => { gateway, contract }
 */
const Verify_Credential = async (req, res, getContractAndGateway) => {
  try {
    const { credentialId } = req.params;

    if (!credentialId) {
      return res.status(400).json({
        success: false,
        message: 'Credential ID is required',
      });
    }
    console.log(`[VERIFY] Querying credential: ${credentialId}`);

    let mainPayload = null;
    let finalIsValid = false;
    let finalReason = 'Credential not found';
    let sourceUsed = 'none';
    let blockchainError = null;

    // ✅ STEP 1: Try BLOCKCHAIN FIRST (trust anchor)
    if (getContractAndGateway) {
      try {
        console.log('[VERIFY] Step 1: Running blockchain VerifyCredential() (primary)...');
        const identityName = 'admin';
        const orgName = 'Org1';
        const { gateway, contract } = await getContractAndGateway(identityName, orgName);
        const bcResultBuffer = await contract.evaluateTransaction('VerifyCredential', credentialId);
        const bcResult = JSON.parse(bcResultBuffer.toString());
        await gateway.disconnect();

        console.log('[VERIFY] Blockchain result:', bcResult);

        if (bcResult.valid !== undefined) {
          // Blockchain returned a definitive answer
          const c = bcResult.credential || {};
          const now = new Date();
          let chainStatus = c.status || '';
          if (!chainStatus || String(chainStatus).toLowerCase() === 'unknown') {
            if (bcResult.valid) {
              chainStatus = 'active';
            } else {
              const reasonLower = (bcResult.reason || '').toLowerCase();
              if (reasonLower.includes('revoked')) chainStatus = 'revoked';
              else if (reasonLower.includes('expired')) chainStatus = 'expired';
              else chainStatus = 'invalid';
            }
          }
          chainStatus = String(chainStatus).toLowerCase();
          const chainIsRevoked = chainStatus === 'revoked' || (!bcResult.valid && (bcResult.reason || '').toLowerCase().includes('revoked'));
          const chainIsExpired = c.expiryDate ? new Date(c.expiryDate) < now : (!bcResult.valid && (bcResult.reason || '').toLowerCase().includes('expired'));

          mainPayload = {
            credentialID: credentialId,
            credentialType: c.credentialType || undefined,
            credentialName: c.credentialName || undefined,
            issuerName: c.issuerID || c.issuerName || undefined,
            holderID: c.holderID || undefined,
            status: chainStatus,
            isValid: bcResult.valid,
            isRevoked: chainIsRevoked,
            isExpired: chainIsExpired,
            expiryDate: c.expiryDate || undefined,
            verifiedAt: new Date().toISOString(),
            source: 'blockchain',
          };
          mainPayload.status = String(mainPayload.status || 'unknown').toLowerCase();
          finalIsValid = bcResult.valid;
          finalReason = bcResult.reason || (bcResult.valid ? 'Credential is valid (blockchain-verified)' : 'Credential is invalid (blockchain)');
          sourceUsed = 'blockchain';
        }
      } catch (bcErr) {
        console.error('[VERIFY] Blockchain VerifyCredential failed:', bcErr.message);
        blockchainError = bcErr.message;
        // Fall through to CouchDB
      }
    }

    if (mainPayload) {
      try {
        const searchId = normalizeCredentialId(credentialId);
        const adminCouch = nano(COUCHDB_URL);
        const userWalletDb = adminCouch.use('wallet_user_credentials');
        const couchResult = await userWalletDb.find({
          selector: { _id: searchId },
          limit: 1,
        });

        if (couchResult.docs && couchResult.docs.length > 0) {
          const couchCred = couchResult.docs[0];
          mainPayload.credentialName = mainPayload.credentialName || couchCred.credentialName || undefined;
          mainPayload.credentialType = mainPayload.credentialType || couchCred.credentialType || undefined;
          mainPayload.issuerName = couchCred.issuerName || mainPayload.issuerName || undefined;
          mainPayload.holderName = couchCred.holderName || couchCred.holderID || mainPayload.holderID || undefined;
          mainPayload.holderID = mainPayload.holderID || couchCred.holderID || undefined;
          mainPayload.badgeImage = couchCred.badgeImage || undefined;
          mainPayload.skills = couchCred.skills || [];
          mainPayload.description = couchCred.description || undefined;
          mainPayload.savedToUserWalletAt = couchCred.savedToUserWalletAt || undefined;
        }

        if (mainPayload.holderID && !mainPayload.holderName) {
          try {
            const holderUser = await couchdbService.getUser(mainPayload.holderID);
            if (holderUser) {
              mainPayload.holderName = holderUser.username || holderUser.fullName || holderUser.name || holderUser.email || mainPayload.holderID;
            }
          } catch (e) { /* non-critical */ }
        }

        const issuerLookupId = mainPayload.issuerID || mainPayload.issuerName;
        if (issuerLookupId && typeof issuerLookupId === 'string' && issuerLookupId.startsWith('issuer_')) {
          try {
            const issuerDoc = await couchdbService.getUser(issuerLookupId);
            if (issuerDoc) {
              mainPayload.issuerName = issuerDoc.orgName || issuerDoc.contactName || issuerDoc.username || mainPayload.issuerName;
            }
          } catch (e) { /* non-critical */ }
        }
      } catch (enrichErr) {
        console.warn('[VERIFY] CouchDB enrichment failed (non-fatal):', enrichErr.message);
      }
    }

    // ✅ STEP 2: FALLBACK to CouchDB if blockchain didn't provide an answer
    if (!mainPayload) {
      console.log('[VERIFY] Step 2: Falling back to CouchDB...');
      const searchId = normalizeCredentialId(credentialId);
      const adminCouch = nano(COUCHDB_URL);
      const userWalletDb = adminCouch.use('wallet_user_credentials');

      let couchResult;
      try {
        couchResult = await userWalletDb.find({
          selector: { _id: searchId },
          limit: 1,
        });
      } catch (couchErr) {
        console.log('[VERIFY] CouchDB query error:', couchErr.message);
        couchResult = { docs: [] };
      }

      if (couchResult.docs && couchResult.docs.length > 0) {
        const credential = couchResult.docs[0];
        const now = new Date();
        let status = credential.status || '';
        if (!status || String(status).toLowerCase() === 'unknown') {
          if (credential.isRevoked === true || credential.revoked === true) status = 'revoked';
          else if (credential.expiryDate && new Date(credential.expiryDate) < now) status = 'expired';
          else if (credential.blockchainId || credential._id) status = 'active';
          else status = 'invalid';
        }
        status = String(status).toLowerCase();
        const isRevoked = status === 'revoked' || credential.isRevoked === true || credential.revoked === true;
        const isExpired = credential.expiryDate ? new Date(credential.expiryDate) < now : false;
        const isStatusValid = status === 'active' || status === 'issued';
        const isValid = !isRevoked && !isExpired && isStatusValid;

        let reason;
        if (isRevoked) reason = 'Credential has been revoked';
        else if (isExpired) reason = 'Credential has expired';
        else if (!isStatusValid) reason = `Credential is not in a valid status (${status})`;
        else reason = 'Credential is valid (CouchDB fallback — blockchain unavailable)';

        mainPayload = {
          credentialID: credentialId,
          credentialType: credential.credentialType,
          credentialName: credential.credentialName,
          issuerName: credential.issuerName || 'Unknown',
          holderID: credential.holderID,
          status,
          isValid,
          isRevoked,
          isExpired,
          expiryDate: credential.expiryDate,
          verifiedAt: new Date().toISOString(),
          source: 'couchdb_fallback',
        };
        mainPayload.status = String(mainPayload.status || 'unknown').toLowerCase();
        finalIsValid = isValid;
        finalReason = reason;
        sourceUsed = 'couchdb_fallback';
      }
    }

    // ✅ STEP 3: Return response
    if (!mainPayload) {
      return res.status(404).json({
        success: false,
        verified: false,
        message: 'Credential not found',
        credentialID: credentialId,
        verifiedAt: new Date().toISOString(),
        sources: { blockchain: sourceUsed === 'blockchain', couchDB: sourceUsed === 'couchdb_fallback', blockchainError },
      });
    }

    return res.status(200).json({
      success: true,
      verified: true,
      credentialID: mainPayload.credentialID,
      credentialType: mainPayload.credentialType,
      credentialName: mainPayload.credentialName,
      issuerName: mainPayload.issuerName,
      holderID: mainPayload.holderID,
      holderName: mainPayload.holderName || undefined,
      badgeImage: mainPayload.badgeImage || undefined,
      skills: mainPayload.skills || [],
      description: mainPayload.description || undefined,
      status: mainPayload.status,
      isValid: finalIsValid,
      isRevoked: mainPayload.isRevoked,
      isExpired: mainPayload.isExpired,
      expiryDate: mainPayload.expiryDate,
      reason: finalReason,
      sources: {
        blockchain: sourceUsed === 'blockchain',
        couchDB: sourceUsed === 'couchdb_fallback',
        blockchainError,
        primarySource: sourceUsed,
      },
      verifiedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[VERIFY ERROR]', error.message);

    return res.status(500).json({
      success: false,
      verified: false,
      message: 'Error verifying credential',
      credentialID: req.params.credentialId,
      error: error.message,
      verifiedAt: new Date().toISOString(),
    });
  }
};

/**
 * Function Name: getVerificationStats
 *
 * Technical:
 * Aggregates basic statistics over all credentials stored in wallet_user_credentials.
 * - total: all credentials
 * - active: status === 'issued' or 'active'
 * - revoked: status === 'revoked' or isRevoked === true
 * - expired: expiryDate < now
 * - pending: status === 'pending' or 'pending_blockchain'
 *
 * Tropang Ex:
 * Ito yung pang-dashboard na summary. Parang "overview card" na nagsasabi:
 * - Ilan na lahat ng credentials
 * - Ilan ang active
 * - Ilan ang revoked
 * - Ilan ang expired
 * - Ilan ang pending/di pa fully synced sa blockchain
 */
const getVerificationStats = async (req, res) => {
  try {
    console.log('[VERIFY] Fetching verification statistics...');

    const adminCouch = nano(COUCHDB_URL);
    const userWalletDb = adminCouch.use('wallet_user_credentials');

    const result = await userWalletDb.find({
      selector: {
        _id: { $gt: null },
      },
    });

    const allCredentials = result.docs || [];
    const now = new Date();

    const stats = {
      total: allCredentials.length,
      active: allCredentials.filter(
        (c) => c.status === 'issued' || c.status === 'active',
      ).length,
      revoked: allCredentials.filter(
        (c) => c.status === 'revoked' || c.isRevoked,
      ).length,
      expired: allCredentials.filter(
        (c) => c.expiryDate && new Date(c.expiryDate) < now,
      ).length,
      pending: allCredentials.filter(
        (c) => c.status === 'pending' || c.status === 'pending_blockchain',
      ).length,
    };

    console.log('[VERIFY] Stats calculated:', stats);

    return res.status(200).json({
      success: true,
      stats,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[VERIFY ERROR]', error.message);

    return res.status(500).json({
      success: false,
      message: 'Error fetching verification statistics',
      error: error.message,
    });
  }
};

/**
 * Function Name: logVerificationEvent
 *
 * Technical:
 * Creates an on-chain verification log entry by calling the chaincode
 * function LogVerification(ctx, credentialId, verifierName, verifierEmail, resultJson).
 *
 * PLUS: Best-effort lookup of holderID + holderName from CouchDB (wallet_user_credentials + users),
 * then i-aattach sa HTTP response (off-chain enrichment).
 *
 * Expected req.params:
 *   { credentialId: "<BLOCKCHAIN_CREDENTIAL_ID>" }
 *
 * Expected req.body:
 *   {
 *     verifierName: "Juan Dela Cruz",
 *     verifierEmail: "juan@example.com",
 *     verifyResult: {
 *       valid: true,
 *       reason: "Credential is valid on-chain"
 *     }
 *   }
 *
 * Expected extra param from router:
 *   getContractAndGateway(identityName, orgName) => { gateway, contract }
 */
const logVerificationEvent = async (req, res, getContractAndGateway) => {
  try {
    const { credentialId } = req.params;
    const { verifierName, verifierEmail, verifyResult, name, email, resultJson } = req.body || {};

    // Step 0: Basic validation
    if (!credentialId) {
      return res.status(400).json({
        success: false,
        message: 'credentialId (path param) is required',
      });
    }

    const resolvedName = verifierName || name || '';
    const resolvedEmail = verifierEmail || email || '';

    // --- Try to resolve holderID + holderName from CouchDB ---
    let holderID = null;
    let holderName = null;

    try {
      const adminCouch = nano(COUCHDB_URL);
      const userWalletDb = adminCouch.use('wallet_user_credentials');

      // reuse same normalization pattern as Verify_Credential
      const normalizedId = normalizeCredentialId(credentialId);

      const result = await userWalletDb.find({
        selector: { _id: normalizedId },
        limit: 1,
      });

      if (result.docs && result.docs.length > 0) {
        const credDoc = result.docs[0];
        holderID = credDoc.holderID || null;

        if (holderID) {
          try {
            // getUser() already chooses usersDb vs issuersDb based on ID prefix
            const user = await couchdbService.getUser(holderID);

            // users doc (see Fauxton) has `fullName`, plus these fallbacks
            holderName =
              user.fullName ||
              user.username ||
              user.name ||
              user.displayName ||
              user.email ||
              null;
          } catch (userErr) {
            console.warn(
              '[VERIFY-LOG] Failed to resolve holder user by holderID:',
              userErr.message
            );
          }
        }
      }
    } catch (resolveErr) {
      console.warn(
        '[VERIFY-LOG] Failed to resolve holder info from CouchDB:',
        resolveErr.message
      );
    }
    // --- END holder resolve ---

    // Take result from previous /verify call (backend/chaincode output)
    const resultSummary = verifyResult || {};
    const serializedResultJson = resultJson || JSON.stringify({
      valid: !!(resultSummary.valid ?? resultSummary.isValid),
      reason: resultSummary.reason || '',
      status: resultSummary.status || '',
      source: resultSummary.source || '',
    });

    console.log('[VERIFY-LOG] Creating verification log for credential:', credentialId);

    // Step 1: Choose Fabric identity/org for logging
    // You can later switch this to DLSU identity if you want.
    const identityName = 'admin';
    const orgName = 'Org1';

    const { gateway, contract } = await getContractAndGateway(identityName, orgName);

    // Step 2: Submit LogVerification transaction
    const logBuffer = await contract.submitTransaction(
      'LogVerification',
      credentialId,
      resolvedName,
      resolvedEmail,
      serializedResultJson
    );

    await gateway.disconnect();

    const log = JSON.parse(logBuffer.toString());
    console.log('[VERIFY-LOG] On-chain verification log created:', log.id);

    // Attach holderName/holderID in HTTP response (off-chain enrichment only)
    const enrichedLog = {
      ...log,
      holderID: log.holderID || holderID,
      holderName: holderName || null,
    };

    return res.status(201).json({
      success: true,
      message: 'Verification log created on-chain',
      log: enrichedLog,
    });
  } catch (error) {
    console.error('[VERIFY-LOG ERROR]', error.message);

    return res.status(500).json({
      success: false,
      message: 'Error creating verification log',
      error: error.message,
      credentialID: req.params.credentialId,
    });
  }
};

// ============================================================================
// VERIFICATION LOGS: Blockchain-sourced audit
// ============================================================================

/*
  Function Name: getAllVerificationLogs

  Technical:
  - Dynamically chooses which Org1 Fabric identity to use:
    - If called by a logged-in admin user (admin dashboard):
      uses 'chaincert-admin' (public admin identity for admin accounts).
    - Otherwise (verifier dashboard / CLI / no user context):
      uses 'admin' (generic Org1 verifier/non-user Fabric identity).
  - Uses getContractAndGateway to connect to Fabric.
  - Calls chaincode function GetAllVerificationLogs (evaluateTransaction).
  - THEN best-effort enriches each log with holderName from CouchDB users DB
    using holderID (via couchdbService.getUser).
  - Returns array of enriched verification log objects.

  Tropang Ex:
  Ito yung pang-dashboard na listahan ng LAHAT ng verification attempts
  na na-log sa blockchain (UI + CLI), good for audit view, PLUS may
  Holder Name na galing sa users DB kung ma-resolve. Kapag galing sa
  admin dashboard, gagamit ng chaincert-admin identity; kapag galing
  sa verifier side na walang user context, generic admin identity lang.
*/
const getAllVerificationLogs = async (req, res, getContractAndGateway) => {
  try {
    // Step 1: Resolve identity based on context
    // - Admin dashboard (logged-in admin user) -> chaincert-admin
    // - Verifier dashboard / CLI / no user     -> admin
    let identityName;
    const orgName = 'Org1';

    if (req.user && req.user.role === 'admin') {
      identityName = 'chaincert-admin';
    } else {
      identityName = 'admin';
    }

    console.log(
      '[VERIFY-LOGS] Using Fabric identity',
      identityName,
      'for user',
      req.user ? `${req.user.id} (${req.user.role})` : 'NO-USER'
    );

    // Step 2: Connect to blockchain
    const { gateway, contract } = await getContractAndGateway(identityName, orgName);

    // Step 3: Call chaincode GetAllVerificationLogs (read-only)
    const resultBuffer = await contract.evaluateTransaction('GetAllVerificationLogs');
    const logs = JSON.parse(resultBuffer.toString());

    await gateway.disconnect();

    // Step 4: Best-effort enrichment from CouchDB users DB
    // Para mabigyan ng Holder Name based on holderID.
    const enrichedLogs = await Promise.all(
      (logs || []).map(async (log) => {
        let holderName = null;

        try {
          const holderID = log.holderID;

          if (holderID) {
            // getUser() already chooses usersDb vs issuersDb based on ID prefix
            const user = await couchdbService.getUser(holderID);

            holderName =
              user.fullName ||
              user.username ||
              user.name ||
              user.displayName ||
              user.email ||
              null;
          }
        } catch (e) {
          console.warn(
            '[VERIFY-LOGS] Failed to enrich holderName for log',
            log.id,
            e.message
          );
        }

        return {
          ...log,
          holderName,
        };
      })
    );

    // Step 5: Return enriched logs
    return res.status(200).json({
      success: true,
      logs: enrichedLogs,
      count: enrichedLogs.length || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('VERIFY LOGS ERROR (all):', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error fetching verification logs from blockchain',
      error: error.message,
    });
  }
};

/*
  Function Name: getVerificationLogById

  Technical:
  - Uses getContractAndGateway to connect as Org1 admin.
  - Calls chaincode function GetVerificationLogById with a specific logId.
  - Returns the single log object if found.

  Tropang Ex:
  Kapag may pinili kang specific log sa UI (e.g. vlog_123...),
  dito makukuha yung buong detalye niya galing blockchain.
*/
const getVerificationLogById = async (req, res, getContractAndGateway) => {
  try {
    const logId = req.params.logId;
    if (!logId) {
      return res.status(400).json({
        success: false,
        message: 'logId is required',
      });
    }

    const identityName = 'admin';
    const orgName = 'Org1';

    const { gateway, contract } = await getContractAndGateway(identityName, orgName);

    const resultBuffer = await contract.evaluateTransaction(
      'GetVerificationLogById',
      logId
    );
    const log = JSON.parse(resultBuffer.toString());

    await gateway.disconnect();

    return res.status(200).json({
      success: true,
      log,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('VERIFY LOGS ERROR (byId):', error.message);

    // 404-style response if chaincode throws "does not exist"
    if (error.message && error.message.includes('does not exist')) {
      return res.status(404).json({
        success: false,
        message: 'Verification log not found on blockchain',
        error: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Error fetching verification log from blockchain',
      error: error.message,
    });
  }
};


/* Ito yung pinapagamit natin sa router. Kapag may tumawag ng /verify o stats endpoint, dito rin babagsak. */
module.exports = {
  Verify_Credential,
  getVerificationStats,
  logVerificationEvent,
  getAllVerificationLogs,
  getVerificationLogById,
};
