// ==========================================================================================================================================================================
//                                                               apiService.js 
// ==========================================================================================================================================================================


/* [ OUTLINE ]
  =====================================================================
  FILE: apiService.js
  TECHNICAL: Frontend Axios service layer for backend APIs
  TROPA: Centralized HTTP client ng frontend.
  =====================================================================


  CATEGORY: SYSTEM / HEALTH
  - healthCheck()


  CATEGORY: USER AUTH / ACCOUNTS
  - registerUser(userData)
  - login(credentials)
  - changePassword(passwordData)
  - updateProfile(profileData)
  - uploadProfilePicture(formData)
  - getUserInfo(userId)


  CATEGORY: ISSUER AUTH / PROFILE
  - registerIssuer(formData)
  - loginIssuer(credentials)


  CATEGORY: ADMIN / ISSUER REVIEW
  - getPendingIssuers()
  - approveIssuer(issuerId)
  - rejectIssuer(issuerId, rejectionReason)


  CATEGORY: ISSUER CREDENTIAL TEMPLATES (CREATE + READ)
  - Create_CredentialTemplate(credentialData)
  - Get_IssuedCredentials()
  - Get_CredentialTemplates()


  CATEGORY: ISSUER CREDENTIAL ISSUANCE (INSTANCE)
  - Issue_CredentialInstance(credentialId, holderID, expiryDate)


  CATEGORY: DEBUG / UTIL
  - getApiBaseUrl()
*/


import axios from './axiosInstance';


const apiService = {


  // ==========================================================================================================================================================================
  //                                                               SYSTEM / HEALTH
  // ==========================================================================================================================================================================


  /*
    Function Name: healthCheck


    Technical: Calls the backend health endpoint to confirm that the server is running and reachable.
    Tropang Ex: Parang tinatanong mo yung backend ng “Uy, buhay ka pa ba?”
  */
  healthCheck: async () => {
    try {

      /* Step 1: Send GET request to /health endpoint
        Technical: Axios sends an HTTP GET request to backend health route.
        Tropang Ex: Frontend → backend → “OK ka pa ba?”
      */
      const response = await axios.get('/health');

      /* Step 2: Return backend response
        Tropang Ex: Ibinabalik sa frontend yung sagot ng backend.
      */
      return response.data;

    } catch (error) {

      /* Step 3: Handle request error
        Tropang Ex: Kapag down yung backend, lalabas yung error sa console.
      */
      console.error('Health check failed:', error.response?.data?.message || error.message);
      throw error;
    }
  },


  // ==========================================================================================================================================================================
  //                                                               USER AUTH / ACCOUNTS
  // ==========================================================================================================================================================================


  /*
    Function Name: registerUser


    Technical: Sends user registration data to the backend to create a new user account.
    Tropang Ex: Pang sign-up ng student/admin. Si backend na bahala mag-hash ng password at mag-save sa DB.
  */
  registerUser: async (userData) => {
    try {

      /* Step 1: POST registration data to /register
        Technical: Sends userData (email, password, etc.) to backend.
        Tropang Ex: Ipinapasa yung form data ng signup.
      */
      const response = await axios.post('/auth/register', userData);

      /* Step 2: Return backend response
        Tropang Ex: Ibinabalik kung successful ba yung registration.
      */
      return response.data;

    } catch (error) {

      /* Step 3: Handle registration errors
        Tropang Ex: Halimbawa: email already exists, weak password, etc.
      */
      console.error('User registration failed:', error.response?.data?.message || error.message);
      throw error;
    }
  },
  // ==========================================================================================================================================================================


  /*
    Function Name: login


    Technical: Authenticates a regular user via backend login endpoint.


    Tropang Ex: Pang login ng student/admin gamit email + password.
  */
  login: async (credentials) => {
    try {

      /* Step 1: POST credentials to /login
        Technical: Sends email/password to backend for validation.
        Tropang Ex: Login attempt ng user.
      */
      const response = await axios.post('/auth/login', credentials);

      /* Step 2: Return login result (token/user info)
        Tropang Ex: Kapag tama login, babalik yung session/token info.
      */
      return response.data;

    } catch (error) {

      /* Step 3: Handle login failure
        Tropang Ex: Mali password / user not found.
      */
      const status = error?.response?.status;
      const message = error?.response?.data?.message || error.message;
      if (status >= 500 || !status) {
        console.error('Login failed:', message);
      } else {
        console.warn('Login request rejected:', message);
      }
      throw error;
    }
  },


  // ==========================================================================================================================================================================
  //                                                               ISSUER AUTH / PROFILE
  // ==========================================================================================================================================================================


  /*
    Function Name: registerIssuer


    Technical:
    Submits an issuer application to the backend for admin approval.


    Tropang Ex:
    Pang-apply ng school/org bilang issuer (subject for admin review).
  */
  registerIssuer: async (formData) => {
    try {

      /* Step 1: POST issuer registration form
        Technical: Sends issuer application data to backend.
        Tropang Ex: Application form ng school/org.
      */
      const response = await axios.post('/auth/register-issuer', formData);

      /* Step 2: Return application result
        Tropang Ex: Confirmation na na-submit yung application.
      */
      return response.data;

    } catch (error) {
      console.error('Issuer registration failed:', error.response?.data?.message || error.message);
      throw error;
    }
  },
  // ==========================================================================================================================================================================


  /*
    Function Name: loginIssuer


    Technical: Logs in an issuer account (must usually be approved first).
    Tropang Ex: Pang login ng issuer dashboard.
  */
  loginIssuer: async (credentials) => {
    try {

      /* Step 1: POST issuer credentials
        Tropang Ex: Login attempt ng issuer.
      */
      const response = await axios.post('/auth/login-issuer', credentials);

      /* Step 2: Return issuer session data */
      return response.data;

    } catch (error) {
      const status = error?.response?.status;
      const message = error?.response?.data?.message || error.message;
      if (status >= 500 || !status) {
        console.error('Issuer login failed:', message);
      } else {
        console.warn('Issuer login request rejected:', message);
      }
      throw error;
    }
  },
  // ==========================================================================================================================================================================


  /*
    Function Name: changePassword


    Technical: Requests backend to change a user’s password after verifying current password.
    Tropang Ex: Pang palit ng password sa settings page.
  */
  changePassword: async (passwordData) => {
    try {

      /* Step 1: POST password change request
        Technical: Sends email, currentPassword, newPassword.
        Tropang Ex: Verify muna yung old password bago palitan.
      */
      const response = await axios.post('/auth/change-password', { 
        email: passwordData.email,
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      /* Step 2: Return success response */
      return response.data;

    } catch (error) {
      console.error('Error changing password:', error.response?.data?.message || error.message);
      throw error;
    }
  },
// ==========================================================================================================================================================================


  /*
    Function Name: updateProfile


    Technical: Updates profile summary and visibility settings.
    Tropang Ex: Pang edit ng bio / about me ng user.
  */
  updateProfile: async (profileData) => {
    try {

      /* Step 1: POST updated profile fields
        Tropang Ex: Save profile settings.
      */
      const response = await axios.post('/auth/update-profile', {
        userId: profileData.userId,
        summary: profileData.summary,
        isPublic: profileData.isPublic
      });

      /* Step 2: Return updated profile result */
      return response.data;

    } catch (error) {
      console.error('Error updating profile:', error.response?.data?.message || error.message);
      throw error;
    }
  },
// ==========================================================================================================================================================================


  /*
    Function Name: uploadProfilePicture


    Technical: Uploads profile image using multipart/form-data.
    Tropang Ex: Pang palit ng avatar/profile picture.
  */
  uploadProfilePicture: async (formData) => {
    try {

      /* Step 1: POST image file to backend
        Technical: multipart/form-data request.
        Tropang Ex: Upload ng picture file.
      */
      const response = await axios.post('/auth/upload-pfp', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      /* Step 2: Return uploaded image info */
      return response.data;

    } catch (error) {
      console.error('Error uploading profile picture:', error.response?.data?.message || error.message);
      throw error;
    }
  },


  /*
    Function Name: getUserInfo


    Technical: Fetches user profile info from backend.


    Tropang Ex: Pang refresh ng user details sa UI.
  */
  getUserInfo: async (userId) => {
    try {

      /* Step 1: GET user info by ID */
      const response = await axios.get(`/auth/user/${userId}`);

      /* Step 2: Return user document */
      return response.data;

    } catch (error) {
      console.error('Error getting user info:', error.response?.data?.message || error.message);
      throw error;
    }
  },

  /**
   * Function Name: getAllUsers
   * Technical: Fetches all non-admin users from backend.
   * Tropang Ex: Kinukuha lahat ng users para sa dropdown ng "Select Recipient".
   */
  getAllUsers: async () => {
    try {
      console.log("Fetching all users for recipient dropdown...");
      const response = await axios.get('/auth/users');
      return response.data.users || []; // Backend returns { success: true, users: [...] }
    } catch (error) {
      console.error('Error fetching all users:', error.response?.data?.message || error.message);
      throw error;
    }
  },

  // ==========================================================================================================================================================================
  //                                                               ADMIN / ISSUER REVIEW
  // ==========================================================================================================================================================================


  /* BADING BALIK 
    Function Name: getPendingIssuers


    Technical: Retrieves issuer applications awaiting admin approval.
    Tropang Ex: Admin dashboard list ng mga nag-apply na issuer.
  */
  getPendingIssuers: async () => {
    try {

      /* Step 1: GET pending issuers */
      const response = await axios.get('/auth/pending-issuers');

      /* Step 2: Return issuer list */
      return response.data;

    } catch (error) {
      console.error('Error fetching pending issuers:', error.response?.data?.message || error.message);
      throw error;
    }
  },
  // ==========================================================================================================================================================================

    /*
    Function Name: getApprovedIssuers

    Technical:
    Retrieves all APPROVED issuers from backend.
    Tropang Ex: Admin dashboard list ng lahat ng currently approved issuers
    / accredited organizations.
  */
  getApprovedIssuers: async () => {
    try {
      // Step 1: GET approved issuers
      const response = await axios.get('/auth/approved-issuers');

      // Step 2: Return payload (backend already sends { success, data, count, ... })
      return response.data;
    } catch (error) {
      console.error(
        'Error fetching approved issuers:',
        error.response?.data?.message || error.message
      );
      throw error;
    }
  },
  // ==========================================================================================================================================================================

  /*
  Function Name: getRejectedIssuers

  Technical:
  Retrieves all REJECTED issuers from backend.
  Tropang Ex: Admin dashboard list ng lahat ng rejected issuer applications.
*/
getRejectedIssuers: async () => {
  try {
    // Step 1: GET rejected issuers
    const response = await axios.get('/auth/rejected-issuers');

    // Step 2: Return payload
    return response.data;
  } catch (error) {
    console.error(
      'Error fetching rejected issuers:',
      error.response?.data?.message || error.message
    );
    throw error;
  }
},
  // ==========================================================================================================================================================================

/*
  Function Name: getDisabledIssuers

  Technical:
  Retrieves all DISABLED issuers from backend.
*/
getDisabledIssuers: async () => {
  try {
    const response = await axios.get('/auth/disabled-issuers');
    return response.data;
  } catch (error) {
    console.error(
      'Error fetching disabled issuers:',
      error.response?.data?.message || error.message
    );
    throw error;
  }
},
  // ==========================================================================================================================================================================

  /*
  Function Name: approveIssuer

  Technical:
  Approves an issuer application via SDK endpoint
  (CouchDB + Blockchain logging).
*/
approveIssuer: async (issuerId, approvalReason) => {
  try {

    const response = await axios.post(
      `/approve-issuer/${issuerId}`,
      {
        approvalReason: approvalReason || ''
      }
    );

    return response.data;

  } catch (error) {
    console.error(
      'Error approving issuer:',
      error.response?.data?.message || error.message
    );
    throw error;
  }
},
// =============================================================================================================

/*
  Function Name: rejectIssuer

  Technical:
  Rejects issuer application via SDK endpoint
  (CouchDB + Blockchain logging).
*/
rejectIssuer: async (issuerId, rejectionReason) => {
  try {

    const response = await axios.post(
      `/reject-issuer/${issuerId}`,
      {
        rejectionReason
      }
    );

    return response.data;

  } catch (error) {
    console.error(
      'Error rejecting issuer:',
      error.response?.data?.message || error.message
    );
    throw error;
  }
},
  // ==========================================================================================================================================================================
// ==========================================================================================================================================================================
//                                                               ADMIN / STATUS MANAGEMENT (DISABLE / ENABLE)
// ==========================================================================================================================================================================

/*
  Function Name: disableIssuer
  Technical: Disables an APPROVED issuer (admin action) with required reason.
*/
disableIssuer: async (issuerId, reason) => {
  try {
    if (!issuerId) throw new Error('issuerId is required');
    if (!reason || reason.trim() === '') throw new Error('reason is required');

    const response = await axios.post(`/auth/disable-issuer/${issuerId}`, { reason });
    return response.data;
  } catch (error) {
    console.error(
      'Error disabling issuer:',
      error.response?.data?.message || error.message
    );
    throw error;
  }
},

/*
  Function Name: enableIssuer
  Technical: Re-enables a DISABLED issuer (admin action) with required reason.
*/
enableIssuer: async (issuerId, reason) => {
  try {
    if (!issuerId) throw new Error('issuerId is required');
    if (!reason || reason.trim() === '') throw new Error('reason is required');

    const response = await axios.post(`/auth/enable-issuer/${issuerId}`, { reason });
    return response.data;
  } catch (error) {
    console.error(
      'Error enabling issuer:',
      error.response?.data?.message || error.message
    );
    throw error;
  }
},

/*
  Function Name: disableUser
  Technical: Disables a USER account (admin action) with required reason.
*/
disableUser: async (userId, reason) => {
  try {
    if (!userId) throw new Error('userId is required');
    if (!reason || reason.trim() === '') throw new Error('reason is required');

    const response = await axios.post(`/auth/disable-user/${userId}`, { reason });
    return response.data;
  } catch (error) {
    console.error(
      'Error disabling user:',
      error.response?.data?.message || error.message
    );
    throw error;
  }
},

/*
  Function Name: enableUser
  Technical: Re-enables a disabled USER account (admin action) with required reason.
*/
enableUser: async (userId, reason) => {
  try {
    if (!userId) throw new Error('userId is required');
    if (!reason || reason.trim() === '') throw new Error('reason is required');

    const response = await axios.post(`/auth/enable-user/${userId}`, { reason });
    return response.data;
  } catch (error) {
    console.error(
      'Error enabling user:',
      error.response?.data?.message || error.message
    );
    throw error;
  }
},

  // ==========================================================================================================================================================================
  //                                                               Issuer Credentials (From Blockchain)
  // ==========================================================================================================================================================================
  // ==========================================================================================================================================================================
  //                             ISSUER CREDENTIAL TEMPLATES (CREATE + READ)
  // ==========================================================================================================================================================================


  /*
    Function Name: Create_CredentialTemplate


    Technical:
    Creates a new credential TEMPLATE for the logged-in issuer by calling
    POST /issuer/credentials/create. Expects JWT token to be attached
    by axiosInstance for authentication.


    Tropang Ex:
    Ito yung “Create Template” button ng issuer dashboard.
    Ipapasa niya yung form details (type, name, description, metadata)
    papunta sa backend, tapos bahala na si backend mag-save sa blockchain
    at CouchDB.
  */
  Create_CredentialTemplate: async (credentialData) => {
    try {

      /* Step 1: POST template data to issuer credential endpoint
         Technical:
         Sends credentialData (credentialType, credentialName, description, metadata)
         to backend route /issuer/credentials/create.

         Tropang Ex:
         Ipinapasa yung laman ng create-template form kay backend.
      */
      const response = await axios.post('/issuer/credentials/create', {
        credentialType: credentialData.credentialType,
        credentialName: credentialData.credentialName,
        description: credentialData.description,
        metadata: credentialData.metadata
      });

      /* Step 2: Return backend response
         Tropang Ex:
         Ibinabalik kung successful ba yung creation sa blockchain + CouchDB,
         kasama yung credentialId at status.
      */
      return response.data;

    } catch (error) {

      /* Step 3: Handle creation errors
         Tropang Ex:
         Kapag may mali sa input, auth, o DB/blockchain error, dito lalabas.
      */
      console.error('Error creating credential template:', error.response?.data?.message || error.message);
      throw error;
    }
  },
// ==========================================================================================================================================================================


  /*
    Function Name: Get_IssuedCredentials


    Technical:
    Fetches ISSUED credentials for the logged-in issuer from the backend
    endpoint GET /credentials/issued.


    Tropang Ex:
    Kinukuha lahat ng credentials na na-issue na talaga ng issuer sa mga holders.
  */
  Get_IssuedCredentials: async () => {
    try {
      const response = await axios.get('/credentials/issued');
      return response.data.credentials;
    } catch (error) {
      console.error('Error fetching issued credentials:', error.response?.data?.message || error.message);
      throw error;
    }
  },
  // ==========================================================================================================================================================================


  /*
    Function Name: Get_CredentialTemplates


    Technical:
    Fetches credential TEMPLATES for the logged-in issuer from
    GET /credentials/templates.


    Tropang Ex:
    Kinukuha lahat ng credential templates (blueprints) ng issuer.
  */
  Get_CredentialTemplates: async () => {
    try {
      const response = await axios.get('/credentials/templates');
      return response.data.credentials;
    } catch (error) {
      console.error('Error fetching credential templates:', error.response?.data?.message || error.message);
      throw error;
    }
  },
  // ==========================================================================================================================================================================

    // ==========================================================================================================================================================================

  /*
    Function Name: Get_IssuerCredentialsHistory

    Technical:
    Fetches the complete audit trail of ALL credentials for the logged-in issuer
    from the backend endpoint GET /issuer/credentials/history.
    
    Returns a flattened array of all history entries sorted by most recent timestamp.
    Supports optional filtering by credentialId via query parameter.

    Tropang Ex:
    Ito yung kinukuha ng "Credential History" page para makita lahat ng nangyari
    sa credentials ng issuer — template creation, issuance, revocation, etc.
    Sorted by most recent activity, perfect for audit trail dashboard.

    Parameters:
    - credentialId (optional) → If provided, filters history to show only entries for that credential

    Returns:
    {
      success: true,
      data: [ ...flattened history entries... ],
      count: 42,
      isFiltered: false,
      filter: null,
      timestamp: "2026-02-03T17:10:00.000Z"
    }
  */
  Get_IssuerCredentialsHistory: async (credentialId = null) => {
    try {

      /* Step 1: Build request URL with optional filter
         Technical:
         - Base URL: /issuer/credentials/history
         - If credentialId provided: add ?credentialId=xxx query param
         
         Tropang Ex:
         Kung may search query, isasama sa URL para filtered results ang bumalik.
      */
      let url = '/issuer/credentials/history';
      if (credentialId) {
        url += `?credentialId=${encodeURIComponent(credentialId)}`;
      }

      /* Step 2: Send GET request to backend
         Technical:
         Axios automatically attaches JWT token from axiosInstance interceptor.
         
         Tropang Ex:
         Hihingi sa backend ng buong history, tapos kung may filter, filtered results
         ang babalik.
      */
      const response = await axios.get(url);

      /* Step 3: Return response data (NOT response.data.credentials, just response.data)
         Technical:
         Backend returns:
         {
           success: true,
           data: [...history entries...],
           count: 42,
           isFiltered: false,
           filter: null,
           timestamp: "..."
         }
         
         So we return the WHOLE response.data object, not just response.data.data
         
         Tropang Ex:
         Ibinabalik buong object para may access sa count, isFiltered, etc.
      */
      return response.data;

    } catch (error) {
      console.error('Error fetching credential history:', error.response?.data?.message || error.message);
      throw error;
    }
  },

  // ==========================================================================================================================================================================

  // ==========================================================================================================================================================================
  //                         ISSUER CREDENTIAL ISSUANCE (INSTANCE)
  // ==========================================================================================================================================================================


  /*
    Function Name: Issue_CredentialInstance


    Technical:
    Issues a credential INSTANCE to a specific holder by calling:
      POST /credentials/:credentialId/issue


    Sends:
      - credentialId (from param)
      - holderID (body)
      - optional expiryDate (body)


    Tropang Ex:
    Ito yung button na "Issue to student/user".
    Pipili ka ng template (credentialId), tapos pipili ka ng holderID at expiryDate,
    then si backend na bahala mag:
      1) magsulat sa blockchain (IssueCredential)
      2) mag-save sa CouchDB (issued_credentials + wallet_user_credentials).
  */
  Issue_CredentialToUser: async (credentialId, holderID, expiryDate) => {
    try {
      /* Step 1: POST issuance request to backend
         Technical:
         Calls /credentials/:credentialId/issue with holderID + expiryDate in body.

         Tropang Ex:
         Frontend → "Pa-issue nga nitong template na ’to kay holderID na ’to."
      */
      const response = await axios.post(
        `/credentials/${credentialId}/issue`,
        {
          holderID: holderID,
          expiryDate: expiryDate || null
        }
      );

      /* Step 2: Return backend result
         Tropang Ex:
         Ibinabalik dito yung buong result ng issuance:
           - success flag
           - message
           - credential data galing blockchain
           - CouchDB save info (kung pumasok sa DBs).
      */
      return response.data;

    } catch (error) {
      /* Step 3: Handle issuance errors
         Tropang Ex:
         Kapag pumalya sa blockchain or CouchDB, dito magla-log at ipapasa yung error
         pabalik sa UI para ma-handle (toast/alert).
      */
      console.error(
        'Error issuing credential:',
        error.response?.data?.message || error.message
      );
      throw error;
    }
  },
// ==========================================================================================================================================================================

  /*
    Function Name: Revoke_CredentialInstance

    Technical:
    Revokes a credential INSTANCE by calling:
      POST /credentials/:credentialId/revoke

    Sends:
      - credentialId (URL param, blockchain ID e.g. "cred_1770...")
      (no body needed for now; backend uses JWT to know which issuer/admin acts)

    Tropang Ex:
    Ito yung "Revoke" button sa issuer/admin dashboard.
    Kapag tinawag, ia-update ng backend yung status sa:
      1) blockchain (RevokeCredential)
      2) CouchDB copies (issued_credentials + wallet_user_credentials).
  */
    Revoke_CredentialInstance: async (credentialId, rejectionReason) => { // - polo
    try {
      /* Step 1: POST revoke request to backend
         Technical:
         Calls /credentials/:credentialId/revoke with no extra body.
      */
      const response = await axios.post(
        `/credentials/${credentialId}/revoke`,
        { rejectionReason: rejectionReason || '' } // - polo
      );

      /* Step 2: Return backend result
         Tropang Ex:
         Ibinabalik dito yung buong result ng revocation:
           - success flag
           - message
           - updated credential data
           - CouchDB sync info.
      */
      return response.data;

    } catch (error) {
      /* Step 3: Handle revoke errors
         Tropang Ex:
         Kapag pumalya sa blockchain or CouchDB, dito magla-log at ipapasa
         yung error pabalik sa UI para ma-handle (toast/alert).
      */
      console.error(
        'Error revoking credential:',
        error.response?.data?.message || error.message
      );
      throw error;
    }
  },
// ==========================================================================================================================================================================

 // ==========================================================================================================================================================================
  //                                VERIFIER / PUBLIC CHECK
  // ==========================================================================================================================================================================

  /*
    Function Name: Verify_CredentialById

    Technical:
    Verifies a credential by its ID via backend endpoint:
      GET /api/credentials/:credentialId/verify

    Tropang Ex:
    Ito yung ginagamit ng public / verifier UI (or QR scan) para i-check kung:
      - existing ba yung credential,
      - valid pa ba (hindi revoked, hindi expired),
      - ano status sa CouchDB at blockchain.
  */
  Verify_CredentialById: async (credentialId) => {
    try {
      const response = await axios.get(`/credentials/${credentialId}/verify`);
      // Backend already returns a rich object:
      // {
      //   success, verified, credentialID, status, isValid, isRevoked,
      //   isExpired, reason, sources: { couchDB, blockchain, ... }, ...
      // }
      return response.data;
    } catch (error) {
      console.error(
        'Error verifying credential:',
        error.response?.data?.message || error.message
      );
      throw error;
    }
  },
  // ==========================================================================================================================================================================  
    /*
    Function Name: Log_VerificationEvent

    Technical:
    Creates an on-chain verification log entry for a credential via:
      POST /credentials/:credentialId/log-verification

    Expects:
      - credentialId (URL param)
      - payload from frontend:
        {
          verifierName,
          verifierEmail,
          verifyResult: { valid, reason }
        }

    Tropang Ex:
    Pagkatapos mong mag-Verify sa UI (may result na), tatawagin mo 'to
    para isulat sa blockchain na:
      - sino ang nag-verify (name/email),
      - anong credential ang chineck,
      - ano ang naging result.
  */
  Log_VerificationEvent: async (credentialId, verifierName, verifierEmail, verifyResult) => {
    try {
      const response = await axios.post(
        `/credentials/${credentialId}/log-verification`,
        {
          verifierName,
          verifierEmail,
          verifyResult
        }
      );
      return response.data; // { success, message, log }
    } catch (error) {
      console.error(
        'Error logging verification event:',
        error.response?.data?.message || error.message
      );
      throw error;
    }
  },

  // Get all verification logs (blockchain)
Get_AllVerificationLogs: async () => {
  try {
    const response = await axios.get('/verification-logs'); // baseURL already has /api
    return response.data; // { success, logs, count, timestamp }
  } catch (error) {
    console.error(
      'Error fetching verification logs:',
      error.response?.data?.message || error.message
    );
    throw error;
  }
},

// Get all issuer/user status-change logs (blockchain)
Get_AllStatusLogs: async () => {
  try {
    const response = await axios.get('/admin/status-logs');
    return response.data; // { success, logs, count }
  } catch (error) {
    console.error(
      'Error fetching status logs:',
      error.response?.data?.message || error.message
    );
    throw error;
  }
},

// Get single verification log by ID
Get_VerificationLogById: async (logId) => {
  try {
    const response = await axios.get(`/verification-logs/${logId}`);
    return response.data; // { success, log, timestamp }
  } catch (error) {
    console.error(
      'Error fetching verification log by ID:',
      error.response?.data?.message || error.message
    );
    throw error;
  }
},
// ==========================================================================================================================================================================

  // ==========================================================================================================================================================================
  //                                               ADMIN / DASHBOARD - GLOBAL CREDENTIALS VIEW
  // ==========================================================================================================================================================================

  /*
    Function Name: Get_AllAdminCredentials

    Technical:
    Fetches an aggregated list of ALL credentials (templates + issued)
    across ALL approved issuers via:
      GET /api/admin/credentials/all

    Supports optional filters via query params:
      - issuerId: limit results to a specific issuer
      - type: 'issued' | 'templates' (or omit for all)

    Tropang Ex:
    Ito yung kinukuha ng Admin Dashboard → Credentials tab.
    - Puwede mong piliin “All issuers” o specific school (DLSU, Ateneo, etc.).
    - Puwede mong piliin “Issued only” o “Templates only”.
  */
  Get_AllAdminCredentials: async (params = {}) => {
    try {
      /* Step 1: Send GET request with optional filters
         Technical:
         axios.get('/admin/credentials/all', { params }) will automatically build
         the query string (?issuerId=...&type=...).

         Tropang Ex:
         Frontend → backend: “Bigyan mo ako ng master list, optionally filtered
         by issuer at type.”
      */
      const response = await axios.get('/admin/credentials/all', { params });

      /* Step 2: Return backend response payload
         Technical:
         Backend returns:
           {
             success: true,
             data: [...rows...],
             count: number,
             filters: { issuerId, type },
             timestamp: "..."
           }

         Tropang Ex:
         Ibinabalik buong object para may access ka sa data + count + filters.
      */
      return response.data;

    } catch (error) {
      /* Step 3: Handle request errors
         Tropang Ex:
         Kapag pumalya yung aggregation sa backend (CouchDB / logic),
         dito magla-log ng error at ipapasa pabalik sa UI.
      */
      console.error(
        'Error fetching all admin credentials:',
        error.response?.data?.message || error.message
      );
      throw error;
    }
  },
  // ==========================================================================================================================================================================

    /*
    Function Name: Get_CredentialHistoryById

    Technical:
    Fetches the FULL blockchain history of a specific credential
    via endpoint:
      GET /api/credentials/:credentialId/history

    Returns:
    {
      success: true,
      history: [ ...history records... ],
      timestamp: "..."
    }

    Tropang Ex:
    Ito yung tatawagin kapag pinindot mo yung "See History"
    ng isang issued credential sa dashboard.
    Ibinabalik nito lahat ng blockchain transactions ng credential —
    creation, issuance, updates, revoke, etc.
  */
  Get_CredentialHistoryById: async (credentialId) => {
    try {

      /* Step 1: Validate input */
      if (!credentialId) {
        throw new Error("credentialId is required");
      }

      /* Step 2: Send GET request to backend */
      const response = await axios.get(
        `/credentials/${credentialId}/history`
      );

      /* Step 3: Return backend payload
         Backend returns:
         {
           success: true,
           history: [...],
           timestamp: "..."
         }
      */
      return response.data;

    } catch (error) {
      console.error(
        'Error fetching credential history by ID:',
        error.response?.data?.error || error.message
      );
      throw error;
    }
  },

  // ==========================================================================================================================================================================
  //                                                               USER CREDENTIALS (STUDENT WALLET)
  // ==========================================================================================================================================================================

  /*
    Function Name: Get_UserCredentials

    Technical:
    Fetches all credentials for a specific student/holder from
    the admin CouchDB (wallet_user_credentials) via:
      GET /api/auth/credentials/user/:holderID

    Tropang Ex:
    Ito yung kinukuha ng student dashboard para makita niya
    lahat ng credentials na na-issue sa kanya
    CouchDB only — mabilis, walang blockchain call

    // - polo
  */
  Get_UserCredentials: async (holderID) => {
    try {
      /* Step 1: Validate input
         // - polo
      */
      if (!holderID) {
        throw new Error('holderID is required');
      }

      /* Step 2: Send GET request to backend
         // - polo
      */
      const response = await axios.get(`/auth/credentials/user/${holderID}`);

      /* Step 3: Return credentials array
         Technical: Backend returns { success, credentials, count, timestamp }
         Tropang Ex: Ibinabalik lang yung credentials array para sa dashboard.
         // - polo
      */
      return response.data.credentials || [];

    } catch (error) {
      console.error(
        'Error fetching user credentials:',
        error.response?.data?.message || error.message
      );
      throw error;
    }
  },

  /*
    Function Name: Update_CredentialVisibility
    Technical:
    Updates visibility of a credential in CouchDB via:
      PATCH /api/auth/credentials/:credentialId/visibility
    CouchDB only — no blockchain call
    // - polo
  */
  Update_CredentialVisibility: async (credentialId, visibility) => {
    try {
      if (!credentialId) throw new Error('credentialId is required');
      if (!['public', 'private'].includes(visibility)) throw new Error('visibility must be public or private');

      const response = await axios.patch(
        `/auth/credentials/${credentialId}/visibility`,
        { visibility }
      );
      return response.data;
    } catch (error) {
      console.error('Error updating credential visibility:', error.response?.data?.message || error.message);
      throw error;
    }
  },

  // ==========================================================================================================================================================================
  //                                                               DEBUG / UTIL
  // ==========================================================================================================================================================================


  /*
    Function Name: getApiBaseUrl


    Technical: Returns the current axios base URL.
    Tropang Ex: Pang debug kung saan kumokonek yung frontend (local, staging, prod).
  */
  getApiBaseUrl: () => {
    return axios.defaults.baseURL || 'http://localhost:4000';
  }
};


export default apiService;
