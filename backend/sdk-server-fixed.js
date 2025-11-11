// backend/sdk-server-fixed.js
const express = require('express');
const cors = require('cors');
const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcryptjs = require('bcryptjs');
const multer = require('multer');
const Docker = require('dockerode');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key';

// ✅ Multer configuration
const upload = multer({ storage: multer.memoryStorage() });

// ✅ Import CouchDB service
const couchdb = require('./couchDB_service');

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Initialize Docker client
const docker = new Docker({ socketPath: '/var/run/docker.sock' });
const FABRIC_SAMPLES_PATH = '/home/kaitanz_/fabric-samples';
const CORE_YAML_PATH = `${FABRIC_SAMPLES_PATH}/config/core.yaml`;

// ✅ Initialize CouchDB on server startup
couchdb.initializeDatabases().catch(err => {
  console.error('⚠️  CouchDB init error:', err.message);
});

// ✅ FIXED: Create database indexes on startup (FIXED SORT BUG)
const setupDatabaseIndexes = async () => {
  try {
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const db = couchdb.couch.use('issuer_registrations');
    
    // ✅ FIX: Added 'createdAt' to index fields for sorting
    await db.createIndex({
      index: {
        fields: ['type', 'status', 'createdAt']  // ← FIXED! Added createdAt here
      },
      name: 'idx-type-status-created',
      ddoc: 'indexes'
    });

    console.log('✅ Database indexes created successfully');
  } catch (error) {
    if (error.statusCode === 409 || error.message.includes('already')) {
      console.log('✅ Indexes already exist');
    } else {
      console.error('⚠️  Index creation error:', error.message);
    }
  }
};

setTimeout(setupDatabaseIndexes, 2000);

// ✅ Import and use auth routes
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

// SUBJECTIVE - KAI PATH TO CONNECTION PROFILE (Ubuntu/Linux)
const ccpPath = '/home/kaitanz_/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/connection-org1.json';
const walletPath = path.join(__dirname, 'wallet');

let cachedGateway = null;
let lastConnectionTime = 0;
const CONNECTION_CACHE_TTL = 5 * 60 * 1000;

async function getContractAndGateway() {
  try {
    const now = Date.now();
    if (cachedGateway && cachedGateway.isConnected && (now - lastConnectionTime) < CONNECTION_CACHE_TTL) {
      console.log('♻️  Reusing cached gateway connection');
      const network = await cachedGateway.getNetwork('chaincert-channel');
      const contract = network.getContract('chaincert');
      return { gateway: cachedGateway, contract };
    }
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

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

// ========== EXISTING: User Registration Endpoint
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, role, fullName } = req.body;
    if (!email || !password || !role) {
      return res.status(400).json({ success: false, error: 'Missing required fields.' });
    }
    const result = await couchdb.saveUser({ email, password, role, fullName });
    res.json({ success: true, userId: result.id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ========== OPTIMIZED: Regular User Login (Updated with bcryptjs)
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing email or password.' 
      });
    }

    // Get user from database
    const users = await couchdb.getAllUsers();
    const user = users.find(u => u.email === email);

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials.' 
      });
    }

    // ✅ NEW: Verify password with bcryptjs (not plain text)
    const passwordMatch = await bcryptjs.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials.' 
      });
    }

    // Create JWT token
    const token = jwt.sign(
      { 
        id: user._id, 
        email: user.email, 
        role: user.role || 'student' 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const { password: pw, ...userData } = user;
    
    res.json({ 
      success: true, 
      token, 
      user: {
        ...userData,
        role: user.role || 'student'
      }
    });
  } catch (err) {
    console.error('❌ User login error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ========== NEW: Issuer Registration Endpoint
app.post('/api/register-issuer', upload.single('supportingDocuments'), async (req, res) => {
  try {
    const { orgName, contactName, email, password, confirmPassword } = req.body;

    if (!orgName || !contactName || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required' 
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Passwords do not match' 
      });
    }

    const hashedPassword = await bcryptjs.hash(password, 10);

    const issuerData = {
      orgName,
      contactName,
      email,
      password: hashedPassword,
      documents: req.file ? [req.file] : []
    };

    const result = await couchdb.createIssuerRegistration(issuerData);
    
    await couchdb.createNotification({
      title: `New Issuer Registration: ${orgName}`,
      message: `${contactName} from ${orgName} is requesting to register.`,
      issuerId: result.id,
      issuerEmail: email,
      category: 'issuer_registration',
      targetRole: 'admin'
    });

    res.status(201).json({
      success: true,
      message: 'Issuer registration submitted successfully. Awaiting admin approval.',
      issuerId: result.id
    });
  } catch (error) {
    console.error('Issuer registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// ========== OPTIMIZED: Issuer Login Endpoint (No brute force, password hashed)
app.post('/api/login-issuer', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }

    // ✅ Get APPROVED issuer only
    const issuer = await couchdb.getApprovedIssuer(email);

    if (!issuer) {
      return res.status(401).json({ 
        success: false, 
        message: 'Issuer not found or not approved yet' 
      });
    }

    // ✅ Verify password with bcryptjs
    const passwordMatch = await bcryptjs.compare(password, issuer.password);
    if (!passwordMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid password' 
      });
    }

    // ✅ Generate token with issuer role
    const token = jwt.sign(
      { 
        id: issuer._id, 
        email: issuer.email, 
        role: 'issuer',
        orgName: issuer.orgName 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(200).json({
      success: true,
      token,
      user: {
        id: issuer._id,
        email: issuer.email,
        role: 'issuer',
        orgName: issuer.orgName,
        contactName: issuer.contactName
      }
    });
  } catch (error) {
    console.error('❌ Issuer login error:', error.message);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// ✅ FIXED: Get Pending Issuer Registrations (Admin) - NO MORE SORTING ERROR
app.get('/api/pending-issuers', async (req, res) => {
  try {
    const pendingIssuers = await couchdb.getPendingIssuers();
    
    res.status(200).json({
      success: true,
      data: pendingIssuers
    });
  } catch (error) {
    console.error('Error fetching pending issuers:', error.message);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// ========== NEW: Deploy Issuer Peer Dynamically (With CouchDB + core.yaml)
app.post('/api/deploy-issuer-peer', async (req, res) => {
  try {
    const { issuerEmail } = req.body;

    if (!issuerEmail) {
      return res.status(400).json({ 
        success: false, 
        message: 'Issuer email is required' 
      });
    }

    // ✅ Convert email to container name (e.g., dlsu@example.com → dlsu_example-com)
    const sanitizedEmail = issuerEmail.replace(/[@.]/g, (match) => {
      return match === '@' ? '_' : '-';
    }).toLowerCase();

    // ✅ Step 1: Start CouchDB first
    const couchDBName = `couchdb-${sanitizedEmail}`;
    const couchDBPort = 5984 + Math.floor(Math.random() * 1000);

    console.log(`🔧 [DEPLOY] Starting CouchDB: ${couchDBName} on port ${couchDBPort}`);

    const couchDBContainer = await docker.createContainer({
      Image: 'couchdb:3.3.2',
      name: couchDBName,
      Env: [
        'COUCHDB_USER=admin',
        'COUCHDB_PASSWORD=adminpw'
      ],
      HostConfig: {
        PortBindings: {
          '5984/tcp': [{ HostPort: String(couchDBPort) }]
        },
        NetworkMode: 'fabric_test'
      }
    });

    await couchDBContainer.start();
    console.log(`✅ CouchDB started: ${couchDBName}:${couchDBPort}`);

    // ✅ Wait for CouchDB to be ready
    await new Promise(resolve => setTimeout(resolve, 3000));

    // ✅ Step 2: Start Peer with CouchDB + core.yaml mount
    const peerName = `peer0.${sanitizedEmail}.example.com`;
    const peerPort = 7051 + Math.floor(Math.random() * 100);

    const orgPath = `${FABRIC_SAMPLES_PATH}/test-network/organizations/peerOrganizations/${sanitizedEmail}.example.com`;
    const peerPath = `${orgPath}/peers/${peerName}`;

    console.log(`🔧 [DEPLOY] Starting Peer: ${peerName} on port ${peerPort}`);

    const peerContainer = await docker.createContainer({
      Image: 'hyperledger/fabric-peer:latest',
      name: peerName,
      Hostname: peerName,
      Env: [
        `FABRIC_CFG_PATH=/etc/hyperledger/fabric`,
        `CORE_PEER_ID=${peerName}`,
        `CORE_PEER_ADDRESS=${peerName}:${peerPort}`,
        `CORE_PEER_LISTENADDRESS=0.0.0.0:${peerPort}`,
        `CORE_PEER_CHAINCODEADDRESS=${peerName}:${peerPort + 1}`,
        `CORE_PEER_CHAINCODELISTENADDRESS=0.0.0.0:${peerPort + 1}`,
        `CORE_PEER_GOSSIP_BOOTSTRAP=${peerName}:${peerPort}`,
        `CORE_PEER_GOSSIP_EXTERNALENDPOINT=${peerName}:${peerPort}`,
        `CORE_PEER_LOCALMSPID=${sanitizedEmail.toUpperCase()}MSP`,
        `CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/msp`,
        `CORE_VM_ENDPOINT=unix:///host/var/run/docker.sock`,
        `CORE_VM_DOCKER_HOSTCONFIG_NETWORKMODE=fabric_test`,
        `CORE_LEDGER_STATE_STATEDATABASE=CouchDB`,
        `CORE_LEDGER_STATE_COUCHDBCONFIG_COUCHDBADDRESS=${couchDBName}:5984`,
        `CORE_LEDGER_STATE_COUCHDBCONFIG_USERNAME=admin`,
        `CORE_LEDGER_STATE_COUCHDBCONFIG_PASSWORD=adminpw`,
        `CORE_PEER_TLS_ENABLED=true`,
        `CORE_PEER_TLS_CERT_FILE=/etc/hyperledger/fabric/tls/server.crt`,
        `CORE_PEER_TLS_KEY_FILE=/etc/hyperledger/fabric/tls/server.key`,
        `CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt`
      ],
      HostConfig: {
        Binds: [
          '/var/run/docker.sock:/host/var/run/docker.sock',
          `${peerPath}/msp:/etc/hyperledger/fabric/msp`,
          `${peerPath}/tls:/etc/hyperledger/fabric/tls`,
          `${CORE_YAML_PATH}:/etc/hyperledger/fabric/core.yaml`  // ✅ KEY FIX
        ],
        PortBindings: {
          [`${peerPort}/tcp`]: [{ HostPort: String(peerPort) }],
          [`${peerPort + 1}/tcp`]: [{ HostPort: String(peerPort + 1) }]
        },
        NetworkMode: 'fabric_test'
      }
    });

    await peerContainer.start();
    console.log(`✅ Peer started: ${peerName}:${peerPort}`);

    // ✅ Save deployment info to CouchDB
    const deploymentInfo = {
      issuerEmail,
      peerName,
      peerPort,
      couchDBName,
      couchDBPort,
      deployedAt: new Date().toISOString(),
      status: 'deployed'
    };

    await couchdb.saveDeploymentInfo(deploymentInfo);

    res.status(201).json({
      success: true,
      message: `Issuer peer deployed successfully`,
      deployment: deploymentInfo
    });

  } catch (error) {
    console.error('❌ Deployment error:', error.message);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// ========== EXISTING: Credential Endpoints

app.get('/api/credentials', async (req, res) => {
  try {
    const { gateway, contract } = await getContractAndGateway();
    const result = await contract.evaluateTransaction('GetCredentialsByIssuer', 'ISSUER');
    res.json({ success: true, credentials: JSON.parse(result.toString()) });
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/credentials', async (req, res) => {
  try {
    const { id, holderID, issuerID, credentialType, expiryDate, metadata, documentHash } = req.body;
    if (!id || !holderID || !issuerID) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
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
app.listen(PORT, () => {
  console.log(`✅ API running on :${PORT}`);
  console.log('✅ CouchDB databases selected');
  console.log('✅ Docker deployment endpoints ready');
});

setInterval(() => {}, 1000);