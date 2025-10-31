const API_BASE_URL = 'http://localhost:3000/api';

class ApiService {
    // Health check
    static async healthCheck() {
        try {
            const response = await fetch(`${API_BASE_URL}/../health`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Health check failed:', error);
            throw error;
        }
    }

    // Get ALL credentials
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
    }

    // Issue credential
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
    }

    // Get credential by ID
    static async getCredential(credentialId) {
        try {
            const response = await fetch(`${API_BASE_URL}/credentials/${credentialId}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching credential:', error);
            throw error;
        }
    }

    // Verify credential
    static async verifyCredential(credentialId) {
        try {
            const response = await fetch(`${API_BASE_URL}/credentials/${credentialId}/verify`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Error verifying credential:', error);
            throw error;
        }
    }

    // Revoke credential
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
    }

    // Get credentials by holder
    static async getCredentialsByHolder(holderId) {
        try {
            const response = await fetch(`${API_BASE_URL}/credentials/holder/${holderId}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching holder credentials:', error);
            throw error;
        }
    }

    // Get credentials by issuer
    static async getCredentialsByIssuer(issuerId) {
        try {
            const response = await fetch(`${API_BASE_URL}/credentials/issuer/${issuerId}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching issuer credentials:', error);
            throw error;
        }
    }

    // Get credential history
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
}

export default ApiService;