// ==========================================================================================================================================================================
//                                                                       authController.js 
// ==========================================================================================================================================================================
/*
  Technical:
  This is the backend "handler layer" for authentication-related endpoints.
  Siya yung tumatanggap ng request galing routes (authRoutes.js), then siya yung gumagawa ng logic:
    - validate inputs
    - hash/compare passwords
    - generate JWT token
    - call couchDB_service.js to save/fetch/update data

  Tropang Ex:
  Siya yung "brain" ng auth endpoints.
      authRoutes = traffic enforcer (URL mapping)
      authController = actual worker (logic)
      couchDB_service = database middleman

  Used when:
  - may nag-register/login (user or issuer)
  - may nag-update ng profile/password/pfp
  - admin actions: view pending issuers, approve/reject
  - issuer dashboard wants fast CouchDB fetch of credentials
*/

const couchDB = require('../couchDB_service');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
// removed wallet 

const authController = {

  // ========================================================================================================================================================================
  //                                                               USER AUTH (REGISTER / LOGIN)
  // ========================================================================================================================================================================

  /*
    Endpoint: POST /api/auth/register
    Function Name: register

    Technical:
    Registers a new regular user (student/admin).
    - Validates required fields
    - Hashes password using bcrypt
    - Saves user document to CouchDB via couchDB.saveUser()
    - Returns created userId

    Tropang Ex:
    Signup ng student/admin. Safe kasi hashed yung password.
    Note: WalletId removed na, so user record = basic identity info lang.
  */
  register: async (req, res) => { 
    try {
      /* Step 1: Extract request body fields */
      const { username, email, password, role, org } = req.body;

      /* Step 2: Basic validation (required fields) */
      if (!username || !password || !email) {
        return res.status(400).json({
          success: false,
          message: 'Username, password, and email are required'
        });
      }

      /* Step 3: Hash password (never store plain text) */
      const hashedPassword = await bcrypt.hash(password, 10);

      /* Step 4: Build user document to be stored in CouchDB */
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

      /* Step 5: Save user in CouchDB (via service layer) */
      const result = await couchDB.saveUser(userData);

      /* Step 6: Return success response */
      return res.status(201).json({
        success: true,
        message: 'User registered successfully',
        userId: result.id
      });

    } catch (error) {
      /* Step 7: Handle server errors */
      console.error('Registration error:', error);
      return res.status(500).json({
        success: false,
        message: `Registration error: ${error.message}`
      });
    }
  },

  // ========================================================================================================================================================================

  /*
    Endpoint: POST /api/auth/login
    Function Name: login

    Technical:
    Logs in a regular user.
    - Validates email/password
    - Loads all users from CouchDB and finds matching email
    - Compares bcrypt password hash
    - Generates JWT token (7 days expiry)
    - Returns token + basic user payload

    Tropang Ex:
    Login ng student/admin. If tama password → bibigyan ka ng token, tapos gamitin yun sa protected endpoints.
  */
  login: async (req, res) => {
    try {
      /* Step 1: Validate request inputs */
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      /* Step 2: Fetch all users and find the matching USER record */
      const users = await couchDB.getAllUsers();
      const user = users.find(u => u.email === email && u.type === 'user');

      /* Step 3: If not found, reject */
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      /* Step 4: Compare password */
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid password'
        });
      }

      /* Step 5: Create JWT token (contains identity claims) */
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

      /* Step 6: Return token + basic user info (frontend-friendly payload) */
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
      /* Step 7: Handle server errors */
      console.error('Login error:', error);
      return res.status(500).json({
        success: false,
        message: `Login error: ${error.message}`
      });
    }
  },

  // ========================================================================================================================================================================
  //                                                               USER INFO / LISTING
  // ========================================================================================================================================================================

  /*
    Endpoint: GET /api/auth/user/:id
    Function Name: getUserInfo

    Technical:
    Fetches a user (or issuer) document via couchDB.getUser(id). Returns only safe public fields (no password).

    Tropang Ex:
    Pang refresh ng profile page. Kinukuha details ni user like bio + pfp.
  */
  getUserInfo: async (req, res) => {
    try {
      /* Step 1: Get userId from params */
      const { id } = req.params;

      /* Step 2: Fetch doc from CouchDB (smart DB selection happens inside getUser) */
      const user = await couchDB.getUser(id);

      /* Step 3: If no doc found, 404 */
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      /* Step 4: Return safe trimmed user payload */
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
      /* Step 5: Handle errors */
      return res.status(500).json({
        success: false,
        message: `User lookup error: ${error.message}`
      });
    }
  },

  // ========================================================================================================================================================================

  /*
    Endpoint: GET /api/auth/users
    Function Name: getAllUsers

    Technical:
    Fetches all documents from users DB then filters only type === 'user'.
    Returns list + count.

    Tropang Ex:
    Ginagamit to pang dropdown ni issuer (pipili siya sinong holder/student).

    Note:
    Comment says "Admin only", but this function itself does not enforce admin auth.
    (Access control should be in middleware / route protection.)
  */
  getAllUsers: async (req, res) => {
    try {
      /* Step 1: Fetch all user docs from CouchDB */
      const users = await couchDB.getAllUsers();

      /* Step 2: Filter out only real user accounts */
      const filteredUsers = users.filter(u => u.type === 'user');

      /* Step 3: Return list */
      return res.status(200).json({
        success: true,
        message: 'Users retrieved successfully',
        users: filteredUsers,
        count: filteredUsers.length
      });

    } catch (error) {
      /* Step 4: Handle errors */
      return res.status(500).json({
        success: false,
        message: `Retrieve users error: ${error.message}`
      });
    }
  },

  // ========================================================================================================================================================================
  //                                                               USER SETTINGS (PROFILE / PASSWORD / PFP)
  // ========================================================================================================================================================================

  /*
    Endpoint: POST /api/auth/update-profile
    Function Name: updateProfile

    Technical:
    Updates a user's profile fields via couchDB.updateProfile(userId, {summary, isPublic}).
    Returns CouchDB update response.

    Tropang Ex:
    Pang-edit ng bio + public profile toggle.

    Expected req.body:
    { userId, summary, isPublic }
  */
  updateProfile: async (req, res) => {
    try {
      /* Step 1: Extract payload */
      const { userId, summary, isPublic } = req.body;

      /* Step 2: Update profile fields in DB */
      const result = await couchDB.updateProfile(userId, { summary, isPublic });

      /* Step 3: Return update response */
      return res.status(200).json({
        success: true,
        message: 'Profile updated',
        data: result
      });

    } catch (error) {
      /* Step 4: Handle errors */
      console.error('Update profile error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // ========================================================================================================================================================================

  /*
    Endpoint: POST /api/auth/change-password
    Function Name: changePassword

    Technical:
    Changes password for BOTH:
      - regular users (users DB)
      - approved issuers (issuers DB)
    Steps:
      - find user by email (users first, then issuers)
      - verify current password (bcrypt compare)
      - hash new password
      - update via couchDB.updateUser(user._id, { password })

    Tropang Ex:
    Isang endpoint para sa student/admin AND issuer.
    If tama current password → update to new one.

    Expected req.body:
    { email, currentPassword, newPassword }
  */
  changePassword: async (req, res) => {
    try {
      /* Step 1: Extract payload */
      const { email, currentPassword, newPassword } = req.body;

      /* Step 2: Find user in users DB first */
      const allUsers = await couchDB.getAllUsers();
      let user = allUsers.find(u => u.email === email);

      /* Step 3: If not found, try issuers DB (approved issuers only) */
      if (!user) {
        user = await couchDB.getApprovedIssuer(email);
      }

      /* Step 4: If still not found, 404 */
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      /* Step 5: Verify current password */
      const passwordMatch = await bcrypt.compare(currentPassword, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ success: false, message: 'Invalid current password' });
      }

      /* Step 6: Hash new password */
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      /* Step 7: Update the user/issuer doc (smart DB selection handled by updateUser) */
      await couchDB.updateUser(user._id, { password: hashedNewPassword });

      /* Step 8: Return success */
      return res.status(200).json({ success: true, message: 'Password updated successfully' });

    } catch (error) {
      /* Step 9: Handle errors */
      console.error('Change password error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // ========================================================================================================================================================================

  /*
    Endpoint: POST /api/auth/upload-pfp
    Function Name: uploadProfilePicture

    Technical:
    Uploads profile picture using multer (req.file).
    Converts image buffer to base64 data URL then stores it directly in CouchDB user doc.
    Updates via couchDB.updateUser(userId, { profilePicture })

    Tropang Ex:
    Upload avatar. Simple approach: save as base64 string in DB.
    (Okay for demos, pero heavy pag malalaking images.)

    Expected:
    - req.body.userId
    - req.file from multer (upload.single('profilePicture'))
  */
  uploadProfilePicture: async (req, res) => {
    try {
      /* Step 1: Extract inputs */
      const { userId } = req.body;
      const file = req.file;

      /* Step 2: Validate file + userId */
      if (!file) {
        return res.status(400).json({ success: false, message: 'No file uploaded.' });
      }
      if (!userId) {
        return res.status(400).json({ success: false, message: 'User ID is missing.' });
      }

      /* Step 3: Convert image buffer to base64 data URL */
      const fileBuffer = file.buffer;
      const fileType = file.mimetype;
      const base64Image = `data:${fileType};base64,${fileBuffer.toString('base64')}`;

      /* Step 4: Save base64 string into user record */
      await couchDB.updateUser(userId, {
        profilePicture: base64Image
      });

      /* Step 5: Return success + new image string */
      return res.status(200).json({
        success: true,
        message: 'Profile picture updated!',
        imageUrl: base64Image
      });

    } catch (error) {
      /* Step 6: Handle errors */
      console.error('Error uploading profile picture:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // ========================================================================================================================================================================
  //                                                               ISSUER REGISTRATION / ADMIN REVIEW
  // ========================================================================================================================================================================

  /*
    Endpoint: POST /api/auth/register-issuer
    Function Name: registerIssuer

    Technical:
    Submits an issuer application (NOT auto-approved).
    Flow:
      - validate fields + confirm password
      - check accreditation via couchDB.checkIfOrgAccredited(orgName)
      - if not accredited → 403 deny registration
      - hash password
      - prepare issuerData (includes uploaded doc file if any)
      - create issuer registration doc via couchDB.createIssuerRegistration(issuerData, accreditationCheck)
      - returns issuerId

    Tropang Ex:
    Apply ka muna bilang issuer. Pag hindi accredited org → bagsak agad.
    Pag accredited → mapupunta sa "pending" list for admin approval.

    Expected req.body:
    { orgName, contactName, email, password, confirmPassword }

    Upload:
    upload.single('documents') gives req.file (single file)
  */
  registerIssuer: async (req, res) => {
    try {
      /* Step 1: Extract fields from request */
      const { orgName, contactName, email, password, confirmPassword } = req.body;

      /* Step 2: Debug logs (trace registration flow) */
      console.log('=== ISSUER REGISTRATION DEBUG START (authController) ===');
      console.log('[1] Organization Name from request:', orgName);
      console.log('[1b] Contact Name from request:', contactName);

      /* Step 3: Validate required fields */
      if (!orgName || !contactName || !email || !password) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
      }

      /* Step 4: Confirm passwords match */
      if (password !== confirmPassword) {
        return res.status(400).json({ success: false, message: 'Passwords do not match' });
      }

      /* Step 5: Accreditation check (hard gate) */
      console.log(`[2] Checking accreditation for "${orgName}"...`);
      const accreditationCheck = await couchDB.checkIfOrgAccredited(orgName);
      console.log('[3] Accreditation check result:', accreditationCheck);

      /* Step 6: If not accredited, deny */
      if (!accreditationCheck.isAccredited) {
        console.log('[4] ❌ REJECTING registration: Organization is not accredited.');
        console.log('=== ISSUER REGISTRATION DEBUG END ===\n');
        return res.status(403).json({
          success: false,
          accredited: false,
          message: `Organization "${orgName}" is not accredited. Registration denied.`
        });
      }

      /* Step 7: Hash password */
      console.log('[5] ✅ PASSED ACCREDITATION. Proceeding with registration...');
      const hashedPassword = await bcrypt.hash(password, 10);

      /* Step 8: Build issuerData doc to be stored (pending status will be set by service) */
      const issuerData = {
        orgName,
        contactName,
        email,
        password: hashedPassword,
        documents: req.file ? [req.file] : []
      };

      /* Step 9: Save issuer registration (pending) into CouchDB */
      console.log('[6] Saving to CouchDB...');
      const result = await couchDB.createIssuerRegistration(issuerData, accreditationCheck);

      /* Step 10: Return success response */
      console.log('[7] Registration result:', result);
      console.log('=== ISSUER REGISTRATION DEBUG END ===\n');

      return res.status(201).json({
        success: true,
        message: 'Issuer registration submitted successfully',
        issuerId: result.id,
        accredited: true
      });

    } catch (error) {
      /* Step 11: Handle errors */
      console.error('Issuer registration error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // ========================================================================================================================================================================

  /*
    Endpoint: GET /api/auth/pending-issuers
    Function Name: getPendingIssuers

    Technical:
    Fetches issuer applications where status = pending (via couchDB.getPendingIssuers()).

    Tropang Ex:
    Admin dashboard list ng “for approval” issuers.
  */
  getPendingIssuers: async (req, res) => {
    try {
      /* Step 1: Fetch pending issuer records from CouchDB */
      const pendingIssuers = await couchDB.getPendingIssuers();

      /* Step 2: Return results */
      res.status(200).json({
        success: true,
        data: pendingIssuers
      });

    } catch (error) {
      /* Step 3: Handle errors */
      console.error('Error fetching pending issuers:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // ========================================================================================================================================================================

  /*
    Endpoint: POST /api/auth/approve-issuer/:issuerId
    Function Name: approveIssuer

    Technical:
    Approves issuer application by calling couchDB.approveIssuer(issuerId, adminId).
    Note:
    - Uses req.user?.id if auth middleware attaches user info, else fallback "admin".

    Tropang Ex:
    Admin clicks Approve → issuer becomes usable (gets couchDBUrl + fabricIdentity etc).
  */
  approveIssuer: async (req, res) => {
    try {
      /* Step 1: Extract issuerId from URL */
      const { issuerId } = req.params;

      /* Step 2: Approve issuer via CouchDB service */
      const result = await couchDB.approveIssuer(issuerId, req.user?.id || 'admin');

      /* Step 3: Return success */
      res.status(200).json({
        success: true,
        message: 'Issuer approved successfully',
        data: result
      });

    } catch (error) {
      /* Step 4: Handle errors */
      console.error('Error approving issuer:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // ========================================================================================================================================================================

  /*
    Endpoint: POST /api/auth/reject-issuer/:issuerId
    Function Name: rejectIssuer

    Technical:
    Rejects issuer application by calling couchDB.rejectIssuer(issuerId, rejectionReason).

    Tropang Ex:
    Admin clicks Reject → may rejection reason + timestamp.
  */
  rejectIssuer: async (req, res) => {
    try {
      /* Step 1: Extract issuerId + rejectionReason */
      const { issuerId } = req.params;
      const { rejectionReason } = req.body;

      /* Step 2: Reject issuer via CouchDB service */
      const result = await couchDB.rejectIssuer(issuerId, rejectionReason);

      /* Step 3: Return success */
      res.status(200).json({
        success: true,
        message: 'Issuer rejected',
        data: result
      });

    } catch (error) {
      /* Step 4: Handle errors */
      console.error('Error rejecting issuer:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // ========================================================================================================================================================================
  //                                                               ISSUER LOGIN
  // ========================================================================================================================================================================

  /*
    Endpoint: POST /api/auth/login-issuer
    Function Name: loginIssuer

    Technical:
    Logs in APPROVED issuers only.
    Flow:
      - validate email/password
      - fetch issuer record via couchDB.getApprovedIssuer(email)
      - bcrypt compare password
      - generate JWT token with issuer identity fields + fabricIdentity
      - return token + issuer payload

    Tropang Ex:
    Issuer login. Kung pending pa application mo → bawal ka pa.

    Expected req.body:
    { email, password }
  */
  loginIssuer: async (req, res) => {
    try {
      /* Step 1: Validate inputs */
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      /* Step 2: Only approved issuers can login */
      const issuer = await couchDB.getApprovedIssuer(email);
      if (!issuer) {
        return res.status(401).json({
          success: false,
          message: 'Issuer not found or not approved yet'
        });
      }

      /* Step 3: Verify password */
      const passwordMatch = await bcrypt.compare(password, issuer.password);
      if (!passwordMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid password'
        });
      }

      /* Step 4: Generate JWT (includes fabricIdentity for blockchain usage later) */
      const token = jwt.sign(
        {
          _id: issuer._id,
          email: issuer.email,
          role: 'issuer',
          orgName: issuer.orgName,
          fabricIdentity: issuer.fabricIdentity
        },
        process.env.JWT_SECRET || 'your_jwt_secret',
        { expiresIn: '7d' }
      );

      /* Step 5: Return token + basic issuer payload */
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
      /* Step 6: Handle errors */
      console.error('Issuer login error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // ========================================================================================================================================================================
  //                                                               ISSUER DASHBOARD (FAST COUCHDB FETCH)
  // ========================================================================================================================================================================

  /*
    Endpoint: GET /api/auth/issuer/:issuerId/credentials
    Function Name: getIssuerCredentials

    Technical:
    Fetches issuer credentials via couchDB.getIssuerCredentials(issuerId).
    Returns a frontend-ready payload:
      issuerId, issuerName, email, credentialCount, credentials[]

    Tropang Ex:
    Ito yung mabilisang “dashboard fetch” ni issuer.
    Hindi blockchain query — pang UI performance.

    Expected req.params:
    { issuerId }
  */
  getIssuerCredentials: async (req, res) => {
    try {
      /* Step 1: Validate issuerId */
      const { issuerId } = req.params;
      console.log(`[AUTHCONTROLLER] Fetching credentials for issuer: ${issuerId}`);

      if (!issuerId) {
        return res.status(400).json({
          success: false,
          message: 'Issuer ID is required'
        });
      }

      /* Step 2: Call CouchDB service wrapper */
      const credentialsData = await couchDB.getIssuerCredentials(issuerId);
      console.log(`[AUTHCONTROLLER] Credentials data received:`, credentialsData);

      /* Step 3: If empty, return a safe empty response (not an error) */
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

      /* Step 4: Return successful credentials payload */
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
      /* Step 5: Handle errors */
      console.error('Error fetching issuer credentials:', error);
      return res.status(500).json({
        success: false,
        message: `Error fetching credentials: ${error.message}`
      });
    }
  }
};

module.exports = authController;
