import axios from './axiosInstance';


const apiService = {
  // Health check
  healthCheck: async () => {
    try {
      const response = await axios.get('/health');
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error.response?.data?.message || error.message);
      throw error;
    }
  },


  // User Registration
  registerUser: async (userData) => {
    try {
      const response = await axios.post('/register', userData);
      return response.data;
    } catch (error) {
      console.error('User registration failed:', error.response?.data?.message || error.message);
      throw error;
    }
  },


  // User Login
  login: async (credentials) => {
    try {
      const response = await axios.post('/login', credentials);
      return response.data;
    } catch (error) {
      console.error('Login failed:', error.response?.data?.message || error.message);
      throw error;
    }
  },


  // ========== NEW ISSUER METHODS ==========
  
  // Issuer Registration
  registerIssuer: async (formData) => {
    try {
      const response = await axios.post('/auth/register-issuer', formData);
      return response.data;
    } catch (error) {
      console.error('Issuer registration failed:', error.response?.data?.message || error.message);
      throw error;
    }
  },


  // Issuer Login
  loginIssuer: async (credentials) => {
    try {
      const response = await axios.post('/login-issuer', credentials);
      return response.data;
    } catch (error) {
      console.error('Issuer login failed:', error.response?.data?.message || error.message);
      throw error;
    }
  },


  // Change Password
  changePassword: async (passwordData) => {
    try {
      const response = await axios.post('/auth/change-password', { 
        email: passwordData.email,
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      return response.data;
    } catch (error) {
      console.error('Error changing password:', error.response?.data?.message || error.message);
      throw error;
    }
  },


  // Update Profile Summary
  updateProfile: async (profileData) => {
    try {
      const response = await axios.post('/auth/update-profile', {
        userId: profileData.userId,
        summary: profileData.summary,
        isPublic: profileData.isPublic
      });
      return response.data;
    } catch (error) {
      console.error('Error updating profile:', error.response?.data?.message || error.message);
      throw error;
    }
  },


  // Upload Profile Picture
  uploadProfilePicture: async (formData) => {
    try {
      const response = await axios.post('/auth/upload-pfp', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error uploading profile picture:', error.response?.data?.message || error.message);
      throw error;
    }
  },


  // Get User Info
  getUserInfo: async (userId) => {
    try {
      const response = await axios.get(`/auth/user/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting user info:', error.response?.data?.message || error.message);
      throw error;
    }
  },


  // Get Pending Issuers (Admin)
  getPendingIssuers: async () => {
    try {
      const response = await axios.get('/pending-issuers');
      return response.data;
    } catch (error) {
      console.error('Error fetching pending issuers:', error.response?.data?.message || error.message);
      throw error;
    }
  },


  // Approve Issuer (Admin)
  approveIssuer: async (issuerId) => {
    try {
      const response = await axios.post(`/auth/approve-issuer/${issuerId}`);
      return response.data;
    } catch (error) {
      console.error('Error approving issuer:', error.response?.data?.message || error.message);
      throw error;
    }
  },


  // Reject Issuer (Admin)
  rejectIssuer: async (issuerId, rejectionReason) => {
    try {
      const response = await axios.post(`/auth/reject-issuer/${issuerId}`, {
        rejectionReason
      });
      return response.data;
    } catch (error) {
      console.error('Error rejecting issuer:', error.response?.data?.message || error.message);
      throw error;
    }
  },


  // ========== CREDENTIAL METHODS ==========
  
  // Get ALL Credentials
  getAllCredentials: async () => {
    try {
      const response = await axios.get('/credentials');
      return response.data?.credentials || [];
    } catch (error) {
      console.error('Error fetching all credentials:', error.response?.data?.message || error.message);
      throw error;
    }
  },


  // ✅ UPDATED: Get Credentials by Issuer from CouchDB
  getCredentialsByIssuer: async (issuerID) => {
    try {
      // ✅ Validate issuer ID before making request
      if (!issuerID || issuerID === 'ISSUER' || issuerID === 'undefined') {
        console.warn('⚠️  Invalid issuer ID:', issuerID);
        return [];
      }

      // ✅ Call the new CouchDB endpoint (via backend)
      const response = await axios.get(`/credentials/issuer/${issuerID}`);
      
      // ✅ Safely extract credentials with fallback
      return response.data?.credentials || response.data?.data || [];
    } catch (error) {
      // ✅ Better error handling - don't throw on 400 errors, just return empty
      if (error.response?.status === 400 || error.response?.status === 404) {
        console.warn('⚠️  Issuer not found or invalid:', issuerID);
        return [];
      }
      
      console.error('Error fetching credentials by issuer:', error.response?.data?.message || error.message);
      throw error;
    }
  },


  // Get Credentials by Holder
  getCredentialsByHolder: async (holderID) => {
    try {
      const response = await axios.get(`/credentials/holder/${holderID}`);
      return response.data?.credentials || [];
    } catch (error) {
      console.error('Error fetching credentials by holder:', error.response?.data?.message || error.message);
      throw error;
    }
  },


  // Get Credential by ID
  getCredentialById: async (credentialId) => {
    try {
      const response = await axios.get(`/credentials/${credentialId}`);
      return response.data?.credential;
    } catch (error) {
      console.error(`Error fetching credential ${credentialId}:`, error.response?.data?.message || error.message);
      throw error;
    }
  },


  // Verify Credential
  verifyCredential: async (credentialId) => {
    try {
      const response = await axios.post(`/credentials/${credentialId}/verify`);
      return response.data?.verification;
    } catch (error) {
      console.error(`Error verifying credential ${credentialId}:`, error.response?.data?.message || error.message);
      throw error;
    }
  },


  // Issue New Credential
  issueCredential: async (credentialData) => {
    try {
      const response = await axios.post('/credentials', {
        id: credentialData.id,
        holderID: credentialData.holderID,
        issuerID: credentialData.issuerID,
        credentialType: credentialData.credentialType,
        expiryDate: credentialData.expiryDate,
        metadata: credentialData.metadata || '',
        documentHash: credentialData.documentHash || ''
      });
      return response.data?.credential;
    } catch (error) {
      console.error('Error issuing credential:', error.response?.data?.message || error.message);
      throw error;
    }
  },


  // Create Credential
  createCredential: async (credentialData) => {
    try {
      const response = await axios.post('/credentials', {
        id: credentialData.id,
        credentialType: credentialData.credentialType,
        credentialName: credentialData.credentialName,
        description: credentialData.description,
        issuerID: credentialData.issuerID,
        metadata: credentialData.metadata || ''
      });
      return response.data?.credential;
    } catch (error) {
      console.error('Error creating credential:', error.response?.data?.message || error.message);
      throw error;
    }
  },


  // Revoke Credential
  revokeCredential: async (credentialId) => {
    try {
      const response = await axios.put(`/credentials/${credentialId}/revoke`);
      return response.data?.credential;
    } catch (error) {
      console.error(`Error revoking credential ${credentialId}:`, error.response?.data?.message || error.message);
      throw error;
    }
  },


  // Get Credential History
  getCredentialHistory: async (credentialId) => {
    try {
      const response = await axios.get(`/credentials/${credentialId}/history`);
      return response.data?.history || [];
    } catch (error) {
      console.error(`Error fetching history for ${credentialId}:`, error.response?.data?.message || error.message);
      throw error;
    }
  },


  // Get All Users
  getAllUsers: async () => {
    try {
      const response = await axios.get('/users');
      return response.data?.users || [];
    } catch (error) {
      console.error('Error fetching users:', error.response?.data?.message || error.message);
      throw error;
    }
  },


  // Issue Credential to Holder
  issueCredentialToHolder: async (data) => {
    try {
      const response = await axios.post('/api/issue-to-holder', data);
      return response.data;
    } catch (error) {
      console.error('Error issuing credential to holder:', error.response?.data?.message || error.message);
      throw error;
    }
  },


  // ========== CREDENTIAL CREATION BY ISSUER ==========


  // Create Credential (Issuer version)
  createCredentialAsIssuer: async (credentialData) => {
    try {
      const response = await axios.post('/auth/issuer/credentials/create', {
        credential: credentialData
      });
      return response.data;
    } catch (error) {
      console.error('Error creating credential:', error.response?.data?.message || error.message);
      throw error;
    }
  },


  // Get API Base URL (for debugging)
  getApiBaseUrl: () => {
    return axios.defaults.baseURL || 'http://localhost:8080';
  }
};


export default apiService;
