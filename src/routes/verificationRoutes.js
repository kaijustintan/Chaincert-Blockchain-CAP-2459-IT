const express = require('express');

const verifierController = require('../controllers/verifierController');

const router = express.Router();

// GET /api/verify/verify/:credentialID - Verify credential by ID in URL params.
router.get('/verify/:credentialID', verifierController.verifyCredentialByID);

// POST /api/verify/verify - Verify credential by ID in request body.
router.post('/verify', (req, res, next) => {
  const { credentialID } = req.body || {};
  if (!credentialID) {
    return res.status(400).json({
      success: false,
      message: 'Credential ID is required in body',
    });
  }
  req.params.credentialID = credentialID;
  return verifierController.verifyCredentialByID(req, res, next);
});

// GET /api/verify/verify-stats - Get verification statistics.
router.get('/verify-stats', verifierController.getVerificationStats);

// GET /api/verify/verify-credential/:credentialID - Legacy verification endpoint alias.
router.get('/verify-credential/:credentialID', verifierController.verifyCredentialByID);

module.exports = router;
