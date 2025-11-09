import axios from './axiosInstance';

const apiService = {
  // Health check
  healthCheck: async () => {
    try {
      const response = await axios.get('/health');
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  },

  // User Registration
  registerUser: async (userData) => {
    try {
      const response = await axios.post('/register', userData);
      return response.data;
    } catch (error) {
      console.error('User registration failed:', error);
      throw error;
    }
  },

  // User Login
  login: async (credentials) => {
    try {
      const response = await axios.post('/login', credentials);
      return response.data;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  },

  // ========== NEW ISSUER METHODS ==========
  
  // Issuer Registration - FIXED: Accept pre-built FormData
  registerIssuer: async (formData) => {
    try {
      // formData is already built by the component
      // Just send it directly - axios will handle FormData automatically
      const response = await axios.post('/register-issuer', formData);
      return response.data;
    } catch (error) {
      console.error('Issuer registration failed:', error);
      throw error;
    }
  },

  // Issuer Login
  loginIssuer: async (credentials) => {
    try {
      const response = await axios.post('/login-issuer', credentials);
      return response.data;
    } catch (error) {
      console.error('Issuer login failed:', error);
      throw error;
    }
  },

  // ✅ FIXED: Get Pending Issuers (Admin) - Returns full response
  getPendingIssuers: async () => {
    try {
      const response = await axios.get('/pending-issuers');
      // ✅ Return entire response so adminDashboard.js can access response.data
      return response.data;
    } catch (error) {
      console.error('Error fetching pending issuers:', error);
      throw error;
    }
  },

  // ✅ FIXED: Approve Issuer (Admin) - Added /auth prefix
  approveIssuer: async (issuerId) => {
    try {
      const response = await axios.post(`/auth/approve-issuer/${issuerId}`);
      return response.data;
    } catch (error) {
      console.error('Error approving issuer:', error);
      throw error;
    }
  },

  // ✅ FIXED: Reject Issuer (Admin) - Added /auth prefix
  rejectIssuer: async (issuerId, rejectionReason) => {
    try {
      const response = await axios.post(`/auth/reject-issuer/${issuerId}`, {
        rejectionReason
      });
      return response.data;
    } catch (error) {
      console.error('Error rejecting issuer:', error);
      throw error;
    }
  },

  // ========== EXISTING CREDENTIAL METHODS ==========
  
  // Get ALL credentials
  getAllCredentials: async () => {
    try {
      const response = await axios.get('/credentials');
      return response.data.credentials || [];
    } catch (error) {
      console.error('Error fetching all credentials:', error);
      throw error;
    }
  },

  // Get credentials by issuer
  getCredentialsByIssuer: async (issuerID) => {
    try {
      const response = await axios.get(`/credentials/issuer/${issuerID}`);
      return response.data.credentials;
    } catch (error) {
      console.error('Error fetching credentials:', error);
      throw error;
    }
  },

  // Get credentials by holder
  getCredentialsByHolder: async (holderID) => {
    try {
      const response = await axios.get(`/credentials/holder/${holderID}`);
      return response.data.credentials;
    } catch (error) {
      console.error('Error fetching credentials:', error);
      throw error;
    }
  },

  // Get credential by ID
  getCredentialById: async (credentialId) => {
    try {
      const response = await axios.get(`/credentials/${credentialId}`);
      return response.data.credential;
    } catch (error) {
      console.error(`Error fetching credential ${credentialId}:`, error);
      throw error;
    }
  },

  // Verify credential
  verifyCredential: async (credentialId) => {
    try {
      const response = await axios.post(`/credentials/${credentialId}/verify`);
      return response.data.verification;
    } catch (error) {
      console.error(`Error verifying credential ${credentialId}:`, error);
      throw error;
    }
  },

  // Issue new credential
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
      return response.data.credential;
    } catch (error) {
      console.error('Error issuing credential:', error);
      throw error;
    }
  },

  // Revoke credential
  revokeCredential: async (credentialId) => {
    try {
      const response = await axios.put(`/credentials/${credentialId}/revoke`);
      return response.data.credential;
    } catch (error) {
      console.error(`Error revoking credential ${credentialId}:`, error);
      throw error;
    }
  },

  // Get credential history
  getCredentialHistory: async (credentialId) => {
    try {
      const response = await axios.get(`/credentials/${credentialId}/history`);
      return response.data.history;
    } catch (error) {
      console.error(`Error fetching history for ${credentialId}:`, error);
      throw error;
    }
  }
};

export default apiService;
