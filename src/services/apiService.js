<<<<<<< Updated upstream
import axios from './axiosInstance';

const API_BASE_URL = 'http://localhost:4000/api'; // ADDED THIS FOR THE CHANGE PASSWORD

const apiService = {
  // Health check
  healthCheck: async () => {
    try {
      const response = await axios.get('/health');
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
=======
const API_BASE_URL = 'http://localhost:4000/api';  // Changed from 3000 to 4000

class ApiService {
    // ========== HEALTH CHECK ==========
    static async healthCheck() {
        try {
            const response = await fetch(`${API_BASE_URL}/../health`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Health check failed:', error);
            throw error;
        }
>>>>>>> Stashed changes
    }
  },

<<<<<<< Updated upstream
  // User Registration
  registerUser: async (userData) => {
    try {
      const response = await axios.post('/register', userData);
      return response.data;
    } catch (error) {
      console.error('User registration failed:', error);
      throw error;
=======
    // ========== CREDENTIAL METHODS ==========
    
    static async getAllCredentials() {
        try {
            const response = await fetch(`${API_BASE_URL}/credentials`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            return data.credentials || [];
        } catch (error) {
            console.error('Error fetching all credentials:', error);
            throw error;
        }
>>>>>>> Stashed changes
    }
  },

<<<<<<< Updated upstream
  // User Login
  login: async (credentials) => {
    try {
      const response = await axios.post('/login', credentials);
      return response.data;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
=======
    static async issueCredential(credentialData) {
        try {
            const response = await fetch(`${API_BASE_URL}/credentials/issue`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentialData)
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Error issuing credential:', error);
            throw error;
        }
>>>>>>> Stashed changes
    }
  },

<<<<<<< Updated upstream
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
=======
    static async getCredential(credentialId) {
        try {
            const response = await fetch(`${API_BASE_URL}/credentials/${credentialId}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching credential:', error);
            throw error;
        }
>>>>>>> Stashed changes
    }
  },

<<<<<<< Updated upstream
  // Issuer Login
  loginIssuer: async (credentials) => {
    try {
      const response = await axios.post('/login-issuer', credentials);
      return response.data;
    } catch (error) {
      console.error('Issuer login failed:', error);
      throw error;
=======
    static async verifyCredential(credentialId) {
        try {
            const response = await fetch(`${API_BASE_URL}/credentials/${credentialId}/verify`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Error verifying credential:', error);
            throw error;
        }
>>>>>>> Stashed changes
    }
  },

<<<<<<< Updated upstream
  // NEWLY ADDED - OLOPS
  changePassword: async (passwordData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/change-password`, {
        email: passwordData.email,
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      return response.data;
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
=======
    static async revokeCredential(credentialId, reason) {
        try {
            const response = await fetch(`${API_BASE_URL}/credentials/${credentialId}/revoke`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: reason || 'No reason provided' })
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Error revoking credential:', error);
            throw error;
        }
>>>>>>> Stashed changes
    }
  },

<<<<<<< Updated upstream
  // Profile Summary 
  updateProfile: async (profileData) => {
    try {
      const response = await axios.post('/auth/update-profile', {
        userId: profileData.userId,
        summary: profileData.summary,
        isPublic: profileData.isPublic
      });
      return response.data;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
=======
    static async getCredentialsByHolder(holderId) {
        try {
            const response = await fetch(`${API_BASE_URL}/credentials/holder/${holderId}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            return data.credentials || data || [];
        } catch (error) {
            console.error('Error fetching holder credentials:', error);
            throw error;
        }
>>>>>>> Stashed changes
    }
  },

<<<<<<< Updated upstream
  // Edited this for Profile Summary Display
  getUserInfo: async (userId) => {
    try {
      const response = await axios.get(`/auth/user/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting user info:', error);
      throw error;
=======
    static async getCredentialsByIssuer(issuerId) {
        try {
            const response = await fetch(`${API_BASE_URL}/credentials/issuer/${issuerId}`);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
            }
            const data = await response.json();
            return data.credentials || data || [];
        } catch (error) {
            console.error('Error fetching issuer credentials:', error);
            throw error;
        }
>>>>>>> Stashed changes
    }
  },

<<<<<<< Updated upstream
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
=======
    static async getCredentialHistory(credentialId) {
        try {
            const response = await fetch(`${API_BASE_URL}/credentials/${credentialId}/history`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching credential history:', error);
            throw error;
        }
    }

    // ========== AUTH METHODS ==========
    
    static async register(userData) {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Registration failed');
            }
            return await response.json();
        } catch (error) {
            console.error('Error registering:', error);
            throw error;
        }
    }

    static async login(username, password) {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Login failed');
            }
            const data = await response.json();
            
            // Store token in localStorage
            if (data.token) {
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
            }
            
            return data;
        } catch (error) {
            console.error('Error logging in:', error);
            throw error;
        }
    }

    static async logout() {
        try {
            const token = localStorage.getItem('authToken');
            if (token) {
                await fetch(`${API_BASE_URL}/auth/logout`, {
                    method: 'POST',
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
            }
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
        } catch (error) {
            console.error('Error logging out:', error);
            throw error;
        }
    }

    static async getCurrentUser() {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) throw new Error('No token found');
            
            const response = await fetch(`${API_BASE_URL}/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Error getting current user:', error);
            throw error;
        }
    }

    static isAuthenticated() {
        return !!localStorage.getItem('authToken');
    }

    static getUser() {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    }

    static getAuthToken() {
        return localStorage.getItem('authToken');
    }
}
>>>>>>> Stashed changes

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