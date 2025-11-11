const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(bodyParser.json());

const ccpPath = path.resolve(__dirname, 'connection-profile.json');
const walletPath = path.join(process.cwd(), 'wallet');

async function getContract() {
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    
    const identity = await wallet.get('admin');
    if (!identity) {
        throw new Error('Admin identity not found in wallet');
    }

    const gateway = new Gateway();
    await gateway.connect(ccp, {
        wallet,
        identity: 'admin',
        discovery: { enabled: false, asLocalhost: true }
    });

    const network = await gateway.getNetwork('chaincert-channel');
    const contract = network.getContract('chaincert');
    
    return { contract, gateway };
}

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'ChainCert API is running' });
});

app.post('/api/credentials', async (req, res) => {
    try {
        const { id, holderID, issuerID, credentialType, expiryDate, metadata, documentHash } = req.body;
        
        if (!id || !holderID || !issuerID || !credentialType || !expiryDate) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const { contract, gateway } = await getContract();
        
        const result = await contract.submitTransaction(
            'IssueCredential',
            id, holderID, issuerID, credentialType, expiryDate,
            metadata || '', documentHash || ''
        );
        
        await gateway.disconnect();
        
        res.status(201).json({
            success: true,
            message: 'Credential issued successfully',
            credentialId: id,
            credential: JSON.parse(result.toString())
        });
    } catch (error) {
        console.error('Error issuing credential:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/credentials/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { contract, gateway } = await getContract();
        const result = await contract.evaluateTransaction('GetCredential', id);
        await gateway.disconnect();
        const credential = JSON.parse(result.toString());
        res.json(credential);
    } catch (error) {
        console.error('Error getting credential:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/credentials/:id/verify', async (req, res) => {
    try {
        const { id } = req.params;
        const { contract, gateway } = await getContract();
        const result = await contract.evaluateTransaction('VerifyCredential', id);
        await gateway.disconnect();
        const verification = JSON.parse(result.toString());
        res.json(verification);
    } catch (error) {
        console.error('Error verifying credential:', error);
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/credentials/:id/revoke', async (req, res) => {
    try {
        const { id } = req.params;
        const { contract, gateway } = await getContract();
        
        const result = await contract.submitTransaction('RevokeCredential', id);
        
        await gateway.disconnect();
        
        res.json({
            success: true,
            message: 'Credential revoked successfully',
            credentialId: id,
            credential: JSON.parse(result.toString())
        });
    } catch (error) {
        console.error('Error revoking credential:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`ChainCert API server running on http://localhost:${PORT}`);
    console.log('Available endpoints:');
    console.log('  GET  /api/health');
    console.log('  POST /api/credentials');
    console.log('  GET  /api/credentials/:id');
    console.log('  GET  /api/credentials/:id/verify');
    console.log('  PUT  /api/credentials/:id/revoke');
});
