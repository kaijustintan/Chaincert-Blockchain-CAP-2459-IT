const express = require('express');
const multer = require('multer');

const authController = require('../controllers/authController');
const issuerOnboardingController = require('../controllers/issuerOnboardingController');
const issuerCredentialController = require('../controllers/issuerCredentialController');
const { requireAuth } = require('../securityHelpers');

const router = express.Router();

/* M7 (Phase 5 hardening) + upload-limits pass.

   LAYMAN (Tropang Ex): Yung dating limit ay "5 MB kada file" LANG — walang limit kung ILAN ang
   file. At dahil naka-memory storage at bukas sa kahit sino (walang login ang registration),
   kayang magpadala ng isang request na may 1,000 na file na tig-5 MB — 5 GB na RAM agad, patay
   ang server. Ngayon may hangganan na ang bilang, hindi lang ang laki.

   TECHNICAL: `limits.fileSize` caps each file INDIVIDUALLY; it says nothing about how many files
   a request may contain. Combined with upload.any() (accepts unlimited files under arbitrary field
   names) and memoryStorage, an unauthenticated POST /api/issuer/register could buffer unbounded
   data into the heap. Multer buffers everything BEFORE the controller's own field-name allow-list
   at ~L200 ever runs, so that check was no defence.

   Worst case is now bounded at files x fileSize = 8 x 5 MB = 40 MB per request, and the route also
   gained authLimiter in sdk-server-fixed.js.

   Sizing: the largest category requires 4 documents, plus root_authorization_letter for a
   subordinate = 5 files, and the form posts 8 text fields. 8 files / 30 parts leaves headroom
   without being generous enough to matter.

   Deliberately still upload.any() rather than upload.fields(): the controller ALREADY rejects
   unknown field names (invalidDocs, ~L200) with a clearer message, and .fields() would change
   req.files from an array to an object — which the controller reads as
   `Array.isArray(req.files) ? req.files : []`, so it would silently see ZERO files and fail every
   registration with "Missing required documents." The limits below close the actual DoS; the
   shape change would have added regression risk for validation we already perform.
*/
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB per file
    files: 8,                  // max 8 files per request (5 is the real maximum needed)
    parts: 30                  // files + text fields combined (13 is the real maximum needed)
  }
});

/*
  Function Name: handleUpload

  LAYMAN (Tropang Ex): Kapag lumagpas sa limit ang in-upload (sobrang laki o sobrang dami), si
  multer ay nagtatapon ng error. Kung walang huhuli niyan, aabot siya sa global error handler at
  magiging generic na "Something went wrong" (500) — akala ng user sira ang server, gayong ang
  totoo, sobra lang ang file niya. Dito natin siya sinasalo at binibigyan ng malinaw na sagot.

  TECHNICAL: Wraps a multer middleware and converts MulterError into an actionable 4xx. Without
  this the new limits.files / limits.parts caps would surface as opaque 500s via the M9 handler.
  413 for the size/count caps (payload too large), 400 for a malformed field.

  PARAMS: mw — the multer middleware to wrap (e.g. upload.any()).
  RETURNS: an (req, res, next) middleware.
*/
const handleUpload = (mw) => (req, res, next) => mw(req, res, (err) => {
  if (err && err instanceof multer.MulterError) {
    const messages = {
      LIMIT_FILE_SIZE: 'A file is too large. Each document must be 5 MB or less.',
      LIMIT_FILE_COUNT: 'Too many files. Please upload only the required documents.',
      LIMIT_PART_COUNT: 'Too many form fields submitted.',
      LIMIT_FIELD_COUNT: 'Too many form fields submitted.',
      LIMIT_UNEXPECTED_FILE: 'Unexpected file field in the upload.'
    };
    const status = (err.code === 'LIMIT_FILE_SIZE' || err.code === 'LIMIT_FILE_COUNT') ? 413 : 400;
    return res.status(status).json({
      success: false,
      message: messages[err.code] || 'Upload rejected.'
    });
  }
  if (err) return next(err);
  next();
});

// ======================================================
// ISSUER AUTH / ONBOARDING
// ======================================================

// POST /api/issuer/register
// Submit issuer registration with attachments.
router.post('/register', handleUpload(upload.any()), issuerOnboardingController.registerIssuer);

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

// ======================================================
// AUTH BOUNDARY — everything BELOW this line requires a valid token. (M2)
// ------------------------------------------------------------------------------------------
// The five routes above are deliberately public and must STAY above this line:
//   /register, /login                  — you cannot have an account yet
//   /issuer-requirements/:category     — drives the registration wizard's document checklist
//   /root-authorities                  — a subordinate picks its parent before it has an account
//   /directory                         — the public issuer directory, browsable logged out
//
// /api/issuer was previously mounted with NO guard at all (sdk-server-fixed.js), so all 18 routes
// were reachable anonymously and protection depended on each handler remembering to check. Several
// did (check_IssuerHasTemplates, getIssuerVerifications, the notification handlers); one did not
// (getIssuerCredentials, below), which exposed any issuer's full credential set to anyone. Guarding
// at the boundary makes "closed" the default and the public list explicit.
//
// Role/ownership is still the controller's job — this line only proves the caller is logged in.
// ======================================================
router.use(requireAuth);

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

// C11: renewal requests — this issuer's queue + the decision endpoint (self-auth in controller).
// Approve marks the request AFTER the frontend re-issues via the existing issue flow.
router.get('/renewal-requests', issuerCredentialController.getRenewalRequests);
// D3: inject the gateway so the decision (approve/decline) is logged on-chain via LogRenewalDecision.
router.patch('/renewal-requests/:requestId/decision', (req, res) =>
  issuerCredentialController.decideRenewalRequest(req, res, req.app.locals.getContractAndGateway)
);

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
