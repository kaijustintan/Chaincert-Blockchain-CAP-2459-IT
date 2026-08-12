const express = require('express');

const verifierController = require('../controllers/verifierController');
const { requireAdmin } = require('../securityHelpers');

const router = express.Router();

// ======================================================
// VERIFICATION ACTIONS
// ======================================================
// The credential-verification endpoints below are PUBLIC by design — that is the product: anyone
// holding a credential ID or a shared link can check it without an account. Only the LOG-reading
// endpoints at the bottom are privileged.

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
// Admin-only: this runs an unindexed full scan ({_id:{$gt:null}}, limit 100000) over the
// verification set. Left anonymous it is a free amplification primitive any script can spam.
router.get('/verify-stats', requireAdmin, verifierController.getVerificationStats);

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
// VERIFICATION LOG ROUTES  (ADMIN ONLY)
// (Merged from verificationApiRoutes.js)
// ======================================================
// These were documented as "admin-only globally" but had NO check of any kind: /api/verify is
// mounted without requireAuth, and verifierController only read req.user to pick a Fabric identity
// (falling through to the generic 'admin' identity for anonymous callers, then proceeding). So an
// unauthenticated GET returned every verification event ever recorded — credential IDs, holder IDs,
// verifier emails, timestamps, results — and the enrichment loop's user.email fallback added holder
// addresses on top.
//
// This also silently defeated the scoped endpoints built elsewhere: walletController.getMyVerifications
// and issuerCredentialController.getIssuerVerifications both filter this same dataset server-side,
// which is pointless while the unfiltered feed is open. It contradicted the deliberate VERIFY2
// decision (verifierController.js:270-272) to withhold holder PII from verifiers.

// GET /api/verify/verification-logs
// Get all verification logs.
router.get('/verification-logs', requireAdmin, (req, res) => {
  return verifierController.getAllVerificationLogs(
    req,
    res,
    req.app.locals.getContractAndGateway
  );
});

// GET /api/verify/verification-logs/:logId
// Get one verification log by ID.
router.get('/verification-logs/:logId', requireAdmin, (req, res) => {
  return verifierController.getVerificationLogById(
    req,
    res,
    req.app.locals.getContractAndGateway
  );
});

module.exports = router;
