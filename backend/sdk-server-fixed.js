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
const nano = require('nano');  // ✅ FIXED: Added at top level

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
const FABRIC_SAMPLES_PATH = '/home/kaitanz_/fabric-samples/fabric-samples'; // KAI # SUBJECTIVE
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
// const ccpPath = '/home/kaitanz_/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/connection-org1.json'; // SUBJECTIVE
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

   // ✅ ADD THIS HERE - Check if CCP file exists
  if (!fs.existsSync(ccpPath)) {
    throw new Error(`Connection profile not found at: ${ccpPath}`);
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
// KAI - CHANGES
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, role, fullName } = req.body;
    if (!email || !password || !role) {
      return res.status(400).json({ success: false, error: 'Missing required fields.' });
    }
    
    // ✅ FIXED ISSUE #3: Check if user already exists
    const existingUsers = await couchdb.getAllUsers();
    const userExists = existingUsers.find(u => u.email === email);
    if (userExists) {
      return res.status(409).json({ success: false, error: 'User already exists with this email.' });
    }
    
    // 1. Generate a unique walletId (you can customize this)
    const walletId = `wallet_${Date.now()}`;

    // 2. Save user with walletId included
    const result = await couchdb.saveUser({ email, password, role, fullName, walletId });
    
    res.json({ success: true, userId: result.id, walletId });
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
    
    // ✅ FIXED ISSUE #2: Standardized response format
    res.json({ 
      success: true, 
      credentials: JSON.parse(result.toString()),
      count: JSON.parse(result.toString()).length || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// KAI - CHANGES 
// KAI - CHANGES - 2-STEP CREDENTIAL ISSUANCE (CouchDB FIRST, then Blockchain)
// In sdk-server-fixed.js - POST /api/credentials endpoint
// KAI - FIXED: Credential Creation with Proper Identity Resolution
app.post('/api/credentials', async (req, res) => {
  try {
    const { id, issuerID, credentialType, credentialName, description, metadata } = req.body;
    
    // ✅ FIXED ISSUE #4: Enhanced validation for all required fields
    if (!id || !issuerID || !credentialType || !credentialName) {
      return res.status(400).json({ 
        error: 'Missing required fields: id, issuerID, credentialType, credentialName' 
      });
    }

    // ✅ FIX #1: Get user and resolve identityName, orgName
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    let identityName, orgName;

    if (user.role === 'issuer') {
      // Issuer creating credential
      const issuerDoc = await couchdb.getApprovedIssuer(user.email);
      if (!issuerDoc || !issuerDoc.fabricIdentity || !issuerDoc.orgName) {
        return res.status(403).json({ 
          success: false, 
          error: 'Issuer not approved or Fabric identity missing.' 
        });
      }
      identityName = issuerDoc.fabricIdentity;
      orgName = issuerDoc.orgName;
    } else if (user.role === 'admin') {
      // Admin creating credential
      identityName = 'admin';
      orgName = 'Org1';
    } else {
      return res.status(403).json({ 
        success: false, 
        error: 'Not authorized to create credentials.' 
      });
    }

    // ✅ NOW identityName and orgName are DEFINED!
    const MAXRETRIES = 3;
    let lastError;

    for (let attempt = 1; attempt <= MAXRETRIES; attempt++) {
      try {
        console.log(`Attempting credential creation (${attempt}/${MAXRETRIES})...`);
        
        const { gateway, contract } = await getContractAndGateway(identityName, orgName);
        
        // ✅ FIX #2: Use correct chaincode function name
        const result = await contract.submitTransaction(
          'CreateCredentialTemplate',  // ← Changed from 'IssueCredential' 
          id,
          issuerID,
          credentialType,
          credentialName,
          description,
          metadata || ''
        );

        console.log(`✅ SUCCESS on attempt ${attempt}`);
        return res.status(201).json({ 
          success: true, 
          credential: JSON.parse(result.toString()),
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        lastError = error;
        const errorMsg = error.message.toLowerCase();
        
        // ✅ FIX #3: Better error detection
        if (errorMsg.includes('peer endorsement') || 
            errorMsg.includes('do not match') || 
            errorMsg.includes('no valid responses')) {
          if (attempt < MAXRETRIES) {
            const backoffMs = Math.pow(2, attempt - 1) * 1000;
            console.log(`Retrying in ${backoffMs}ms...`);
            await sleep(backoffMs);
            continue;
          }
        }
        
        if (attempt === MAXRETRIES) throw error;
      }
    }
    
    throw new Error(`Failed after ${MAXRETRIES} attempts: ${lastError.message}`);
  } catch (error) {
    console.error('❌ Error creating credential:', error.message);
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
    
    // ✅ FIXED ISSUE #2: Standardized response format
    res.json({ 
      success: true, 
      credentials: JSON.parse(result.toString()),
      count: JSON.parse(result.toString()).length || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ FIX FOR CREDENTIALS DASHBOARD - COMPLETE FIX
app.get('/api/credentials/issuer/:issuerID', async (req, res) => {
  try {
    const { issuerID } = req.params;
    
    // ✅ Validate issuer ID - THIS IS THE KEY FIX!
    if (!issuerID || issuerID === 'ISSUER') {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid issuer ID is required',
        message: 'Issuer ID cannot be empty or "ISSUER"'
      });
    }

    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // ✅ FIXED ISSUE #1: nano is now defined at top level, no need to require again
    const adminNano = nano('http://admin:adminpw@localhost:5985');
    const issuersDB = adminNano.use('issuers');
    
    let issuer;
    try {
      issuer = await issuersDB.get(issuerID);
    } catch (err) {
      if (err.statusCode === 404) {
        return res.status(404).json({ 
          success: false, 
          error: 'Issuer not found'
        });
      }
      throw err;
    }

    if (!issuer || !issuer.couchDBUrl) {
      return res.status(403).json({ 
        success: false, 
        error: 'Issuer not found or CouchDB URL missing' 
      });
    }

    // ✅ Connect to issuer's OWN CouchDB (not admin's)
    const issuerNano = nano(issuer.couchDBUrl);
    const walletDb = issuerNano.use('wallet_issuer_credentials');

    // ✅ Use .find() instead of .view() - no design docs needed!
    const result = await walletDb.find({
      selector: {
        issuerId: issuerID
      }
    });

    // ✅ FIXED ISSUE #2: Standardized response format
    res.json({ 
      success: true, 
      credentials: result.docs || [],
      count: (result.docs || []).length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`❌ Error fetching issuer credentials: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
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
    
    // ✅ FIXED ISSUE #2: Standardized response format
    res.json({ 
      success: true, 
      history: JSON.parse(result.toString()),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add this after all your other endpoints but before app.listen
app.get('/api/users', async (req, res) => {
  try {
    const users = await couchdb.getAllUsers();
    // Only include if user.role !== 'admin' (or set your real user roles)
    const filtered = users.filter(u => !u.role || u.role === 'user');
    res.json({
      success: true,
      users: filtered.map(u => ({ id: u._id, email: u.email })),
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`✅ API running on :${PORT}`);
  console.log('✅ CouchDB databases selected');
  console.log('✅ Docker deployment endpoints ready');
});

setInterval(() => {}, 1000);