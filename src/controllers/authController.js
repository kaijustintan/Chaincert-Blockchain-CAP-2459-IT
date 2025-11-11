const couchDB = require('../couchDB_service');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');


const authController = {
  // POST /api/auth/register - User registration
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
          role: user.role
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


  // ========== ISSUER REGISTRATION ENDPOINTS ==========


  // POST /api/auth/register-issuer
  registerIssuer: async (req, res) => {
    try {
      const { orgName, contactName, email, password, confirmPassword } = req.body;
      
      console.log('=== ISSUER REGISTRATION DEBUG START ===');
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
      const hashedPassword = await bcrypt.hash(password, 10);


      // Check the accredited_organizations database for accredited status
      let accredited = false;
      
      console.log('[2] Fetching accredited organizations...');
      const accreditedOrgs = await couchDB.getAllAccreditedOrganizations();
      
      console.log('[3] Total accredited orgs found:', accreditedOrgs.length);
      console.log('[4] Accredited orgs list:');
      accreditedOrgs.forEach((org, index) => {
        console.log(`    Org ${index + 1}:`, {
          _id: org._id,
          orgName: org.orgName || 'N/A',
          isAccredited: org.isAccredited,
          status: org.status
        });
      });


      if (orgName) {
        // FIXED: Only use orgName field (not org.name)
        const inputOrgTrimmed = orgName.trim();
        console.log('[5] Input org (preserving case):', inputOrgTrimmed);


        accredited = accreditedOrgs.some(org => {
          // ✅ ONLY CHECK orgName field (since both DBs use orgName)
          const orgNameFromDB = (org.orgName || '').trim();
          
          // CASE-INSENSITIVE comparison
          const nameMatch = orgNameFromDB.toLowerCase() === inputOrgTrimmed.toLowerCase();
          const isActiveAccredited = org.isAccredited === true && org.status === 'active';
          
          const matchResult = nameMatch && isActiveAccredited;
          
          console.log(`[6] Checking org "${orgNameFromDB}":`, {
            orgNameFromDB,
            inputOrgTrimmed,
            nameMatch,
            isActiveAccredited,
            finalMatch: matchResult
          });
          
          return matchResult;
        });


        console.log('[7] Final accredited value:', accredited);
      }


        const issuerData = {
      orgName: orgName,
      contactName: contactName,
      email: email,
      password: hashedPassword,
      documents: req.files || [],
      accredited: Boolean(accredited) // ✅ FORCE IT TO BOOLEAN
    };

    console.log('[8] Issuer data being sent to CouchDB - EXPLICIT CHECKS:', {
      orgName: issuerData.orgName,
      accredited: issuerData.accredited,
      accreditedRaw: accredited,
      accreditedType: typeof issuerData.accredited,
      fullIssuerData: JSON.stringify(issuerData)
    });

    const result = await couchDB.createIssuerRegistration(issuerData);

      
      console.log('[9] Registration result:', result);
      console.log('=== ISSUER REGISTRATION DEBUG END ===\n');


      res.status(201).json({
        success: true,
        message: 'Issuer registration submitted successfully',
        issuerId: result.id,
        accredited: accredited
      });
    } catch (error) {
      console.error('Issuer registration error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
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
          orgName: issuer.orgName
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
  }
};


module.exports = authController;
