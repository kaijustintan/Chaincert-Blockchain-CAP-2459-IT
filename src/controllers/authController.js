// authController.js
const couchDB = require('../couchDB_service');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
// removed wallet 

const authController = {
  // POST /api/auth/register - User registration
  // KAI -CHANGES 
register: async (req, res) => { 
  try {
    const { username, email, password, role, org } = req.body;
    if (!username || !password || !email) {
      return res.status(400).json({
        success: false,
        message: 'Username, password, and email are required'
      });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const userData = {
      type: 'user',
      username,
      email,
      password: hashedPassword,
      role: role || 'student',
      org: org || 'org1',
      createdAt: new Date(),
      isActive: true
    };
    // Save user WITHOUT walletId
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
          summary: user.summary || '', // ✅ <-- ADDED THIS LINE
          isPublic: user.isPublic,    // ✅ <-- AND ADDED THIS LINE
          profilePicture: user.profilePicture || null // ✅ <-- ADD THIS LINE
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


  // ========== ADD THIS FUNCTION ==========
  updateProfile: async (req, res) => {
    try {
      const { userId, summary, isPublic } = req.body;
      const result = await couchDB.updateProfile(userId, { summary, isPublic });
      return res.status(200).json({ success: true, message: 'Profile updated', data: result });
    } catch (error) {
      console.error('Update profile error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },


  // ========== AND ADD THIS FUNCTION ==========
  changePassword: async (req, res) => {
    try {
      const { email, currentPassword, newPassword } = req.body;


      // --- START OF FIX ---
      // We need to find the user in BOTH databases.
      
      // 1. Check the 'users' database first
      const allUsers = await couchDB.getAllUsers();
      let user = allUsers.find(u => u.email === email);


      // 2. If not found, check the 'issuers' database
      if (!user) {
        // This function searches the 'issuers' db by email
        user = await couchDB.getApprovedIssuer(email);
      }


      // 3. If still not found, NOW we can say they don't exist.
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      // --- END OF FIX ---


      const passwordMatch = await bcrypt.compare(currentPassword, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ success: false, message: 'Invalid current password' });
      }


      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      
      // This function IS smart (we fixed it before), so it will
      // correctly update either a user or an issuer.
      await couchDB.updateUser(user._id, { password: hashedNewPassword });


      return res.status(200).json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
      console.error('Change password error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },


  // ========== ADD THIS NEW FUNCTION ==========
  uploadProfilePicture: async (req, res) => {
    try {
      const { userId } = req.body;
      const file = req.file;


      if (!file) {
        return res.status(400).json({ success: false, message: 'No file uploaded.' });
      }


      if (!userId) {
        return res.status(400).json({ success: false, message: 'User ID is missing.' });
      }


      // We will just save the image buffer directly to the database for simplicity.
      // NOTE: This is simple, but not ideal for large files.
      // A better way is to save the file to disk and store the file path.
      
      // Convert the image buffer to base64
      const fileBuffer = file.buffer;
      const fileType = file.mimetype;
      const base64Image = `data:${fileType};base64,${fileBuffer.toString('base64')}`;


      // Call couchDB to update the user
      await couchDB.updateUser(userId, {
        profilePicture: base64Image
      });


      return res.status(200).json({
        success: true,
        message: 'Profile picture updated!',
        imageUrl: base64Image // Send the new image back
      });


    } catch (error) {
      console.error('Error uploading profile picture:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },


  // ========== ISSUER REGISTRATION ENDPOINTS ==========


  // POST /api/auth/register-issuer
registerIssuer: async (req, res) => {
  try {
    const { orgName, contactName, email, password, confirmPassword } = req.body;


    console.log('=== ISSUER REGISTRATION DEBUG START (authController) ===');
    console.log('[1] Organization Name from request:', orgName);
    console.log('[1b] Contact Name from request:', contactName);


    if (!orgName || !contactName || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }


    // ---- ACCREDITATION CHECK FIRST ----
    console.log(`[2] Checking accreditation for "${orgName}"...`);
    
    // ✅ FIXED: Call the correct function from couchDB_service
    // This function returns an object: { isAccredited: boolean, accreditedType: string }
    const accreditationCheck = await couchDB.checkIfOrgAccredited(orgName);


    console.log('[3] Accreditation check result:', accreditationCheck);


    if (!accreditationCheck.isAccredited) {
      console.log('[4] ❌ REJECTING registration: Organization is not accredited.');
      console.log('=== ISSUER REGISTRATION DEBUG END ===\n');
      return res.status(403).json({
        success: false,
        accredited: false,
        message: `Organization "${orgName}" is not accredited. Registration denied.`
      });
    }
    // ------------------------------------


    console.log('[5] ✅ PASSED ACCREDITATION. Proceeding with registration...');
    const hashedPassword = await bcrypt.hash(password, 10);


    const issuerData = {
      orgName,
      contactName,
      email,
      password: hashedPassword,
      // ✅ FIXED: Use req.file (from upload.single) not req.files
      documents: req.file ? [req.file] : [] 
      // We no longer hardcode 'accredited: true' here
    };


    console.log('[6] Saving to CouchDB...');
    
    // ✅ FIXED: Pass the 'accreditationCheck' object to the database function
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
    return res.status(500).json({ success: false, message: error.message });
  }
},


  // GET /api/auth/pending-issuers
  getPendingIssuers: async (req, res) => {
    try {
      const pendingIssuers = await couchDB.getPendingIssuers();
      res.status(200).json({
        success: true,
        data: pendingIssuers
      });
    } catch (error) {
      console.error('Error fetching pending issuers:', error);
      res.status(500).json({
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
      res.status(200).json({
        success: true,
        message: 'Issuer approved successfully',
        data: result
      });
    } catch (error) {
      console.error('Error approving issuer:', error);
      res.status(500).json({
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
      res.status(200).json({
        success: true,
        message: 'Issuer rejected',
        data: result
      });
    } catch (error) {
      console.error('Error rejecting issuer:', error);
      res.status(500).json({
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
          orgName: issuer.orgName,
          fabricIdentity: issuer.fabricIdentity  // ← ADD THIS LINE!
        },
        process.env.JWT_SECRET || 'your_jwt_secret',
        { expiresIn: '7d' }
      );
      res.status(200).json({
        success: true,
        token,
        user: {
          id: issuer._id,
          email: issuer.email,
          role: 'issuer',
          name: issuer.orgName
        }
      });
    } catch (error) {
      console.error('Issuer login error:', error);
      res.status(500).json({
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
