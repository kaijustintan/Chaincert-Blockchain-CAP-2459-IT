const express = require('express');
const nano = require('nano');

const issuerCredentialController = require('../controllers/issuerCredentialController');
const verifierController = require('../controllers/verifierController');
const couchdb = require('../couchDB_service');
const { requireAuth, requireAnyRole, sendServerError } = require('../securityHelpers');

const router = express.Router();

// ======================================================
// PUBLIC VERIFICATION ROUTES  (declared FIRST — see the auth boundary below)
// ======================================================
// Credential verification is public by design: that is the product. A verifier holding a
// credential ID or a shared link checks it without an account.
//
// These four were previously declared at the BOTTOM of this file. They are hoisted above the auth
// boundary so the rest of the router can be closed by default. Route-precedence was checked before
// moving: every param route here has a distinct LITERAL second segment (/verify, /log-verification,
// /history, /issue, /revoke), and the private routes below are either single-segment (/issued,
// /templates) or literal-first (/issuer/:issuerID), so nothing is shadowed by the hoist.

// V1: verifier email OTP (prove email ownership once per window before logging a verification).
// Literal paths declared BEFORE the /:credentialId/* routes so they never get param-matched.
// POST /api/credentials/verify/request-otp
router.post('/verify/request-otp', (req, res) => verifierController.requestVerifierOtp(req, res));
// POST /api/credentials/verify/confirm-otp
router.post('/verify/confirm-otp', (req, res) => verifierController.confirmVerifierOtp(req, res));

// GET /api/credentials/:credentialId/verify
// Verify credential by id.
router.get('/:credentialId/verify', (req, res) => {
  return verifierController.Verify_Credential(
    req,
    res,
    req.app.locals.getContractAndGateway
  );
});

// POST /api/credentials/:credentialId/log-verification
// Write verification log on-chain. Public, but logVerificationEvent itself REQUIRES a
// 'verifier_email_proof' JWT and takes the email FROM that token, so the logged identity
// cannot be spoofed by the request body (V1).
router.post('/:credentialId/log-verification', (req, res) => {
  return verifierController.logVerificationEvent(
    req,
    res,
    req.app.locals.getContractAndGateway
  );
});

// ======================================================
// AUTH BOUNDARY — everything BELOW requires a valid token. (M2)
// ------------------------------------------------------------------------------------------
// /api/credentials was mounted with no guard, so all 10 routes were anonymous and two of them
// hand-rolled their own `if (!req.user) return 401` inline. Those inline blocks are now redundant
// and have been removed in favour of this single boundary — one place to read, and any route added
// below is guarded automatically.
// ======================================================
router.use(requireAuth);

// ======================================================
// ISSUER / ADMIN CREDENTIAL ROUTES
// ======================================================

// GET /api/credentials/issued
// Get issued credentials for issuer/admin.
router.get('/issued', (req, res) => {
  return issuerCredentialController.get_IssuerIssuedCredentials(
    req,
    res,
    req.app.locals.getContractAndGateway
  );
});

// GET /api/credentials/templates
// Get credential templates from blockchain.
router.get('/templates', (req, res) => {
  return issuerCredentialController.getCredentialTemplates(
    req,
    res,
    req.app.locals.getContractAndGateway
  );
});

// GET /api/credentials/issuer/:issuerID
// Get issuer credentials from issuer CouchDB.
router.get('/issuer/:issuerID', async (req, res) => {
  try {
    const { issuerID } = req.params;
    const user = req.user; // guaranteed by the router-level requireAuth above

    if (!issuerID || issuerID === 'ISSUER') {
      return res.status(400).json({
        success: false,
        error: 'Valid issuer ID is required',
        message: 'Issuer ID cannot be empty or "ISSUER"',
      });
    }

    // IDOR fix: the id came from the URL and was never compared to the caller. Any authenticated
    // user — including a student — could read any issuer's full template catalogue by id, and
    // issuer ids are public via GET /api/issuer/root-authorities. Issuers now see only their own;
    // admin (platform operator) may read any.
    if (user.role !== 'admin' && String(issuerID) !== String(user.id)) {
      return res.status(403).json({
        success: false,
        error: 'You can only access your own credentials.',
      });
    }

    // M11 (COMPLETE): this was the first of seven sites that hardcoded the CouchDB connection and
    // bypassed COUCHDB_URL. The remaining six (accountController x2, issuerCredentialController x3,
    // verifierController x1) are now env-driven too, so a password rotation takes effect on every
    // code path rather than some of them — a partial rotation was the harder failure to diagnose.
    const adminNano = nano(process.env.COUCHDB_URL || 'http://admin:adminpw@localhost:5985');
    const issuersDB = adminNano.use('issuers');

    let issuer;
    try {
      issuer = await issuersDB.get(issuerID);
    } catch (err) {
      if (err.statusCode === 404) {
        return res.status(404).json({
          success: false,
          error: 'Issuer not found',
        });
      }
      throw err;
    }

    if (!issuer || !issuer.couchDBUrl) {
      return res.status(403).json({
        success: false,
        error: 'Issuer not found or CouchDB URL missing',
      });
    }

    const issuerNano = nano(issuer.couchDBUrl);
    const walletDb = issuerNano.use('wallet_issuer_credentials');
    const result = await walletDb.find({
      selector: { issuerId: issuerID },
    });

    return res.json({
      success: true,
      credentials: result.docs || [],
      count: (result.docs || []).length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // M9: was returning the raw error.message (CouchDB/Fabric internals) to the client.
    return sendServerError(res, error, 'CREDENTIAL-ROUTE');
  }
});

// GET /api/credentials/:id/history
// Get blockchain history of a credential.
router.get('/:id/history', async (req, res) => {
  let gateway;

  try {
    const user = req.user; // guaranteed by the router-level requireAuth above

    let identityName;
    let orgName;

    if (user.role === 'issuer') {
      const issuer = await couchdb.getApprovedIssuer(user.email);

      if (!issuer || !issuer.fabricIdentity || !issuer.orgName) {
        return res.status(403).json({
          success: false,
          error: 'Issuer not approved or Fabric identity missing.',
        });
      }

      identityName = issuer.fabricIdentity;
      orgName = issuer.orgName;
    } else if (
      user.role === 'admin' ||
      user.role === 'student' ||
      user.role === 'user'
    ) {
      identityName = 'chaincert-admin';
      orgName = 'Org1';
    } else {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Not allowed.',
      });
    }

    const cg = await req.app.locals.getContractAndGateway(
      identityName,
      orgName
    );
    gateway = cg.gateway;
    const contract = cg.contract;

    const result = await contract.evaluateTransaction(
      'Get_CredentialTemplateOrIssuedCredentialHistory',
      req.params.id
    );

    return res.json({
      success: true,
      history: JSON.parse(result.toString()),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // M9: was returning the raw error.message to the client.
    return sendServerError(res, error, 'CREDENTIAL-HISTORY');
  } finally {
    try { if (gateway) await gateway.disconnect(); } catch (_) {}
  }
});

// ======================================================
// CREDENTIAL ACTIONS
// ======================================================

// POST /api/credentials/:credentialId/issue
// Issue credential to a holder.
// requireAnyRole rejects a logged-in student at the route; the controller then enforces that the
// TEMPLATE belongs to this issuer (Step 4D) before anything is written to the ledger.
router.post('/:credentialId/issue', requireAnyRole('issuer', 'admin'), (req, res) => {
  return issuerCredentialController.Issue_Credential(
    req,
    res,
    req.app.locals.getContractAndGateway
  );
});

// POST /api/credentials/:credentialId/revoke
// Revoke credential.
// Role at the route, per-credential ownership in the controller (Step 3B) — revocation is
// immutable, so both gates run before submitTransaction.
router.post('/:credentialId/revoke', requireAnyRole('issuer', 'admin'), (req, res) => {
  return issuerCredentialController.revoke_Credential(
    req,
    res,
    req.app.locals.getContractAndGateway
  );
});

module.exports = router;