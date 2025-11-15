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
// const uploadRoutes = require('./routes/uploadRoutes'); // NEWLY ADDED - OLOPS PENDING

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key';

// ✅ Multer configuration
const upload = multer({ storage: multer.memoryStorage() });

// ✅ Import CouchDB service
const couchdb = require('./couchDB_service');

const app = express();

app.use((req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    const token = authHeader.split(' ')[1]; // Bearer <token>
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      req.user = null;
    }
  } else {
    req.user = null;
  }
  next();
});

app.use(cors());
app.use(express.json());


// ✅ Initialize Docker client
const docker = new Docker({ socketPath: '/var/run/docker.sock' });
// SUBJECTIVE
const FABRIC_SAMPLES_PATH = '/home/kaitanz_/fabric-samples/fabric-samples'; // KAI
// const FABRIC_SAMPLES_PATH = path.resolve(__dirname, '..', 'fabric-samples', 'fabric-samples'); // SAKANILA
const CORE_YAML_PATH = `${FABRIC_SAMPLES_PATH}/config/core.yaml`;

// ✅ Initialize CouchDB on server startup
couchdb.initializeDatabases().catch(err => {
  console.error('⚠️  CouchDB init error:', err.message);
});

// ✅ FIXED: Create database indexes on startup (FIXED SORT BUG)
const setupDatabaseIndexes = async () => {
  try {
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const db = couchdb.couch.use('issuers');
    
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
    if (error.statusCode === 409 || (error.message || '').includes('already')) {
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
/*
const ccpPath = path.resolve(
  __dirname,
  '..',
  'fabric-samples',
  'fabric-samples',
  'test-network',
  'organizations',
  'peerOrganizations',
  'org1.example.com',
  'connection-org1.json'
);
*/
// const ccpPath = '/home/kaitanz_/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/connection-org1.json';
// const ccpPath = '/home/polo/fabric-samples-full/test-network/organizations/peerOrganizations/org1.example.com/connection-org1.json';

// ✅ RESTORED: walletPath (was commented out but used below)
const walletPath = path.join(__dirname, 'wallet');

let cachedGateway = null;
let lastConnectionTime = 0;
const CONNECTION_CACHE_TTL = 5 * 60 * 1000;

// KAI MODIFIED AS OF NOV 15 10:47PM 
// identityName = fabricIdentity (ex: delasalleuniversity-admin) || orgName (ex: De La Salle University )
async function getContractAndGateway(identityName, orgName) {
  if (!identityName || !orgName) {
    throw new Error('identityName and orgName are required');
  }

  let ccpPath;
  if (
    orgName.toLowerCase().includes('delasalleuniversity') ||
    identityName.trim().toLowerCase().replace(/\s+/g, '').includes('delasalleuniversity') 
  ) {
    ccpPath = path.resolve(
      __dirname,'..','fabric-samples','fabric-samples','test-network','organizations','peerOrganizations','dlsu.example.com','connection-delasalleuniversity.json'
    );
  } else {
    // Default to Org1
    ccpPath = path.resolve(
      __dirname,'..','fabric-samples','fabric-samples','test-network','organizations','peerOrganizations','org1.example.com','connection-org1.json'
    );
  }

  const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
  const ccp = JSON.parse(ccpJSON);
  const wallet = await Wallets.newFileSystemWallet(walletPath);
  const identity = await wallet.get(identityName);
  if (!identity) throw new Error(`Identity ${identityName} not found`);
  const gateway = new Gateway();
  await gateway.connect(ccp, {
    wallet,
    identity: identityName,
    discovery: { enabled: true, asLocalhost: true }
  });
  const network = await gateway.getNetwork('chaincert-channel');
  const contract = network.getContract('chaincert');
  cachedGateway = gateway;
  lastConnectionTime = Date.now();
  return { gateway, contract };
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

// ========== EXISTING: Credential Endpoints

// KAI  - NOV 16 - 12:16AM
app.get('/api/credentials', async (req, res) => {
  try {
    // (A) Check user role from session/JWT (assume Auth middleware sets req.user)
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    let identityName, orgName;

    if (user.role === 'issuer') {
      // (B) Find issuer doc from CouchDB
      // user.email or user.id should be set
      const issuerDoc = await couchdb.getApprovedIssuer(user.email);
      if (!issuerDoc || !issuerDoc.fabricIdentity || !issuerDoc.orgName) {
        return res.status(403).json({ success: false, error: 'Issuer not approved or info missing.' });
      }
      identityName = issuerDoc.fabricIdentity;  // E.g. 'delasalleuniversity-admin'
      orgName = issuerDoc.orgName;             // E.g. 'De La Salle University'
    } else if (user.role === 'admin') {
      // (C) Org1 admin
      identityName = 'admin';
      orgName = 'Org1';
    } else {
      // Optional: handle regular users or others here
      return res.status(403).json({ success: false, error: 'Not authorized to view credentials.' });
    }

    // (D) Call gateway with right identity/org
    const { gateway, contract } = await getContractAndGateway(identityName, orgName);
    // Pattern: issuer account queries their own credentials
    const issuerIdToQuery = user.role === 'issuer' ? user._id || user.email : 'ISSUER'; // adjust as needed
    const result = await contract.evaluateTransaction('GetCredentialsByIssuer', issuerIdToQuery);
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

    const user = req.user; // Assumed set by JWT middleware
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let identityName, orgName;

    if (user.role === 'issuer') {
      // Look up issuer info in CouchDB by email or ID
      const issuerDoc = await couchdb.getApprovedIssuer(user.email);
      if (!issuerDoc || !issuerDoc.fabricIdentity || !issuerDoc.orgName) {
        return res.status(403).json({ error: 'Issuer not approved or Fabric identity missing.' });
      }
      identityName = issuerDoc.fabricIdentity;
      orgName = issuerDoc.orgName;
    } else if (user.role === 'admin') {
      // Org1 admin
      identityName = 'admin';
      orgName = 'Org1';
    } else {
      return res.status(403).json({ error: 'Forbidden: not allowed to issue credentials.' });
    }

    // Retry logic remains unchanged, just uses the correct gateway/contract each time
    const MAX_RETRIES = 3;
    let lastError;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`\uD83D\uDCE4 Attempt ${attempt}/${MAX_RETRIES}: Issuing credential ${id}...`);
        const { gateway, contract } = await getContractAndGateway(identityName, orgName);
        const result = await contract.submitTransaction(
          'IssueCredential',
          id, holderID, issuerID, credentialType, expiryDate, metadata || '', documentHash || ''
        );
        console.log(`\u2705 SUCCESS on attempt ${attempt}`);
        return res.status(201).json({ success: true, credential: JSON.parse(result.toString()) });
      } catch (error) {
        lastError = error;
        const errorMsg = (error.message || '').toLowerCase();
        console.error(`\u274C Attempt ${attempt} failed: ${error.message}`);
        if (
          (errorMsg.includes('peer endorsement') ||
            errorMsg.includes('do not match') ||
            errorMsg.includes('no valid responses') ||
            errorMsg.includes('endorsement')) && attempt < MAX_RETRIES
        ) {
          const backoffMs = Math.pow(2, attempt - 1) * 1000;
          console.log(`\u23F3 Waiting ${backoffMs}ms before retry...`);
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
    console.error(`\u274C Error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});


app.get('/api/credentials/:id', async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    let identityName, orgName;
    if (user.role === 'issuer') {
      const issuer = await couchdb.getApprovedIssuer(user.email);
      if (!issuer || !issuer.fabricIdentity || !issuer.orgName) {
        return res.status(403).json({ success: false, error: 'Issuer not approved or Fabric identity missing.' });
      }
      identityName = issuer.fabricIdentity;
      orgName = issuer.orgName;
    } else if (user.role === 'admin') {
      identityName = 'admin';
      orgName = 'Org1';
    } else {
      return res.status(403).json({ success: false, error: 'Forbidden: Not allowed.' });
    }
    const { gateway, contract } = await getContractAndGateway(identityName, orgName);
    const result = await contract.evaluateTransaction('GetCredential', req.params.id);
    res.json({ success: true, credential: JSON.parse(result.toString()) });
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});


app.post('/api/credentials/:id/verify', async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    let identityName, orgName;
    if (user.role === 'issuer') {
      const issuer = await couchdb.getApprovedIssuer(user.email);
      if (!issuer || !issuer.fabricIdentity || !issuer.orgName) {
        return res.status(403).json({ success: false, error: 'Issuer not approved or Fabric identity missing.' });
      }
      identityName = issuer.fabricIdentity;
      orgName = issuer.orgName;
    } else if (user.role === 'admin') {
      identityName = 'admin';
      orgName = 'Org1';
    } else {
      return res.status(403).json({ success: false, error: 'Forbidden: Not allowed.' });
    }
    const { gateway, contract } = await getContractAndGateway(identityName, orgName);
    const result = await contract.evaluateTransaction('VerifyCredential', req.params.id);
    res.json({ success: true, verification: JSON.parse(result.toString()) });
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/credentials/:id/revoke', async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    let identityName, orgName;
    if (user.role === 'issuer') {
      const issuer = await couchdb.getApprovedIssuer(user.email);
      if (!issuer || !issuer.fabricIdentity || !issuer.orgName) {
        return res.status(403).json({ success: false, error: 'Issuer not approved or Fabric identity missing.' });
      }
      identityName = issuer.fabricIdentity;
      orgName = issuer.orgName;
    } else if (user.role === 'admin') {
      identityName = 'admin';
      orgName = 'Org1';
    } else {
      return res.status(403).json({ success: false, error: 'Forbidden: Not allowed.' });
    }
    const MAX_RETRIES = 3;
    let lastError;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`📤 Attempt ${attempt}/${MAX_RETRIES}: Revoking credential ${req.params.id}...`);
        const { gateway, contract } = await getContractAndGateway(identityName, orgName);
        const result = await contract.submitTransaction('RevokeCredential', req.params.id);
        console.log(`✅ SUCCESS on attempt ${attempt}`);
        return res.json({ success: true, credential: JSON.parse(result.toString()) });
      } catch (error) {
        lastError = error;
        const errorMsg = (error.message || '').toLowerCase();
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
    // You can decide: allow only Org1 admin, or tailor logic for holder view
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    let identityName, orgName;
    if (user.role === 'admin') {
      identityName = 'admin';
      orgName = 'Org1';
    } else if (user.role === 'issuer') {
      const issuer = await couchdb.getApprovedIssuer(user.email);
      if (!issuer || !issuer.fabricIdentity || !issuer.orgName) {
        return res.status(403).json({ success: false, error: 'Issuer not approved or Fabric identity missing.' });
      }
      identityName = issuer.fabricIdentity;
      orgName = issuer.orgName;
    } else {
      return res.status(403).json({ success: false, error: 'Forbidden: Not allowed.' });
    }
    const { gateway, contract } = await getContractAndGateway(identityName, orgName);
    const result = await contract.evaluateTransaction('GetCredentialsByHolder', req.params.holderID);
    res.json({ success: true, credentials: JSON.parse(result.toString()) });
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/credentials/issuer/:issuerID', async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    let identityName, orgName;
    if (user.role === 'issuer') {
      const issuer = await couchdb.getApprovedIssuer(user.email);
      if (!issuer || !issuer.fabricIdentity || !issuer.orgName) {
        return res.status(403).json({ success: false, error: 'Issuer not approved or Fabric identity missing.' });
      }
      identityName = issuer.fabricIdentity;
      orgName = issuer.orgName;
    } else if (user.role === 'admin') {
      identityName = 'admin';
      orgName = 'Org1';
    } else {
      return res.status(403).json({ success: false, error: 'Forbidden: Not allowed.' });
    }
    const { gateway, contract } = await getContractAndGateway(identityName, orgName);
    const result = await contract.evaluateTransaction('GetCredentialsByIssuer', req.params.issuerID);
    res.json({ success: true, credentials: JSON.parse(result.toString()) });
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/credentials/:id/history', async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    let identityName, orgName;
    if (user.role === 'issuer') {
      const issuer = await couchdb.getApprovedIssuer(user.email);
      if (!issuer || !issuer.fabricIdentity || !issuer.orgName) {
        return res.status(403).json({ success: false, error: 'Issuer not approved or Fabric identity missing.' });
      }
      identityName = issuer.fabricIdentity;
      orgName = issuer.orgName;
    } else if (user.role === 'admin') {
      identityName = 'admin';
      orgName = 'Org1';
    } else {
      return res.status(403).json({ success: false, error: 'Forbidden: Not allowed.' });
    }
    const { gateway, contract } = await getContractAndGateway(identityName, orgName);
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
