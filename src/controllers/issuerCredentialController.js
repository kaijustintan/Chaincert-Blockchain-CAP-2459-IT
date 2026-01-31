// ==========================================================================================================================================================================
//                                                                       issuerCredentialController.js
// ==========================================================================================================================================================================
const nano = require('nano');
const couchdbService = require('../../backend/couchDB_service');

                                          // PURO CREDENTIAL TEMPLATE LOGIC PA LANG LAMAN NITO, WALA PANG ISSUE CREDENTIAL 
/*
  FILE NAME: issuerCredentialController.js

  Technical:
  Controller for ISSUER Credential Template actions including:
      - Creating a credential TEMPLATE on the blockchain (CreateCredentialTemplate)
      - Then saving a copy of that template into the issuer’s own CouchDB
        (wallet_issuer_credentials) for fast dashboard reads.

  Where used:
  Usually tinatawag ito ng issuer dashboard routes (e.g., /issuer/credentials/create or similar),
  and the request is expected to be authenticated (req.user exists).
*/

// ==========================================================================================================================================================================
//                                                             CREDENTIAL TEMPLATE CREATION (BLOCKCHAIN + COUCHDB)
// ==========================================================================================================================================================================

/*
  Function Name: Create_CredentialTemplate | This is the main endpoint called from issuerDashboardPage.js

  Technical:
  Creates a credential TEMPLATE using a 2-phase write:
    Phase A: Save template to BLOCKCHAIN first (CreateCredentialTemplate chaincode call)
    Phase B: Save template copy to issuer’s CouchDB (wallet_issuer_credentials)

  Why this order:
  Blockchain is the “source of truth”, so blockchain write happens first.
  CouchDB is for fast reads/UI caching.

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
exports.Create_CredentialTemplate = async (req, res, getContractAndGateway) => {
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

      Technical: credentialName + credentialType are required fields.
      Tropang Ex: Di pwede kulang yung basic details ng template, otherwise application will fail 
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

      Tropang Ex:
      Kukunin natin yung “issuer profile” para malaman:
        - anong Fabric identity niya (pang sign ng blockchain tx)
        - anong org name niya (pang select ng network config)
        - at later: couchDBUrl niya (pang save sa DB)
    */

    // Connect to ADMIN CouchDB (issuers DB)
    let identityName, orgName, issuerDoc;
    const adminNano = nano('http://admin:adminpw@localhost:5985'); 
    const issuersDB = adminNano.use('issuers');

    // Fetch issuerDoc using issuerId (req.user.id)
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

    //  Validate issuer is approved: must have fabricIdentity + orgName
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
      - Uses DB: wallet_issuer_credentials
      - Inserts document with _id EXACTLY = credentialId
        (so blockchain ID == CouchDB doc ID)

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

      // CHANGES: Build credentialDoc here, but actual insert delegated to couchDB_service
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

      // CHANGES: Use centralized CouchDB service instead of manual nano + .use()
      couchdbResult = await couchdbService.save_CredentialTemplateToIssuerDB(
        issuerDoc,
        credentialDoc
      ); // CHANGES - unified DB access

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
// ==========================================================================================================================================================================

/*
  Function Name: issue_CredentialToUser

  Technical:
  Issues a credential INSTANCE based on an existing template by:
    - Resolving the issuer/admin Fabric identity
    - Calling chaincode IssueCredential on the blockchain
    - Then saving the issued credential copy to BOTH CouchDBs via service:
        * Issuer CouchDB: issued_credentials
        * Admin CouchDB: wallet_user_credentials

  Tropang Ex:
  Ito yung “Issue Credential” flow:
    1) Isusulat muna sa blockchain na na-issue na.
    2) Pag okay, gagawa ng kopya sa CouchDB ni issuer at sa main DB
       para mabilis lumabas sa dashboards.
*/
exports.issue_CredentialToUser = async (req, res, getContractAndGateway) => {
  try {
    /* Step 1: Extract credentialId from req.params and holderID/expiryDate from req.body.

      Tropang Ex:
      Kinukuha kung anong credential/template ID ang i-iissue at kanino mapupunta.
    */
    const { credentialId } = req.params;
    const { holderID, expiryDate } = req.body;

    /* Step 2: Validate required field: holderID */
    if (!holderID) {
      return res.status(400).json({
        success: false,
        error: 'holderID is required'
      });
    }

    /* Step 3: Check if user is authenticated (JWT/session) */
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    /* Step 4: Get Fabric identityName + orgName based on role (issuer/admin)

      Tropang Ex:
      Dito natin chine-check kung sino ang pipirma sa blockchain transaction.
    */
    let identityName;
    let orgName;
    let issuerDoc;

    if (user.role === 'issuer') {
      // 4A: Issuer → fetch approved issuerDoc via CouchDB service (by email)
      issuerDoc = await couchdbService.getApprovedIssuer(user.email);
      if (!issuerDoc || !issuerDoc.fabricIdentity || !issuerDoc.orgName) {
        return res.status(403).json({
          success: false,
          error: 'Issuer not approved or Fabric identity missing.'
        });
      }

      identityName = issuerDoc.fabricIdentity;
      orgName = issuerDoc.orgName;

    } else if (user.role === 'admin') {
      // 4B: Admin → use Org1 admin identity
      identityName = 'admin';
      orgName = 'Org1';

    } else {
      // 4C: Block other roles
      return res.status(403).json({
        success: false,
        error: 'Not authorized to issue credentials.'
      });
    }

    /* Step 5: Connect to blockchain as resolved identity/org */
    console.log(`[ISSUE] Issuing credential on blockchain...`);
    const { gateway, contract } = await getContractAndGateway(identityName, orgName);

    /* Step 6: Submit IssueCredential transaction to BLOCKCHAIN */
    const result = await contract.submitTransaction(
      'IssueCredential',
      credentialId,
      holderID,
      expiryDate || ''
    );

    /* Step 7: Parse blockchain response into JSON object */
    const credentialData = JSON.parse(result.toString());
    console.log(`✅ [ISSUE] Blockchain success. Credential ID: ${credentialData.id}`);

    /* Step 8: Disconnect Fabric gateway after blockchain transaction */
    await gateway.disconnect();

    /* Step 9: Save a copy of the issued credential to BOTH CouchDBs

      Technical:
      - Uses couchdbService.saveIssuedCredentialToBothDBs(issuerEmail, credentialDataExtended)

      Tropang Ex:
      After ma-issue sa blockchain, dito siya officially papasok sa:
        - issuer DB (issued_credentials)
        - admin DB (wallet_user_credentials)
    */
    try {
      console.log(`[ISSUE] Saving issued credential to BOTH CouchDB databases...`);

      const couchResult = await couchdbService.saveIssuedCredentialToBothDBs(user.email, {
        ...credentialData,
        holderID: holderID,
        expiryDate: expiryDate || null
      });

      console.log(`[ISSUE] ✅ CouchDB save successful:`, couchResult.message);

      /* Step 10: Return COMPLETE success response (blockchain + CouchDB ok) */
      return res.status(200).json({
        success: true,
        message: 'Credential issued successfully',
        credential: credentialData,
        couchDB: couchResult,
        timestamp: new Date().toISOString()
      });

    } catch (couchErr) {
      console.error(`[ISSUE] ⚠️ CouchDB save failed (non-fatal):`, couchErr.message);

      /* Step 10B: Return PARTIAL success (blockchain only, CouchDB sync failed) */
      return res.status(200).json({
        success: true,
        message: 'Credential issued to blockchain (CouchDB sync pending)',
        credential: credentialData,
        warning: couchErr.message,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('❌ [ISSUE] Error issuing credential:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
// ==========================================================================================================================================================================

/*
  Function Name: get_CredentialTemplatesByIssuerID

  Technical:
  Fetches all credential TEMPLATE docs for the logged-in issuer from issuer’s CouchDB.

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
/*
  Function Name: get_CredentialTemplatesByIssuerID

  Technical:
  Fetches all credential TEMPLATE / credential_instance docs for the logged-in issuer
  from the issuer’s CouchDB via couchDB_service helper.

  Tropang Ex:
  Ito yung “list templates/credentials” ng issuer dashboard.
  Hindi blockchain query — CouchDB read lang para mabilis.

  Inputs / Parameters:
  - req.user.id → issuerId
  Output:
  - 200 success with data + count
  - 401 if not logged in
  - 404/403 if issuer record / CouchDB URL is not properly configured (handled by service)
*/
exports.get_CredentialTemplatesByIssuerID = async (req, res) => {
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

    /*
      Step 2: Delegate CouchDB fetch to couchDB_service

      Technical:
      - Uses getIssuerCredentials(issuerId), which:
        * looks up issuer in ADMIN CouchDB (issuers DB)
        * checks issuer.couchDBUrl
        * connects to issuer’s CouchDB
        * queries wallet_issuer_credentials for type: 'credential_instance'
        * returns { issuerId, issuerName, email, credentialCount, credentials }

      Tropang Ex:
      Imbes na dito pa tayo mag-nano at mag-query,
      tatawag na lang tayo sa “service” na marunong na maghanap
      ng credentials ng issuer.
    */
    const result = await couchDB_service.getIssuerCredentials(issuerId);

    /*
      Step 3: Normalize empty result from service

      Note:
      - getIssuerCredentials() can return [] if no couchDBUrl.
      - To keep API response shape stable, handle that here.
    */
    if (!result || Array.isArray(result)) {
      // Soft-fallback: no credentials / no CouchDB URL configured
      return res.status(200).json({
        success: true,
        data: [],
        count: 0,
        timestamp: new Date().toISOString()
      });
    }

    /* Step 4: Return results in a simple list + count
       Tropang Ex:
       Ibinabalik sa frontend yung list ng credential docs at bilang nila.
    */
    return res.status(200).json({
      success: true,
      data: result.credentials || [],
      count: result.credentialCount || (result.credentials || []).length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {

    /* Step 5: Error handling */
    console.error('Error fetching credentials:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};


module.exports = exports;
