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
const { sendServerError } = require('../securityHelpers'); // Phase 5 Tier 2 (M9)
const mailerService = require('../mailerService'); // F28: holder credential emails
const { findNameMatches } = require('../utils/nameSimilarity'); // S3-a: exact + near-match name detection — UBUNTU DIRECTORY BASED (~/chaincert-api/utils/)

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
    const { credentialType, credentialName, description, metadata, skills, badgeImage, renewable, confirmSimilar } = req.body; // - polo (renewable: D5; confirmSimilar: S3-a near-match override)

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

    /* Step 2.5: Block duplicate + warn near-match ACTIVE template names per issuer
       (UAT feedback Group 4.1 + defense revision S3-a)

       Technical:
       Chaincode only enforces uniqueness by ID, so an issuer could create two "BSIT"
       templates. Two tiers via utils/nameSimilarity against the CouchDB template mirror:
       EXACT (normalized equality — lowercase + strip non-alphanumeric, a strict superset
       of the old trim+lowercase check, so "Python-Certificate" vs "Python Certificate"
       is now caught) → hard 409. NEAR-MATCH (truncation/abbreviation pattern, e.g.
       "Python Cert" vs "Python Certificate") → 409 with code SIMILAR_NAME unless the
       caller re-submits with confirmSimilar:true (the UI's confirm step sets it after
       showing the warning). Deliberately pattern-based, NOT a similarity score — any
       score cutoff would be an arbitrary threshold of exactly the kind the defense
       panel flagged. Scoped per issuer + active-only so archived names stay reusable.
       Tropang Ex:
       Bawal ang eksaktong kapareho ng pangalan. Yung KAMUKHA lang (putol/daglat tulad ng
       "Python Cert"), babalaan muna — matutuloy lang kapag kinumpirma ng issuer na sadya.
    */
    try {
      const existingTemplates = await couchdbService.getIssuerTemplatesByIssuerId(issuerId);
      const activeNames = (Array.isArray(existingTemplates) ? existingTemplates : [])
        .filter((t) => {
          const status = String(t.status || '').toLowerCase();
          return status !== 'revoked' && status !== 'disabled' && status !== 'inactive' && status !== 'archived';
        })
        .map((t) => String(t.credentialName || '').trim())
        .filter(Boolean);
      const matches = findNameMatches(String(credentialName).trim(), activeNames);
      if (matches.exact.length > 0) {
        return res.status(409).json({
          success: false,
          error: `You already have an active template named "${String(credentialName).trim()}". Please use a different name or archive the existing one.`
        });
      }
      if (matches.similar.length > 0 && !confirmSimilar) {
        return res.status(409).json({
          success: false,
          code: 'SIMILAR_NAME',
          similar: matches.similar,
          error: `This name is similar to your existing ${matches.similar.map((n) => `"${n}"`).join(', ')}. Re-submit with confirmSimilar to create it anyway.`
        });
      }
    } catch (dupCheckErr) {
      // Non-fatal: a read hiccup on the mirror shouldn't block creation entirely.
      console.warn('[CREATE TEMPLATE] duplicate-name check skipped:', dupCheckErr.message);
    }

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
    // M11: env-driven (see backend/.env.example COUCHDB_URL).
    const adminNano = nano(process.env.COUCHDB_URL || 'http://admin:adminpw@localhost:5985');
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
        skills && skills.length > 0 ? JSON.stringify(skills) : '[]',  // - polo
        renewable === false ? 'false' : 'true'  // D5: pass as string; default renewable unless explicitly false
      );

      blockchainCredential = JSON.parse(result.toString());

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
      if (!issuerDoc || !issuerDoc.couchDBUrl) {
        throw new Error('Issuer CouchDB URL not configured');
      }

      const credentialDoc = {
        _id: credentialId,
        id: credentialId,
        issuerID: issuerId,
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
    return sendServerError(res, error, 'ISSUER-CREDENTIAL'); // M9
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
    const { holderID, expiryDate, renewedFrom } = req.body; // renewedFrom: D2 renewal lineage

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

    /* Step 2b: F01 — block same-day (and past) expiry. A credential stays valid
       through the END of its expiry day in Asia/Manila, so issuing one that
       expires "today" makes it valid for only the remainder of the day — which
       is what produced the active-but-already-expired confusion. Require the
       expiry to be at least the day AFTER today (Manila). Empty = never expires. */
    /* RESTORED. This block was commented out with a "RESTORE (uncomment) before demo" note so that
       already-expired credentials could be minted for UAT. Shipping it disabled meant an issuer
       could write a permanently-useless record to an IMMUTABLE ledger — it verifies as EXPIRED the
       instant it exists, and per the chaincode's own guard an expired credential can never be
       revoked, so it cannot even be withdrawn.

       It is now ON by default and opt-out via ALLOW_PAST_EXPIRY, matching how every other testing
       toggle in this project works (and, unlike the commented-out version, it announces itself at
       startup so nobody can leave it on by accident). */
    if (process.env.ALLOW_PAST_EXPIRY !== 'true' && expiryDate && String(expiryDate).trim() !== '') {
      const datePart = String(expiryDate).slice(0, 10);
      const todayManila = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart) || datePart <= todayManila) {
        return res.status(400).json({
          success: false,
          error: 'Expiry date must be at least the day after today.'
        });
      }
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

    /* Step 4D: OWNERSHIP GATE — load the TEMPLATE before the ledger write. (M1)

      Technical:
      The template was previously loaded only at Step 9A, AFTER submitTransaction, inside a
      best-effort try/catch that swallowed every error — so NOTHING ever verified the template
      belonged to the caller. An approved Issuer B could POST /api/credentials/<A's templateId>/issue
      and mint a credential the ledger permanently attributes to Issuer A, because the chaincode
      copies template.issuerID onto the new credential (chaincode/index.js:239). Template ids are
      discoverable through the public issuer directory. The ledger entry is immutable, so there is
      no after-the-fact remedy: the check MUST precede submitTransaction.

      Admin is exempt from the ownership comparison (platform operator, no couchDBUrl of its own),
      but the template must still exist — issuing against a non-existent template should be a clean
      404, not a chaincode error.

      Tropang Ex:
      Bago tayo sumulat sa blockchain, tinitingnan muna natin kung SA'YO ba talaga yung template na
      gagamitin mo. Kapag hindi, 403 agad — walang maisusulat sa ledger, kaya walang permanenteng
      pekeng record na mabubura pa.
    */
    const templateDoc = await couchdbService.getCredentialDocById(
      credentialId,
      user.role === 'issuer' ? issuerDoc.couchDBUrl : null
    );

    if (!templateDoc) {
      return res.status(404).json({
        success: false,
        error: 'Credential template not found.'
      });
    }

    if (user.role === 'issuer' && String(templateDoc.issuerID) !== String(user.id)) {
      console.warn(`[ISSUE] BLOCKED cross-issuer issuance: user=${user.id} template=${credentialId} owner=${templateDoc.issuerID}`);
      return res.status(403).json({
        success: false,
        error: 'You can only issue credentials from your own templates.'
      });
    }

    if (templateDoc.isTemplate !== true) {
      return res.status(400).json({
        success: false,
        error: 'That credential id is not an issuable template.'
      });
    }

    /* Step 4E: DUPLICATE-ISSUANCE GATE.

      Technical:
      getBlockedHolderIDsByTemplate() already encodes the rule for who may still receive this
      credential (it un-blocks holders whose copy is expired or revoked, so renewals and re-issues
      still work). Until now it was called from exactly ONE place — getEligibleUsersForTemplate,
      the endpoint that populates the recipient DROPDOWN. So the rule only ever filtered a UI list.

      Nothing enforced it on the write path: a direct POST to this endpoint with an already-holding
      holderID succeeded, and batch issue loops this same endpoint. The chaincode is no backstop
      either — IssueCredential mints a key containing the tx timestamp, so it is unique by
      construction and putState never collides.

      Note this narrows but does not eliminate the race: two concurrent requests can both read the
      blocked list before either writes. Closing that fully needs a uniqueness constraint on-chain
      (a composite key of templateId+holderID), which is a redeploy. This turns "unenforced" into
      "enforced except under a genuine race", which is the meaningful part.

      Admin is NOT exempt — a duplicate is a duplicate regardless of who submits it.

      Tropang Ex:
      Dati, yung "hindi pwedeng ma-duplicate" rule ay pang-dropdown lang — kung direkta kang
      mag-POST, dedma. Ngayon, tinitingnan na talaga bago sumulat sa ledger. Permanent kasi yun
      kapag nakapasok na.
    */
    try {
      const blockedHolderIDs = await couchdbService.getBlockedHolderIDsByTemplate(credentialId);
      if (Array.isArray(blockedHolderIDs) && blockedHolderIDs.includes(holderID)) {
        console.warn(`[ISSUE] BLOCKED duplicate issuance: template=${credentialId} holder=${holderID}`);
        return res.status(409).json({
          success: false,
          error: 'This holder already has an active copy of this credential.'
        });
      }
    } catch (dupErr) {
      // FAIL CLOSED. The pre-existing duplicate-name check deliberately warns-and-continues on a
      // read failure, but this is different: proceeding writes an IMMUTABLE duplicate to the
      // ledger that cannot be withdrawn. Refusing costs the issuer a retry; proceeding costs a
      // permanent bad record.
      console.error('[ISSUE] duplicate-check read failed, refusing to issue:', dupErr.message);
      return res.status(503).json({
        success: false,
        error: 'Could not verify whether this holder already has this credential. Please try again.'
      });
    }

    /* Step 5: Connect to blockchain as resolved identity/org

      Tropang Ex:
      Kumokonek tayo sa Fabric gamit yung tamang signer.
    */
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
      expiryDate || '',
      renewedFrom || ''  // D2: predecessor credential id when this issuance is a renewal re-issue
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
      /* Step 9A: Optional enrichment (badgeImage + skills) from the template
         Technical:
         These fields do not live on the blockchain record, so they come from the template doc.
         Step 4D already loaded AND authorized that document, so this reuses it instead of doing a
         second round-trip.

         This also fixes a silent data-loss bug: the old code re-fetched the template inside a
         swallow-all try/catch, so ANY hiccup (subordinate CouchDB blip, a getApprovedIssuer miss)
         made badge images and skills vanish from the issued credential with only a console.warn.

         Tropang Ex:
         Yung extra fields pang-display (badge image, skills) — nasa template doc na nabasa natin
         kanina pa sa Step 4D, kaya hindi na natin uulitin ang pagkuha.
      */
      const templateBadgeImage = templateDoc.badgeImage || '';
      const templateSkills = templateDoc.skills || [];

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

      // F28: email the holder that a new credential was issued (best-effort, non-fatal).
      // G3: fire-and-forget so issuance responds immediately.
      if (holderEmail) {
        const credName = credentialDataExtended.credentialName || credentialDataExtended.credentialType || 'a credential';
        const issuerName = credentialDataExtended.issuerName || issuerDoc?.orgName || user.orgName || 'an issuer';
        mailerService.sendMailFireAndForget({
          to: holderEmail,
          realRecipient: true, // holder email is legit → deliver for real, bypass central inbox
          subject: 'A New Credential Has Been Issued to You',
          html: mailerService.renderEmail({
            heading: 'New Credential Issued',
            bodyHtml: `
                <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.6;">Hi <strong>${holderName || 'there'}</strong>,</p>
                <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.6;"><strong>${issuerName}</strong> has issued you a new credential: <strong>${credName}</strong>.</p>
                <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">Log in to your ChainCert wallet to view, share, or export it.</p>`
          }),
          text: `Hi ${holderName || 'there'},\n\n${issuerName} has issued you a new credential: ${credName}.\nLog in to your ChainCert wallet to view it.`
        }, '[ISSUE]');
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
    return sendServerError(res, error, 'ISSUER-CREDENTIAL'); // M9
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
    return sendServerError(res, error, 'ISSUER-CREDENTIAL'); // M9
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

    /* Step 5: Extract + safety filter + PERF strip */
    const credentials = (result.rows || [])
      .map(r => r.doc)
      .filter(doc => doc && doc.type === 'credential_instance')
      // PERF (UAT): the issuer's issued view NEVER renders badgeImage, yet each issued doc carries
      // the template's base64 badge (copied at issuance, couchDB_service.Issue_Credential_DB). On an
      // issuer with many issued credentials that made the /issued response tens of MB — the ~20s load
      // (dominated by the Node→browser download). Dropping it here shrinks each row to a few KB with
      // zero UX impact. The HOLDER keeps its own copy in wallet_user_credentials, so badges still show
      // in the wallet/profile/PDF. (Row COUNT is not the bottleneck, so no pagination is needed.)
      .map(({ badgeImage, ...rest }) => rest);

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
    // M11: env-driven (see backend/.env.example COUCHDB_URL).
    const adminNano = nano(process.env.COUCHDB_URL || 'http://admin:adminpw@localhost:5985');
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
      if (!getContractAndGateway) {
        throw new Error('getContractAndGateway function not provided');
      }

      const { gateway, contract } = await getContractAndGateway(identityName, orgName);

      const result = await contract.evaluateTransaction(
        'Get_IssuerCredentialsHistory',
        issuerId
      );

      rawHistory = JSON.parse(result.toString());

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
      // M11: env-driven (see backend/.env.example COUCHDB_URL).
      const adminNano2 = nano(process.env.COUCHDB_URL || 'http://admin:adminpw@localhost:5985');
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
    }

    // =====================================================
    // ✅ SUCCESS: Return sorted (and optionally filtered) history
    // =====================================================

    /* Step 5: Return final response
       Tropang Ex:
       Ibinabalik na yung sorted history, ready for display sa UI.
    */

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

    return sendServerError(res, error, 'ISSUER-CREDENTIAL'); // M9
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

    /* Step 3B: OWNERSHIP GATE — load the CREDENTIAL before the ledger write. (M1)

       Technical:
       This handler previously read NOTHING about the credential before
       submitTransaction('RevokeCredential', ...). The only pre-submit read was
       getApprovedIssuer(user.email), which returns the ISSUER doc — that proves the CALLER is an
       approved issuer, not that the CREDENTIAL is theirs. The credential first entered scope at
       Step 5, parsed from the transaction RESULT. And the chaincode is no second line of defence:
       RevokeCredential checks only status and expiry, never ctx.clientIdentity against
       credential.issuerID. So any approved issuer could revoke ANY credential on the platform,
       and it was already immutable on-chain by the time anyone could notice — plus the holder got
       a revocation email in the victim issuer's name.

       Credential ids are printed in exported PDFs, share links, and the public verify endpoint,
       so targets were trivially discoverable.

       Tropang Ex:
       Dati, basta approved issuer ka, kaya mong i-revoke kahit credential ng ibang issuer — tapos
       permanent na agad sa blockchain, walang undo. Ngayon, binabasa muna natin yung credential at
       tinitingnan kung sa'yo nga ba, bago tayo sumulat.
    */
    const credentialDoc = await couchdbService.getCredentialDocById(
      credentialId,
      user.role === 'issuer' ? issuerDoc.couchDBUrl : null
    );

    if (!credentialDoc) {
      // Deliberately 404 and NOT 403: with no doc we cannot attribute ownership, and answering
      // "exists but not yours" versus "does not exist" would turn this endpoint into an
      // enumeration oracle over the whole credential space. Fail closed either way.
      return res.status(404).json({
        success: false,
        error: 'Credential not found.'
      });
    }

    if (user.role === 'issuer' && String(credentialDoc.issuerID) !== String(user.id)) {
      console.warn(`[REVOKE] BLOCKED cross-issuer revoke: user=${user.id} cred=${credentialId} owner=${credentialDoc.issuerID}`);
      return res.status(403).json({
        success: false,
        error: 'You can only revoke credentials you issued.'
      });
    }

    /* Step 4: Connect to blockchain as resolved identity/org */
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
      const couchResult = await couchdbService.Revoke_Credential_DB(
        revokedCredential.id,   // blockchainId (cred_...)
        user.email,             // issuerEmail
        rejectionReason || ''        // - polo
      );

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
      } catch (notifErr) {
        console.warn('[REVOKE] Notification failed (non-fatal):', notifErr.message);
      }

      // F28: email the holder that their credential was revoked (best-effort, non-fatal).
      try {
        const holderDoc = await couchdbService.getUser(revokedCredential.holderID);
        const holderEmail = holderDoc?.email || '';
        const holderName = holderDoc?.name || holderDoc?.username || holderEmail || revokedCredential.holderID;
        if (holderEmail) {
          const credName = revokedCredential.credentialName || revokedCredential.credentialType || 'a credential';
          const issuerName = issuerDoc?.orgName || user.email || 'an issuer';
          // G3: fire-and-forget the send; the try/catch around it stays because the
          // getUser() lookup above is a DB read that can throw.
          mailerService.sendMailFireAndForget({
            to: holderEmail,
            realRecipient: true, // holder email is legit → deliver for real, bypass central inbox
            subject: 'A Credential in Your ChainCert Wallet Was Revoked',
            html: mailerService.renderEmail({
              heading: 'Credential Revoked',
              bodyHtml: `
                <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.6;">Hi <strong>${holderName}</strong>,</p>
                <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.6;"><strong>${issuerName}</strong> has <strong style="color:#b91c1c;">revoked</strong> your credential: <strong>${credName}</strong>. It will now show as invalid when verified.</p>
                ${rejectionReason ? `<p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.6;"><strong>Reason:</strong> ${rejectionReason}</p>` : ''}
                <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">If you have questions, please contact the issuing organization.</p>`
            }),
            text: `Hi ${holderName},\n\n${issuerName} has revoked your credential: ${credName}. It will now show as invalid when verified.${rejectionReason ? `\nReason: ${rejectionReason}` : ''}`
          }, '[REVOKE]');
        }
      } catch (emailErr) {
        console.error('[REVOKE] Holder lookup for revocation email failed (non-fatal):', emailErr?.message || emailErr);
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
    return sendServerError(res, error, 'ISSUER-CREDENTIAL'); // M9
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

    return sendServerError(res, error, 'ISSUER-CREDENTIAL'); // M9
  }
};
// ==========================================================================================================================================================================



/*
  Function Name: getIssuerCredentials

  LAYMAN (Tropang Ex): Kinukuha ang lahat ng credential ng ISANG issuer. Dati, kahit sino — kahit
  hindi naka-login — pwedeng humingi ng credential list ng KAHIT SINONG issuer, basta alam nila ang
  issuer id. At ang issuer id ay libreng nakukuha sa public na /root-authorities list. Ngayon,
  kailangan naka-login ka, at sarili mo lang na credentials ang makikita mo (maliban kung admin ka).

  TECHNICAL: Was the only handler in this file with NO auth check of any kind, on a router that was
  itself mounted without a guard — so it read any issuer's full credential set anonymously. Issuer
  ids are public (issuerOnboardingController.getPublicRootAuthorities returns id: doc._id), so the
  attack was: GET /api/issuer/root-authorities -> pick an id -> GET .../issuer/<id>/credentials.

  Now: an issuer may only read their OWN id; admin may read any. The param is still accepted (the
  frontend sends it) but it must match the token for role 'issuer'. This mirrors the scoping already
  used by getCredentialTemplates (~line 1614) in this same file.

  PARAMS: req (req.params.issuerId, req.user), res.
  RETURNS: 200 { success, message, data:{...} } | 401 | 403 | 400 | 500 via sendServerError.
*/
exports.getIssuerCredentials = async (req, res) => {
  try {
    const { issuerId } = req.params;
    const user = req.user;

    if (!user || !user.id) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    if (!issuerId) {
      return res.status(400).json({
        success: false,
        message: 'Issuer ID is required'
      });
    }

    // Ownership gate: an issuer sees only their own credentials. Admin is the platform operator
    // and may read any issuer's set (the admin dashboard's all-credentials view depends on it).
    if (user.role !== 'admin' && String(issuerId) !== String(user.id)) {
      return res.status(403).json({
        success: false,
        message: 'You can only access your own credentials.'
      });
    }

    const credentialsData = await couchdbService.getIssuerCredentials(issuerId);

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
    // M9: was returning `Error fetching credentials: ${error.message}` straight to the client,
    // leaking CouchDB/Fabric internals. Every other handler in this file already uses sendServerError.
    return sendServerError(res, error, 'ISSUER-CREDENTIAL');
  }
};

// ==========================================================================================================================================================================
//                                                                       N1: ISSUER IN-APP NOTIFICATIONS
// ==========================================================================================================================================================================
/*
  N1: issuer notifications. The issuer scope is ALWAYS derived from req.user.id (never a URL
  param), so an issuer can only ever read/mark its own notifications — no IDOR. Notifications
  are created elsewhere (admin approve/reject/disable/enable, root approve/reject, subordinate
  registration) via couchDB.createNotification({ targetRole:'issuer', issuerId, ... }).
*/
exports.getIssuerNotifications = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    const notifications = await couchdbService.getIssuerNotifications(req.user.id);
    return res.status(200).json({ success: true, notifications, count: notifications.length });
  } catch (error) {
    console.error('[ISSUER NOTIFICATIONS] list error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to load notifications.' });
  }
};

exports.getUnreadIssuerNotifications = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    const notifications = await couchdbService.getUnreadIssuerNotifications(req.user.id);
    return res.status(200).json({ success: true, notifications, unreadCount: notifications.length });
  } catch (error) {
    console.error('[ISSUER NOTIFICATIONS] unread error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to load notifications.' });
  }
};

exports.markIssuerNotificationAsRead = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    const { notificationId } = req.params;
    // Ownership check: the notification must belong to THIS issuer before we mark it.
    const own = await couchdbService.getIssuerNotifications(req.user.id);
    if (!own.some((n) => n._id === notificationId)) {
      return res.status(403).json({ success: false, message: 'Not your notification.' });
    }
    await couchdbService.markNotificationAsRead(notificationId);
    return res.status(200).json({ success: true, notificationId });
  } catch (error) {
    console.error('[ISSUER NOTIFICATIONS] mark-read error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to update notification.' });
  }
};

/*
  Function Name: getIssuerVerifications  (C5: issuer "Verification Reach")

  LAYMAN (Tropang Ex):
  Para sa issuer: "Ilang beses na-verify ang mga credential na IN-ISSUE ko, ilang natatanging
  verifier, at ano ang mga resulta?" — ang "Verification Reach." Proof na aktwal na tinitignan
  at pinagkakatiwalaan ng labas ang mga credential mo. Sinasala sa server para SARILING
  credentials mo lang ang makikita mo (privacy boundary — walang verification ng ibang issuer).

  TECHNICAL:
  Mirrors walletController.getMyVerifications. Identity from the JWT (req.user.id). A credential's
  issuerID === the issuer's account id (set at template creation → inherited by issued credentials),
  and LogVerification enriches the log's issuerID from the credential — so we read the global
  on-chain verification log (GetAllVerificationLogs, read-only, generic admin/Org1 identity) and
  filter server-side to logs where issuerID === req.user.id. Forged/not-found logs have an empty
  issuerID and are naturally excluded. No IDOR (identity never comes from a URL/body param).

  PARAMS:
  - req, res — Express. getContractAndGateway — injected by the route from req.app.locals.

  RETURNS:
  200 { success, verifications:[...own logs...], count, timestamp } | 401 unauth | 403 wrong role.
*/
exports.getIssuerVerifications = async (req, res, getContractAndGateway) => {
  let gateway;
  try {
    const user = req.user;
    if (!user || !user.id) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    if (user.role !== 'issuer' && user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Issuer access only.' });
    }
    const issuerId = String(user.id);

    // Read-only verification log; same generic identity selection as the holder endpoint.
    const identityName = user.role === 'admin' ? 'chaincert-admin' : 'admin';
    const conn = await getContractAndGateway(identityName, 'Org1');
    gateway = conn.gateway;
    const resultBuffer = await conn.contract.evaluateTransaction('GetAllVerificationLogs');
    const allLogs = JSON.parse(resultBuffer.toString()) || [];

    // PRIVACY BOUNDARY: only verifications of THIS issuer's own credentials.
    const myLogs = allLogs.filter((log) => log && log.issuerID && String(log.issuerID) === issuerId);

    return res.status(200).json({
      success: true,
      verifications: myLogs,
      count: myLogs.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return sendServerError(res, error, 'ISSUER'); // M9
  } finally {
    if (gateway) {
      try { await gateway.disconnect(); } catch (_) { /* best-effort */ }
    }
  }
};

// ==========================================================================================
// C11: CREDENTIAL RENEWAL REQUESTS (issuer side)
// ==========================================================================================

/*
  Function Name: getRenewalRequests  (C11)

  LAYMAN (Tropang Ex):
  Ang renewal queue ng NAKA-LOGIN na issuer — mga holder na nagsabing "paki-renew naman."
  Pending muna sa taas, tapos yung mga na-desisyunan na.

  TECHNICAL:
  Identity from the JWT (req.user.id) — matches renewal_request.issuerId (which came from the
  credential's issuerID). Self-auth because /api/issuer has no route guard.

  PARAMS: req, res.
  RETURNS: 200 { success, requests, count } | 401 | 403 wrong role.
*/
exports.getRenewalRequests = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.id) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    if (user.role !== 'issuer' && user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Issuer access only.' });
    }
    const requests = await couchdbService.getRenewalRequestsByIssuer(user.id);
    return res.status(200).json({ success: true, requests, count: requests.length });
  } catch (error) {
    return sendServerError(res, error, 'ISSUER'); // M9
  }
};

/*
  Function Name: decideRenewalRequest  (C11)

  LAYMAN (Tropang Ex):
  Dito nagdedesisyon ang issuer sa isang renewal request. HINDI ito ang nag-iissue — ang
  frontend ang tumatawag sa NORMAL na issue flow (para pare-pareho ang chaincode + dual-write
  + holder email), tapos itong endpoint ang nagmamarka ng approved/declined at nag-aabiso sa
  holder. Ang basehan ng desisyon ay ang SARILING records ng issuer — hindi alam ng ChainCert
  kung qualified pa ang holder.

  TECHNICAL:
  Ownership: request.issuerId must equal req.user.id. Only 'pending' requests are decidable
  (409 otherwise). approve → { status:'approved', decidedAt, newCredentialId, newExpiryDate }
  (lineage: the renewal doc links old credentialId → newCredentialId — no chaincode change);
  decline → requires declineReason. Both create a best-effort holder in-app notification.

  PARAMS:
  - req.params.requestId; req.body { action:'approve'|'decline', declineReason?,
    newCredentialId?, newExpiryDate? }.

  RETURNS: 200 { success, request } | 400 | 401 | 403 | 404 | 409 already decided.
*/
exports.decideRenewalRequest = async (req, res, getContractAndGateway) => {
  try {
    const user = req.user;
    if (!user || !user.id) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    if (user.role !== 'issuer' && user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Issuer access only.' });
    }
    const { requestId } = req.params;
    const { action, declineReason, newCredentialId, newExpiryDate } = req.body || {};
    if (!requestId || !['approve', 'decline'].includes(action)) {
      return res.status(400).json({ success: false, message: "action must be 'approve' or 'decline'." });
    }

    const request = await couchdbService.getRenewalRequestById(requestId);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Renewal request not found.' });
    }
    if (String(request.issuerId) !== String(user.id)) {
      return res.status(403).json({ success: false, message: 'You can only decide renewal requests addressed to you.' });
    }
    if (request.status !== 'pending') {
      return res.status(409).json({ success: false, message: 'This request was already decided.' });
    }
    if (action === 'decline' && !String(declineReason || '').trim()) {
      return res.status(400).json({ success: false, message: 'A decline reason is required — the holder will see it.' });
    }

    const patch = action === 'approve'
      ? { status: 'approved', decidedAt: new Date().toISOString(), newCredentialId: newCredentialId || '', newExpiryDate: newExpiryDate || '' }
      : { status: 'declined', decidedAt: new Date().toISOString(), declineReason: String(declineReason).trim() };
    const updated = await couchdbService.updateRenewalRequest(requestId, patch);

    // D3: immutable on-chain audit of the renewal decision (approve AND decline). Best-effort —
    // a logging failure must NOT fail the decision (the CouchDB record drives the workflow, and on
    // approve the re-issued credential is already on-chain). Mirrors adminIssuerController.Approve_Issuer.
    let gateway = null;
    try {
      if (typeof getContractAndGateway === 'function') {
        const conn = await getContractAndGateway('chaincert-admin', 'Org1');
        gateway = conn.gateway;
        await conn.contract.submitTransaction(
          'LogRenewalDecision',
          String(requestId),
          String(request.holderId || ''),
          String(request.issuerId || ''),
          action === 'approve' ? 'approved' : 'declined',
          action === 'approve' ? '' : String(patch.declineReason || ''),
          String(request.credentialId || ''),
          action === 'approve' ? String(newCredentialId || '') : ''
        );
      }
    } catch (bcErr) {
      console.warn('[RENEWAL] on-chain LogRenewalDecision failed (non-fatal):', bcErr?.message || bcErr);
    } finally {
      try { if (gateway) await gateway.disconnect(); } catch (_) {}
    }

    // Best-effort holder in-app notification. (On approve, the issuance itself already
    // notified + emailed the holder about the NEW credential — this closes the request loop.)
    try {
      await couchdbService.Create_CredentialNotification(request.holderId, {
        notificationType: action === 'approve' ? 'renewal_approved' : 'renewal_declined',
        credentialId: request.credentialId,
        credentialName: request.credentialName,
        issuerName: request.issuerName,
        message: action === 'approve'
          ? `Your renewal request for "${request.credentialName}" was approved — a renewed credential has been issued to you.`
          : `Your renewal request for "${request.credentialName}" was declined. Reason: ${patch.declineReason}`,
      });
    } catch (nErr) {
      console.warn('[RENEWAL] holder notification failed (non-fatal):', nErr.message);
    }

    return res.status(200).json({ success: true, request: updated });
  } catch (error) {
    return sendServerError(res, error, 'ISSUER'); // M9
  }
};
