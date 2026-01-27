// controllers/issuerCredentialController.js

const nano = require('nano');

/*
  FILE NAME: issuerCredentialController.js

  Technical:
  Controller for ISSUER Credential Template actions.
  Handles the unified flow for:
    - Creating a credential TEMPLATE on the blockchain (CreateCredentialTemplate)
    - Then saving a copy of that template into the issuer’s own CouchDB
      (wallet_issuer_credentials) for fast dashboard reads.

  Tropang Ex:
  Ito yung “Create Template” engine ni issuer.
  Kapag nag-create siya ng credential template:
    1) official save sa blockchain
    2) then copy save sa CouchDB ni issuer (pang mabilis sa UI)

  Where used:
  Usually tinatawag ito ng issuer dashboard routes (e.g., /issuer/credentials/create or similar),
  and the request is expected to be authenticated (req.user exists).

  Watch-out / Possible Redundancy:
  - This controller manually connects to admin CouchDB issuers DB to fetch issuerDoc.
    Similar logic exists in couchDB_service.js (getIssuerById, getIssuerByEmail, approveIssuer, etc.).
  - This is not wrong, but it’s “duplicate responsibility” compared to the service layer.
*/

// ==========================================================================================================================================================================
//                                                             CREDENTIAL TEMPLATE CREATION (BLOCKCHAIN + COUCHDB)
// ==========================================================================================================================================================================

/**
* ✅ UNIFIED ENDPOINT: Creates credential in BOTH Blockchain AND CouchDB
* This is the main endpoint called from issuerDashboardPage.js
*/

/*
  Function Name: createCredential

  Technical:
  Creates a credential TEMPLATE using a 2-phase write:
    Phase A: Save template to BLOCKCHAIN first (CreateCredentialTemplate chaincode call)
    Phase B: Save template copy to issuer’s CouchDB (wallet_issuer_credentials)

  Why this order:
  Blockchain is the “source of truth”, so blockchain write happens first.
  CouchDB is for fast reads/UI caching.

  Tropang Ex:
  Parang:
  “Una, official sa ledger (blockchain).”
  “Pangalawa, lagay ko rin sa personal DB ni issuer para mabilis sa dashboard.”

  Inputs / Parameters:
  - req.user.id
      → issuerId (who is creating the template; must be logged in as issuer)
  - req.body:
      credentialType, credentialName, description, metadata

  Output:
  - 201 success: both blockchain + couchdb saved
  - 201 partial: blockchain saved but couchdb failed (returns warning)
  - 401/403/404/500 for validation/authorization/system errors
*/
exports.createCredential = async (req, res, getContractAndGateway) => {
  try {
    /* Step 0: Check authentication

      Technical: Requires JWT middleware to populate req.user.
      Tropang Ex: Bawal gumawa ng template kung di ka logged in as issuer.
    */
    // ✅ Check authentication
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - No authentication token'
      });
    }

    /* Step 1: Extract request payload

      Tropang Ex: Kukunin natin yung fields na galing sa form/UI.
    */
    // ✅ Extract from request body
    const { credentialType, credentialName, description, metadata } = req.body;

    /* Step 2: Validate required fields

      Technical: credentialName + credentialType are required.
      Tropang Ex: Di pwede kulang yung basic details ng template.
    */
    // ✅ Validate required fields
    if (!credentialName || !credentialType) {
      return res.status(400).json({
        success: false,
        error: 'credentialName and credentialType are required'
      });
    }

    /* Step 3: Generate unique credential/template ID

      Technical:
      - Uses timestamp + random suffix.
      - This credentialId is used as:
          - blockchain template ID
          - CouchDB document _id (matched)
      Tropang Ex:
      Unique ID para walang magbabanggaan na templates.
    */
    // ✅ Generate unique credential ID
    const credentialId = `cred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const issuerId = req.user.id;
    console.log(`\n📝 [CREDENTIAL] Starting creation for ID: ${credentialId}`);

    // =====================================================
    // STEP 1: RESOLVE ISSUER IDENTITY (for blockchain)
    // =====================================================

    /*
      Step 4: Resolve issuer identity + org info (needed for blockchain signing)

      Technical:
      - Connect to ADMIN CouchDB (issuers DB)
      - Fetch issuerDoc using issuerId (req.user.id)
      - Validate issuer is approved:
          must have fabricIdentity + orgName
      - Normalize orgName for getContractAndGateway (critical fix)

      Tropang Ex:
      Kukunin natin yung “issuer profile” para malaman:
        - anong Fabric identity niya (pang sign ng blockchain tx)
        - anong org name niya (pang select ng network config)
        - at later: couchDBUrl niya (pang save sa DB)
    */
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

    /*
      Step 5: Save template to blockchain

      Technical:
      - Requires getContractAndGateway injected from sdk-server-fixed.js
      - Uses identityName + normalized orgName
      - Calls chaincode function: CreateCredentialTemplate
      - Parses blockchain result into JSON

      Tropang Ex:
      Ito yung official “ledger save”.
      Pag nag-fail dito, wala tayong template at all.
    */
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

      /* Step 5.1: Disconnect gateway

        Technical: close the live blockchain connection.
        Tropang Ex: cleanup para di mag-leak yung connections.
      */
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

    /*
      Step 6: Save template copy to issuer’s CouchDB

      Technical:
      - Requires issuerDoc.couchDBUrl
      - Connect to issuer CouchDB
      - Use DB: wallet_issuer_credentials
      - Insert document with _id EXACTLY = credentialId
        (so blockchain ID == couchDB doc ID)

      Tropang Ex:
      Ito yung “pang mabilis na copy” para dashboard.
      Kahit blockchain ang truth, CouchDB ang mabilis na pang display.
    */
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

      /* Step 6.1: Partial success handler

        Technical:
        - Blockchain already succeeded
        - CouchDB failed (network/db misconfig/etc.)
        - Returns 201 but success:false with warning payload

        Tropang Ex:
        “Okay sa blockchain, pero di napasok sa DB copy.”
        So UI should show warning and maybe retry syncing later.
      */
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

    /*
      Step 7: Return final success payload

      Tropang Ex:
      “All good na — nasa blockchain + nasa CouchDB cache.”
    */
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

    /* Step 8: Catch-all error handler

      Technical: unexpected errors not caught by blockchain/couchdb try-catches.
      Tropang Ex: last safety net.
    */
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

/*
  Function Name: getCredentials

  Technical:
  Fetches all credential TEMPLATE docs for the logged-in issuer from issuer’s CouchDB.
  Uses Mango .find() to filter by issuerId.

  Tropang Ex:
  Ito yung “list templates” ng issuer dashboard.
  Hindi blockchain query — CouchDB read lang para mabilis.

  Inputs / Parameters:
  - req.user.id → issuerId
  Output:
  - 200 success with data + count
  - 401 if not logged in
  - 403 if issuer has no couchDBUrl configured
*/
exports.getCredentials = async (req, res) => {
  try {

    /* Step 0: Check authentication */
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    /* Step 1: Resolve issuerId from token */
    const issuerId = req.user.id;

    /* Step 2: Get issuerDoc from ADMIN CouchDB (issuers DB)

      Technical:
      - Needed to retrieve issuerDoc.couchDBUrl
      Tropang Ex:
      Kailangan natin yung couchDBUrl para makakonek sa personal DB ni issuer.
    */
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

    /* Step 3: Validate issuer couchDBUrl exists */
    if (!issuerDoc || !issuerDoc.couchDBUrl) {
      return res.status(403).json({
        success: false,
        error: 'Issuer CouchDB URL not configured'
      });
    }

    /* Step 4: Connect to issuer CouchDB + select wallet_issuer_credentials

      Tropang Ex:
      Dito naka-save yung templates for dashboard reads.
    */
    // Query credentials from CouchDB
    const issuerNano = nano(issuerDoc.couchDBUrl);
    const credentialsDB = issuerNano.use('wallet_issuer_credentials');

    /* Step 5: Mango query docs by issuerId

      Technical: Uses .find() for reliability vs views.
      Tropang Ex: Kunin lahat ng templates na pag-aari ng issuer.
    */
    // ✅ FIXED: Use .find() instead of .view() - more reliable
    const result = await credentialsDB.find({
      selector: {
        issuerId: issuerId
      }
    });

    /* Step 6: Return results */
    return res.status(200).json({
      success: true,
      data: result.docs || [],
      count: (result.docs || []).length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {

    /* Step 7: Error handling */
    console.error('Error fetching credentials:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = exports;
