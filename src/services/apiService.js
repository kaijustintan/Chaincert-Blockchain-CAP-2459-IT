import axios from 'axios';

const API_BASE_URL = 'http://172.27.177.220:4000/api';

const apiService = {

  // Health check
  healthCheck: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/health`);
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  },

  // Get ALL credentials ← NEW FUNCTION
  getAllCredentials: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/credentials`);
      return response.data.credentials || [];
    } catch (error) {
      console.error('Error fetching all credentials:', error);
      throw error;
    }
  },

  // Get credentials by issuer (FIXED - was getAllCredentials)
  getCredentialsByIssuer: async (issuerID) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/credentials/issuer/${issuerID}`);
      return response.data.credentials;
    } catch (error) {
      console.error('Error fetching credentials:', error);
      throw error;
    }
  },

  // Get credentials by holder
  getCredentialsByHolder: async (holderID) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/credentials/holder/${holderID}`);
      return response.data.credentials;
    } catch (error) {
      console.error('Error fetching credentials:', error);
      throw error;
    }
  },

  // Get credential by ID
  getCredentialById: async (credentialId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/credentials/${credentialId}`);
      return response.data.credential;
    } catch (error) {
      console.error(`Error fetching credential ${credentialId}:`, error);
      throw error;
    }
  },

  // Verify credential
  verifyCredential: async (credentialId) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/credentials/${credentialId}/verify`);
      return response.data.verification;
    } catch (error) {
      console.error(`Error verifying credential ${credentialId}:`, error);
      throw error;
    }
  },

  // Issue new credential
  issueCredential: async (credentialData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/credentials`, {
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
      const response = await axios.put(`${API_BASE_URL}/credentials/${credentialId}/revoke`);
      return response.data.credential;
    } catch (error) {
      console.error(`Error revoking credential ${credentialId}:`, error);
      throw error;
    }
  },

  // Get credential history
  getCredentialHistory: async (credentialId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/credentials/${credentialId}/history`);
      return response.data.history;
    } catch (error) {
      console.error(`Error fetching history for ${credentialId}:`, error);
      throw error;
    }
  }
};

export default apiService;
