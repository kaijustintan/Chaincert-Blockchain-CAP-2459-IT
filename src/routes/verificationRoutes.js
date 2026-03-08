const express = require('express');

const verifierController = require('../controllers/verifierController');

const router = express.Router();

// ======================================================
// VERIFICATION ACTIONS
// ======================================================

// GET /api/verify/verify/:credentialId
// Verify credential by ID from URL params.
router.get('/verify/:credentialId', (req, res) => {
  return verifierController.Verify_Credential(
    req,
    res,
    req.app.locals.getContractAndGateway
  );
});

// POST /api/verify/verify
// Verify credential by ID from request body.
router.post('/verify', (req, res) => {
  const { credentialID, credentialId } = req.body || {};
  const resolvedCredentialId = credentialId || credentialID;

  if (!resolvedCredentialId) {
    return res.status(400).json({
      success: false,
      message: 'Credential ID is required in body',
    });
  }

  req.params.credentialId = resolvedCredentialId;
  return verifierController.Verify_Credential(
    req,
    res,
    req.app.locals.getContractAndGateway
  );
});

// GET /api/verify/verify-stats
// Get verification statistics.
router.get('/verify-stats', verifierController.getVerificationStats);

// GET /api/verify/verify-credential/:credentialId
// Legacy verification endpoint alias.
router.get('/verify-credential/:credentialId', (req, res) => {
  return verifierController.Verify_Credential(
    req,
    res,
    req.app.locals.getContractAndGateway
  );
});

// ======================================================
// VERIFICATION LOG ROUTES
// (Merged from verificationApiRoutes.js)
// ======================================================

// GET /api/verify/verification-logs
// Get all verification logs.
router.get('/verification-logs', (req, res) => {
  return verifierController.getAllVerificationLogs(
    req,
    res,
    req.app.locals.getContractAndGateway
  );
});

// GET /api/verify/verification-logs/:logId
// Get one verification log by ID.
router.get('/verification-logs/:logId', (req, res) => {
  return verifierController.getVerificationLogById(
    req,
    res,
    req.app.locals.getContractAndGateway
  );
});

module.exports = router;
