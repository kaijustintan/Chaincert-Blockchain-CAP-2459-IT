const express = require('express');
const multer = require('multer');

const authController = require('../controllers/authController');
const issuerOnboardingController = require('../controllers/issuerOnboardingController');
const issuerCredentialController = require('../controllers/issuerCredentialController');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// ======================================================
// ISSUER AUTH / ONBOARDING
// ======================================================

// POST /api/issuer/register
// Submit issuer registration with attachments.
router.post('/register', upload.any(), issuerOnboardingController.registerIssuer);

// POST /api/issuer/login
// Authenticate an issuer account.
router.post('/login', authController.loginIssuer);

// ======================================================
// ISSUER REGISTRATION / DOCUMENT ROUTES
// ======================================================

// GET /api/issuer/issuer-requirements/:category
// Get required documents for issuer registration category
router.get(
  '/issuer-requirements/:category',
  issuerOnboardingController.getIssuerRequirementsByCategory
);

// GET /api/issuer/root-authorities
// PUBLIC minimal list of approved root authorities for the registration form (no auth — a
// subordinate issuer picks its parent before it has an account). Replaces the registration page's
// old call to the now admin-only GET /api/admin/approved-issuers. (M2 — Phase 5 hardening)
router.get(
  '/root-authorities',
  issuerOnboardingController.getPublicRootAuthorities
);

// GET /api/issuer/issuer/:issuerId/documents
// Get issuer document metadata
router.get(
  '/issuer/:issuerId/documents',
  issuerOnboardingController.getIssuerDocuments
);

// GET /api/issuer/issuer/:issuerId/documents/:attachmentName
// View or download a specific issuer document
router.get(
  '/issuer/:issuerId/documents/:attachmentName',
  issuerOnboardingController.viewIssuerDocument
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
  issuerCredentialController.getIssuerCredentials
);

// GET /api/issuer/issuer/templates/:templateId/eligible-users
// Get users eligible for credential issuance
router.get(
  '/issuer/templates/:templateId/eligible-users',
  issuerCredentialController.getEligibleUsersForTemplate
);

// ======================================================
// BLOCKCHAIN CREDENTIAL OPERATIONS
// ======================================================

// GET /api/issuer/credentials/history
// Get issuer credential history from blockchain
router.get('/credentials/history', (req, res) => {
  return issuerCredentialController.Get_CredentialHistory(
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
