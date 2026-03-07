const express = require('express');
const multer = require('multer');

const authController = require('../controllers/authController');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/auth/register - Register a new user account.
router.post('/register', authController.register);

// POST /api/auth/login - Authenticate a user account.
router.post('/login', authController.login);

// GET /api/auth/user/:id - Fetch user profile details by user id.
router.get('/user/:id', authController.getUserInfo);

// GET /api/auth/users - List users.
router.get('/users', authController.getAllUsers);

// POST /api/auth/update-profile - Update user profile fields.
router.post('/update-profile', authController.updateProfile);

// POST /api/auth/change-password - Change account password.
router.post('/change-password', authController.changePassword);

// POST /api/auth/upload-pfp - Upload/update profile picture.
router.post('/upload-pfp', upload.single('profilePicture'), authController.uploadProfilePicture);

// POST /api/auth/register-issuer - Submit issuer registration with attachments.
router.post('/register-issuer', upload.any(), authController.registerIssuer);

// POST /api/auth/login-issuer - Authenticate an issuer account.
router.post('/login-issuer', authController.loginIssuer);

module.exports = router;
