// controllers/issuerCredentialController.js

const nano = require('nano');

/**
* ✅ UNIFIED ENDPOINT: Creates credential in BOTH Blockchain AND CouchDB
* This is the main endpoint called from issuerDashboardPage.js
*/

exports.createCredential = async (req, res, getContractAndGateway) => {
  try {
    // ✅ Check authentication
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - No authentication token'
      });
    }

    // ✅ Extract from request body
    const { credentialType, credentialName, description, metadata } = req.body;

    // ✅ Validate required fields
    if (!credentialName || !credentialType) {
      return res.status(400).json({
        success: false,
        error: 'credentialName and credentialType are required'
      });
    }

    // ✅ Generate unique credential ID
    const credentialId = `cred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const issuerId = req.user.id;
    console.log(`\n📝 [CREDENTIAL] Starting creation for ID: ${credentialId}`);

    // =====================================================
    // STEP 1: RESOLVE ISSUER IDENTITY (for blockchain)
    // =====================================================

    let identityName, orgName, issuerDoc;
    const adminNano = nano('http://admin:adminpw@localhost:5985');
    const issuersDB = adminNano.use('issuers');

    try {
      issuerDoc = await issuersDB.get(issuerId);
    } catch (err) {
      if (err.statusCode === 404) {
        return res.status(404).json({
          success: false,
          error: 'Issuer profile not found'
        });
      }
      throw err;
    }

    if (!issuerDoc || !issuerDoc.fabricIdentity || !issuerDoc.orgName) {
      return res.status(403).json({
        success: false,
        error: 'Issuer not approved or Fabric identity missing'
      });
    }

    identityName = issuerDoc.fabricIdentity;
    
    // 🔥 CRITICAL FIX: Normalize orgName to lowercase with no spaces!
    orgName = issuerDoc.orgName.toLowerCase().replace(/\s+/g, '');
    
    console.log(` Identity: ${identityName}, Org: ${orgName} (normalized from: ${issuerDoc.orgName})`);

    // =====================================================
    // STEP 2: SAVE TO BLOCKCHAIN (First!)
    // =====================================================

    let blockchainCredential;
    try {
      console.log(`📡 [BLOCKCHAIN] Saving credential...`);

      // ✅ CRITICAL: getContractAndGateway must be passed from sdk-server-fixed.js
      if (!getContractAndGateway) {
        throw new Error('getContractAndGateway function not provided');
      }

      // ✅ PASS NORMALIZED ORGNAME to getContractAndGateway
      const { gateway, contract } = await getContractAndGateway(identityName, orgName);

      // Call blockchain chaincode - CreateCredentialTemplate
      const result = await contract.submitTransaction(
        'CreateCredentialTemplate',
        credentialId,
        issuerId,
        credentialType,
        credentialName,
        description || '',
        metadata ? JSON.stringify(metadata) : ''
      );

      blockchainCredential = JSON.parse(result.toString());
      console.log(`✅ [BLOCKCHAIN] Credential saved successfully`);
      await gateway.disconnect();

    } catch (blockchainError) {
      console.error(`❌ [BLOCKCHAIN] Error:`, blockchainError.message);
      console.error(`Stack:`, blockchainError.stack);
      return res.status(500).json({
        success: false,
        stage: 'blockchain',
        error: `Blockchain save failed: ${blockchainError.message}`,
        hint: 'Check if orgName matches your configured organization'
      });
    }

    // =====================================================
    // STEP 3: SAVE TO COUCHDB (Second!)
    // =====================================================

    let couchdbResult;
    try {
      console.log(`💾 [COUCHDB] Saving credential...`);

      if (!issuerDoc || !issuerDoc.couchDBUrl) {
        throw new Error('Issuer CouchDB URL not configured');
      }

      // Connect to issuer's CouchDB
      const issuerNano = nano(issuerDoc.couchDBUrl);
      const credentialsDB = issuerNano.use('wallet_issuer_credentials');

      // Create credential document
      const credentialDoc = {
        _id: credentialId, // ✅ CRITICAL: Match blockchain ID
        id: credentialId,
        issuerId: issuerId,
        credentialType: credentialType,
        credentialName: credentialName,
        description: description || '',
        metadata: metadata || {},
        status: 'active',
        isTemplate: true, // ← This is a template, not yet issued
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        blockchain: {
          saved: true,
          credentialData: blockchainCredential
        }
      };

      // Save to CouchDB
      couchdbResult = await credentialsDB.insert(credentialDoc);
      console.log(`✅ [COUCHDB] Credential saved successfully`);

    } catch (couchdbError) {
      console.error(`❌ [COUCHDB] Error:`, couchdbError.message);
      // ⚠️ BLOCKCHAIN succeeded but COUCHDB failed
      // This is a partial success - user needs to know
      return res.status(201).json({
        success: false,
        stage: 'couchdb',
        warning: 'Credential saved to blockchain but failed to save to CouchDB',
        error: couchdbError.message,
        credentialId: credentialId,
        blockchain: {
          saved: true,
          credential: blockchainCredential
        },
        couchdb: {
          saved: false,
          error: couchdbError.message
        }
      });
    }

    // =====================================================
    // ✅ SUCCESS: Both blockchain AND CouchDB saved!
    // =====================================================

    console.log(`\n✅ [COMPLETE] Credential created successfully in both systems\n`);

    return res.status(201).json({
      success: true,
      message: 'Credential created successfully in both blockchain and CouchDB',
      credentialId: credentialId,
      data: {
        id: credentialId,
        credentialType: credentialType,
        credentialName: credentialName,
        description: description || '',
        issuerId: issuerId,
        status: 'active',
        isTemplate: true,
        createdAt: new Date().toISOString()
      },
      blockchain: {
        saved: true,
        credential: blockchainCredential
      },
      couchdb: {
        saved: true,
        docId: couchdbResult.id,
        docRev: couchdbResult.rev
      }
    });

  } catch (error) {
    console.error('\n❌ [ERROR] Credential creation failed:', error.message);
    console.error('Stack:', error.stack);
    return res.status(500).json({
      success: false,
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
* ✅ Get all credentials for an issuer from CouchDB
*/

exports.getCredentials = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    const issuerId = req.user.id;

    // Get issuer's CouchDB connection
    const adminNano = nano('http://admin:adminpw@localhost:5985');
    const issuersDB = adminNano.use('issuers');

    let issuerDoc;
    try {
      issuerDoc = await issuersDB.get(issuerId);
    } catch (err) {
      if (err.statusCode === 404) {
        return res.status(404).json({
          success: false,
          error: 'Issuer not found'
        });
      }
      throw err;
    }

    if (!issuerDoc || !issuerDoc.couchDBUrl) {
      return res.status(403).json({
        success: false,
        error: 'Issuer CouchDB URL not configured'
      });
    }

    // Query credentials from CouchDB
    const issuerNano = nano(issuerDoc.couchDBUrl);
    const credentialsDB = issuerNano.use('wallet_issuer_credentials');

    // ✅ FIXED: Use .find() instead of .view() - more reliable
    const result = await credentialsDB.find({
      selector: {
        issuerId: issuerId
      }
    });

    return res.status(200).json({
      success: true,
      data: result.docs || [],
      count: (result.docs || []).length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching credentials:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = exports;
