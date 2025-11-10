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

  // Get ALL credentials ← NEW FUNCTION
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

  // Get credential by ID
  getCredentialById: async (credentialId) => {
    try {
      const response = await axios.get(`/credentials/${credentialId}`);
      return response.data.credential;
    } catch (error) {
      console.error(`Error fetching credential ${credentialId}:`, error);
      throw error;
    }

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

  // Revoke credential
  revokeCredential: async (credentialId) => {
    try {
      const response = await axios.put(`/credentials/${credentialId}/revoke`);
      return response.data.credential;
    } catch (error) {
      console.error(`Error revoking credential ${credentialId}:`, error);
      throw error;
    }

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

export default ApiService;