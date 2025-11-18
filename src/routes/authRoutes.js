// authRoutes.js - Express routes for authentication endpoints
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const verifierController = require('../controllers/verifierController');
const couchDB = require('../couchDB_service');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const issuerCredentialController = require('../controllers/issuerCredentialController');

// ========== EXISTING ROUTES (KEEP ALL INTACT) ==========

// POST /api/auth/register - Register a new user
router.post('/register', authController.register);

// POST /api/auth/login - Login user
router.post('/login', authController.login);

// GET /api/auth/user/:id - Get user information
router.get('/user/:id', authController.getUserInfo);

// GET /api/auth/users - Get all users
router.get('/users', authController.getAllUsers);

// POST /api/auth/update-profile - Update user profile
router.post('/update-profile', authController.updateProfile);

// POST /api/auth/change-password - Change password
router.post('/change-password', authController.changePassword);

// POST /api/auth/upload-pfp - Upload profile picture
router.post('/upload-pfp', upload.single('profilePicture'), authController.uploadProfilePicture);

// ========== ISSUER ROUTES (KEEP ALL INTACT) ==========

// POST /api/auth/register-issuer - Register a new issuer
router.post('/register-issuer', upload.single('documents'), authController.registerIssuer);

// POST /api/auth/login-issuer - Login issuer
router.post('/login-issuer', authController.loginIssuer);

// GET /api/auth/pending-issuers - Get pending issuer registrations (Admin)
router.get('/pending-issuers', authController.getPendingIssuers);

// POST /api/auth/approve-issuer/:issuerId - Approve issuer (Admin)
router.post('/approve-issuer/:issuerId', authController.approveIssuer);

// POST /api/auth/reject-issuer/:issuerId - Reject issuer (Admin)
router.post('/reject-issuer/:issuerId', authController.rejectIssuer);

// ========== CREDENTIAL ROUTES (KEEP ALL INTACT) ==========

// GET /api/auth/issuer/:issuerId/credentials - Get issuer credentials
router.get('/issuer/:issuerId/credentials', authController.getIssuerCredentials);

// ========== VERIFICATION ROUTES - SIMPLIFIED FOR VERIFIER MODULE ==========

// GET /api/auth/verify/:credentialID - Verify credential by ID
router.get('/verify/:credentialID', async (req, res) => {
  try {
    const { credentialID } = req.params;

    if (!credentialID) {
      return res.status(400).json({
        success: false,
        message: 'Credential ID is required'
      });
    }

    console.log(`[ROUTES] Verifier verification: ${credentialID}`);

    // Call the verifier controller
    await verifierController.verifyCredentialByID(req, res);

  } catch (error) {
    console.error('[ROUTES] Error in verify route:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/auth/verify - Alternative POST endpoint
router.post('/verify', async (req, res) => {
  try {
    const { credentialID } = req.body;

    if (!credentialID) {
      return res.status(400).json({
        success: false,
        message: 'Credential ID is required in body'
      });
    }

    console.log(`[ROUTES] POST verify: ${credentialID}`);

    req.params.credentialID = credentialID;
    await verifierController.verifyCredentialByID(req, res);

  } catch (error) {
    console.error('[ROUTES] Error in verify POST:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/auth/verify-stats - Get verification statistics
router.get('/verify-stats', async (req, res) => {
  try {
    console.log(`[ROUTES] Fetching verification statistics`);
    await verifierController.getVerificationStats(req, res);
  } catch (error) {
    console.error('[ROUTES] Error fetching verification stats:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ========== LEGACY ROUTES (BACKWARD COMPATIBILITY) ==========

router.get('/verify-credential/:credentialID', async (req, res) => {
  try {
    const { credentialID } = req.params;
    req.params.credentialID = credentialID;
    await verifierController.verifyCredentialByID(req, res);
  } catch (error) {
    console.error('[ROUTES] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
