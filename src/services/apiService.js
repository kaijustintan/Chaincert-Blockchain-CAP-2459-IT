// ==========================================================================================================================================================================
//                                                                       apiService.js 
// ==========================================================================================================================================================================
import axios from './axiosInstance';

const apiService = {

  // ==========================================================================================================================================================================
  //                                                                       SYSTEM / HEALTH
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
  //                                                                       USER AUTH / ACCOUNTS
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
      const response = await axios.post('/register', userData);

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
      const response = await axios.post('/login', credentials);

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
  //                                                                       ISSUER AUTH / PROFILE
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
      const response = await axios.post('/login-issuer', credentials);

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

  // ==========================================================================================================================================================================
  //                                                                       ADMIN / ISSUER REVIEW
  // ==========================================================================================================================================================================

  /* BADING BALIK 
    Function Name: getPendingIssuers

    Technical: Retrieves issuer applications awaiting admin approval.
    Tropang Ex: Admin dashboard list ng mga nag-apply na issuer.
  */
  getPendingIssuers: async () => {
    try {

      /* Step 1: GET pending issuers */
      const response = await axios.get('/pending-issuers');

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
  //                                                                       Issuer Credentials (From Blockchain)
  // ==========================================================================================================================================================================

  /*
    Function Name: Get_IssuedCredentials

    Technical:
    Fetches ISSUED credentials for the logged-in issuer from the backend
    endpoint GET /api/credentials/issued.

    Tropang Ex:
    Kinukuha lahat ng credentials na na-issue na talaga ng issuer sa mga holders.
  */
  Get_IssuedCredentials: async () => {
    try {
      const response = await axios.get('/api/credentials/issued');
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
    GET /api/credentials/templates.

    Tropang Ex:
    Kinukuha lahat ng credential templates (blueprints) ng issuer.
  */
  Get_CredentialTemplates: async () => {
    try {
      const response = await axios.get('/api/credentials/templates');
      return response.data.credentials;
    } catch (error) {
      console.error('Error fetching credential templates:', error.response?.data?.message || error.message);
      throw error;
    }
  },
  // ==========================================================================================================================================================================

  // ==========================================================================================================================================================================
  //                                                                       DEBUG / UTIL
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
