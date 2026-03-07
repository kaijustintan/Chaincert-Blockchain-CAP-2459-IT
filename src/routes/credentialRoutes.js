const express = require('express');
const nano = require('nano');

const authController = require('../controllers/authController');
const issuerCredentialController = require('../controllers/issuerCredentialController');
const verifierController = require('../controllers/verifierController');
const couchdb = require('../couchDB_service');

const router = express.Router();

// ======================================================
// STUDENT / WALLET CREDENTIAL ROUTES
// ======================================================

// GET /api/credentials/credentials/user/:holderID
// Get student wallet credentials (CouchDB reads).
router.get('/credentials/user/:holderID', authController.getUserCredentials);

// PATCH /api/credentials/credentials/:credentialId/visibility
// Update credential visibility state.
router.patch('/credentials/:credentialId/visibility', authController.updateCredentialVisibility);

// PATCH /api/credentials/credentials/:credentialId/order
// Update credential display order.
router.patch('/credentials/:credentialId/order', authController.updateCredentialOrder);

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

    if (!issuerID || issuerID === 'ISSUER') {
      return res.status(400).json({
        success: false,
        error: 'Valid issuer ID is required',
        message: 'Issuer ID cannot be empty or "ISSUER"',
      });
    }

    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const adminNano = nano('http://admin:adminpw@localhost:5985');
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
    console.error(`❌ Error fetching issuer credentials: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// GET /api/credentials/:id/history
// Get blockchain history of a credential.
router.get('/:id/history', async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

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

    const { contract } = await req.app.locals.getContractAndGateway(
      identityName,
      orgName
    );

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
    console.error(`❌ Error: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ======================================================
// CREDENTIAL ACTIONS
// ======================================================

// POST /api/credentials/:credentialId/issue
// Issue credential to a holder.
router.post('/:credentialId/issue', (req, res) => {
  return issuerCredentialController.issue_CredentialToUser(
    req,
    res,
    req.app.locals.getContractAndGateway
  );
});

// POST /api/credentials/:credentialId/revoke
// Revoke credential.
router.post('/:credentialId/revoke', (req, res) => {
  return issuerCredentialController.revoke_Credential(
    req,
    res,
    req.app.locals.getContractAndGateway
  );
});

// ======================================================
// VERIFICATION-RELATED CREDENTIAL ROUTES
// ======================================================

// GET /api/credentials/:credentialId/verify
// Verify credential by id.
router.get('/:credentialId/verify', (req, res) => {
  return verifierController.verifyCredentialByID(
    req,
    res,
    req.app.locals.getContractAndGateway
  );
});

// POST /api/credentials/:credentialId/log-verification
// Write verification log on-chain.
router.post('/:credentialId/log-verification', (req, res) => {
  return verifierController.logVerificationEvent(
    req,
    res,
    req.app.locals.getContractAndGateway
  );
});

module.exports = router;