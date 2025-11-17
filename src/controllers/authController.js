// src/controllers/authController.js

const couchDB = require('../couchDB_service');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const authController = {
  // POST /api/auth/register - User registration
  register: async (req, res) => {
    try {
      const { username, email, password, role, org } = req.body;
      
      // Use fullName if username is missing (for consistency)
      const fullName = req.body.fullName || username; 

      if (!fullName || !password || !email) {
        return res.status(400).json({
          success: false,
          message: 'Full Name, password, and email are required'
        });
      }

      // ✅ STRICT CHECK: Is this email already in use?
      console.log(`[REGISTER] Checking if email "${email}" exists...`);
      
      const userExists = await couchDB.checkIfUserExists(email);
      
      if (userExists) {
        console.log('[REGISTER] ❌ Email already registered.');
        return res.status(409).json({ // 409 Conflict
          success: false,
          message: 'This email is already registered. Please login instead.'
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const userData = {
        type: 'user',
        username: fullName,
        fullName: fullName,
        email,
        password: hashedPassword,
        role: role || 'student',
        org: org || 'org1',
        createdAt: new Date(),
        isActive: true
      };
      
      const result = await couchDB.saveUser(userData);
      
      return res.status(201).json({
        success: true,
        message: 'User registered successfully',
        userId: result.id
      });
    } catch (error) {
      console.error('Registration error:', error);
      return res.status(500).json({
        success: false,
        message: `Registration error: ${error.message}`
      });
    }
  },

  // POST /api/auth/login - User login
  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      const users = await couchDB.getAllUsers();
      const user = users.find(u => u.email === email && u.type === 'user');

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid password'
        });
      }

      const token = jwt.sign(
        {
          userId: user._id,
          email: user.email,
          role: user.role,
          username: user.username
        },
        process.env.JWT_SECRET || 'your_jwt_secret',
        { expiresIn: '7d' }
      );

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          name: user.username,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({
        success: false,
        message: `Login error: ${error.message}`
      });
    }
  },

  // GET /api/auth/user/:id - Get user info
  getUserInfo: async (req, res) => {
    try {
      const { id } = req.params;
      const user = await couchDB.getUser(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      return res.status(200).json({
        success: true,
        user: {
          id: user._id,
          name: user.username,
          email: user.email,
          role: user.role,
          summary: user.summary || '',
          isPublic: user.isPublic,
          profilePicture: user.profilePicture || null
        }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: `User lookup error: ${error.message}`
      });
    }
  },

  // GET /api/auth/users - Get all users (Admin only)
  getAllUsers: async (req, res) => {
    try {
      const users = await couchDB.getAllUsers();
      const filteredUsers = users.filter(u => u.type === 'user');

      return res.status(200).json({
        success: true,
        message: 'Users retrieved successfully',
        users: filteredUsers,
        count: filteredUsers.length
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: `Retrieve users error: ${error.message}`
      });
    }
  },

  // POST /api/auth/update-profile
  updateProfile: async (req, res) => {
    try {
      const { userId, summary, isPublic } = req.body;
      const result = await couchDB.updateProfile(userId, { summary, isPublic });

      return res.status(200).json({
        success: true,
        message: 'Profile updated',
        data: result
      });
    } catch (error) {
      console.error('Update profile error:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // POST /api/auth/change-password
  changePassword: async (req, res) => {
    try {
      const { email, currentPassword, newPassword } = req.body;

      // 1. Check the 'users' database first
      const allUsers = await couchDB.getAllUsers();
      let user = allUsers.find(u => u.email === email);

      // 2. If not found, check the 'issuers' database
      if (!user) {
        user = await couchDB.getApprovedIssuer(email);
      }

      // 3. If still not found, NOW we can say they don't exist.
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const passwordMatch = await bcrypt.compare(currentPassword, user.password);
      if (!passwordMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid current password'
        });
      }

      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      await couchDB.updateUser(user._id, { password: hashedNewPassword });

      return res.status(200).json({
        success: true,
        message: 'Password updated successfully'
      });
    } catch (error) {
      console.error('Change password error:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // POST /api/auth/upload-profile-picture
  uploadProfilePicture: async (req, res) => {
    try {
      const { userId } = req.body;
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded.'
        });
      }

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is missing.'
        });
      }

      const fileBuffer = file.buffer;
      const fileType = file.mimetype;
      const base64Image = `data:${fileType};base64,${fileBuffer.toString('base64')}`;

      await couchDB.updateUser(userId, {
        profilePicture: base64Image
      });

      return res.status(200).json({
        success: true,
        message: 'Profile picture updated!',
        imageUrl: base64Image
      });
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // ========== ISSUER REGISTRATION ENDPOINTS ==========

  // POST /api/auth/register-issuer
  registerIssuer: async (req, res) => {
    try {
      const { orgName, contactName, email, password, confirmPassword } = req.body;

      console.log('=== ISSUER REGISTRATION DEBUG START (authController) ===');
      console.log('[1] Organization Name from request:', orgName);

      if (!orgName || !contactName || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'All fields are required'
        });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'Passwords do not match'
        });
      }

      // ✅ CHECK 1: IS ORG ALREADY REGISTERED?
      console.log(`[2] Checking if "${orgName}" is already registered...`);
      const alreadyExists = await couchDB.checkIfIssuerExists(orgName);

      if (alreadyExists) {
        console.log('[2.5] ❌ REJECTING: Organization already registered.');
        return res.status(409).json({
          success: false,
          message: `Organization "${orgName}" is already registered or pending approval.`
        });
      }

      // ✅ CHECK 2: IS ORG ACCREDITED?
      console.log(`[3] Checking accreditation for "${orgName}"...`);
      const accreditationCheck = await couchDB.checkIfOrgAccredited(orgName);

      console.log('[3.5] Accreditation check result:', accreditationCheck);

      if (!accreditationCheck.isAccredited) {
        console.log('[4] ❌ REJECTING registration: Organization is not accredited.');
        return res.status(403).json({
          success: false,
          accredited: false,
          message: `Organization "${orgName}" is not accredited. Registration denied.`
        });
      }

      console.log('[5] ✅ PASSED ACCREDITATION. Proceeding with registration...');
      const hashedPassword = await bcrypt.hash(password, 10);

      const issuerData = {
        orgName,
        contactName,
        email,
        password: hashedPassword,
        documents: req.file ? [req.file] : []
      };

      console.log('[6] Saving to CouchDB...');
      const result = await couchDB.createIssuerRegistration(issuerData, accreditationCheck);

      console.log('[7] Registration result:', result);
      console.log('=== ISSUER REGISTRATION DEBUG END ===\n');

      return res.status(201).json({
        success: true,
        message: 'Issuer registration submitted successfully',
        issuerId: result.id,
        accredited: true
      });
    } catch (error) {
      console.error('Issuer registration error:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // GET /api/auth/pending-issuers
  getPendingIssuers: async (req, res) => {
    try {
      const pendingIssuers = await couchDB.getPendingIssuers();

      return res.status(200).json({
        success: true,
        data: pendingIssuers
      });
    } catch (error) {
      console.error('Error fetching pending issuers:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // POST /api/auth/approve-issuer/:issuerId
  approveIssuer: async (req, res) => {
    try {
      const { issuerId } = req.params;
      const result = await couchDB.approveIssuer(issuerId, req.user?.id || 'admin');

      return res.status(200).json({
        success: true,
        message: 'Issuer approved successfully',
        data: result
      });
    } catch (error) {
      console.error('Error approving issuer:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // POST /api/auth/reject-issuer/:issuerId
  rejectIssuer: async (req, res) => {
    try {
      const { issuerId } = req.params;
      const { rejectionReason } = req.body;

      const result = await couchDB.rejectIssuer(issuerId, rejectionReason);

      return res.status(200).json({
        success: true,
        message: 'Issuer rejected',
        data: result
      });
    } catch (error) {
      console.error('Error rejecting issuer:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // POST /api/auth/login-issuer
  loginIssuer: async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      const issuer = await couchDB.getApprovedIssuer(email);

      if (!issuer) {
        return res.status(401).json({
          success: false,
          message: 'Issuer not found or not approved yet'
        });
      }

      const passwordMatch = await bcrypt.compare(password, issuer.password);
      if (!passwordMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid password'
        });
      }

      const token = jwt.sign(
        {
          _id: issuer._id,
          email: issuer.email,
          role: 'issuer',
          orgName: issuer.orgName
        },
        process.env.JWT_SECRET || 'your_jwt_secret',
        { expiresIn: '7d' }
      );

      return res.status(200).json({
        success: true,
        token,
        user: {
          id: issuer._id,
          email: issuer.email,
          role: 'issuer',
          name: issuer.orgName,
          username: issuer.orgName,
          orgName: issuer.orgName
        }
      });
    } catch (error) {
      console.error('Issuer login error:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // ========== NEW FUNCTION: GET ISSUER CREDENTIALS ==========
  // GET /api/auth/issuer/:issuerId/credentials
  getIssuerCredentials: async (req, res) => {
    try {
      const { issuerId } = req.params;

      console.log(`[AUTHCONTROLLER] Fetching credentials for issuer: ${issuerId}`);

      if (!issuerId) {
        return res.status(400).json({
          success: false,
          message: 'Issuer ID is required'
        });
      }

      // Get credentials from couchDB for this issuer
      const credentialsData = await couchDB.getIssuerCredentials(issuerId);

      console.log(`[AUTHCONTROLLER] Credentials data received:`, credentialsData);

      if (!credentialsData || !credentialsData.credentials || credentialsData.credentials.length === 0) {
        return res.status(200).json({
          success: true,
          message: 'No credentials found for this issuer',
          data: {
            issuerId: issuerId,
            issuerName: credentialsData?.issuerName || 'Unknown',
            email: credentialsData?.email || 'N/A',
            credentialCount: 0,
            credentials: []
          }
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Credentials retrieved successfully',
        data: {
          issuerId: credentialsData.issuerId,
          issuerName: credentialsData.issuerName,
          email: credentialsData.email,
          credentialCount: credentialsData.credentialCount,
          credentials: credentialsData.credentials
        }
      });
    } catch (error) {
      console.error('Error fetching issuer credentials:', error);
      return res.status(500).json({
        success: false,
        message: `Error fetching credentials: ${error.message}`
      });
    }
  }
};

module.exports = authController;