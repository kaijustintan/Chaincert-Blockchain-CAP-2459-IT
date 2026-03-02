// ==========================================================================================================================================================================
//                                                                       authController.js 
// ==========================================================================================================================================================================

/* [ OUTLINE ]
  =====================================================================
  FILE: authController.js
  TECHNICAL: Authentication + account + issuer admin logic
  TROPA: “Brain” ng auth endpoints.
   Used when:
  - may nag-register/login (user or issue
  - may nag-update ng profile/password/pfp
  - admin actions: view pending issuers, approve/reject
  - issuer dashboard wants fast CouchDB fetch of credentials
  =====================================================================

  CATEGORY: USER AUTH (REGISTER / LOGIN)
  - register(req, res)
  - login(req, res)

  CATEGORY: USER INFO / LISTING
  - getUserInfo(req, res)
  - getAllUsers(req, res)

  CATEGORY: USER SETTINGS (PROFILE / PASSWORD / PFP)
  - updateProfile(req, res)
  - changePassword(req, res)
  - uploadProfilePicture(req, res)

  CATEGORY: ISSUER REGISTRATION / ADMIN REVIEW
  - registerIssuer(req, res)
  - getPendingIssuers(req, res)
  - approveIssuer(req, res)
  - rejectIssuer(req, res)

  CATEGORY: ISSUER LOGIN
  - loginIssuer(req, res)

  CATEGORY: ISSUER DASHBOARD (FAST COUCHDB FETCH)
  - getIssuerCredentials(req, res)

  CATEGORY: USER CREDENTIALS (STUDENT WALLET)
  - getUserCredentials(req, res)
  - updateCredentialVisibility(req, res)  // - polo
  - updateCredentialOrder(req, res)       // - polo
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
    // FOR DEBUGGING: log incoming request body
    console.log('🔥 HIT /api/auth/register, body =', req.body);

    /* Step 1: Extract request body fields */
    const { username, email, password, role, org } = req.body;

    // FOR DEBUGGING: confirm extracted fields
    console.log('🧪 Extracted fields:', { username, email, hasPassword: !!password, role, org });

    /* Step 2: Basic validation (required fields) */
    if (!username || !password || !email) {
      console.log('❌ Missing required fields in register'); // FOR DEBUGGING
      return res.status(400).json({
        success: false,
        message: 'Username, password, and email are required'
      });
    }

    /* Step 3: Hash password (never store plain text) */
    console.log('🔐 Hashing password...'); // FOR DEBUGGING
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('🔐 Password hashed'); // FOR DEBUGGING

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

    console.log('📦 Built userData =', userData); // FOR DEBUGGING

    /* Step 5: Save user in CouchDB (via service layer) */
    console.log('💾 Calling couchDB.saveUser...'); // FOR DEBUGGING
    const result = await couchDB.saveUser(userData);
    console.log('✅ couchDB.saveUser result =', result); // FOR DEBUGGING

    /* Step 6: Return success response */
    console.log('✅ Sending 201 response for register'); // FOR DEBUGGING
    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      userId: result.id
    });

  } catch (error) {
    /* Step 7: Handle server errors */
    console.error('🔥 Registration error:', error); // FOR DEBUGGING
    return res.status(500).json({
      success: false,
      message: `Registration error: ${error.message}`
    });
  }
},

  // ========================================================================================================================================================================

  // ========================================================================================================================================================================
// USER AUTH (REGISTER / LOGIN)
// ========================================================================================================================================================================

/*
  Endpoint: POST /api/auth/login
  Function Name: login

  Technical:
  Logs in a regular user.
  - Validates email/password
  - Loads all users from CouchDB and finds matching email (type === 'user')
  - Compares bcrypt password hash
  - Generates JWT token (24h expiry) with basic identity + role
  - Returns token + user payload without password

  Tropang Ex:
  Login ng student/admin. Kapag tama credentials → may token ka na + user info na
  pwede gamitin sa UI.
*/
// Endpoint: POST /api/auth/login
login: async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Step 2: Fetch all users and find the matching record by email
    const users = await couchDB.getAllUsers();
    const user = users.find(u => u.email === email);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been disabled. Please contact administrator.'
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
        id: user._id,
        email: user.email,
        role: user.role || 'student'
      },
      process.env.JWT_SECRET || 'dev_secret_key',
      { expiresIn: '24h' }
    );

    const { password: pw, ...userData } = user;

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        ...userData,
        role: user.role || 'student'
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
  Fetches all user documents from CouchDB via couchDB.getAllUsers().
  Returns list + count as-is (any filtering should be handled in the service layer).

  Tropang Ex:
  Ginagamit to pang dropdown ni issuer (pipili siya sinong holder/student).

  Note:
  Comment says "Admin only", but this function itself does not enforce admin auth.
  (Access control should be in middleware / route protection.)
*/
/*
  Endpoint: GET /api/auth/users
  Function Name: getAllUsers

  Technical:
  Fetches all user documents from CouchDB via couchDB.getAllUsers().
  Applies non-admin filter for recipient dropdown use-cases.
  Returns list + count.
*/
getAllUsers: async (req, res) => {
  try {
    const users = await couchDB.getAllUsers();

    // Keep only non-admin accounts for dropdown (holders/recipients)
    const filteredUsers = users.filter(u => !u.role || u.role === 'user');

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
  UPDATED FLOW (Accreditation gating removed):
    - validate fields + confirm password
    - (optional) check accreditation via couchDB.checkIfOrgAccredited(orgName) for tagging ONLY
    - DO NOT deny if not accredited (anyone can register)
    - hash password
    - prepare issuerData (includes uploaded doc file if any)
    - create issuer registration doc via couchDB.createIssuerRegistration(issuerData, accreditationCheck?)  // non-blocking
    - returns issuerId + accreditation tag (optional)

  Tropang Ex:
  Kahit sino pwedeng mag-apply bilang issuer. Lahat mapupunta sa "pending" list for admin approval.
  Yung accreditation check, pang-label nalang (optional), hindi na pang-block.

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

    /* Step 5: OPTIONAL accreditation check (NON-BLOCKING)
       Technical: Still checking accreditation for possible tagging / future use,
       but registration will proceed regardless of result.
    */
    let accreditationCheck = null;
    try {
      console.log(`[2] (Optional) Checking accreditation for "${orgName}"...`);
      accreditationCheck = await couchDB.checkIfOrgAccredited(orgName);
      console.log('[3] Accreditation check result (non-blocking):', accreditationCheck);
    } catch (accErr) {
      // If accreditation DB/check is unavailable, we still proceed.
      console.warn('[3b] Accreditation check failed (proceeding anyway):', accErr.message);
      accreditationCheck = null;
    }

    /* Step 6: Hash password
       Tropang Ex: Kahit hindi accredited, tuloy pa rin. Admin approval ang tunay na gate.
    */
    console.log('[4] Proceeding with registration (accreditation no longer a gate)...');
    const hashedPassword = await bcrypt.hash(password, 10);

    /* Step 7: Build issuerData doc to be stored (pending status will be set by service) */
    const issuerData = {
      orgName,
      contactName,
      email,
      password: hashedPassword,
      documents: req.file ? [req.file] : []
    };

    /* Step 8: Save issuer registration (pending) into CouchDB */
    console.log('[5] Saving to CouchDB (pending issuer application)...');
    // createIssuerRegistration now supports optional accreditationCheck
      let result;
      try {
        result = await couchDB.createIssuerRegistration(issuerData, accreditationCheck);
      } catch (err) {
        if (err.statusCode === 409) {
          return res.status(409).json({
            success: false,
            message: 'Issuer registration already exists for this email/org.',
            existing: err.details || null
          });
        }
        throw err;
      }
    /* Step 9: Return success response */
    console.log('[6] Registration result:', result);
    console.log('=== ISSUER REGISTRATION DEBUG END ===\n');

    return res.status(201).json({
      success: true,
      message: 'Issuer registration submitted successfully (pending admin approval)',
      issuerId: result.id,
      // ✅ no longer forced true; just pass along what we found (or false if unknown)
      accredited: accreditationCheck?.isAccredited ?? false,
      accreditedType: accreditationCheck?.accreditedType ?? null
    });

  } catch (error) {
    /* Step 10: Handle errors */
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
    Endpoint: GET /api/auth/approved-issuers
    Function Name: getApprovedIssuers

    Technical:
    Fetches all issuer registration documents where status = "approved"
    via couchDB.getApprovedIssuers().

    Tropang Ex:
    Ito yung listahan ng lahat ng kasalukuyang approved issuers /
    accredited organizations para sa admin dashboard.
  */
  getApprovedIssuers: async (req, res) => {
    try {
      // (Optional) dito mo pwedeng i-enforce na admin lang:
      // if (!req.user || req.user.role !== 'admin') {
      //   return res.status(403).json({ success: false, message: 'Forbidden' });
      // }

      const approvedIssuers = await couchDB.getApprovedIssuers();

      // Optionally map to only the fields you want to expose in the UI
      const safeIssuers = approvedIssuers.map(doc => ({
        id: doc._id,
        orgName: doc.orgName,
        contactName: doc.contactName,
        email: doc.email,
        status: doc.status,
        accredited: doc.accredited,
        accreditedType: doc.accreditedType,
        createdAt: doc.createdAt,        // CHANGES: add this
        approvedAt: doc.approvedAt,
        approvedBy: doc.approvedBy,
        walletId: doc.walletId,
        fabricIdentity: doc.fabricIdentity,
        couchDBUrl: doc.couchDBUrl
      }));

      return res.status(200).json({
        success: true,
        message: 'Approved issuers retrieved successfully',
        data: safeIssuers,
        count: safeIssuers.length
      });
    } catch (error) {
      console.error('Error fetching approved issuers:', error);
      return res.status(500).json({
        success: false,
        message: `Error fetching approved issuers: ${error.message}`
      });
    }
  },

  /*
  Endpoint: GET /api/auth/rejected-issuers
  Function Name: getRejectedIssuers

  Technical:
  Fetches all issuer registration documents where status = "rejected"
  via couchDB.getRejectedIssuers().

  Tropang Ex:
  Ito yung listahan ng lahat ng rejected issuers / rejected applications para sa admin dashboard.
*/
getRejectedIssuers: async (req, res) => {
  try {
    // (Optional) enforce admin only:
    // if (!req.user || req.user.role !== 'admin') {
    //   return res.status(403).json({ success: false, message: 'Forbidden' });
    // }

    const rejectedIssuers = await couchDB.getRejectedIssuers();

    const safeIssuers = rejectedIssuers.map(doc => ({
      id: doc._id,
      orgName: doc.orgName,
      contactName: doc.contactName,
      email: doc.email,
      status: doc.status,

      // Keep these if still existing in schema
      accredited: doc.accredited,
      accreditedType: doc.accreditedType,

      createdAt: doc.createdAt,

      // ✅ Rejection metadata
      rejectedAt: doc.rejectedAt || null,
      rejectedBy: doc.rejectedBy || null,
      rejectionReason: doc.rejectionReason || null,

      // still present fields (might be null for rejected)
      approvedAt: doc.approvedAt || null,
      approvedBy: doc.approvedBy || null,

      walletId: doc.walletId,
      fabricIdentity: doc.fabricIdentity,
      couchDBUrl: doc.couchDBUrl
    }));

    return res.status(200).json({
      success: true,
      message: 'Rejected issuers retrieved successfully',
      data: safeIssuers,
      count: safeIssuers.length
    });

  } catch (error) {
    console.error('Error fetching rejected issuers:', error);
    return res.status(500).json({
      success: false,
      message: `Error fetching rejected issuers: ${error.message}`
    });
  }
},

/*
  Endpoint: GET /api/auth/disabled-issuers
  Function Name: getDisabledIssuers

  Technical:
  Fetches all issuer registration documents where status = "disabled"
  via couchDB.getDisabledIssuers().
*/
getDisabledIssuers: async (req, res) => {
  try {
    const disabledIssuers = await couchDB.getDisabledIssuers();

    const safeIssuers = disabledIssuers.map(doc => ({
      id: doc._id,
      orgName: doc.orgName,
      contactName: doc.contactName,
      email: doc.email,
      status: doc.status,
      accredited: doc.accredited,
      accreditedType: doc.accreditedType,
      createdAt: doc.createdAt,
      approvedAt: doc.approvedAt || null,
      approvedBy: doc.approvedBy || null,
      disabledAt: doc.disabledAt || null,
      disabledBy: doc.disabledBy || null,
      disableReason: doc.disableReason || null,
      walletId: doc.walletId,
      fabricIdentity: doc.fabricIdentity,
      couchDBUrl: doc.couchDBUrl
    }));

    return res.status(200).json({
      success: true,
      message: 'Disabled issuers retrieved successfully',
      data: safeIssuers,
      count: safeIssuers.length
    });
  } catch (error) {
    console.error('Error fetching disabled issuers:', error);
    return res.status(500).json({
      success: false,
      message: `Error fetching disabled issuers: ${error.message}`
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
  approveIssuer: async (req, res, getContractAndGateway) => {
  let gateway = null;

  try {
    const { issuerId } = req.params;
    const { approvalReason } = req.body; // optional custom reason

    // 1️⃣ Approve in CouchDB FIRST (source of truth)
    const result = await couchDB.approveIssuer(
      issuerId,
      req.user?.id || 'admin'
    );

    // Extract useful fields for blockchain log
    const issuerEmail = result.email;
    const orgName = result.orgName;
    const reason = approvalReason || 'Issuer application approved by admin';

    // 2️⃣ Blockchain logging (BEST-EFFORT ONLY)
    let blockchainWarning = null;

    try {
      if (typeof getContractAndGateway !== 'function') {
        throw new Error('getContractAndGateway not provided');
      }

      const identityName = 'chaincert-admin';
      const orgNameForGateway = 'Org1';

      const { gateway: gw, contract } =
        await getContractAndGateway(identityName, orgNameForGateway);

      gateway = gw;

      await contract.submitTransaction(
        'LogIssuerApproval',
        issuerId,
        issuerEmail,
        orgName,
        reason
      );

    } catch (bcErr) {
      blockchainWarning = bcErr?.message || String(bcErr);
      console.error('[approveIssuer] Blockchain log failed:', blockchainWarning);
    } finally {
      try { if (gateway) await gateway.disconnect(); } catch (_) {}
      gateway = null;
    }

    // 3️⃣ Single response only
    return res.status(200).json({
      success: true,
      message: blockchainWarning
        ? 'Issuer approved, but blockchain log failed.'
        : 'Issuer approved successfully.',
      warning: blockchainWarning,
      data: result
    });

  } catch (error) {
    console.error('Error approving issuer:', error);
    if (res.headersSent) return;
    return res.status(500).json({
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
  rejectIssuer: async (req, res, getContractAndGateway) => {
  let gateway = null;

  try {
    const { issuerId } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason || rejectionReason.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required.'
      });
    }

    // 1️⃣ Reject in CouchDB FIRST
    const result = await couchDB.rejectIssuer(
      issuerId,
      rejectionReason
    );

    // We need issuerEmail + orgName for blockchain log
    const issuerDoc = await couchDB.getIssuerById(issuerId);
    const issuerEmail = issuerDoc.email;
    const orgName = issuerDoc.orgName;

    // 2️⃣ Blockchain logging (BEST-EFFORT ONLY)
    let blockchainWarning = null;

    try {
      if (typeof getContractAndGateway !== 'function') {
        throw new Error('getContractAndGateway not provided');
      }

      const identityName = 'chaincert-admin';
      const orgNameForGateway = 'Org1';

      const { gateway: gw, contract } =
        await getContractAndGateway(identityName, orgNameForGateway);

      gateway = gw;

      await contract.submitTransaction(
        'LogIssuerRejection',
        issuerId,
        issuerEmail,
        orgName,
        rejectionReason
      );

    } catch (bcErr) {
      blockchainWarning = bcErr?.message || String(bcErr);
      console.error('[rejectIssuer] Blockchain log failed:', blockchainWarning);
    } finally {
      try { if (gateway) await gateway.disconnect(); } catch (_) {}
      gateway = null;
    }

    return res.status(200).json({
      success: true,
      message: blockchainWarning
        ? 'Issuer rejected, but blockchain log failed.'
        : 'Issuer rejected successfully.',
      warning: blockchainWarning,
      data: result
    });

  } catch (error) {
    console.error('Error rejecting issuer:', error);
    if (res.headersSent) return;
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
},

// ========================================================================================================================================================================
// ADMIN: ISSUER DECISION LOGS (SPECIFIC EMAIL)
// ========================================================================================================================================================================
getIssuerDecisionLogs: async (req, res, getContractAndGateway) => {
  let gateway = null;

  try {
    const { issuerEmail } = req.params;

    if (!issuerEmail) {
      return res.status(400).json({
        success: false,
        message: 'issuerEmail is required'
      });
    }

    if (typeof getContractAndGateway !== 'function') {
      return res.status(500).json({
        success: false,
        message: 'Blockchain gateway is not available'
      });
    }

    const identityName = 'chaincert-admin';
    const orgName = 'Org1';

    const cg = await getContractAndGateway(identityName, orgName);
    gateway = cg.gateway;
    const contract = cg.contract;

    const resultBuffer = await contract.evaluateTransaction(
      'GetIssuerDecisionLogs',
      issuerEmail
    );

    const raw = resultBuffer.toString();

    let logs;
    try {
      logs = JSON.parse(raw || '[]');
    } catch (_) {
      logs = [];
    }

    // Ensure array response
    if (!Array.isArray(logs)) logs = [];

    return res.status(200).json({
      success: true,
      logs,
      count: logs.length
    });

  } catch (error) {
    console.error('getIssuerDecisionLogs error:', error);
    if (res.headersSent) return;

    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch issuer decision logs'
    });
  } finally {
    try { if (gateway) await gateway.disconnect(); } catch (_) {}
  }
},

  // ========================================================================================================================================================================
  //                                                               ISSUER LOGIN
  // ========================================================================================================================================================================

  // ========================================================================================================================================================================
// ISSUER LOGIN
// ========================================================================================================================================================================

/*
  Endpoint: POST /api/auth/login-issuer
  Function Name: loginIssuer

  Technical:
  Logs in APPROVED issuers only.
  - Validates email/password
  - Fetches issuer via couchDB.getApprovedIssuer(email)
  - Compares bcrypt password hash
  - Generates JWT token (24h expiry) with issuer identity + orgName
  - Returns token + issuer payload (matches sdk-server-fixed response shape)

  Tropang Ex:
  Issuer login. Kung pending pa application mo → bawal ka pa.
*/
loginIssuer: async (req, res) => {
  try {
    // Step 1: Validate inputs
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Step 2: Only approved issuers can login
    const issuer = await couchDB.getIssuerByEmail(email);

    if (!issuer) {
      return res.status(401).json({
        success: false,
        message: 'Issuer not found or not approved yet'
      });
    }

    if (issuer.status === 'disabled') {
        return res.status(403).json({
          success: false,
          message: 'Your issuer account has been disabled. Please contact administrator.'
        });
      }

    if (issuer.status !== 'approved') {
      return res.status(401).json({
        success: false,
        message: 'Issuer not found or not approved yet'
      });
    }

    // Step 3: Verify password
    const passwordMatch = await bcrypt.compare(password, issuer.password);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password'
      });
    }

    // Step 4: Generate JWT (24h, same as sdk-server-fixed)
    const token = jwt.sign(
      {
        id: issuer._id,
        email: issuer.email,
        role: 'issuer',
        orgName: issuer.orgName
        // Note: in sdk-server-fixed, walang fabricIdentity sa payload;
        // kung kailangan mo yun later, pwede mong idagdag dito.
      },
      process.env.JWT_SECRET || 'dev_secret_key',
      { expiresIn: '24h' }
    );

    // Step 5: Return token + basic issuer payload (matches sdk-server-fixed)
    return res.status(200).json({
      success: true,
      token,
      user: {
        id: issuer._id,
        email: issuer.email,
        role: 'issuer',
        orgName: issuer.orgName,
        contactName: issuer.contactName
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
  },

  // ========================================================================================================================================================================
  //                                                               USER CREDENTIALS (STUDENT WALLET)
  // ========================================================================================================================================================================

  /*
    Endpoint: GET /api/auth/credentials/user/:holderID
    Function Name: getUserCredentials

    Technical:
    Fetches all issued credentials for a specific user/holder from
    the admin CouchDB (wallet_user_credentials) using their holderID
    CouchDB only — no blockchain call needed

    Tropang Ex:
    Pang-fetch ng credentials ng student para sa personal dashboard
    Kinukuha lahat ng credentials na naka-assign sa kanya sa wallet_user_credentials DB

    Expected req.params:
    { holderID } - the user's CouchDB _id

    // - polo
  */
  getUserCredentials: async (req, res) => {
    try {
      /* Step 1: Extract holderID from URL params
         // - polo
      */
      const { holderID } = req.params;

      if (!holderID) {
        return res.status(400).json({
          success: false,
          message: 'holderID is required'
        });
      }

      /* Step 2: Fetch credentials from CouchDB using existing service function
         Technical: Calls getUserCredentialsByHolderId which queries wallet_user_credentials.
         Tropang Ex: Kunin lahat ng credentials na naka-assign sa student na ito.
         // - polo
      */
      const credentials = await couchDB.getUserCredentialsByHolderId(holderID);

      /* Step 3: Return credentials list
         // - polo
      */
      return res.status(200).json({
        success: true,
        credentials: credentials || [],
        count: (credentials || []).length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      /* Step 4: Handle errors */
      console.error('Error fetching user credentials:', error);
      return res.status(500).json({
        success: false,
        message: `Error fetching credentials: ${error.message}`
      });
    }
  },

  /*
    Endpoint: PATCH /api/auth/credentials/:credentialId/visibility
    Function Name: updateCredentialVisibility
    Technical: Updates visibility field of a credential in wallet_user_credentials (CouchDB only)
    No blockchain call needed — visibility is UI/privacy preference only
    // - polo
  */
  updateCredentialVisibility: async (req, res) => {
    try {
      const { credentialId } = req.params;
      const { visibility } = req.body;

      if (!credentialId) {
        return res.status(400).json({ success: false, message: 'credentialId is required' });
      }
      if (!visibility || !['public', 'private'].includes(visibility)) {
        return res.status(400).json({ success: false, message: 'visibility must be "public" or "private"' });
      }

      await couchDB.updateCredentialVisibility(credentialId, visibility);

      return res.status(200).json({
        success: true,
        message: `Credential visibility updated to ${visibility}`,
        credentialId,
        visibility,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('[AUTH CONTROLLER] Error updating credential visibility:', error);
      return res.status(500).json({ success: false, message: `Error updating visibility: ${error.message}` });
    }
  },

  /*
    Endpoint: PATCH /api/auth/credentials/:credentialId/order
    Function Name: updateCredentialOrder
    Technical: Updates currentOrder field of a credential in wallet_user_credentials (CouchDB only)
    No blockchain call needed — display order is UI preference only
    // - polo
  */
  updateCredentialOrder: async (req, res) => {
    try {
      const { credentialId } = req.params;
      const { newOrder } = req.body;

      if (!credentialId) {
        return res.status(400).json({ success: false, message: 'credentialId is required' });
      }
      if (newOrder === undefined || newOrder === null || typeof newOrder !== 'number') {
        return res.status(400).json({ success: false, message: 'newOrder must be a number' });
      }

      await couchDB.updateCredentialOrder(credentialId, newOrder);

      return res.status(200).json({
        success: true,
        message: `Credential order updated to ${newOrder}`,
        credentialId,
        newOrder,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('[AUTH CONTROLLER] Error updating credential order:', error);
      return res.status(500).json({ success: false, message: `Error updating order: ${error.message}` });
    }
  },

  // ========================================================================================================================================================================
// ADMIN: DISABLE / ENABLE ISSUER (WITH BLOCKCHAIN AUDIT LOG)
// ========================================================================================================================================================================

// =================================================================================================
// ADMIN: DISABLE / ENABLE ISSUER (WITH BLOCKCHAIN AUDIT LOG) — SAFE VERSION
// =================================================================================================

disableIssuer: async (req, res, getContractAndGateway) => {
  let gateway = null;

  try {
    const { issuerId } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Disabling reason is required.'
      });
    }

    // 1) Get issuer doc
    const issuer = await couchDB.getIssuerById(issuerId);
    if (!issuer) {
      return res.status(404).json({ success: false, message: 'Issuer not found.' });
    }

    const previousStatus = issuer.status || '';

    if (previousStatus === 'disabled') {
      return res.status(400).json({
        success: false,
        message: 'Issuer is already disabled.'
      });
    }

    // 2) Update CouchDB FIRST (source for UI lists)
    await couchDB.disableIssuer(issuerId, 'chaincert-admin', reason);

    // 3) Blockchain logging (BEST-EFFORT ONLY)
    let blockchainLogWarning = null;

    try {
      if (typeof getContractAndGateway !== 'function') {
        throw new Error('getContractAndGateway function not provided');
      }

      const identityName = 'chaincert-admin';
      const orgName = 'Org1';

          // ✅ DEBUG LOGS (PASTE THESE)
      console.log('\n[disableIssuer][DEBUG] typeof getContractAndGateway =', typeof getContractAndGateway);
      console.log('[disableIssuer][DEBUG] identityName =', identityName, '| orgName =', orgName);
      console.log('[disableIssuer][DEBUG] issuerId =', issuerId, '| issuerEmail =', issuer.email);
      console.log('[disableIssuer][DEBUG] about to call getContractAndGateway...\n');

      // prefer same style as issuerCredentialController
      const cg = await getContractAndGateway(identityName, orgName);

       console.log('\n[disableIssuer][DEBUG] getContractAndGateway returned:', cg);
  console.log('[disableIssuer][DEBUG] cg type =', typeof cg);
  console.log('[disableIssuer][DEBUG] cg keys =', cg ? Object.keys(cg) : null);
  console.log('[disableIssuer][DEBUG] cg.gateway exists =', !!(cg && cg.gateway));
  console.log('[disableIssuer][DEBUG] cg.contract exists =', !!(cg && cg.contract), '\n');

      if (!cg || !cg.gateway || !cg.contract) {
        throw new Error('getContractAndGateway returned an invalid connection object');
      }

      gateway = cg.gateway;
      const contract = cg.contract;

      await contract.submitTransaction(
        'LogIssuerStatusChange',
        issuer.email,
        previousStatus,
        'disabled',
        reason
      );

    } catch (bcErr) {
      blockchainLogWarning = bcErr?.message || String(bcErr);
      console.error('[disableIssuer] Blockchain log failed:', blockchainLogWarning);
      // DO NOT throw — keep it best-effort
    } finally {
      // Always attempt disconnect if gateway was created
      try { if (gateway) await gateway.disconnect(); } catch (_) {}
      gateway = null;
    }

    // ✅ SINGLE RESPONSE ONLY
    return res.status(200).json({
      success: true,
      message: blockchainLogWarning
        ? 'Issuer disabled successfully, but blockchain log failed.'
        : 'Issuer disabled successfully.',
      warning: blockchainLogWarning
    });

  } catch (error) {
    console.error('disableIssuer error:', error);

    // ✅ avoid ERR_HTTP_HEADERS_SENT
    if (res.headersSent) return;

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
},

enableIssuer: async (req, res, getContractAndGateway) => {
  let gateway = null;

  try {
    const { issuerId } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Re-enable reason is required.'
      });
    }

    // 1) Get issuer doc
    const issuer = await couchDB.getIssuerById(issuerId);
    if (!issuer) {
      return res.status(404).json({ success: false, message: 'Issuer not found.' });
    }

    const previousStatus = issuer.status || '';

    if (previousStatus === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Issuer is already enabled (approved).'
      });
    }

    // 2) Update CouchDB FIRST
    await couchDB.enableIssuer(issuerId, 'chaincert-admin', reason);

    // 3) Blockchain logging (BEST-EFFORT ONLY)
    let blockchainLogWarning = null;

    try {
      if (typeof getContractAndGateway !== 'function') {
        throw new Error('getContractAndGateway function not provided');
      }

      const identityName = 'chaincert-admin';
      const orgName = 'Org1';

      const cg = await getContractAndGateway(identityName, orgName);
      if (!cg || !cg.gateway || !cg.contract) {
        throw new Error('getContractAndGateway returned an invalid connection object');
      }

      gateway = cg.gateway;
      const contract = cg.contract;

      await contract.submitTransaction(
        'LogIssuerStatusChange',
        issuer.email,
        previousStatus,
        'approved',
        reason
      );

    } catch (bcErr) {
      blockchainLogWarning = bcErr?.message || String(bcErr);
      console.error('[enableIssuer] Blockchain log failed:', blockchainLogWarning);
    } finally {
      try { if (gateway) await gateway.disconnect(); } catch (_) {}
      gateway = null;
    }

    return res.status(200).json({
      success: true,
      message: blockchainLogWarning
        ? 'Issuer re-enabled successfully, but blockchain log failed.'
        : 'Issuer re-enabled successfully.',
      warning: blockchainLogWarning
    });

  } catch (error) {
    console.error('enableIssuer error:', error);
    if (res.headersSent) return;

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
},


// ========================================================================================================================================================================
// ADMIN: DISABLE / ENABLE USER (WITH BLOCKCHAIN AUDIT LOG)
// ========================================================================================================================================================================

disableUser: async (req, res, getContractAndGateway) => {
  let gateway;

  try {
    const { userId } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Disabling reason is required.'
      });
    }

    // 1) Fetch user doc
    const user = await couchDB.getUser(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    const previousStatus = user.isActive ? 'active' : 'disabled';

    if (!user.isActive) {
      return res.status(400).json({
        success: false,
        message: 'User is already disabled.'
      });
    }

    // 2) Update CouchDB using existing service function
    await couchDB.disableUser(userId, 'chaincert-admin', reason);

    // 3) Blockchain log
    let blockchainLogWarning = null;
    const identityName = 'chaincert-admin';
    const orgName = 'Org1';

    if (typeof getContractAndGateway === 'function') {
      const cg = await getContractAndGateway(identityName, orgName);
      gateway = cg.gateway;
      const contract = cg.contract;

      await contract.submitTransaction(
        'LogUserStatusChange',
        user.email,
        previousStatus,
        'disabled',
        reason
      );
    }

    return res.status(200).json({
      success: true,
      message: blockchainLogWarning
        ? 'User disabled successfully, but blockchain log failed.'
        : 'User disabled successfully.',
      warning: blockchainLogWarning
    });

  } catch (error) {
    console.error('disableUser error:', error);
    if (res.headersSent) return;
    return res.status(500).json({
      success: false,
      message: error.message
    });
  } finally {
    try { if (gateway) await gateway.disconnect(); } catch (_) {}
  }
},

enableUser: async (req, res, getContractAndGateway) => {
  let gateway;

  try {
    const { userId } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Re-enable reason is required.'
      });
    }

    // 1) Fetch user doc
    const user = await couchDB.getUser(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    const previousStatus = user.isActive ? 'active' : 'disabled';

    if (user.isActive) {
      return res.status(400).json({
        success: false,
        message: 'User is already active.'
      });
    }

    // 2) Update CouchDB using existing service function
    await couchDB.enableUser(userId, 'chaincert-admin', reason);

    // 3) Blockchain log
    let blockchainLogWarning = null;
    const identityName = 'chaincert-admin';
    const orgName = 'Org1';

    if (typeof getContractAndGateway === 'function') {
      const cg = await getContractAndGateway(identityName, orgName);
      gateway = cg.gateway;
      const contract = cg.contract;

      await contract.submitTransaction(
        'LogUserStatusChange',
        user.email,
        previousStatus,
        'active',
        reason
      );
    }

    return res.status(200).json({
      success: true,
      message: blockchainLogWarning
        ? 'User re-enabled successfully, but blockchain log failed.'
        : 'User re-enabled successfully.',
      warning: blockchainLogWarning
    });

  } catch (error) {
    console.error('enableUser error:', error);
    if (res.headersSent) return;
    return res.status(500).json({
      success: false,
      message: error.message
    });
  } finally {
    try { if (gateway) await gateway.disconnect(); } catch (_) {}
  }
},
  


// ========================================================================================================================================================================
// ADMIN: STATUS LOGS (ISSUER + USER ENABLE/DISABLE)
// ========================================================================================================================================================================

getAllStatusLogs: async (req, res, getContractAndGateway) => {
  let gateway;
  try {
    if (typeof getContractAndGateway !== 'function') {
      return res.status(500).json({
        success: false,
        message: 'Blockchain gateway is not available'
      });
    }

    const identityName = 'chaincert-admin';
    const orgName = 'Org1';

    const cg = await getContractAndGateway(identityName, orgName);
    gateway = cg.gateway;
    const contract = cg.contract;

    const resultBuffer = await contract.evaluateTransaction('GetAllStatusLogs');
    const raw = resultBuffer.toString();
    let logs;

    try {
      logs = JSON.parse(raw || '[]');
    } catch (_) {
      logs = [];
    }

    return res.status(200).json({
      success: true,
      logs: Array.isArray(logs) ? logs : [],
      count: Array.isArray(logs) ? logs.length : 0
    });
  } catch (error) {
    console.error('getAllStatusLogs error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch status logs'
    });
  } finally {
    try { if (gateway) await gateway.disconnect(); } catch (_) {}
  }
},

// =========================================================================================================
// ADMIN: CHANGE PASSWORD (WITH BLOCKCHAIN AUDIT LOG)
// =========================================================================================================

changeAdminPasswordSecure: async (req, res, getContractAndGateway) => {
  let gateway = null;

  try {
    const { currentPassword, newPassword } = req.body;

    // ✅ Admin-only
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required.'
      });
    }

    // ✅ Required inputs
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'currentPassword and newPassword are required.'
      });
    }

    const adminEmail = req.user.email;

    // 1️⃣ Change password in CouchDB (with built-in verification + audit log)
    await couchDB.changeAdminPassword(
      adminEmail,
      currentPassword,
      newPassword,
      adminEmail,
      {
        via: 'ui',
        ip: req.ip,
        userAgent: req.headers['user-agent']
      }
    );

    // 2️⃣ Blockchain log (BEST-EFFORT ONLY)
    let blockchainWarning = null;

    // ✅ Align with chaincode signature:
    // LogAdminPasswordChange(ctx, adminEmail, changeType, reason)
    const changeType = 'self_change'; // since the admin is changing their own password via settings
    const reason = ''; // optional; do NOT store sensitive details

    try {
      if (typeof getContractAndGateway !== 'function') {
        throw new Error('getContractAndGateway not provided');
      }

      const identityName = 'chaincert-admin';
      const orgName = 'Org1';

      const cg = await getContractAndGateway(identityName, orgName);

      // ✅ validate returned object (prevents "invalid connection object" issues)
      if (!cg || !cg.gateway || !cg.contract) {
        throw new Error('getContractAndGateway returned an invalid connection object');
      }

      gateway = cg.gateway;
      const contract = cg.contract;

      await contract.submitTransaction(
        'LogAdminPasswordChange', // ✅ MATCHES chaincode function name
        adminEmail,
        changeType,
        reason
      );

    } catch (bcErr) {
      blockchainWarning = bcErr?.message || String(bcErr);
      console.error('[changeAdminPasswordSecure] Blockchain log failed:', blockchainWarning);
    } finally {
      try { if (gateway) await gateway.disconnect(); } catch (_) {}
      gateway = null;
    }

    return res.status(200).json({
      success: true,
      message: blockchainWarning
        ? 'Password changed, but blockchain log failed.'
        : 'Password changed successfully.',
      warning: blockchainWarning
    });

  } catch (error) {
    console.error('changeAdminPasswordSecure error:', error);
    if (res.headersSent) return;

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
},

// ========================================================================================================================================================================
// ADMIN: ISSUER-ONLY STATUS LOGS (ALL ISSUERS)
// ========================================================================================================================================================================
getAllIssuerStatusLogs: async (req, res, getContractAndGateway) => {
  let gateway;

  try {
    if (typeof getContractAndGateway !== 'function') {
      return res.status(500).json({
        success: false,
        message: 'Blockchain gateway is not available'
      });
    }

    const identityName = 'chaincert-admin';
    const orgName = 'Org1';

    const cg = await getContractAndGateway(identityName, orgName);
    gateway = cg.gateway;
    const contract = cg.contract;

    const resultBuffer = await contract.evaluateTransaction('GetAllIssuerStatusLogs');
    const raw = resultBuffer.toString();

    let logs;
    try {
      logs = JSON.parse(raw || '[]');
    } catch (_) {
      logs = [];
    }

    return res.status(200).json({
      success: true,
      logs: Array.isArray(logs) ? logs : [],
      count: Array.isArray(logs) ? logs.length : 0
    });

  } catch (error) {
    console.error('getAllIssuerStatusLogs error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch issuer status logs'
    });
  } finally {
    try { if (gateway) await gateway.disconnect(); } catch (_) {}
  }
},

// ========================================================================================================================================================================
// ADMIN: USER-ONLY STATUS LOGS (ALL USERS)
// ========================================================================================================================================================================
getAllUserStatusLogs: async (req, res, getContractAndGateway) => {
  let gateway;

  try {
    if (typeof getContractAndGateway !== 'function') {
      return res.status(500).json({
        success: false,
        message: 'Blockchain gateway is not available'
      });
    }

    const identityName = 'chaincert-admin';
    const orgName = 'Org1';

    const cg = await getContractAndGateway(identityName, orgName);
    gateway = cg.gateway;
    const contract = cg.contract;

    const resultBuffer = await contract.evaluateTransaction('GetAllUserStatusLogs');
    const raw = resultBuffer.toString();

    let logs;
    try {
      logs = JSON.parse(raw || '[]');
    } catch (_) {
      logs = [];
    }

    return res.status(200).json({
      success: true,
      logs: Array.isArray(logs) ? logs : [],
      count: Array.isArray(logs) ? logs.length : 0
    });

  } catch (error) {
    console.error('getAllUserStatusLogs error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch user status logs'
    });
  } finally {
    try { if (gateway) await gateway.disconnect(); } catch (_) {}
  }
},

// ========================================================================================================================================================================
// ADMIN: ISSUER STATUS LOGS (SPECIFIC EMAIL)
// ========================================================================================================================================================================
getIssuerStatusLogs: async (req, res, getContractAndGateway) => {
  let gateway;

  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Issuer email is required'
      });
    }

    if (typeof getContractAndGateway !== 'function') {
      return res.status(500).json({
        success: false,
        message: 'Blockchain gateway is not available'
      });
    }

    const identityName = 'chaincert-admin';
    const orgName = 'Org1';

    const cg = await getContractAndGateway(identityName, orgName);
    gateway = cg.gateway;
    const contract = cg.contract;

    const resultBuffer = await contract.evaluateTransaction(
      'GetIssuerStatusLogs',
      email
    );

    const raw = resultBuffer.toString();

    let logs;
    try {
      logs = JSON.parse(raw || '[]');
    } catch (_) {
      logs = [];
    }

    return res.status(200).json({
      success: true,
      logs: Array.isArray(logs) ? logs : [],
      count: Array.isArray(logs) ? logs.length : 0
    });

  } catch (error) {
    console.error('getIssuerStatusLogs error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch issuer status logs'
    });
  } finally {
    try { if (gateway) await gateway.disconnect(); } catch (_) {}
  }
},

// ========================================================================================================================================================================
// ADMIN: USER STATUS LOGS (SPECIFIC EMAIL)
// ========================================================================================================================================================================
getUserStatusLogs: async (req, res, getContractAndGateway) => {
  let gateway;

  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'User email is required'
      });
    }

    if (typeof getContractAndGateway !== 'function') {
      return res.status(500).json({
        success: false,
        message: 'Blockchain gateway is not available'
      });
    }

    const identityName = 'chaincert-admin';
    const orgName = 'Org1';

    const cg = await getContractAndGateway(identityName, orgName);
    gateway = cg.gateway;
    const contract = cg.contract;

    const resultBuffer = await contract.evaluateTransaction(
      'GetUserStatusLogs',
      email
    );

    const raw = resultBuffer.toString();

    let logs;
    try {
      logs = JSON.parse(raw || '[]');
    } catch (_) {
      logs = [];
    }

    return res.status(200).json({
      success: true,
      logs: Array.isArray(logs) ? logs : [],
      count: Array.isArray(logs) ? logs.length : 0
    });

  } catch (error) {
    console.error('getUserStatusLogs error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch user status logs'
    });
  } finally {
    try { if (gateway) await gateway.disconnect(); } catch (_) {}
  }
},

// ========================================================================================================================================================================
// ADMIN: ALL ISSUER DECISION LOGS (APPROVE + REJECT, ALL ISSUERS)
// ========================================================================================================================================================================
getAllIssuerDecisionLogs: async (req, res, getContractAndGateway) => {
  let gateway;

  try {
    if (typeof getContractAndGateway !== 'function') {
      return res.status(500).json({
        success: false,
        message: 'Blockchain gateway is not available'
      });
    }

    const identityName = 'chaincert-admin';
    const orgName = 'Org1';

    const cg = await getContractAndGateway(identityName, orgName);
    gateway = cg.gateway;
    const contract = cg.contract;

    const resultBuffer = await contract.evaluateTransaction('GetAllIssuerDecisionLogs');
    const raw = resultBuffer.toString();

    let logs;
    try { logs = JSON.parse(raw || '[]'); } catch (_) { logs = []; }
    if (!Array.isArray(logs)) logs = [];

    return res.status(200).json({
      success: true,
      logs,
      count: logs.length
    });

  } catch (error) {
    console.error('getAllIssuerDecisionLogs error:', error);
    if (res.headersSent) return;

    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch issuer decision logs'
    });
  } finally {
    try { if (gateway) await gateway.disconnect(); } catch (_) {}
  }
},

// ========================================================================================================================================================================
// ADMIN: ALL ISSUER APPROVAL LOGS (ALL ISSUERS)
// ========================================================================================================================================================================
getAllIssuerApprovalLogs: async (req, res, getContractAndGateway) => {
  let gateway;

  try {
    if (typeof getContractAndGateway !== 'function') {
      return res.status(500).json({
        success: false,
        message: 'Blockchain gateway is not available'
      });
    }

    const identityName = 'chaincert-admin';
    const orgName = 'Org1';

    const cg = await getContractAndGateway(identityName, orgName);
    gateway = cg.gateway;
    const contract = cg.contract;

    const resultBuffer = await contract.evaluateTransaction('GetAllIssuerApprovalLogs');
    const raw = resultBuffer.toString();

    let logs;
    try { logs = JSON.parse(raw || '[]'); } catch (_) { logs = []; }
    if (!Array.isArray(logs)) logs = [];

    return res.status(200).json({
      success: true,
      logs,
      count: logs.length
    });

  } catch (error) {
    console.error('getAllIssuerApprovalLogs error:', error);
    if (res.headersSent) return;

    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch issuer approval logs'
    });
  } finally {
    try { if (gateway) await gateway.disconnect(); } catch (_) {}
  }
},

// ========================================================================================================================================================================
// ADMIN: ALL ISSUER REJECTION LOGS (ALL ISSUERS)
// ========================================================================================================================================================================
getAllIssuerRejectionLogs: async (req, res, getContractAndGateway) => {
  let gateway;

  try {
    if (typeof getContractAndGateway !== 'function') {
      return res.status(500).json({
        success: false,
        message: 'Blockchain gateway is not available'
      });
    }

    const identityName = 'chaincert-admin';
    const orgName = 'Org1';

    const cg = await getContractAndGateway(identityName, orgName);
    gateway = cg.gateway;
    const contract = cg.contract;

    const resultBuffer = await contract.evaluateTransaction('GetAllIssuerRejectionLogs');
    const raw = resultBuffer.toString();

    let logs;
    try { logs = JSON.parse(raw || '[]'); } catch (_) { logs = []; }
    if (!Array.isArray(logs)) logs = [];

    return res.status(200).json({
      success: true,
      logs,
      count: logs.length
    });

  } catch (error) {
    console.error('getAllIssuerRejectionLogs error:', error);
    if (res.headersSent) return;

    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch issuer rejection logs'
    });
  } finally {
    try { if (gateway) await gateway.disconnect(); } catch (_) {}
  }
},

// ========================================================================================================================================================================
// ADMIN: ISSUER STATUS LOGS (SPECIFIC ISSUER EMAIL)
// ========================================================================================================================================================================
getIssuerStatusLogs: async (req, res, getContractAndGateway) => {
  let gateway = null;

  try {
    const { issuerEmail } = req.params;

    if (!issuerEmail) {
      return res.status(400).json({
        success: false,
        message: 'issuerEmail is required'
      });
    }

    if (typeof getContractAndGateway !== 'function') {
      return res.status(500).json({
        success: false,
        message: 'Blockchain gateway is not available'
      });
    }

    const identityName = 'chaincert-admin';
    const orgName = 'Org1';

    const cg = await getContractAndGateway(identityName, orgName);
    gateway = cg.gateway;
    const contract = cg.contract;

    const resultBuffer = await contract.evaluateTransaction(
      'GetIssuerStatusLogs',
      issuerEmail
    );

    const raw = resultBuffer.toString();

    let logs;
    try {
      logs = JSON.parse(raw || '[]');
    } catch (_) {
      logs = [];
    }

    if (!Array.isArray(logs)) logs = [];

    return res.status(200).json({
      success: true,
      logs,
      count: logs.length
    });

  } catch (error) {
    console.error('getIssuerStatusLogs error:', error);
    if (res.headersSent) return;

    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch issuer status logs'
    });

  } finally {
    try { if (gateway) await gateway.disconnect(); } catch (_) {}
  }
},

// ========================================================================================================================================================================
// ADMIN: USER STATUS LOGS (SPECIFIC USER EMAIL)
// ========================================================================================================================================================================
getUserStatusLogs: async (req, res, getContractAndGateway) => {
  let gateway = null;

  try {
    const { userEmail } = req.params;

    if (!userEmail) {
      return res.status(400).json({
        success: false,
        message: 'userEmail is required'
      });
    }

    if (typeof getContractAndGateway !== 'function') {
      return res.status(500).json({
        success: false,
        message: 'Blockchain gateway is not available'
      });
    }

    const identityName = 'chaincert-admin';
    const orgName = 'Org1';

    const cg = await getContractAndGateway(identityName, orgName);
    gateway = cg.gateway;
    const contract = cg.contract;

    const resultBuffer = await contract.evaluateTransaction(
      'GetUserStatusLogs',
      userEmail
    );

    const raw = resultBuffer.toString();

    let logs;
    try {
      logs = JSON.parse(raw || '[]');
    } catch (_) {
      logs = [];
    }

    if (!Array.isArray(logs)) logs = [];

    return res.status(200).json({
      success: true,
      logs,
      count: logs.length
    });

  } catch (error) {
    console.error('getUserStatusLogs error:', error);
    if (res.headersSent) return;

    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch user status logs'
    });

  } finally {
    try { if (gateway) await gateway.disconnect(); } catch (_) {}
  }
},


};

module.exports = authController;
