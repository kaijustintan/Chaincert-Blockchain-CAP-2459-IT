// ==========================================================================================================================================================================
//                                                                       verifierController.js 
// ==========================================================================================================================================================================

/*
  verifierController.js

    Technical:
    Centralizes all credential verification logic for the verifier module, using CouchDB as the primary data source for now (admin wallet DB: wallet_user_credentials).

    Tropang Ex:
    Ito yung “utak” ng verification feature. Kapag may nag-input ng credential ID para i-check kung legit, dito napupunta yung trabaho:
    - hahanapin sa CouchDB
    - kukunin status (active, revoked, expired)
    - magbabalik ng malinaw na verification result.

    NOTE! --> dapat pati sa BC nagququery for verification
*/

const nano = require('nano');

// couchDB connection where wallet_user_credentials is
const COUCHDB_URL = 'http://admin:adminpw@localhost:5985';





/**
 * Function Name: verifyCredentialByID
 *
 * Technical:
 * Verifies a credential by its ID using CouchDB as the primary source.
 * - Cleans the credential ID to avoid double prefix issues.
 * - Queries the wallet_user_credentials DB.
 * - If found, computes validity flags (isValid, isRevoked, isExpired) and returns a detailed payload.
 * - If not found, returns 404 (no blockchain fallback yet, but design leaves room for it later).
 *
 * Expected req.params:
 * {
 *   credentialID: "user_cred_12345" // or similar
 * }
 */
const verifyCredentialByID = async (req, res) => {
  try {
    const { credentialID } = req.params;

    // Step 1: Validate input (credentialID must be provided)
    if (!credentialID) {
      return res.status(400).json({
        success: false,
        message: 'Credential ID is required'
      });
    }
    console.log(`[VERIFY] Querying credential: ${credentialID}`);

    // ✅ STEP 1: Query CouchDB FIRST (faster, local check)
    console.log(`[VERIFY] Step 1: Checking CouchDB wallet...`);
    // Create CouchDB client and select the admin wallet DB
    const adminCouch = nano(COUCHDB_URL);
    const userWalletDb = adminCouch.use('wallet_user_credentials');

    /*
    [ID Normalization]

    Technical:
    - Removes an existing user_cred_ prefix if present.
    - Ensures the final searchId is always in the form user_cred_<cleanId>.
    Reason: Prevents double prefix issues like user_cred_user_cred_123.

    Tropang Ex:
    Kung may nag-input ng "user_cred_user_cred_123", nililinis muna natin para siguradong tama yung ID na hahanapin.
    */
    const cleanId = credentialID.replace(/^user_cred_/, '');
    const searchId = `user_cred_${cleanId}`;
    console.log(`[VERIFY] Searching CouchDB for: ${searchId}`);

    let couchResult;
    try {
      // CouchDB query by _id using Mango find
      couchResult = await userWalletDb.find({
        selector: {
          _id: searchId
        },
        limit: 1
      });
    } catch (couchErr) {
      // CouchDB failures are treated as non-fatal for this step
      console.log(`[VERIFY] CouchDB query error (non-fatal):`, couchErr.message);
      couchResult = { docs: [] };
    }

    // If found in CouchDB, return it immediately
    if (couchResult.docs && couchResult.docs.length > 0) {
      // NOTE: docs is an array; we expect a single match (limit: 1)
      const credential = couchResult.docs[0];

      console.log(`[VERIFY] ✅ Found in CouchDB wallet`);

      // Compute validity flags
      const status = credential.status || 'issued';
      const isRevoked = credential.isRevoked || status === 'revoked';
      const isExpired = credential.expiryDate
        ? new Date(credential.expiryDate) < new Date()
        : false;
      const isValid =
        (status === 'issued' || status === 'active') &&
        !isRevoked &&
        !isExpired;

      return res.status(200).json({
        success: true,
        verified: true,
        credentialID: credentialID,
        credentialType: credential.credentialType,
        credentialName: credential.credentialName,
        issuerName: credential.issuerName || 'Unknown',
        holderID: credential.holderID,
        status: status,
        isValid: isValid,
        isRevoked: isRevoked,
        isExpired: isExpired,
        expiryDate: credential.expiryDate,
        verifiedAt: new Date().toISOString(),
        source: 'wallet_cache'
      });
    }

    console.log(`[VERIFY] Credential not in CouchDB, falling back...`);

    // ✅ STEP 2: If not found, return 404
    // (Future design: here is where a blockchain fallback can be added if needed.)
    return res.status(404).json({
      success: false,
      verified: false,
      message: 'Credential not found',
      credentialID: credentialID,
      verifiedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('[VERIFY ERROR]', error.message);

    // Generic server error handler
    return res.status(500).json({
      success: false,
      verified: false,
      message: 'Error verifying credential',
      credentialID: req.params.credentialID,
      error: error.message,
      verifiedAt: new Date().toISOString()
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
    console.log(`[VERIFY] Fetching verification statistics...`);

    // Create CouchDB client and select the admin wallet DB
    const adminCouch = nano(COUCHDB_URL);
    const userWalletDb = adminCouch.use('wallet_user_credentials');

    /*
    CouchDB Query

    Technical:
    - Simple Mango query selecting all documents where _id > null.
    - Effectively retrieves all credentials in the wallet_user_credentials DB.

    Tropang Ex:
    Parang sinasabi sa DB: "Bigyan mo ko ng lahat ng credentials na meron ka."
    */
    const result = await userWalletDb.find({
      selector: {
        _id: { $gt: null }
      }
    });

    const allCredentials = result.docs || [];

    // Compute stats based on status flags
    const stats = {
      total: allCredentials.length,
      active: allCredentials.filter(
        c => c.status === 'issued' || c.status === 'active'
      ).length,
      revoked: allCredentials.filter(
        c => c.status === 'revoked' || c.isRevoked
      ).length,
      expired: allCredentials.filter(
        c => c.expiryDate && new Date(c.expiryDate) < new Date()
      ).length,
      pending: allCredentials.filter(
        c => c.status === 'pending' || c.status === 'pending_blockchain'
      ).length
    };

    console.log(`[VERIFY] Stats calculated:`, stats);

    return res.status(200).json({
      success: true,
      stats: stats,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('[VERIFY ERROR]', error.message);

    return res.status(500).json({
      success: false,
      message: 'Error fetching verification statistics',
      error: error.message
    });
  }
};

/* Ito yung pinapagamit natin sa router. Kapag may tumawag ng /verify o stats endpoint, dito rin babagsak. */
module.exports = {
  verifyCredentialByID,
  getVerificationStats
};
