const express = require('express');

const walletController = require('../controllers/walletController');

const router = express.Router();

// ======================================================
// STUDENT / WALLET CREDENTIAL ROUTES
// ======================================================

// GET /api/wallet/credentials/:holderID
// Get student wallet credentials (CouchDB reads).
router.get('/credentials/:holderID', walletController.getUserCredentials);

// GET /api/wallet/my-verifications
// Phase 4: the authenticated holder's OWN verification logs (server-side filtered, no IDOR).
// getContractAndGateway is injected from app.locals (set in sdk-server-fixed.js).
router.get('/my-verifications', (req, res) =>
  walletController.getMyVerifications(req, res, req.app.locals.getContractAndGateway)
);

// C11: credential renewal requests — holder side (identity derived from the JWT; no IDOR).
// POST /api/wallet/renewal-requests   — ask the issuer to renew one of YOUR credentials
// GET  /api/wallet/renewal-requests   — your own requests (pending "Requested" button state)
router.post('/renewal-requests', walletController.requestCredentialRenewal);
router.get('/renewal-requests', walletController.getMyRenewalRequests);

// PATCH /api/wallet/visibility/:credentialId
// Update credential visibility state.
router.patch('/visibility/:credentialId', walletController.updateCredentialVisibility);

// PATCH /api/wallet/order/:credentialId
// Update credential display order.
router.patch('/order/:credentialId', walletController.updateCredentialOrder);

// PATCH /api/wallet/issuer-template-visibility/:credentialId
// Update issuer template visibility state.
router.patch('/issuer-template-visibility/:credentialId', walletController.updateIssuerTemplateVisibility);

// GET /api/wallet/notifications/:holderID
router.get('/notifications/:holderID', walletController.getUserNotifications);

// GET /api/wallet/notifications/:holderID/unread
router.get('/notifications/:holderID/unread', walletController.getUnreadUserNotifications);

// PATCH /api/wallet/notifications/:notificationId/read
router.patch('/notifications/:notificationId/read', walletController.markNotificationAsRead);

module.exports = router;
