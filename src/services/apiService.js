import axios from 'axios';

const API_BASE_URL = 'http://localhost:4000/api';

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

  // Get all credentials
  getAllCredentials: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/credentials`);
      return response.data;
    } catch (error) {
      console.error('Error fetching credentials:', error);
      throw error;
    }
  },

  // Get credential by ID
  getCredentialById: async (credentialId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/credentials/${credentialId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching credential ${credentialId}:`, error);
      throw error;
    }
  },

  // Verify credential
  verifyCredential: async (credentialId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/credentials/${credentialId}/verify`);
      return response.data;
    } catch (error) {
      console.error(`Error verifying credential ${credentialId}:`, error);
      throw error;
    }
  },

  // Issue new credential
  issueCredential: async (credentialData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/credentials`, credentialData);
      return response.data;
    } catch (error) {
      console.error('Error issuing credential:', error);
      throw error;
    }
  },

     // Revoke credential
  revokeCredential: async (credentialId) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/credentials/${credentialId}/revoke`);
      return response.data;
    } catch (error) {
      console.error(`Error revoking credential ${credentialId}:`, error);
      throw error;
    }
  },

  // Get credential history
  getCredentialHistory: async (credentialId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/credentials/${credentialId}/history`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching history for ${credentialId}:`, error);
      throw error;
    }
  }
};

export default apiService;
