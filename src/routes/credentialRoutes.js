const express = require('express');

const authController = require('../controllers/authController');

const router = express.Router();

// GET /api/credentials/credentials/user/:holderID - Get student wallet credentials (CouchDB reads).
router.get('/credentials/user/:holderID', authController.getUserCredentials);

// PATCH /api/credentials/credentials/:credentialId/visibility - Update credential visibility state.
router.patch('/credentials/:credentialId/visibility', authController.updateCredentialVisibility);

// PATCH /api/credentials/credentials/:credentialId/order - Update credential display order.
router.patch('/credentials/:credentialId/order', authController.updateCredentialOrder);

module.exports = router;
