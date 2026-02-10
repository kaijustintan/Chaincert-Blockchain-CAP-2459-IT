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
 * Function Name: verifyCredentialByID
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
const verifyCredentialByID = async (req, res, getContractAndGateway) => {
  try {
    const { credentialId } = req.params;

    // Step 0: Validate input (credentialId must be provided)
    if (!credentialId) {
      return res.status(400).json({
        success: false,
        message: 'Credential ID is required',
      });
    }
    console.log(`[VERIFY] Querying credential: ${credentialId}`);

    // Normalize ID for CouchDB
    const searchId = normalizeCredentialId(credentialId);
    console.log(`[VERIFY] Normalized CouchDB ID: ${searchId}`);

    // ✅ STEP 1: Query CouchDB FIRST (faster, local check)
    console.log('[VERIFY] Step 1: Checking CouchDB wallet...');
    const adminCouch = nano(COUCHDB_URL);
    const userWalletDb = adminCouch.use('wallet_user_credentials');

    let couchResult;
    try {
      couchResult = await userWalletDb.find({
        selector: { _id: searchId },
        limit: 1,
      });
    } catch (couchErr) {
      console.log('[VERIFY] CouchDB query error (non-fatal):', couchErr.message);
      couchResult = { docs: [] };
    }

    // Prepare base response fields
    let couchPayload = null;
    let isValid = false;
    let isRevoked = false;
    let isExpired = false;
    let status = 'unknown';
    let reason = 'Credential not found in CouchDB';

    if (couchResult.docs && couchResult.docs.length > 0) {
      const credential = couchResult.docs[0];

      console.log('[VERIFY] ✅ Found in CouchDB wallet');

      status = credential.status || 'unknown';
      const now = new Date();

      isRevoked =
        status === 'revoked' ||
        credential.isRevoked === true ||
        credential.revoked === true;

      isExpired = credential.expiryDate
        ? new Date(credential.expiryDate) < now
        : false;

      const isStatusValid = status === 'active' || status === 'issued';
      isValid = !isRevoked && !isExpired && isStatusValid;

      if (isRevoked) {
        reason = 'Credential has been revoked (CouchDB)';
      } else if (isExpired) {
        reason = 'Credential has expired (CouchDB)';
      } else if (!isStatusValid) {
        reason = `Credential is not in a valid status (${status}) (CouchDB)`;
      } else {
        reason = 'Credential is valid (CouchDB)';
      }

      couchPayload = {
        credentialID: credentialId, // field name kept as credentialID for API compatibility
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
        source: 'wallet_cache',
      };
    }

    // At this point:
    // - If couchPayload is null => not found in CouchDB.
    // - If couchPayload exists => we have local validity flags.

    // ✅ STEP 2: Optional blockchain VerifyCredential() cross-check
    // Only run if we have a working getContractAndGateway and we want to test on-chain verify.
    let blockchainCheck = null;

    if (getContractAndGateway) {
      try {
        console.log('[VERIFY] Step 2: Running blockchain VerifyCredential()...');

        // For generic verifier: use Org1 admin identity (same pattern as history endpoint).
        const identityName = 'admin';
        const orgName = 'Org1';

        const { gateway, contract } = await getContractAndGateway(identityName, orgName);

        // NOTE: On-chain VerifyCredential expects the *on-chain* credential ID.
        // For now, we assume credentialId coming from client is already the ledger key.
        const bcResultBuffer = await contract.evaluateTransaction('VerifyCredential', credentialId);
        const bcResult = JSON.parse(bcResultBuffer.toString());

        await gateway.disconnect();

        // bcResult shape per chaincode:
        // - If not found: { valid: false, reason: 'Credential not found' }
        // - If revoked:   { valid: false, reason: 'Credential has been revoked' }
        // - If expired:   { valid: false, reason: 'Credential has expired' }
        // - If bad status:{ valid: false, reason: 'Credential is not in a valid status <status>' }
        // - Else:         { valid: true, credential: { ...full credential object... } }
        blockchainCheck = {
          valid: bcResult.valid,
          reason: bcResult.reason || (bcResult.valid ? 'Credential is valid on-chain' : 'Invalid on-chain'),
          credential: bcResult.credential || null,
        };

        console.log('[VERIFY] Blockchain verify result:', blockchainCheck);
      } catch (bcErr) {
        console.error('[VERIFY] Blockchain VerifyCredential failed (non-fatal):', bcErr.message);
        blockchainCheck = {
          error: bcErr.message,
        };
      }
    }

    // ✅ STEP 3: Compose final response

    // Case A: Nothing in CouchDB and no blockchain success
    if (
      !couchPayload &&
      (!blockchainCheck ||
        (blockchainCheck && blockchainCheck.valid === undefined && !blockchainCheck.credential))
    ) {
      return res.status(404).json({
        success: false,
        verified: false,
        message: 'Credential not found in CouchDB or blockchain',
        credentialID: credentialId,
        verifiedAt: new Date().toISOString(),
      });
    }

    // Decide final validity, preferring strict (any invalid source wins)
    let finalIsValid = isValid;
    let finalReason = reason;
    let onChainStatus = null;

    if (blockchainCheck && blockchainCheck.valid !== undefined) {
      // If blockchain says invalid, override to invalid; if valid and CouchDB says valid, keep valid.
      if (!blockchainCheck.valid) {
        finalIsValid = false;
        finalReason = blockchainCheck.reason || 'Invalid on-chain';
      } else if (blockchainCheck.valid && couchPayload && isValid) {
        finalIsValid = true;
        finalReason = blockchainCheck.reason || reason || 'Credential is valid (CouchDB + blockchain)';
      }
      onChainStatus = blockchainCheck.valid ? 'valid' : 'invalid';
    }

    // If we have CouchDB data, use it as main payload; else, fall back to on-chain credential
    let mainPayload = couchPayload;

    if (!mainPayload && blockchainCheck && blockchainCheck.credential) {
      const c = blockchainCheck.credential;
      const now = new Date();
      const chainStatus = c.status || 'unknown';
      const chainIsRevoked = chainStatus === 'revoked';
      const chainIsExpired = c.expiryDate ? new Date(c.expiryDate) < now : false;
      const chainStatusValid = chainStatus === 'active' || chainStatus === 'issued';

      mainPayload = {
        credentialID: c.id,
        credentialType: c.credentialType,
        credentialName: c.credentialName,
        issuerName: c.issuerID || 'Unknown',
        holderID: c.holderID,
        status: chainStatus,
        isValid: blockchainCheck.valid && chainStatusValid && !chainIsRevoked && !chainIsExpired,
        isRevoked: chainIsRevoked,
        isExpired: chainIsExpired,
        expiryDate: c.expiryDate,
        verifiedAt: new Date().toISOString(),
        source: 'blockchain_only',
      };

      // If CouchDB had nothing, sync our local flags from on-chain
      finalIsValid = mainPayload.isValid;
      finalReason = blockchainCheck.reason || finalReason;
    }

    return res.status(200).json({
      success: true,
      verified: !!mainPayload,
      credentialID: mainPayload ? mainPayload.credentialID : credentialId,
      credentialType: mainPayload ? mainPayload.credentialType : undefined,
      credentialName: mainPayload ? mainPayload.credentialName : undefined,
      issuerName: mainPayload ? mainPayload.issuerName : undefined,
      holderID: mainPayload ? mainPayload.holderID : undefined,
      status: mainPayload ? mainPayload.status : status,
      isValid: finalIsValid,
      isRevoked: mainPayload ? mainPayload.isRevoked : isRevoked,
      isExpired: mainPayload ? mainPayload.isExpired : isExpired,
      expiryDate: mainPayload ? mainPayload.expiryDate : undefined,
      reason: finalReason,
      sources: {
        couchDB: !!couchPayload,
        blockchain: !!blockchainCheck && blockchainCheck.valid !== undefined,
        blockchainError: blockchainCheck && blockchainCheck.error ? blockchainCheck.error : null,
        onChainStatus,
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

/* Ito yung pinapagamit natin sa router. Kapag may tumawag ng /verify o stats endpoint, dito rin babagsak. */
module.exports = {
  verifyCredentialByID,
  getVerificationStats,
};
