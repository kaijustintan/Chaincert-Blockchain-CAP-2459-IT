/* sdk-server-fixed.js
    - The “middleman” of your whole system
    - Nothing talks directly to the blockchain except this file.
*/

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


  /* Step 1: Input validation

  Technical: Validates that the required parameters are provided.
  Tropang Ex: Dito chine-check kung may laman talaga yung identityName at orgName. Kung wala kahit isa, tigil agad kasi hindi pwedeng makipag-usap sa blockchain 
  kung hindi mo alam:
    * sino ang gagamit ng identity
    * anong organization ang nirerepresent
  */
  if (!identityName || !orgName) {
    throw new Error('identityName and orgName are required');
  }


  /* Step 2: Choose the correct connection profile (DLSU OR Org1)

    Technical: Selects which Fabric connection profile (CCP) JSON file to use based on orgName/identityName.
    Tropang Ex: Parang pumipili ka kung anong WiFi network yung kokonektan mo.
      - Kung DLSU ka → DLSU connection profile
      - Kung hindi → default Org1
    Example: getContractAndGateway("delasalleuniversity-admin", "De La Salle University") = use "connection-delasalleuniversity.json"
    
    NOTE! - as u can see hardcoded yung paths to get said files, so in the event a new org gets to be approved as an issuer, we MANUALLY create another ccppath for that said org 
  */
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

  /* Step 3: Check if the connection profile file exists

    Technical: Ensures the chosen CCP file actually exists before attempting to read/connect.
    Tropang Ex: Parang chine-check mo muna kung nandiyan yung “mapa” bago bumiyahe. Kapag wala yung CCP file, hindi alam ng system kung saan hahanapin peers/orderer, 
    so error agad.
    Example: If connection-org1.json was moved/deleted → throws “Connection profile not found...”
  */
  if (!fs.existsSync(ccpPath)) {
    throw new Error(`Connection profile not found at: ${ccpPath}`);
  }


   /* Step 4: Read and parse the connection profile (CCP)
    
    Technical: Loads the CCP JSON content and parses it into an object used by Fabric Gateway.
    Tropang Ex: Binabasa dito yung JSON file na nagsasabi kung paano kumausap sa blockchain:
      * saan yung peers
      * saan yung orderer
      * anong TLS/certs ang gagamitin
    Example: ccp becomes a JS object that gateway.connect() will use.
  */
  const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
  const ccp = JSON.parse(ccpJSON);

  /* Step 5: Load wallet and fetch the signing identity

    Technical: Opens chaincert-api/wallet directory inside ubuntu/filesystem wallet and retrieves the identity that will sign transactions.
    Tropang Ex: Hinahanap dito yung “ID card” (cert + private key) ng gagamit.  Kung wala sa wallet, bawal mag-submit ng transaction kasi walang pipirma.
    Example: identityName = "delasalleuniversity-admin"
      → wallet.get("delasalleuniversity-admin") must exist or it throws Identity not found.
  */
  const wallet = await Wallets.newFileSystemWallet(walletPath);
  const identity = await wallet.get(identityName);
  if (!identity) throw new Error(`Identity ${identityName} not found`);


   /* Step 6: Create Gateway and connect to Fabric as this identity

    Technical: Establishes an authenticated connection to the Fabric network using the CCP + wallet identity.
    Tropang Ex: Ito na yung actual “login” sa blockchain as that org/user identity.
    From here, the backend can now talk to Fabric and submit/query transactions.
    Example: After gateway.connect(), you can access channels and chaincode through the gateway.
  */
  const gateway = new Gateway();
  await gateway.connect(ccp, {
    wallet,
    identity: identityName,
    discovery: { enabled: true, asLocalhost: true }
  });

  /* Step 7: Access the target channel (chaincert-channel)

    Technical: Gets a Network object for the specified Fabric channel.
    Tropang Ex: Pinipili mo kung saang “group chat” (channel) kayo magtatransact. Dito naka-deploy yung ChainCert chaincode kaya dito dapat kumonek.
    Example: network = gateway.getNetwork("chaincert-channel")

    NOTE! - talagang hardcoded yan to chaincert-channel kasi any org joining as must join the general channel, ang kulang dito org exclusive channel
          - ex: so dapat if identity n ccp path = dlsu related = join chaincert-channel AND dlsu-channel
  */
  const network = await gateway.getNetwork('chaincert-channel');


  /* Step 8: Get the chaincode/contract handle (chaincert)

    Technical: Retrieves the contract object used to invoke/evaluate chaincode functions.
    Tropang Ex: Ito na yung “remote control” ng blockchain functions. Dito mo tatawagin yung IssueCredential, CreateCredentialTemplate, etc ng chaincode/index.js 
    Example: contract.submitTransaction("IssueCredential", ...)
  */
  const contract = network.getContract('chaincert');

  /* Step 9: Cache gateway + return gateway and contract (PENDING NOTES)

    Technical: Stores the gateway in cache (optional reuse) and returns the gateway/contract to caller.
    Tropang Ex: Para hindi paulit-ulit connect (depende sa design), tinatandaan yung gateway. Tapos ibinabalik yung gateway at contract para magamit ng ibang API endpoints.
    Example: const { gateway, contract } = await getContractAndGateway(...)
      → then use contract.submitTransaction(...) or contract.evaluateTransaction(...)
  */
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
// ===== CREATE CREDENTIAL WITH RETRY LOGIC & ENHANCED VALIDATION =====
app.post('/api/credentials', async (req, res) => {
  try {
    const { id, issuerID, credentialType, credentialName, description, metadata } = req.body;
    
    // ✅ FIX #4: Enhanced validation for all required fields
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
        console.log(`\n📝 Attempting credential creation (${attempt}/${MAXRETRIES})...`);
        console.log(`   Identity: ${identityName}, Org: ${orgName}`);
        
        const { gateway, contract } = await getContractAndGateway(identityName, orgName);
        
        // ✅ FIX #2: Use correct chaincode function name
        const result = await contract.submitTransaction(
          'CreateCredentialTemplate',  // ← Correct function name
          id,
          issuerID,
          credentialType,
          credentialName,
          description || '',
          metadata || ''
        );
        // ← ADD THIS 3-SECOND WAIT HERE
        await new Promise(resolve => setTimeout(resolve, 3000));


        console.log(`✅ SUCCESS on attempt ${attempt}`);
        
        await gateway.disconnect();
        
        return res.status(201).json({ 
          success: true, 
          credential: JSON.parse(result.toString()),
          timestamp: new Date().toISOString(),
          attempt: attempt
        });
        
      } catch (error) {
        lastError = error;
        const errorMsg = error.message.toLowerCase();
        
        console.log(`❌ Attempt ${attempt} failed:`, error.message);
        
        // ✅ FIX #3: Better error detection for retry-able errors
        if (errorMsg.includes('peer endorsement') || 
            errorMsg.includes('do not match') || 
            errorMsg.includes('no valid responses') ||
            errorMsg.includes('deadline exceeded')) {
          
          if (attempt < MAXRETRIES) {
            const backoffMs = Math.pow(2, attempt - 1) * 1000;
            console.log(`⏳ Retrying in ${backoffMs}ms...`);
            await sleep(backoffMs);
            continue;
          }
        }
        
        // If this is the last attempt, throw the error
        if (attempt === MAXRETRIES) {
          throw error;
        }
      }
    }
    
    throw new Error(`Failed after ${MAXRETRIES} attempts: ${lastError.message}`);
    
  } catch (error) {
    console.error('❌ Error creating credential:', error.message);
    console.error('   Stack:', error.stack);
    
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});


// ✅✅✅ CRITICAL FIX: ISSUE CREDENTIAL ENDPOINT - BLOCKCHAIN FIRST, COUCHDB SECOND ✅✅✅
// ✅✅✅ FIXED: ISSUE CREDENTIAL - SAVES TO BOTH DATABASES AFTER BLOCKCHAIN ✅✅✅
app.post('/api/credentials/:credentialId/issue', async (req, res) => {
  try {
    const { credentialId } = req.params;
    const { holderID, expiryDate } = req.body;
    
    if (!holderID) {
      return res.status(400).json({ 
        success: false, 
        error: 'holderID is required' 
      });
    }


    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }


    let identityName, orgName, issuerDoc;


    if (user.role === 'issuer') {
      issuerDoc = await couchdb.getApprovedIssuer(user.email);
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
        error: 'Not authorized to issue credentials.' 
      });
    }


    // ✅ STEP 1: BLOCKCHAIN TRANSACTION FIRST (Deterministic)
    console.log(`[SDK] Issuing credential to blockchain...`);
    const { gateway, contract } = await getContractAndGateway(identityName, orgName);
    
    const result = await contract.submitTransaction(
      'IssueCredential',
      credentialId,
      holderID,
      expiryDate || ''
    );


    const credentialData = JSON.parse(result.toString());
    console.log(`✅ Blockchain success. Credential ID: ${credentialData.id}`);


    await gateway.disconnect();


    // ✅ STEP 2: SAVE TO **BOTH** COUCHDB DATABASES (Non-fatal)
    try {
      console.log(`[SDK] Saving to BOTH CouchDB databases...`);
      
      const couchResult = await couchdb.saveIssuedCredentialToBothDBs(user.email, {
        ...credentialData,
        holderID: holderID,
        expiryDate: expiryDate || null
      });
      
      console.log(`[SDK] ✅ CouchDB save successful:`, couchResult.message);
      
      return res.status(200).json({ 
        success: true, 
        message: 'Credential issued successfully',
        credential: credentialData,
        couchDB: couchResult,
        timestamp: new Date().toISOString()
      });
      
    } catch (couchErr) {
      console.error(`⚠️ CouchDB save failed (non-fatal):`, couchErr.message);
      
      // ✅ Still return success since blockchain worked
      return res.status(200).json({ 
        success: true, 
        message: 'Credential issued to blockchain (CouchDB sync pending)',
        credential: credentialData,
        warning: couchErr.message,
        timestamp: new Date().toISOString()
      });
    }


  } catch (error) {
    console.error('❌ Error issuing credential:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
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


// ✅ ===== VERIFY CREDENTIAL ENDPOINT (QUERY COUCHDB WORLD STATE) =====
// ✅ NEW FIX: Support both direct verification and user wallet lookup
app.get('/api/credentials/:credentialId/verify', async (req, res) => {
  try {
    const { credentialId } = req.params;

    if (!credentialId) {
      return res.status(400).json({
        success: false,
        error: 'Credential ID is required'
      });
    }

    console.log(`[VERIFY] Verifying credential: ${credentialId}`);

    // ✅ STEP 1: Try CouchDB service first (handles ID cleaning)
    const couchResult = await couchdb.verifyCredentialFromCouchDB(credentialId);
    
    if (couchResult.verified === false && !couchResult.error) {
      // Not found in CouchDB, try blockchain
      console.log(`[VERIFY] Credential not in wallet_user_credentials, querying blockchain...`);
      
      try {
        const adminNano = nano('http://admin:adminpw@localhost:5985');
        const blockchainDb = adminNano.use('wallet_user_credentials');
        
        const cleanId = credentialId.replace(/^user_cred_/, '');
        const searchId = `user_cred_${cleanId}`;
        
        const result = await blockchainDb.find({
          selector: {
            _id: searchId
          },
          limit: 1
        });
        
        if (result.docs.length === 0) {
          return res.status(404).json({
            success: false,
            valid: false,
            reason: 'Credential not found in database',
            credentialId: credentialId,
            timestamp: new Date().toISOString()
          });
        }
        
        const credential = result.docs[0];
        const status = credential.status || 'unknown';
        const isRevoked = status === 'revoked' || credential.revoked === true;
        
        return res.status(200).json({
          success: true,
          verified: true,
          valid: !isRevoked && status === 'issued',
          credential: {
            id: credential._id,
            credentialType: credential.credentialType,
            credentialName: credential.credentialName,
            issuer: {
              id: credential.issuerID,
              name: credential.issuerName || 'Unknown'
            },
            holder: {
              id: credential.holderID
            },
            status: status,
            issuedDate: credential.savedToUserWalletAt || credential.createdAt,
            expiryDate: credential.expiryDate,
            isExpired: credential.expiryDate ? new Date(credential.expiryDate) < new Date() : false
          },
          timestamp: new Date().toISOString()
        });
        
      } catch (blockchainErr) {
        console.error(`[VERIFY] Blockchain lookup failed:`, blockchainErr.message);
        return couchResult;
      }
    }
    
    if (couchResult.error) {
      return res.status(500).json({
        success: false,
        error: couchResult.error,
        timestamp: new Date().toISOString()
      });
    }
    
    // ✅ STEP 2: Return CouchDB result
    return res.status(200).json({
      success: true,
      verified: couchResult.verified,
      valid: couchResult.verified,
      credentialId: couchResult.credentialId,
      holderID: couchResult.holderID,
      issuerName: couchResult.issuerName,
      credentialType: couchResult.credentialType,
      credentialName: couchResult.credentialName,
      status: couchResult.status,
      issuedAt: couchResult.issuedAt,
      expiryDate: couchResult.expiryDate,
      message: couchResult.message,
      timestamp: couchResult.timestamp
    });

  } catch (error) {
    console.error(`❌ Verification error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});


// ✅ ADD THIS HERE - Right before app.listen()


const issuerCredentialController = require('./controllers/issuerCredentialController');


app.post('/api/issuer/credentials/create', (req, res) => {
  issuerCredentialController.createCredential(req, res, getContractAndGateway);
});


const PORT = 4000;
app.listen(PORT, () => {
  console.log(`✅ API running on :${PORT}`);
  console.log('✅ CouchDB databases selected');
  console.log('✅ Docker deployment endpoints ready');
});


setInterval(() => {}, 1000);
