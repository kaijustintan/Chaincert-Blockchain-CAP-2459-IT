// verifierController.js - Handle all verification logic
const nano = require('nano');

const COUCHDB_URL = 'http://admin:adminpw@localhost:5985';

/**
 * Verify a credential by ID
 * - Queries CouchDB FIRST (faster)
 * - Falls back to blockchain if needed
 */
const verifyCredentialByID = async (req, res) => {
  try {
    const { credentialID } = req.params;

    if (!credentialID) {
      return res.status(400).json({
        success: false,
        message: 'Credential ID is required'
      });
    }

    console.log(`[VERIFY] Querying credential: ${credentialID}`);

    // ✅ STEP 1: Query CouchDB FIRST (faster, local check)
    console.log(`[VERIFY] Step 1: Checking CouchDB wallet...`);
    
    const adminCouch = nano(COUCHDB_URL);
    const userWalletDb = adminCouch.use('wallet_user_credentials');
    
    // Clean the credential ID (remove double prefix if exists)
    const cleanId = credentialID.replace(/^user_cred_/, '');
    const searchId = `user_cred_${cleanId}`;
    
    console.log(`[VERIFY] Searching CouchDB for: ${searchId}`);
    
    let couchResult;
    try {
      couchResult = await userWalletDb.find({
        selector: {
          _id: searchId
        },
        limit: 1
      });
    } catch (couchErr) {
      console.log(`[VERIFY] CouchDB query error (non-fatal):`, couchErr.message);
      couchResult = { docs: [] };
    }
    
    // If found in CouchDB, return it immediately
    if (couchResult.docs && couchResult.docs.length > 0) {
      const credential = couchResult.docs;
      console.log(`[VERIFY] ✅ Found in CouchDB wallet`);
      
      return res.status(200).json({
        success: true,
        verified: true,
        credentialID: credentialID,
        credentialType: credential.credentialType,
        credentialName: credential.credentialName,
        issuerName: credential.issuerName || 'Unknown',
        holderID: credential.holderID,
        status: credential.status || 'issued',
        isValid: (credential.status === 'issued' || credential.status === 'active') && !credential.isRevoked,
        isRevoked: credential.isRevoked || credential.status === 'revoked',
        isExpired: credential.expiryDate ? new Date(credential.expiryDate) < new Date() : false,
        expiryDate: credential.expiryDate,
        verifiedAt: new Date().toISOString(),
        source: 'wallet_cache'
      });
    }
    
    console.log(`[VERIFY] Credential not in CouchDB, falling back...`);

    // ✅ STEP 2: If not found, return 404
    return res.status(404).json({
      success: false,
      verified: false,
      message: 'Credential not found',
      credentialID: credentialID,
      verifiedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('[VERIFY ERROR]', error.message);

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
 * Get verification stats
 */
const getVerificationStats = async (req, res) => {
  try {
    console.log(`[VERIFY] Fetching verification statistics...`);
    
    const adminCouch = nano(COUCHDB_URL);
    const userWalletDb = adminCouch.use('wallet_user_credentials');
    
    const result = await userWalletDb.find({
      selector: {
        _id: { $gt: null }
      }
    });
    
    const allCredentials = result.docs || [];
    
    const stats = {
      total: allCredentials.length,
      active: allCredentials.filter(c => c.status === 'issued' || c.status === 'active').length,
      revoked: allCredentials.filter(c => c.status === 'revoked' || c.isRevoked).length,
      expired: allCredentials.filter(c => c.expiryDate && new Date(c.expiryDate) < new Date()).length,
      pending: allCredentials.filter(c => c.status === 'pending' || c.status === 'pending_blockchain').length
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

module.exports = {
  verifyCredentialByID,
  getVerificationStats
};
