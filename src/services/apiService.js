const API_BASE_URL = 'http://localhost:3000/api';

class ApiService {
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