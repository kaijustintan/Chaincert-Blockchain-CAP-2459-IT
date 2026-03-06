// ==========================================================================================================================================================================
//                                                                       authRoutes.js 
// ==========================================================================================================================================================================

/* [ OUTLINE ]
  =====================================================================
  FILE: authRoutes.js
  TECHNICAL: Express router for /api/auth endpoints (auth + verification)
  TROPA: traffic enforcer” ng auth features. Siya yung nagsasabi: “Pag may tumama na request dito na URL, dito mo ipasa sa controller.”

  =====================================================================

  CATEGORY: USER AUTH & ACCOUNT ROUTES
  - POST /register               → authController.register
  - POST /login                  → authController.login
  - GET  /user/:id               → authController.getUserInfo
  - GET  /users                  → authController.getAllUsers
  - POST /update-profile         → authController.updateProfile
  - POST /change-password        → authController.changePassword
  - POST /upload-pfp             → authController.uploadProfilePicture

  CATEGORY: ISSUER ROUTES
  - POST /register-issuer        → authController.registerIssuer
  - POST /login-issuer           → authController.loginIssuer
  - GET  /pending-issuers        → authController.getPendingIssuers
  

  CATEGORY: CREDENTIAL ROUTES (COUCHDB DASHBOARD)
  - GET   /issuer/:issuerId/credentials        → authController.getIssuerCredentials
  - GET   /credentials/user/:holderID          → authController.getUserCredentials
  - PATCH /credentials/:credentialId/visibility → authController.updateCredentialVisibility  // - polo
  - PATCH /credentials/:credentialId/order      → authController.updateCredentialOrder       // - polo

  CATEGORY: VERIFICATION ROUTES
  - GET  /verify/:credentialID         → verifierController.verifyCredentialByID
  - POST /verify                       → verifierController.verifyCredentialByID
  - GET  /verify-stats                 → verifierController.getVerificationStats

  CATEGORY: LEGACY VERIFICATION ROUTES
  - GET  /verify-credential/:credentialID → verifierController.verifyCredentialByID
*/

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const verifierController = require('../controllers/verifierController');
const issuerCredentialController = require('../controllers/issuerCredentialController');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// =========================================================================================================
// ✅ USER AUTH & ACCOUNT ROUTES (simple pass-through routes)
// =========================================================================================================

// POST /api/auth/register - Register a new user
router.post('/register', authController.register);

// POST /api/auth/login - Login user
router.post('/login', authController.login);

// GET /api/auth/user/:id - Get user information by userId
router.get('/user/:id', authController.getUserInfo);

// GET /api/auth/users - Get all users
router.get('/users', authController.getAllUsers);

// POST /api/auth/update-profile - Update user profile (summary/public visibility, etc.)
router.post('/update-profile', authController.updateProfile);

// POST /api/auth/change-password - Change password for a user/issuer account
router.post('/change-password', authController.changePassword);

// POST /api/auth/upload-pfp - Upload profile picture (multipart form-data)
router.post('/upload-pfp', upload.single('profilePicture'), authController.uploadProfilePicture);

// =========================================================================================================
// 🏛️ ISSUER ROUTES (simple pass-through routes)
// =========================================================================================================

// POST /api/auth/register-issuer - Register a new issuer (multipart form-data, includes docs)
router.post('/register-issuer', upload.array('documents'), authController.registerIssuer);

// POST /api/auth/login-issuer - Login issuer
router.post('/login-issuer', authController.loginIssuer);

// GET /api/auth/pending-issuers - Get pending issuer registrations (Admin)
router.get('/pending-issuers', authController.getPendingIssuers);

// GET /api/auth/approved-issuers - Get all APPROVED issuers (Admin)
router.get('/approved-issuers', authController.getApprovedIssuers);

// GET /api/auth/rejected-issuers - Get all REJECTED issuers (Admin)
router.get('/rejected-issuers', authController.getRejectedIssuers);

// GET /api/auth/issuer/templates/exists
router.get('/issuer/templates/exists', issuerCredentialController.check_IssuerHasTemplates);

// =========================================================================================================
// 📄 CREDENTIAL ROUTES (simple pass-through routes)
// =========================================================================================================

// GET /api/auth/issuer/:issuerId/credentials - Get issuer credentials (fast reads / dashboard)
router.get('/issuer/:issuerId/credentials', authController.getIssuerCredentials);

// GET /api/auth/credentials/user/:holderID - Get student wallet credentials (CouchDB only)
// - polo
router.get('/credentials/user/:holderID', authController.getUserCredentials);

// PATCH /api/auth/credentials/:credentialId/visibility - Update credential visibility (CouchDB only)
// - polo
router.patch('/credentials/:credentialId/visibility', authController.updateCredentialVisibility);

// PATCH /api/auth/credentials/:credentialId/order - Update credential display order (CouchDB only)
// - polo
router.patch('/credentials/:credentialId/order', authController.updateCredentialOrder);

// =========================================================================================================
// ISSUER: ELIGIBLE USERS FOR A TEMPLATE (PREVENT DUPLICATE ISSUANCE)
// =========================================================================================================
router.get(
  '/issuer/templates/:templateId/eligible-users', issuerCredentialController.getEligibleUsersForTemplate);

// =========================================================================================================
// ✅ VERIFICATION ROUTES (Verifier Module) - detailed routes with inline logic
// =========================================================================================================

/*
  Endpoint: GET /api/auth/verify/:credentialID

  Technical:
  Verifies a credential by ID using the verifier module. 

  Tropang Ex:
  Ito yung endpoint na tinatawag pag may verifier/user na nag-verify ng credential ID.
  Parang: “Legit ba tong ID na ’to?” → ipapasa niya sa verifierController para doon gawin yung actual checking.

  Input (URL Param):
    credentialID → credential identifier to verify
    Example: /api/auth/verify/user_cred_12345

  Output (Response):
    - 200 OK → verification result payload (galing verifierController)
    - 400 Bad Request → pag walang credentialID
    - 500 Server Error → pag nagka-crash sa verifier flow
*/
router.get('/verify/:credentialID', async (req, res) => {
  try {

    /* Step 1: Extract credential ID from URL param */
    const { credentialID } = req.params;

    /* Step 2: Validate credential ID exists */
    if (!credentialID) {
      return res.status(400).json({
        success: false,
        message: 'Credential ID is required'
      });
    }

    /* Step 3: Debug log (trace which ID is being verified) */
    console.log(`[ROUTES] Verifier verification: ${credentialID}`);

    /* Step 4: Delegate to verifier controller (actual verification logic lives there) */
    await verifierController.verifyCredentialByID(req, res);

  } catch (error) {

    /* Step 5: Catch unexpected errors and return HTTP 500 */
    console.error('[ROUTES] Error in verify route:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
// =========================================================================================================

/*
  Endpoint: POST /api/auth/verify

  Technical:
  Alternative verification endpoint using POST body instead of URL param.
  This is helpful when:
  - the client prefers sending credentialID in JSON
  - you want a unified request format (ex: verifier form input)

  Flow:
  - reads credentialID from req.body
  - validates it's present
  - copies it into req.params.credentialID
  - calls verifierController.verifyCredentialByID(req, res)

  Tropang Ex:
  Same verification logic, ibang “style” lang ng pag-send ng ID. Instead na nasa URL, nasa body siya: { "credentialID": "user_cred_12345" }
*/
router.post('/verify', async (req, res) => {
  try {

    /* Step 1: Extract credentialID from request body */
    const { credentialID } = req.body;

    /* Step 2: Validate credentialID exists */
    if (!credentialID) {
      return res.status(400).json({
        success: false,
        message: 'Credential ID is required in body'
      });
    }

    /* Step 3: Debug log */
    console.log(`[ROUTES] POST verify: ${credentialID}`);

    /* Step 4: Normalize format by forwarding it as a param so we reuse the same controller */
    req.params.credentialID = credentialID;

    /* Step 5: Delegate to verifier controller */
    await verifierController.verifyCredentialByID(req, res);

  } catch (error) {

    /* Step 6: Catch unexpected errors */
    console.error('[ROUTES] Error in verify POST:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
// ==========================================================================================================================================================================

/*
  Endpoint: GET /api/auth/verify-stats

  Technical:
  Returns verification statistics/metrics via verifierController.getVerificationStats().
  Typical outputs could include:
  - total verifications
  - verified vs failed counts
  - recent verification activity (depends on controller implementation)

  Tropang Ex:
  Pang dashboard / analytics ng verifier module:
  “Ilang beses nag-verify? ilan yung pumasa / bumagsak?”

  Output:
    - 200 OK → stats payload from verifierController
    - 500 Server Error → if stats computation/query fails
*/
router.get('/verify-stats', async (req, res) => {
  try {

    /* Step 1: Debug log */
    console.log(`[ROUTES] Fetching verification statistics`);

    /* Step 2: Delegate stats building to verifier controller */
    await verifierController.getVerificationStats(req, res);

  } catch (error) {

    /* Step 3: Catch errors and return HTTP 500 */
    console.error('[ROUTES] Error fetching verification stats:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// =========================================================================================================
// 🧓 LEGACY ROUTES (Backward Compatibility)
// =========================================================================================================

/*
  Endpoint: GET /api/auth/verify-credential/:credentialID | 
  PENDING - this is old dapat delete na, only reason why hindi is bcos baka ginagamit pa ng ibang files, pero to be removed to 

  Technical:
  Legacy verification route kept for backward compatibility with older frontend code.
  It forwards the credentialID to the SAME verifier controller used by /verify/:credentialID.

  Tropang Ex:
  Luma siyang endpoint name. Hindi na siya dapat yung primary,
  pero kept siya para di masira yung older routes / older builds.

  Note:
  If you're standardizing, the canonical route should be:
    GET /api/auth/verify/:credentialID
*/
router.get('/verify-credential/:credentialID', async (req, res) => {
  try {

    /* Step 1: Extract credential ID */
    const { credentialID } = req.params;

    /* Step 2: Ensure controller receives param in expected name */
    req.params.credentialID = credentialID;

    /* Step 3: Delegate to verifier controller */
    await verifierController.verifyCredentialByID(req, res);

  } catch (error) {

    /* Step 4: Error handling */
    console.error('[ROUTES] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
