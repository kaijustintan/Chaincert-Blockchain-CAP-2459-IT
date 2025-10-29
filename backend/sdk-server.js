const express = require('express');
const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());

const ccpPath = path.resolve(__dirname, 'connection-multi-org.json');
const walletPath = path.join(__dirname, 'wallet');

async function getContractAndGateway(channelName = 'chaincert-channel', contractName = 'chaincert') {
    try {
        // Load connection profile
        const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
        const ccp = JSON.parse(ccpJSON);

        // Load wallet
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        
        // Check for admin identity
        const identity = await wallet.get('admin');
        if (!identity) {
            throw new Error('Admin identity not found in wallet. Run setupWallet.js first.');
        }

        // Create gateway instance
        const gateway = new Gateway();
        
        // Connect to gateway with proper options
        await gateway.connect(ccp, {
            wallet,
            identity: 'admin',
            discovery: { 
                enabled: true,
                asLocalhost: true 
            }
        });

        // Get network and contract
        const network = await gateway.getNetwork(channelName);
        const contract = network.getContract(contractName);

        return { gateway, contract };
        
    } catch (error) {
        console.error(`Failed to get contract: ${error}`);
        throw error;
    }
}

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'ChainCert SDK API is running',
        mode: 'Fabric SDK (fabric-network)'
    });
});

// Get credential by ID
app.get('/api/credentials/:id', async (req, res) => {
    let gateway;
    try {
        const { id } = req.params;
        
        ({ gateway, contract } = await getContractAndGateway());
        
        const result = await contract.evaluateTransaction('GetCredential', id);
        const credential = JSON.parse(result.toString());
        
        res.json(credential);
        
    } catch (error) {
        console.error(`Error getting credential: ${error}`);
        res.status(500).json({ 
            error: error.message,
            details: 'Failed to query credential from blockchain'
        });
    } finally {
        if (gateway) {
            gateway.disconnect();
        }
    }
});

// Verify credential
app.get('/api/credentials/:id/verify', async (req, res) => {
    let gateway;
    try {
        const { id } = req.params;
        
        ({ gateway, contract } = await getContractAndGateway());
        
        const result = await contract.evaluateTransaction('VerifyCredential', id);
        const verification = JSON.parse(result.toString());
        
        res.json(verification);
        
    } catch (error) {
        console.error(`Error verifying credential: ${error}`);
        res.status(500).json({ 
            error: error.message,
            details: 'Failed to verify credential'
        });
    } finally {
        if (gateway) {
            gateway.disconnect();
        }
    }
});

// Issue credential (POST)
app.post('/api/credentials', async (req, res) => {
    let gateway;
    try {
        const { id, holderID, issuerID, credentialType, expiryDate, metadata, documentHash } = req.body;
        
        // Validate required fields
        if (!id || !holderID || !issuerID || !credentialType || !expiryDate) {
            return res.status(400).json({ 
                error: 'Missing required fields',
                required: ['id', 'holderID', 'issuerID', 'credentialType', 'expiryDate']
            });
        }

        ({ gateway, contract } = await getContractAndGateway());
        
        // Submit transaction (writes to blockchain)
        const result = await contract.submitTransaction(
            'IssueCredential',
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
        console.error(`Error issuing credential: ${error}`);
        res.status(500).json({ 
            error: error.message,
            details: 'Failed to issue credential'
        });
    } finally {
        if (gateway) {
            gateway.disconnect();
        }
    }
});

// Revoke credential (PUT)
app.put('/api/credentials/:id/revoke', async (req, res) => {
    let gateway;
    try {
        const { id } = req.params;
        
        ({ gateway, contract } = await getContractAndGateway());
        
        const result = await contract.submitTransaction('RevokeCredential', id);
        const credential = JSON.parse(result.toString());
        
        res.json({
            success: true,
            message: 'Credential revoked successfully via SDK',
            credential
        });
        
    } catch (error) {
        console.error(`Error revoking credential: ${error}`);
        res.status(500).json({ 
            error: error.message,
            details: 'Failed to revoke credential'
        });
    } finally {
        if (gateway) {
            gateway.disconnect();
        }
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`ChainCert SDK API running on http://localhost:${PORT}`);
    console.log('Mode: Fabric SDK (fabric-network)');
    console.log('Endpoints:');
    console.log('  GET  /api/health');
    console.log('  GET  /api/credentials/:id');
    console.log('  GET  /api/credentials/:id/verify');
    console.log('  POST /api/credentials');
    console.log('  PUT  /api/credentials/:id/revoke');
});
