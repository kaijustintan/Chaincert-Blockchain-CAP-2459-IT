const express = require('express');

const authController = require('../controllers/authController');
const issuerCredentialController = require('../controllers/issuerCredentialController');

const router = express.Router();

// ======================================================
// ISSUER REGISTRATION / DOCUMENT ROUTES
// ======================================================

// GET /api/issuer/issuer-requirements/:category
// Get required documents for issuer registration category
router.get(
  '/issuer-requirements/:category',
  authController.getIssuerRequirementsByCategory
);

// GET /api/issuer/issuer/:issuerId/documents
// Get issuer document metadata
router.get(
  '/issuer/:issuerId/documents',
  authController.getIssuerDocuments
);

// GET /api/issuer/issuer/:issuerId/documents/:attachmentName
// View or download a specific issuer document
router.get(
  '/issuer/:issuerId/documents/:attachmentName',
  authController.viewIssuerDocument
);


// ======================================================
// ISSUER DASHBOARD / FAST READ ROUTES
// ======================================================

// GET /api/issuer/issuer/templates/exists
// Check if issuer already has credential templates
router.get(
  '/issuer/templates/exists',
  issuerCredentialController.check_IssuerHasTemplates
);

// GET /api/issuer/issuer/:issuerId/credentials
// Get issuer credentials (dashboard fast reads)
router.get(
  '/issuer/:issuerId/credentials',
  authController.getIssuerCredentials
);

// GET /api/issuer/issuer/templates/:templateId/eligible-users
// Get users eligible for credential issuance
router.get(
  '/issuer/templates/:templateId/eligible-users',
  issuerCredentialController.getEligibleUsersForTemplate
);


// ======================================================
// BLOCKCHAIN CREDENTIAL OPERATIONS
// (Merged from issuerApiRoutes.js)
// ======================================================

// GET /api/issuer/credentials/history
// Get issuer credential history from blockchain
router.get('/credentials/history', (req, res) => {
  return issuerCredentialController.get_IssuerCredentialsHistory(
    req,
    res,
    req.app.locals.getContractAndGateway
  );
});

// POST /api/issuer/credentials/create
// Create credential template on blockchain
router.post('/credentials/create', (req, res) => {
  return issuerCredentialController.Create_CredentialTemplate(
    req,
    res,
    req.app.locals.getContractAndGateway
  );
});

module.exports = router;