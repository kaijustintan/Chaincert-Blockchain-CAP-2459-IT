const express = require('express');
const multer = require('multer');

const authController = require('../controllers/authController');
const issuerOnboardingController = require('../controllers/issuerOnboardingController');
const issuerCredentialController = require('../controllers/issuerCredentialController');

const router = express.Router();
// M7 (Phase 5 hardening): cap each uploaded issuer document at 5 MB (DoS protection).
// Magic-number type validation happens in issuerOnboardingController via securityHelpers.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

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

// GET /api/issuer/directory
// PUBLIC issuer directory — anyone (logged out too) can browse/search all approved
// issuers with credibility aggregates (E). No auth.
router.get(
  '/directory',
  issuerOnboardingController.getPublicDirectory
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

// GET /api/issuer/my-verifications
// C5: this issuer's own "Verification Reach" — verifications of their credentials, filtered
// server-side by issuerID (derived from req.user.id, not a URL param → no IDOR).
router.get('/my-verifications', (req, res) => {
  return issuerCredentialController.getIssuerVerifications(
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

// ======================================================
// N1: ISSUER IN-APP NOTIFICATIONS (scope derived from req.user.id — no IDOR)
// ======================================================

// GET /api/issuer/notifications — this issuer's notifications
router.get('/notifications', issuerCredentialController.getIssuerNotifications);

// GET /api/issuer/notifications/unread — unread only (badge count)
router.get('/notifications/unread', issuerCredentialController.getUnreadIssuerNotifications);

// PATCH /api/issuer/notifications/:notificationId/read — mark one read (ownership-checked)
router.patch('/notifications/:notificationId/read', issuerCredentialController.markIssuerNotificationAsRead);

module.exports = router;
