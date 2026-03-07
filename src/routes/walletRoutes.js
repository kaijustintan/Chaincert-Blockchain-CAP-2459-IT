const express = require('express');

const authController = require('../controllers/authController');

const router = express.Router();

// ======================================================
// STUDENT / WALLET CREDENTIAL ROUTES
// ======================================================

// GET /api/wallet/credentials/:holderID
// Get student wallet credentials (CouchDB reads).
router.get('/credentials/:holderID', authController.getUserCredentials);

// PATCH /api/wallet/visibility/:credentialId
// Update credential visibility state.
router.patch('/visibility/:credentialId', authController.updateCredentialVisibility);

// PATCH /api/wallet/order/:credentialId
// Update credential display order.
router.patch('/order/:credentialId', authController.updateCredentialOrder);

module.exports = router;