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

// PATCH /api/wallet/order/:credentialId
// Update credential display order.
router.patch('/order/:credentialId', walletController.updateCredentialOrder);

module.exports = router;
