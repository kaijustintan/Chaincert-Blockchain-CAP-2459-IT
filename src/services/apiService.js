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
      console.error('Login failed:', error.response?.data?.message || error.message);
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
      console.error('Issuer login failed:', error.response?.data?.message || error.message);
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
      const response = await axios.get('/users');
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
    Function Name: approveIssuer


    Technical: Approves an issuer application.
    Tropang Ex: “Approve” button ni admin.
  */
  approveIssuer: async (issuerId) => {
    try {

      /* Step 1: POST approve request */
      const response = await axios.post(`/auth/approve-issuer/${issuerId}`);

      /* Step 2: Return approval result */
      return response.data;

    } catch (error) {
      console.error('Error approving issuer:', error.response?.data?.message || error.message);
      throw error;
    }
  },
// ==========================================================================================================================================================================


  /*
    Function Name: rejectIssuer


    Technical: Rejects an issuer application with a reason.
    Tropang Ex: “Reject” button ni admin + reason kung bakit.
  */
  rejectIssuer: async (issuerId, rejectionReason) => {
    try {

      /* Step 1: POST rejection request */
      const response = await axios.post(`/auth/reject-issuer/${issuerId}`, {
        rejectionReason
      });

      /* Step 2: Return rejection result */
      return response.data;

    } catch (error) {
      console.error('Error rejecting issuer:', error.response?.data?.message || error.message);
      throw error;
    }
  },
  // ==========================================================================================================================================================================


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
  Revoke_CredentialInstance: async (credentialId) => {
    try {
      /* Step 1: POST revoke request to backend
         Technical:
         Calls /credentials/:credentialId/revoke with no extra body.
      */
      const response = await axios.post(
        `/credentials/${credentialId}/revoke`
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
