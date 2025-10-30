const express = require('express');
const cors = require('cors');
const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

const ccpPath = '/home/kaitanz_/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/connection-org1.json';
const walletPath = path.join(__dirname, 'wallet');

async function getContractAndGateway() {
  try {
    const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
    const ccp = JSON.parse(ccpJSON);
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    const identity = await wallet.get('admin');
    if (!identity) throw new Error('Admin identity not found');

    const gateway = new Gateway();
    await gateway.connect(ccp, {
      wallet,
      identity: 'admin',
      discovery: { enabled: true, asLocalhost: true }
    });

    const network = await gateway.getNetwork('chaincert-channel');
    const contract = network.getContract('chaincert');
    return { gateway, contract };
  } catch (error) {
    console.error('❌ Gateway Error:', error.message);
    throw error;
  }
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Get ALL credentials ← NEW ENDPOINT
app.get('/api/credentials', async (req, res) => {
  let gateway;
  try {
    ({ gateway, contract } = await getContractAndGateway());
    const result = await contract.evaluateTransaction('GetCredentialsByIssuer', 'ISSUER-DLSU');
    res.json({ success: true, credentials: JSON.parse(result.toString()) });
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (gateway) gateway.disconnect();
  }
});

// Create credential
app.post('/api/credentials', async (req, res) => {
  let gateway;
  try {
    const { id, holderID, issuerID, credentialType, expiryDate, metadata, documentHash } = req.body;
    if (!id || !holderID || !issuerID) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    ({ gateway, contract } = await getContractAndGateway());
    const result = await contract.submitTransaction('IssueCredential',
      id, holderID, issuerID, credentialType, expiryDate, metadata || '', documentHash || ''
    );
    res.status(201).json({ success: true, credential: JSON.parse(result.toString()) });
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (gateway) gateway.disconnect();
  }
});

// Get credential
app.get('/api/credentials/:id', async (req, res) => {
  let gateway;
  try {
    ({ gateway, contract } = await getContractAndGateway());
    const result = await contract.evaluateTransaction('GetCredential', req.params.id);
    res.json({ success: true, credential: JSON.parse(result.toString()) });
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (gateway) gateway.disconnect();
  }
});

// Verify credential
app.post('/api/credentials/:id/verify', async (req, res) => {
  let gateway;
  try {
    ({ gateway, contract } = await getContractAndGateway());
    const result = await contract.evaluateTransaction('VerifyCredential', req.params.id);
    res.json({ success: true, verification: JSON.parse(result.toString()) });
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (gateway) gateway.disconnect();
  }
});

// Revoke credential
app.put('/api/credentials/:id/revoke', async (req, res) => {
  let gateway;
  try {
    ({ gateway, contract } = await getContractAndGateway());
    const result = await contract.submitTransaction('RevokeCredential', req.params.id);
    res.json({ success: true, credential: JSON.parse(result.toString()) });
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (gateway) gateway.disconnect();
  }
});

// Get credentials by holder
app.get('/api/credentials/holder/:holderID', async (req, res) => {
  let gateway;
  try {
    ({ gateway, contract } = await getContractAndGateway());
    const result = await contract.evaluateTransaction('GetCredentialsByHolder', req.params.holderID);
    res.json({ success: true, credentials: JSON.parse(result.toString()) });
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (gateway) gateway.disconnect();
  }
});

// Get credentials by issuer
app.get('/api/credentials/issuer/:issuerID', async (req, res) => {
  let gateway;
  try {
    ({ gateway, contract } = await getContractAndGateway());
    const result = await contract.evaluateTransaction('GetCredentialsByIssuer', req.params.issuerID);
    res.json({ success: true, credentials: JSON.parse(result.toString()) });
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (gateway) gateway.disconnect();
  }
});

// Get credential history
app.get('/api/credentials/:id/history', async (req, res) => {
  let gateway;
  try {
    ({ gateway, contract } = await getContractAndGateway());
    const result = await contract.evaluateTransaction('GetCredentialHistory', req.params.id);
    res.json({ success: true, history: JSON.parse(result.toString()) });
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (gateway) gateway.disconnect();
  }
});

const PORT = 4000;
app.listen(PORT, () => console.log(`✅ API running on :${PORT}`));
