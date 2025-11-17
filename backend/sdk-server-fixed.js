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
const nano = require('nano');  // ✅ needed for /issuer/:issuerID

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key';

// ✅ Multer configuration
const upload = multer({ storage: multer.memoryStorage() });

// ✅ Import CouchDB service
const couchdb = require('./couchDB_service');

const app = express();

// ✅ Attach req.user from Authorization: Bearer <token>
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
//const FABRIC_SAMPLES_PATH = '/home/kaitanz_/fabric-samples/fabric-samples'; // KAI
const FABRIC_SAMPLES_PATH = path.resolve(__dirname, '..', 'fabric-samples', 'fabric-samples'); // alternative //gamit ni carl
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
        fields: ['type', 'status', 'createdAt']
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

// ✅ RESTORED: walletPath (used by Fabric wallet)
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

  // ✅ Check if CCP file exists
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

// ========== User Registration Endpoint (with duplicate check + walletId)
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, role, fullName } = req.body;
    if (!email || !password || !role) {
      return res.status(400).json({ success: false, error: 'Missing required fields.' });
    }
    
    // Check if user already exists
    const existingUsers = await couchdb.getAllUsers();
    const userExists = existingUsers.find(u => u.email === email);
    if (userExists) {
      return res.status(409).json({ success: false, error: 'User already exists with this email.' });
    }
    
    // Generate a unique walletId
    const walletId = `wallet_${Date.now()}`;

    const result = await couchdb.saveUser({ email, password, role, fullName, walletId });
    
    res.json({ success: true, userId: result.id, walletId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ========== Regular User Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing email or password.' 
      });
    }

    const users = await couchdb.getAllUsers();
    const user = users.find(u => u.email === email);

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials.' 
      });
    }

    const passwordMatch = await bcryptjs.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials.' 
      });
    }

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

// ========== Issuer Login
app.post('/api/login-issuer', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }

    const issuer = await couchdb.getApprovedIssuer(email);

    if (!issuer) {
      return res.status(401).json({ 
        success: false, 
        message: 'Issuer not found or not approved yet' 
      });
    }

    const passwordMatch = await bcryptjs.compare(password, issuer.password);
    if (!passwordMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid password' 
      });
    }

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

// ✅ Pending issuers
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

// ========== CREDENTIAL ENDPOINTS (new behavior)

// Get credentials (role-aware)
app.get('/api/credentials', async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    let identityName, orgName;

    if (user.role === 'issuer') {
      const issuerDoc = await couchdb.getApprovedIssuer(user.email);
      if (!issuerDoc || !issuerDoc.fabricIdentity || !issuerDoc.orgName) {
        return res.status(403).json({ success: false, error: 'Issuer not approved or info missing.' });
      }
      identityName = issuerDoc.fabricIdentity;
      orgName = issuerDoc.orgName;
    } else if (user.role === 'admin') {
      identityName = 'admin';
      orgName = 'Org1';
    } else {
      return res.status(403).json({ success: false, error: 'Not authorized to view credentials.' });
    }

    const { gateway, contract } = await getContractAndGateway(identityName, orgName);
    const issuerIdToQuery = user.role === 'issuer' ? user._id || user.email : 'ISSUER';
    const result = await contract.evaluateTransaction('GetCredentialsByIssuer', issuerIdToQuery);
    
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

// Create credential template (new behavior)
app.post('/api/credentials', async (req, res) => {
  try {
    const { id, issuerID, credentialType, credentialName, description, metadata } = req.body;
    
    if (!id || !issuerID || !credentialType || !credentialName) {
      return res.status(400).json({ 
        error: 'Missing required fields: id, issuerID, credentialType, credentialName' 
      });
    }

    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    let identityName, orgName;

    if (user.role === 'issuer') {
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
      identityName = 'admin';
      orgName = 'Org1';
    } else {
      return res.status(403).json({ 
        success: false, 
        error: 'Not authorized to create credentials.' 
      });
    }

    const MAXRETRIES = 3;
    let lastError;

    for (let attempt = 1; attempt <= MAXRETRIES; attempt++) {
      try {
        console.log(`Attempting credential creation (${attempt}/${MAXRETRIES})...`);
        
        const { gateway, contract } = await getContractAndGateway(identityName, orgName);
        
        const result = await contract.submitTransaction(
          'CreateCredentialTemplate',
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

// ✅ NEW: get credentials from issuer CouchDB wallet
app.get('/api/credentials/issuer/:issuerID', async (req, res) => {
  try {
    const { issuerID } = req.params;
    
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

    const issuerNano = nano(issuer.couchDBUrl);
    const walletDb = issuerNano.use('wallet_issuer_credentials');

    const result = await walletDb.find({
      selector: {
        issuerId: issuerID
      }
    });

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

// Credential history
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


// ===== ✅ ADDED BACK FROM YOUR VERSION =====

// Get single credential
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

// Verify credential
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

// Revoke credential
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
        if (
          (errorMsg.includes('peer endorsement') ||
           errorMsg.includes('do not match') ||
           errorMsg.includes('no valid responses') ||
           errorMsg.includes('endorsement')) && attempt < MAX_RETRIES
        ) {
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


// ===== OTHER HELPER ENDPOINTS =====

// Simple user list
app.get('/api/users', async (req, res) => {
  try {
    const users = await couchdb.getAllUsers();
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

// Keep Node process alive (useful when gateway holds connections)
setInterval(() => {}, 1000);
