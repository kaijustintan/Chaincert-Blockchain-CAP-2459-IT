const express = require('express');
const cors = require('cors');
const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

const ccpPath = path.resolve(__dirname, 'connection-multi-org.json');
const walletPath = path.join(__dirname, 'wallet');

async function getContractAndGateway() {
    try {
        const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
        const ccp = JSON.parse(ccpJSON);
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        
        const identity = await wallet.get('admin');
        if (!identity) {
            throw new Error('Admin identity not found');
        }

        const gateway = new Gateway();
        await gateway.connect(ccp, {
            wallet,
            identity: 'admin',
            discovery: { 
                enabled: false,
                asLocalhost: true 
            }
        });

        const network = await gateway.getNetwork('chaincert-channel');
        const contract = network.getContract('chaincert');

        return { gateway, contract, network };
    } catch (error) {
        throw error;
    }
}

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'ChainCert API is running',
        mode: 'Fabric SDK (fabric-network)'
    });
});

app.get('/api/credentials', async (req, res) => {
    let gateway;
    try {
        const credentialIds = ['CRED001', 'CRED002', 'CRED003'];
        ({ gateway, contract } = await getContractAndGateway());
        
        const credentials = [];
        for (const id of credentialIds) {
            try {
                const result = await contract.evaluateTransaction('GetCredential', id);
                credentials.push(JSON.parse(result.toString()));
            } catch (err) {
                console.log(`Credential ${id} not found, skipping...`);
            }
        }
        
        res.json(credentials);
    } catch (error) {
        console.error(`Error getting credentials: ${error.message}`);
        res.status(500).json({ error: error.message });
    } finally {
        if (gateway) gateway.disconnect();
    }
});

app.get('/api/credentials/:id', async (req, res) => {
    let gateway;
    try {
        const { id } = req.params;
        ({ gateway, contract } = await getContractAndGateway());
        
        const result = await contract.evaluateTransaction('GetCredential', id);
        const credential = JSON.parse(result.toString());
        
        res.json(credential);
    } catch (error) {
        console.error(`Error getting credential: ${error.message}`);
        res.status(500).json({ error: error.message });
    } finally {
        if (gateway) gateway.disconnect();
    }
});

app.get('/api/credentials/:id/verify', async (req, res) => {
    let gateway;
    try {
        const { id } = req.params;
        ({ gateway, contract } = await getContractAndGateway());
        
        const result = await contract.evaluateTransaction('VerifyCredential', id);
        const verification = JSON.parse(result.toString());
        
        res.json(verification);
    } catch (error) {
        console.error(`Error verifying credential: ${error.message}`);
        res.status(500).json({ error: error.message });
    } finally {
        if (gateway) gateway.disconnect();
    }
});

// ✅ NEW: Shorter route for history (what your frontend expects)
app.get('/api/history/:id', async (req, res) => {
    let gateway;
    try {
        const { id } = req.params;
        console.log(`📜 Fetching history for: ${id}`);
        
        ({ gateway, contract } = await getContractAndGateway());
        
        const result = await contract.evaluateTransaction('GetCredentialHistory', id);
        const history = JSON.parse(result.toString());
        
        console.log(`✅ History found for ${id}:`, history.length, 'records');
        res.json(history);
    } catch (error) {
        console.error(`❌ Error getting history for ${id}:`, error.message);
        res.status(404).json({ 
            error: 'History not found', 
            message: error.message,
            credentialId: id 
        });
    } finally {
        if (gateway) gateway.disconnect();
    }
});

// Keep the old route too for compatibility
app.get('/api/credentials/:id/history', async (req, res) => {
    let gateway;
    try {
        const { id } = req.params;
        ({ gateway, contract } = await getContractAndGateway());
        
        const result = await contract.evaluateTransaction('GetCredentialHistory', id);
        const history = JSON.parse(result.toString());
        
        res.json(history);
    } catch (error) {
        console.error(`Error getting history: ${error.message}`);
        res.status(500).json({ error: error.message });
    } finally {
        if (gateway) gateway.disconnect();
    }
});

app.post('/api/credentials', async (req, res) => {
    let gateway;
    try {
        const { id, holderID, issuerID, credentialType, expiryDate, metadata, documentHash } = req.body;
        
        if (!id || !holderID || !issuerID || !credentialType || !expiryDate) {
            return res.status(400).json({ 
                error: 'Missing required fields',
                required: ['id', 'holderID', 'issuerID', 'credentialType', 'expiryDate']
            });
        }

        ({ gateway, contract, network } = await getContractAndGateway());
        
        const transaction = contract.createTransaction('IssueCredential');
        transaction.setEndorsingOrganizations('Org1MSP', 'Org2MSP');
        
        const result = await transaction.submit(
            id,
            holderID,
            issuerID,
            credentialType,
            expiryDate,
            metadata || '',
            documentHash || ''
        );
        
        const credential = JSON.parse(result.toString());
        
        res.status(201).json({
            success: true,
            message: 'Credential issued successfully via SDK',
            credential
        });
        
    } catch (error) {
        console.error(`Error issuing credential: ${error.message}`);
        res.status(500).json({ 
            error: error.message,
            stack: error.stack
        });
    } finally {
        if (gateway) gateway.disconnect();
    }
});

// ✅ NEW: Add /api/revoke endpoint (shorter route)
app.post('/api/revoke', async (req, res) => {
    let gateway;
    try {
        const { credentialId } = req.body;
        
        if (!credentialId) {
            return res.status(400).json({ error: 'credentialId is required' });
        }
        
        ({ gateway, contract, network } = await getContractAndGateway());
        
        const transaction = contract.createTransaction('RevokeCredential');
        transaction.setEndorsingOrganizations('Org1MSP', 'Org2MSP');
        
        const result = await transaction.submit(credentialId);
        
        const credential = JSON.parse(result.toString());
        
        res.json({
            success: true,
            message: 'Credential revoked successfully via SDK',
            credential
        });
        
    } catch (error) {
        console.error(`Error revoking credential: ${error.message}`);
        res.status(500).json({ error: error.message });
    } finally {
        if (gateway) gateway.disconnect();
    }
});

// Keep the old route too for compatibility
app.put('/api/credentials/:id/revoke', async (req, res) => {
    let gateway;
    try {
        const { id } = req.params;
        
        ({ gateway, contract, network } = await getContractAndGateway());
        
        const transaction = contract.createTransaction('RevokeCredential');
        transaction.setEndorsingOrganizations('Org1MSP', 'Org2MSP');
        
        const result = await transaction.submit(id);
        
        const credential = JSON.parse(result.toString());
        
        res.json({
            success: true,
            message: 'Credential revoked successfully via SDK',
            credential
        });
        
    } catch (error) {
        console.error(`Error revoking credential: ${error.message}`);
        res.status(500).json({ error: error.message });
    } finally {
        if (gateway) gateway.disconnect();
    }
});

const PORT = 4000;
app.listen(PORT, () => {
    console.log(`ChainCert API running on http://localhost:${PORT}`);
    console.log('Mode: Fabric SDK with CORS enabled');
    console.log('Endpoints:');
    console.log('  GET  /api/health');
    console.log('  GET  /api/credentials');
    console.log('  GET  /api/credentials/:id');
    console.log('  GET  /api/credentials/:id/verify');
    console.log('  GET  /api/credentials/:id/history');
    console.log('  GET  /api/history/:id                    [NEW]');
    console.log('  POST /api/credentials');
    console.log('  POST /api/revoke                         [NEW]');
    console.log('  PUT  /api/credentials/:id/revoke');
});
