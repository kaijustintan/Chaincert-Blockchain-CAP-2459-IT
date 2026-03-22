const express = require('express');

const walletController = require('../controllers/walletController');

const router = express.Router();

// ======================================================
// STUDENT / WALLET CREDENTIAL ROUTES
// ======================================================

// GET /api/wallet/credentials/:holderID
// Get student wallet credentials (CouchDB reads).
router.get('/credentials/:holderID', walletController.getUserCredentials);

// PATCH /api/wallet/visibility/:credentialId
// Update credential visibility state.
router.patch('/visibility/:credentialId', walletController.updateCredentialVisibility);

// PATCH /api/wallet/issuer/template-visibility/:credentialId
// Update issuer template visibility state.
router.patch('/issuer/template-visibility/:credentialId', walletController.updateIssuerTemplateVisibility);

// PATCH /api/wallet/order/:credentialId
// Update credential display order.
router.patch('/order/:credentialId', walletController.updateCredentialOrder);

// GET /api/wallet/notifications/:holderID
router.get('/notifications/:holderID', walletController.getUserNotifications);

// GET /api/wallet/notifications/:holderID/unread
router.get('/notifications/:holderID/unread', walletController.getUnreadUserNotifications);

// PATCH /api/wallet/notifications/:notificationId/read
router.patch('/notifications/:notificationId/read', walletController.markNotificationAsRead);

module.exports = router;
