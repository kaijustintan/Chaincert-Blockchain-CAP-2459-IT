// ==========================================================================================================================================================================
//                                                                       issuerCredentialController.js
// ==========================================================================================================================================================================

/* [ OUTLINE ]
  =====================================================================
  FILE: issuerCredentialController.js
  TECHNICAL: Express controller for issuer credential templates + issuance
  TROPA: “Backend worker” ng issuer dashboard.
  =====================================================================

  CATEGORY: CREDENTIAL TEMPLATE CREATION
  - Create_CredentialTemplate(req, res, getContractAndGateway)

  CATEGORY: CREDENTIAL ISSUANCE (INSTANCES)
  - Issue_Credential(req, res, getContractAndGateway)
*/

const nano = require('nano');
const couchdbService = require('../couchDB_service');  // UBUNTU DIRECTORY BASED

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
    const { credentialType, credentialName, description, metadata, skills, badgeImage } = req.body; // - polo

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
        metadata ? JSON.stringify(metadata) : '',
        skills && skills.length > 0 ? JSON.stringify(skills) : '[]'  // - polo
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

      const credentialDoc = {
        _id: credentialId,
        id: credentialId,
        issuerId: issuerId,
        credentialType: credentialType,
        credentialName: credentialName,
        description: description || '',
        metadata: metadata || {},
        skills: skills || [],           // - polo
        badgeImage: badgeImage || '',   // - polo (base64, CouchDB only)
        visibility: 'private',
        status: 'active',
        isTemplate: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        blockchain: {
          saved: true,
          credentialData: blockchainCredential
        }
      };

      // CHANGES: Use centralized CouchDB service instead of manual nano + .use()
      couchdbResult = await couchdbService.Create_CredentialTemplate_DB(
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
  Function Name: Issue_Credential (UPDATED)

  Technical:
  Issues a credential INSTANCE based on an existing template by:
    - Resolving the issuer/admin Fabric identity
    - Calling chaincode IssueCredential on the blockchain
    - Then saving the issued credential copy to BOTH CouchDBs via service:
        * Issuer CouchDB: issued_credentials
        * Admin CouchDB: wallet_user_credentials

  IMPORTANT UPDATE:
    ✅ Adds templateId into the issued credential payload so we can:
       - prevent duplicate issuance of same template to same user
       - filter eligible users dropdown based on templateId

  Tropang Ex:
  Ito yung “Issue Credential” flow:
    1) Isusulat muna sa blockchain na na-issue na.
    2) Pag okay, gagawa ng kopya sa CouchDB ni issuer at sa main DB
       para mabilis lumabas sa dashboards.
    3) Ngayon, kasama na si templateId para madaling ma-check kung na-issue na dati.
*/
exports.Issue_Credential = async (req, res, getContractAndGateway) => {
  try {

    /* Step 1: Extract template credentialId from params + issuance details from body

      Technical:
      - credentialId = template ID (blockchain key of template)
      - holderID = user/student recipient
      - expiryDate = optional

      Tropang Ex:
      Kinukuha kung anong template ang i-iissue at kanino mapupunta.
    */
    const { credentialId } = req.params;
    const { holderID, expiryDate } = req.body;

    /* Step 2: Validate required field: holderID

      Tropang Ex:
      Di pwedeng mag-issue kung di natin alam kung sino tatanggap.
    */
    if (!holderID) {
      return res.status(400).json({
        success: false,
        error: 'holderID is required'
      });
    }

    /* Step 3: Check if user is authenticated (JWT middleware attaches req.user)

      Tropang Ex:
      Dapat naka-login ka bago ka makapag issue.
    */
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    /* Step 4: Get Fabric identityName + orgName based on role (issuer/admin)

      Technical:
      Dito natin chine-check kung sino ang pipirma sa blockchain transaction.
      - issuer: use their Fabric identity + their orgName
      - admin: use Org1 admin

      Tropang Ex:
      Parang pipirma ka sa papel:
      - issuer pipirma as themselves
      - admin pipirma as admin
    */
    let identityName;
    let orgName;
    let issuerDoc;

    if (user.role === 'issuer') {
      /* Step 4A: Issuer → fetch approved issuer doc via CouchDB service (by email)

        Tropang Ex:
        Chine-check natin kung approved talaga si issuer at meron siyang Fabric identity.
      */
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
      /* Step 4B: Admin → use Org1 admin identity

        Tropang Ex:
        Admin always signs using Org1 admin wallet identity.
      */
      identityName = 'admin';
      orgName = 'Org1';

    } else {
      /* Step 4C: Block other roles

        Tropang Ex:
        Verifier/student/etc bawal mag-issue.
      */
      return res.status(403).json({
        success: false,
        error: 'Not authorized to issue credentials.'
      });
    }

    /* Step 5: Connect to blockchain as resolved identity/org

      Tropang Ex:
      Kumokonek tayo sa Fabric gamit yung tamang signer.
    */
    console.log(`[ISSUE] Issuing credential on blockchain...`);
    const { gateway, contract } = await getContractAndGateway(identityName, orgName);

    /* Step 6: Submit IssueCredential transaction to BLOCKCHAIN

      Technical:
      Chaincode: IssueCredential(templateId, holderID, expiryDate)

      Tropang Ex:
      Ito yung official "issue" sa ledger — once written, permanent record na siya.
    */
    const result = await contract.submitTransaction(
      'IssueCredential',
      credentialId,
      holderID,
      expiryDate || ''
    );

    /* Step 7: Parse blockchain response into JSON object

      Tropang Ex:
      Ibinabalik ni chaincode yung issued credential object.
    */
    const credentialData = JSON.parse(result.toString());
    console.log(`✅ [ISSUE] Blockchain success. Credential ID: ${credentialData.id}`);

    /* Step 8: Disconnect Fabric gateway after blockchain transaction

      Tropang Ex:
      After transaction, disconnect na para clean.
    */
    await gateway.disconnect();

    /* Step 9: Save a copy of the issued credential to BOTH CouchDBs

      Technical:
      Issue_Credential_DB(issuerEmail, credentialDataExtended)

      Tropang Ex:
      After blockchain, gumawa tayo ng fast-copy sa databases for dashboards + verification.
    */
    try {
      console.log(`[ISSUE] Saving issued credential to BOTH CouchDB databases...`);

      /* Step 9A: Optional enrichment (badgeImage + skills) from issuer template cache
         Technical:
         These fields may not exist in blockchain, so we pull from issuer CouchDB template doc.

         Tropang Ex:
         Kumuha tayo ng extra fields pang display (badge image, skills list).
      */
      let templateBadgeImage = '';
      let templateSkills = [];

      try {
        const nano = require('nano');
        const approvedIssuer = await couchdbService.getApprovedIssuer(user.email);

        if (approvedIssuer && approvedIssuer.couchDBUrl) {
          const issuerCouch = nano(approvedIssuer.couchDBUrl);
          const issuerWalletDb = issuerCouch.use('wallet_issuer_credentials');
          const templateDoc = await issuerWalletDb.get(credentialId);

          templateBadgeImage = templateDoc.badgeImage || '';
          templateSkills = templateDoc.skills || [];
        }
      } catch (tErr) {
        console.warn('[ISSUE] Could not fetch template for badgeImage/skills:', tErr.message);
      }

      /* Step 9A.5: Fetch holder info snapshot for CouchDB display (NEW)
         Technical:
         Pulls holder name/email from users DB so dashboards can display the name easily.
         NOTE: This is stored in CouchDB only; blockchain stays holderID-only.

         Tropang Ex:
         Para hindi puro holderID lang makikita sa dashboards, kukunin natin name/email ni holder.
      */
      let holderName = '';
      let holderEmail = '';

      try {
        const holderDoc = await couchdbService.getUser(holderID);

        if (holderDoc) {
          holderEmail = holderDoc.email || '';

          const fullName = `${holderDoc.firstName || ''} ${holderDoc.lastName || ''}`.trim();
          holderName =
            holderDoc.name ||
            fullName ||
            holderDoc.username ||
            holderDoc.email ||
            holderID;
        } else {
          holderName = holderID;
        }
      } catch (hErr) {
        console.warn('[ISSUE] Could not fetch holder info for holderName snapshot:', hErr.message);
        holderName = holderID;
      }

      /* Step 9B: Build extended credential payload for CouchDB

         Updates:
         ✅ Ensure templateId is included (duplicate prevention)
         ✅ Add holderName + holderEmail snapshot (CouchDB display)

         Tropang Ex:
         Dinadagdagan natin ng templateId + holderName para mas madali sa UI.
      */
      const credentialDataExtended = {
        ...credentialData,
        templateId: credentialId,
        holderID: holderID,
        holderName: holderName,     // ✅ NEW
        holderEmail: holderEmail,   // ✅ OPTIONAL
        expiryDate: expiryDate || null,
        badgeImage: templateBadgeImage,
        skills: (credentialData.skills?.length > 0) ? credentialData.skills : templateSkills
      };

      const couchResult = await couchdbService.Issue_Credential_DB(
        user.email,
        credentialDataExtended
      );

      console.log(`[ISSUE] ✅ CouchDB save successful:`, couchResult.message);

      try {
        await couchdbService.Create_CredentialNotification(holderID, {
          credentialId: credentialDataExtended.id || credentialDataExtended.blockchainId,
          credentialName: credentialDataExtended.credentialName || credentialDataExtended.credentialType,
          issuerId: credentialDataExtended.issuerID || user.id || null,
          issuerName: credentialDataExtended.issuerName || issuerDoc?.orgName || user.orgName || user.email || 'Issuer',
          issuerEmail: user.email || null,
          message: `A new credential (${credentialDataExtended.credentialName || credentialDataExtended.credentialType || 'Credential'}) has been issued to you.`
        });
      } catch (notificationError) {
        console.warn('[ISSUE] Notification creation failed after credential save:', notificationError.message);
      }

      /* Step 10: Return COMPLETE success response (blockchain + CouchDB ok) */
      return res.status(200).json({
        success: true,
        message: 'Credential issued successfully',
        credential: credentialDataExtended,
        couchDB: couchResult,
        timestamp: new Date().toISOString()
      });

    } catch (couchErr) {
      console.error(`[ISSUE] ⚠️ CouchDB save failed (non-fatal):`, couchErr.message);

      /* Step 10B: Return PARTIAL success (blockchain only, CouchDB sync failed) */
      return res.status(200).json({
        success: true,
        message: 'Credential issued to blockchain (CouchDB sync pending)',
        credential: {
          ...credentialData,
          templateId: credentialId,
          holderID: holderID,
          expiryDate: expiryDate || null
        },
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
    const result = await couchdbService.getIssuerCredentials(issuerId);

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

/*
  Function Name: get_IssuerIssuedCredentials

  Technical:
  Fetches ISSUED credentials for the logged-in issuer directly from the issuer's CouchDB
  database: issued_credentials.

  Tropang Ex:
  Para sa Issuer Dashboard — mabilis, kumpleto (may holderName/holderEmail/badgeImage),
  at hindi na kailangan mag-query sa blockchain.
*/
exports.get_IssuerIssuedCredentials = async (req, res) => {
  try {

    /* Step 0: Auth check (JWT middleware) */
    if (!req.user || !req.user.id || !req.user.email) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized.'
      });
    }

    /* Step 1: Role restriction */
    if (req.user.role !== 'issuer' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized.'
      });
    }

    /* Step 2: Resolve issuer CouchDB URL
       Technical:
       - Issuer: uses their own email to fetch approved issuer doc.
       - Admin: (optional) you can later pass issuerId in query to target a specific issuer.
         For now: admin will also resolve using their email if they are in issuers DB.
    */
    const issuerDoc = await couchdbService.getApprovedIssuer(req.user.email);

    if (!issuerDoc || !issuerDoc.couchDBUrl) {
      return res.status(403).json({
        success: false,
        message: 'Issuer not approved or CouchDB URL missing.'
      });
    }

    /* Step 3: Connect to issuer CouchDB and query issued_credentials */
    const nano = require('nano');
    const issuerNano = nano(issuerDoc.couchDBUrl);
    const issuedDb = issuerNano.use('issued_credentials');

    /* Step 4: Fetch all docs (include_docs) */
    const result = await issuedDb.list({ include_docs: true });

    /* Step 5: Extract + safety filter */
    const credentials = (result.rows || [])
      .map(r => r.doc)
      .filter(doc => doc && doc.type === 'credential_instance');

    /* Step 6: Return */
    return res.status(200).json({
      success: true,
      credentials,
      count: credentials.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [ISSUED COUCHDB] Error fetching issued credentials:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch issued credentials.',
      error: error.message
    });
  }
};
// ==========================================================================================================================================================================

// ==========================================================================================================================================================================
//                                                  CHECK TEMPLATE EXISTENCE (COUCHDB ONLY)
// ==========================================================================================================================================================================

/*
  Function Name: check_IssuerHasTemplates

  Technical:
  Checks if the logged-in issuer has at least one credential template
  inside their own CouchDB (wallet_issuer_credentials).

  Uses:
    couchDB_service.checkIssuerHasCredentialTemplates(issuerId)

  Tropang Ex:
  Pang-check bago payagan mag “+ Issue Credential”.
  Kapag zero templates, bawal muna mag-issue.
*/
exports.check_IssuerHasTemplates = async (req, res) => {
  try {

    // Step 0: Authentication check
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const issuerId = req.user.id;

    // Step 1: Call CouchDB service
    const result = await couchdbService.checkIssuerHasCredentialTemplates(issuerId);

    return res.status(200).json({
      success: true,
      hasTemplates: result.hasTemplates,
      count: result.count
    });

  } catch (error) {
    console.error('Error checking issuer template existence:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
// ==========================================================================================================================================================================

// ==========================================================================================================================================================================
//                                                             GET ISSUER CREDENTIALS HISTORY (BLOCKCHAIN AUDIT TRAIL)
// ==========================================================================================================================================================================

/*
  Function Name: Get_CredentialHistory

  Technical:
  Retrieves the complete audit trail of ALL credentials for the logged-in issuer:
    1. Resolves issuer's Fabric identity + org from CouchDB
    2. Calls blockchain chaincode: Get_IssuerCredentialsHistory
    3. Flattens all history entries into a single array
    4. Sorts by timestamp (most recent first)
    5. Enriches history entries with holderName (prefers wallet_user_credentials snapshot, fallback to users DB)
    6. Optionally filters by credentialId (if search query provided)
    7. Returns formatted history for audit dashboard

  Tropang Ex:
  Ito yung "buong timeline ng lahat ng nangyari sa credentials ng issuer" —
  whether template creation, credential issuance, revocation, etc.
  Perfect for compliance audit at blockchain transparency.

  Inputs / Parameters:
  - req.user.id → issuerId
  - req.query.credentialId (optional) → filter by specific credential ID

  Output:
  - 200 success with sorted/filtered history array
  - 401 if not logged in
  - 403 if issuer not approved
  - 404 if issuer profile not found
  - 500 for blockchain/system errors
*/
exports.Get_CredentialHistory = async (req, res, getContractAndGateway) => {
  try {

    /* Step 0: Check authentication
       Technical: Requires JWT middleware to populate req.user.
       Tropang Ex: Bawal kumuha ng history kung di ka logged in as issuer.
    */
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - No authentication token'
      });
    }

    const issuerId = req.user.id;
    const { credentialId } = req.query; // Optional search filter

    console.log(`\n📊 [HISTORY] Fetching credential history for issuer: ${issuerId}`);
    if (credentialId) {
      console.log(`🔍 [HISTORY] Search filter applied: ${credentialId}`);
    }

    // =====================================================
    // STEP 1: RESOLVE ISSUER IDENTITY (for blockchain)
    // =====================================================

    /* Step 1: Resolve issuer identity + org info
       Tropang Ex:
       Kukunin natin yung issuer profile para malaman:
         - fabricIdentity (pang sign ng blockchain query)
         - orgName (pang select ng network config)
    */
    let identityName, orgName, issuerDoc;
    const adminNano = nano('http://admin:adminpw@localhost:5985');
    const issuersDB = adminNano.use('issuers');

    // Fetch issuerDoc using issuerId
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

    // Validate issuer is approved: must have fabricIdentity + orgName
    if (!issuerDoc || !issuerDoc.fabricIdentity || !issuerDoc.orgName) {
      return res.status(403).json({
        success: false,
        error: 'Issuer not approved or Fabric identity missing'
      });
    }

    identityName = issuerDoc.fabricIdentity;

    // 🔥 CRITICAL: Normalize orgName to lowercase with no spaces
    orgName = issuerDoc.orgName.toLowerCase().replace(/\s+/g, '');

    console.log(`✅ [HISTORY] Identity: ${identityName}, Org: ${orgName}`);

    // =====================================================
    // STEP 2: QUERY BLOCKCHAIN FOR HISTORY
    // =====================================================

    /* Step 2: Query blockchain for complete history
       Technical:
       - Calls Get_IssuerCredentialsHistory chaincode function
       - Returns array of credentials with their full history
       - Uses evaluateTransaction (read-only, no state change)

       Tropang Ex:
       Ito yung pag-kuha ng raw data galing sa blockchain.
    */
    let rawHistory;
    try {
      console.log(`📡 [HISTORY] Querying blockchain...`);

      if (!getContractAndGateway) {
        throw new Error('getContractAndGateway function not provided');
      }

      const { gateway, contract } = await getContractAndGateway(identityName, orgName);

      const result = await contract.evaluateTransaction(
        'Get_IssuerCredentialsHistory',
        issuerId
      );

      rawHistory = JSON.parse(result.toString());
      console.log(`✅ [HISTORY] Blockchain query successful. Found ${rawHistory.length} credentials.`);

      await gateway.disconnect();

    } catch (blockchainError) {
      console.error(`❌ [HISTORY] Blockchain error:`, blockchainError.message);
      return res.status(500).json({
        success: false,
        stage: 'blockchain',
        error: `Failed to fetch history from blockchain: ${blockchainError.message}`
      });
    }

    // =====================================================
    // STEP 3: FLATTEN & SORT HISTORY ENTRIES
    // =====================================================

    /* Step 3: Flatten all history entries into single array
       Technical:
       - Each credential has a history array
       - We want ALL history entries in ONE flat array
       - Attach credential metadata to each entry
       - Sort by timestamp (most recent first)

       Tropang Ex:
       Imbes na grouped by credential, gusto natin isang timeline
       ng LAHAT ng nangyari sorted by date.
    */
    console.log(`🔄 [HISTORY] Flattening and sorting history entries...`);

    const allHistoryEntries = [];

    (rawHistory || []).forEach(credential => {
      (credential.history || []).forEach(historyEntry => {
        allHistoryEntries.push({
          // Credential metadata
          credentialId: credential.credentialId,
          credentialName: credential.credentialName,
          credentialType: credential.credentialType,
          isTemplate: credential.isTemplate,
          currentStatus: credential.currentStatus,

          // History entry details
          txId: historyEntry.txId,
          timestamp: historyEntry.timestamp,
          isDelete: historyEntry.isDelete,
          value: historyEntry.value
        });
      });
    });

    // Sort by timestamp (most recent first)
    allHistoryEntries.sort((a, b) =>
      new Date(b.timestamp) - new Date(a.timestamp)
    );

    console.log(`✅ [HISTORY] Flattened ${allHistoryEntries.length} total history entries.`);

    // =====================================================
    // STEP 3.5: ENRICH WITH HOLDER NAME (Prefer wallet_user_credentials snapshot)
    // =====================================================

    /*
      NEW Step: Resolve holderName for each distinct holderID.

      Priority:
      1) wallet_user_credentials (snapshot holderName from issuance) ✅ most consistent
      2) users DB via couchdbService.getUser(hid) (fallback)
      3) fallback to holderID

      Tropang Ex:
      Para consistent yung "Holder Name" sa history:
      - Kung may snapshot sa wallet DB, yun ang gamitin.
      - Kung wala (old records), fallback sa users DB.
    */
    try {
      const adminNano2 = nano('http://admin:adminpw@localhost:5985');
      const walletDb = adminNano2.use('wallet_user_credentials');

      // Collect unique holderIDs
      const holderIdSet = new Set();
      allHistoryEntries.forEach((entry) => {
        const hid = entry?.value?.holderID;
        if (hid) holderIdSet.add(hid);
      });

      const holderIdArray = Array.from(holderIdSet);
      const holderNameCache = {};

      for (const hid of holderIdArray) {
        try {
          // 1) Prefer wallet snapshot (any doc for this holder with holderName)
          let snapshotName = null;

          try {
            const snap = await walletDb.find({
              selector: {
                holderID: hid,
                holderName: { "$exists": true }
              },
              fields: ["holderName", "holderEmail"],
              limit: 1
            });

            if (snap?.docs?.length > 0) {
              snapshotName = snap.docs[0].holderName || null;
            }
          } catch (snapErr) {
            // Non-fatal; fallback to users DB
            console.warn('[HISTORY] Wallet snapshot lookup failed for', hid, snapErr.message);
          }

          if (snapshotName) {
            holderNameCache[hid] = snapshotName;
            continue;
          }

          // 2) Fallback: users DB lookup
          const userDoc = await couchdbService.getUser(hid);

          const name =
            userDoc?.fullName ||
            userDoc?.name ||
            [userDoc?.firstName, userDoc?.lastName].filter(Boolean).join(' ') ||
            userDoc?.username ||
            userDoc?.email ||
            hid;

          holderNameCache[hid] = name;

        } catch (e) {
          console.error('[HISTORY] Failed to resolve holder name for', hid, e.message);
          holderNameCache[hid] = hid; // final fallback
        }
      }

      // Attach holderName to each history entry
      allHistoryEntries.forEach((entry) => {
        const hid = entry?.value?.holderID;
        entry.holderName = hid ? (holderNameCache[hid] || null) : null;
      });

      console.log(
        `✅ [HISTORY] Enriched history entries with holderName for ${holderIdArray.length} unique holders.`
      );

    } catch (enrichErr) {
      console.error('⚠️ [HISTORY] Error enriching holder names:', enrichErr.message);
      // Non-fatal: continue without holderName if something fails
    }

    // =====================================================
    // STEP 4: OPTIONAL FILTER BY CREDENTIAL ID
    // =====================================================

    /* Step 4: Filter by credentialId if search query provided
       Technical:
       - If req.query.credentialId exists, filter entries
       - Uses .includes() to support partial matches

       Tropang Ex:
       Kung nag-search yung user ng specific credential ID,
       ipapakita lang yung history ng credential na yun.
    */
    let filteredHistory = allHistoryEntries;

    if (credentialId) {
      filteredHistory = allHistoryEntries.filter(
        entry => (entry.credentialId || '').includes(credentialId)
      );
      console.log(`🔍 [HISTORY] Filtered to ${filteredHistory.length} entries matching: ${credentialId}`);
    }

    // =====================================================
    // ✅ SUCCESS: Return sorted (and optionally filtered) history
    // =====================================================

    /* Step 5: Return final response
       Tropang Ex:
       Ibinabalik na yung sorted history, ready for display sa UI.
    */
    console.log(`✅ [HISTORY] Returning ${filteredHistory.length} history entries.\n`);

    return res.status(200).json({
      success: true,
      data: filteredHistory,
      count: filteredHistory.length,
      isFiltered: !!credentialId,
      filter: credentialId || null,
      timestamp: new Date().toISOString()
    });

  } catch (error) {

    /* Step 6: Catch-all error handler
       Tropang Ex: Safety net para sa unexpected errors.
    */
    console.error('\n❌ [HISTORY] Error fetching credential history:', error.message);
    console.error('Stack:', error.stack);

    return res.status(500).json({
      success: false,
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
// ==========================================================================================================================================================================

// ==========================================================================================================================================================================
//                                                          CREDENTIAL REVOCATION (BLOCKCHAIN + COUCHDB)
// ==========================================================================================================================================================================

/*
  Function Name: revoke_Credential

  Technical:
  Revokes a credential INSTANCE by:
    - Resolving the issuer/admin Fabric identity
    - Calling chaincode RevokeCredential on the blockchain
    - Then marking the credential as revoked in BOTH CouchDB copies via service:
        * Issuer CouchDB: issued_credentials
        * Admin CouchDB: wallet_user_credentials

  Tropang Ex:
  Ito yung "Revoke Credential" flow:
    1) Ia-update muna sa blockchain na revoked na yung credential.
    2) Pag okay, ia-update yung kopya sa CouchDB ni issuer at sa main DB
       para tama ang status sa dashboards at verification.
*/
exports.revoke_Credential = async (req, res, getContractAndGateway) => {
  try {
    /* Step 1: Extract credentialId from req.params

       Tropang Ex:
       Ito yung blockchain credential ID na ginamit din sa IssueCredential,
       e.g. "cred_1770....holder....timestamp".
    */
    const { credentialId } = req.params;
    const { rejectionReason } = req.body; // - polo
    if (!credentialId) {
      return res.status(400).json({
        success: false,
        error: 'credentialId (blockchain ID) is required'
      });
    }

    /* Step 2: Check if user is authenticated (JWT/session) */
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    /* Step 3: Get Fabric identityName + orgName based on role (issuer/admin)

       Tropang Ex:
       Dito natin chine-check kung sino ang pipirma sa blockchain transaction.
    */
    let identityName;
    let orgName;
    let issuerDoc;

    if (user.role === 'issuer') {
      // Issuer → fetch approved issuerDoc via CouchDB service (by email)
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
      // Admin → use Org1 admin identity (same pattern as issue)
      identityName = 'admin';
      orgName = 'Org1';

    } else {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to revoke credentials.'
      });
    }

    /* Step 4: Connect to blockchain as resolved identity/org */
    console.log(`[REVOKE] Revoking credential on blockchain...`);
    const { gateway, contract } = await getContractAndGateway(identityName, orgName);

    /* Step 5: Submit RevokeCredential transaction to BLOCKCHAIN

       Technical:
       Uses blockchain ID only (no CouchDB prefixes).
    */
    const result = await contract.submitTransaction(
      'RevokeCredential',
      credentialId,
      rejectionReason || '' // - polo
    );

    const revokedCredential = JSON.parse(result.toString());
    console.log(`✅ [REVOKE] Blockchain success. Credential ID: ${revokedCredential.id}`);

    /* Step 6: Disconnect Fabric gateway after blockchain transaction */
    await gateway.disconnect();

    /* Step 7: Sync revocation to CouchDB copies

       Technical:
       - Uses couchdbService.Revoke_Credential_DB(blockchainId, issuerEmail)
       - blockchainId = revokedCredential.id (same as credentialId)
       - issuerEmail = user.email (current issuer/admin actor)
    */
    try {
      console.log(`[REVOKE] Updating CouchDB copies (issuer + admin)...`);

      const couchResult = await couchdbService.Revoke_Credential_DB(
        revokedCredential.id,   // blockchainId (cred_...)
        user.email,             // issuerEmail
        rejectionReason || ''        // - polo
      );

      console.log(`[REVOKE] ✅ CouchDB revoke successful`);

      // In-app revocation notification to holder
      try {
        await couchdbService.Create_CredentialNotification(revokedCredential.holderID, {
          credentialId: revokedCredential.id,
          credentialName: revokedCredential.credentialName || revokedCredential.credentialType,
          issuerId: user.id || null,
          issuerName: issuerDoc?.orgName || user.email || 'Issuer',
          issuerEmail: user.email || null,
          message: `Your credential "${revokedCredential.credentialName || revokedCredential.credentialType}" has been revoked${rejectionReason ? `: ${rejectionReason}` : '.'}`,
          notificationType: 'credential_revoked'
        });
        console.log('[REVOKE] ✅ Revocation notification sent to holder:', revokedCredential.holderID);
      } catch (notifErr) {
        console.warn('[REVOKE] Notification failed (non-fatal):', notifErr.message);
      }

      /* Step 8: Return COMPLETE success response (blockchain + CouchDB ok) */
      return res.status(200).json({
        success: true,
        message: 'Credential revoked successfully (blockchain + CouchDB)',
        credential: revokedCredential,
        couchDB: couchResult,
        timestamp: new Date().toISOString()
      });

    } catch (couchErr) {
      console.error(`[REVOKE] ⚠️ CouchDB revoke failed (non-fatal):`, couchErr.message);

      /* Step 8B: Return PARTIAL success (blockchain only, CouchDB sync failed) */
      return res.status(200).json({
        success: true,
        message: 'Credential revoked on blockchain (CouchDB sync failed)',
        credential: revokedCredential,
        warning: couchErr.message,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('❌ [REVOKE] Error revoking credential:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// =========================================================================================================
// ISSUER: GET ELIGIBLE USERS FOR A TEMPLATE (PREVENT DUPLICATE ISSUANCE)
// =========================================================================================================

/*
  Function Name: getEligibleUsersForTemplate

  Technical:
  Returns a filtered list of NON-ADMIN users that are eligible to receive
  a credential instance for a given templateId.

  Eligibility rule:
    ✅ Allowed if user DOES NOT have an active (non-expired, non-revoked) instance of the same template
    ✅ Allowed if user has an instance but it's EXPIRED
    ✅ Allowed if user has an instance but it's REVOKED
    ❌ Blocked if user already has a STILL-VALID instance of that template

  Data sources:
    - users DB (users list): couchdbService.getAllUsers()
    - admin wallet DB (issued creds registry): couchdbService.getBlockedHolderIDsByTemplate(templateId)

  Tropang Ex:
  Pag pumili si issuer ng template sa dropdown,
  dito natin kukunin yung list of users na pwede bigyan.
  Yung mga meron pang active copy ng same template, di na lalabas sa dropdown.
*/
exports.getEligibleUsersForTemplate = async (req, res) => {
  try {

    /* Step 1: Extract templateId from params */
    const { templateId } = req.params;

    if (!templateId) {
      return res.status(400).json({
        success: false,
        message: 'templateId is required.'
      });
    }

    /* Step 2: Ensure requester is authenticated */
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized.'
      });
    }

    /* Step 3: Restrict access */
    if (user.role !== 'issuer' && user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized.'
      });
    }

    /* Step 4: Fetch all users (raw) */
    const allUsersRaw = await couchdbService.getAllUsers();

    /* Step 5: Get blocked holderIDs (duplicate prevention logic) */
    const blockedHolderIDs = await couchdbService.getBlockedHolderIDsByTemplate(templateId);
    const blockedSet = new Set(blockedHolderIDs);

    /* Step 6: Apply ALL eligibility filters

       Filters:
       - exclude design docs
       - exclude admin role
       - exclude disabled users (isActive === false)
       - exclude blocked users (duplicate active credential)
    */
    const eligibleUsers = (allUsersRaw || [])
      .filter(u => u && !String(u._id || '').startsWith('_design'))
      .filter(u => String(u.role || '').toLowerCase() !== 'admin')
      .filter(u => u.isActive !== false) // ✅ NEW: prevent issuing to disabled users
      .filter(u => {
        const uid = u._id || u.id;
        return uid && !blockedSet.has(uid);
      });

    /* Step 7: Sanitize output */
    const safeEligibleUsers = eligibleUsers.map(u => ({
      _id: u._id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      name: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim(),
      role: u.role,
      status: u.status,
      isActive: u.isActive
    }));

    /* Step 8: Return response */
    return res.status(200).json({
      success: true,
      templateId: templateId,
      totalUsers: (allUsersRaw || []).length,
      blockedCount: blockedHolderIDs.length,
      eligibleCount: safeEligibleUsers.length,
      eligibleUsers: safeEligibleUsers
    });

  } catch (error) {
    console.error('❌ [ELIGIBLE USERS] Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch eligible users.',
      error: error.message
    });
  }
};

// =========================================================================================================
// ISSUER: GET CREDENTIAL TEMPLATES (FROM COUCHDB)
// =========================================================================================================

/*
  Function Name: getCredentialTemplates

  Technical:
  Returns all TEMPLATE credentials (isTemplate: true) for the current issuer/admin
  from CouchDB for fast operational dashboard reads.

  Tropang Ex:
  Ito yung list ng “blueprints” ni issuer (diploma/cert designs).
  Controller na bahala sa issuer resolution + CouchDB query.
*/
exports.getCredentialTemplates = async (req, res, getContractAndGateway) => {
  try {

    /* Step 1: Check if user is authenticated (JWT middleware attaches req.user)

      Tropang Ex:
      Kailangan naka-login ka bago ka makakita ng templates.
    */
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    /* Step 2: Resolve target issuer ID

      Tropang Ex:
      Sino yung issuer na kukunan ng templates?
      - Issuer: sarili niya (req.user.id)
      - Admin: pwede mag-target via req.params.issuerId fallback sa req.user.id
    */
    if (user.role !== 'issuer' && user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view templates.'
      });
    }

    const issuerIdToQuery = user.role === 'issuer'
      ? user.id
      : (req.params?.issuerId || req.user?.id);

    if (!issuerIdToQuery) {
      return res.status(400).json({
        success: false,
        error: 'issuerId is required.'
      });
    }

    /* Step 3: Query CouchDB templates (default source for dashboard/UI lists) */
    const resultArray = await couchdbService.getIssuerTemplatesByIssuerId(issuerIdToQuery);

    /* Step 4: Return standardized response */
    return res.status(200).json({
      success: true,
      credentials: Array.isArray(resultArray) ? resultArray : [],
      count: Array.isArray(resultArray) ? resultArray.length : 0,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error (getCredentialTemplates):', error.message);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
// ==========================================================================================================================================================================



exports.getIssuerCredentials = async (req, res) => {
  try {
    const { issuerId } = req.params;
    console.log(`[AUTHCONTROLLER] Fetching credentials for issuer: ${issuerId}`);

    if (!issuerId) {
      return res.status(400).json({
        success: false,
        message: 'Issuer ID is required'
      });
    }

    const credentialsData = await couchdbService.getIssuerCredentials(issuerId);
    console.log(`[AUTHCONTROLLER] Credentials data received:`, credentialsData);

    if (!credentialsData || !credentialsData.credentials || credentialsData.credentials.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No credentials found for this issuer',
        data: {
          issuerId: issuerId,
          issuerName: credentialsData?.issuerName || 'Unknown',
          email: credentialsData?.email || 'N/A',
          credentialCount: 0,
          credentials: []
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Credentials retrieved successfully',
      data: {
        issuerId: credentialsData.issuerId,
        issuerName: credentialsData.issuerName,
        email: credentialsData.email,
        credentialCount: credentialsData.credentialCount,
        credentials: credentialsData.credentials
      }
    });
  } catch (error) {
    console.error('Error fetching issuer credentials:', error);
    return res.status(500).json({
      success: false,
      message: `Error fetching credentials: ${error.message}`
    });
  }
};
