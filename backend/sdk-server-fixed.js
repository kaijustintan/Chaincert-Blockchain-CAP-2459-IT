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

// 🔧 NEW: Persistent gateway connection
let cachedGateway = null;
let lastConnectionTime = 0;
const CONNECTION_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getContractAndGateway() {
  try {
    const now = Date.now();
    
    // ✅ Reuse gateway if it's still valid (less than 5 min old)
    if (cachedGateway && cachedGateway.isConnected && (now - lastConnectionTime) < CONNECTION_CACHE_TTL) {
      console.log('♻️  Reusing cached gateway connection');
      const network = await cachedGateway.getNetwork('chaincert-channel');
      const contract = network.getContract('chaincert');
      return { gateway: cachedGateway, contract };
    }

    // Otherwise create new connection
    console.log('🔄 Creating new gateway connection...');
    const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
    const ccp = JSON.parse(ccpJSON);
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    const identity = await wallet.get('admin');
    
    if (!identity) throw new Error('Admin identity not found');

    const gateway = new Gateway();
    await gateway.connect(ccp, {
      wallet,
      identity: 'admin',
      discovery: { 
        enabled: true, 
        asLocalhost: true,
        maxAge: 300,
        clearInterval: 60000
      }
    });

    const network = await gateway.getNetwork('chaincert-channel');
    const contract = network.getContract('chaincert');
    
    // Cache the gateway
    cachedGateway = gateway;
    lastConnectionTime = now;
    
    console.log('✅ Successfully connected to Hyperledger Fabric');
    return { gateway, contract };
  } catch (error) {
    console.error('❌ Gateway Error:', error.message);
    cachedGateway = null;
    throw error;
  }
}

// 🔧 NEW: Helper function for exponential backoff
async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down...');
  if (cachedGateway) {
    try {
      await cachedGateway.disconnect();
      console.log('✅ Gateway disconnected');
    } catch (e) {
      console.error('Error disconnecting:', e.message);
    }
  }
  process.exit(0);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Get ALL credentials
app.get('/api/credentials', async (req, res) => {
  let gateway;
  try {
    ({ gateway, contract } = await getContractAndGateway());
    const result = await contract.evaluateTransaction('GetCredentialsByIssuer', 'ISSUER');
    res.json({ success: true, credentials: JSON.parse(result.toString()) });
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 🔧 CREATE credential WITH RETRY LOGIC
app.post('/api/credentials', async (req, res) => {
  try {
    const { id, holderID, issuerID, credentialType, expiryDate, metadata, documentHash } = req.body;
    if (!id || !holderID || !issuerID) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // ✅ RETRY LOGIC - Try up to 3 times
    const MAX_RETRIES = 3;
    let lastError;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`📤 Attempt ${attempt}/${MAX_RETRIES}: Issuing credential ${id}...`);
        
        const { gateway, contract } = await getContractAndGateway();
        
        const result = await contract.submitTransaction(
          'IssueCredential',
          id, holderID, issuerID, credentialType, expiryDate, metadata || '', documentHash || ''
        );
        
        console.log(`✅ SUCCESS on attempt ${attempt}`);
        return res.status(201).json({ success: true, credential: JSON.parse(result.toString()) });
        
      } catch (error) {
        lastError = error;
        const errorMsg = error.message.toLowerCase();
        console.error(`❌ Attempt ${attempt} failed: ${error.message}`);
        
        // If it's an endorsement error, retry with exponential backoff
        if ((errorMsg.includes('peer endorsement') || 
             errorMsg.includes('do not match') || 
             errorMsg.includes('no valid responses') ||
             errorMsg.includes('endorsement')) && attempt < MAX_RETRIES) {
          
          const backoffMs = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
          console.log(`⏳ Waiting ${backoffMs}ms before retry... (attempt ${attempt}/${MAX_RETRIES})`);
          await sleep(backoffMs);
          continue; // ← RETRY
        }
        
        // If not endorsement issue or last attempt, throw
        if (attempt === MAX_RETRIES) {
          throw error;
        }
      }
    }
    
    throw new Error(`Failed after ${MAX_RETRIES} attempts: ${lastError.message}`);
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get credential by ID
app.get('/api/credentials/:id', async (req, res) => {
  try {
    const { gateway, contract } = await getContractAndGateway();
    const result = await contract.evaluateTransaction('GetCredential', req.params.id);
    res.json({ success: true, credential: JSON.parse(result.toString()) });
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Verify credential
app.post('/api/credentials/:id/verify', async (req, res) => {
  try {
    const { gateway, contract } = await getContractAndGateway();
    const result = await contract.evaluateTransaction('VerifyCredential', req.params.id);
    res.json({ success: true, verification: JSON.parse(result.toString()) });
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 🔧 REVOKE credential WITH RETRY LOGIC
app.put('/api/credentials/:id/revoke', async (req, res) => {
  try {
    const MAX_RETRIES = 3;
    let lastError;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`📤 Attempt ${attempt}/${MAX_RETRIES}: Revoking credential ${req.params.id}...`);
        const { gateway, contract } = await getContractAndGateway();
        const result = await contract.submitTransaction('RevokeCredential', req.params.id);
        
        console.log(`✅ SUCCESS on attempt ${attempt}`);
        return res.json({ success: true, credential: JSON.parse(result.toString()) });
        
      } catch (error) {
        lastError = error;
        const errorMsg = error.message.toLowerCase();
        console.error(`❌ Attempt ${attempt} failed: ${error.message}`);
        
        if ((errorMsg.includes('peer endorsement') || 
             errorMsg.includes('do not match') || 
             errorMsg.includes('no valid responses') ||
             errorMsg.includes('endorsement')) && attempt < MAX_RETRIES) {
          
          const backoffMs = Math.pow(2, attempt - 1) * 1000;
          console.log(`⏳ Waiting ${backoffMs}ms before retry...`);
          await sleep(backoffMs);
          continue;
        }
        
        if (attempt === MAX_RETRIES) {
          throw error;
        }
      }
    }
    
    throw new Error(`Failed after ${MAX_RETRIES} attempts: ${lastError.message}`);
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get credentials by holder
app.get('/api/credentials/holder/:holderID', async (req, res) => {
  try {
    const { gateway, contract } = await getContractAndGateway();
    const result = await contract.evaluateTransaction('GetCredentialsByHolder', req.params.holderID);
    res.json({ success: true, credentials: JSON.parse(result.toString()) });
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get credentials by issuer
app.get('/api/credentials/issuer/:issuerID', async (req, res) => {
  try {
    const { gateway, contract } = await getContractAndGateway();
    const result = await contract.evaluateTransaction('GetCredentialsByIssuer', req.params.issuerID);
    res.json({ success: true, credentials: JSON.parse(result.toString()) });
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get credential history
app.get('/api/credentials/:id/history', async (req, res) => {
  try {
    const { gateway, contract } = await getContractAndGateway();
    const result = await contract.evaluateTransaction('GetCredentialHistory', req.params.id);
    res.json({ success: true, history: JSON.parse(result.toString()) });
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = 4000;
app.listen(PORT, () => console.log(`✅ API running on :${PORT}`));
