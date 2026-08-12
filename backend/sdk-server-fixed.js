// sdk-server-fixed.js
/*
  FILE: sdk-server-fixed.js
  LAYMAN (Tropang Ex): Ito yung "puso" ng backend — yung Express server na binubuksan para tumakbo ang
  buong API (node sdk-server-fixed.js sa Ubuntu, port 4000). Dito naka-set up ang lahat: security
  headers, CORS, ang pag-decode ng login token (JWT), ang mga "guard" kung sino ang pwede sa admin/wallet
  routes, ang rate limiter kontra brute-force, ang koneksyon sa blockchain (getContractAndGateway), ang
  pagdikit ng lahat ng route files, ang global error handler, at ang mga background cron jobs. Ito ang
  unang tumatakbo at ang huling humihinto (graceful shutdown).

  TECHNICAL: Express bootstrap + composition root. Boot order matters: (1) load env + force IPv4 DNS
  (E1); (2) FAIL-CLOSED on missing JWT_SECRET (M3); (3) middleware chain — CORS, helmet (M6, tuned for a
  cross-origin JSON API), body parsers, then a JWT-DECODE middleware that sets req.user (or null, never
  blocks); (4) centralized auth guards requireAuth / requireRole (M2); (5) in-memory per-IP rate limiters
  (M5); (6) CouchDB init + Mango index; (7) the Fabric helper getContractAndGateway, exposed to handlers
  via app.locals; (8) route mounting (guards applied at mount points); (9) M9 global error safety-net;
  (10) startup cron hooks (expiry + integrity) and app.listen(4000). Paths are Ubuntu-absolute by design
  (see CLAUDE.md "Windows vs Ubuntu layout" — do NOT rewrite them to resolve on Windows).

  OUTLINE:
    BOOT GUARDS
      - JWT_SECRET fail-closed (M3)
    MIDDLEWARE
      - CORS + helmet (M6)
      - JWT-decode middleware            sets req.user from Authorization: Bearer (never blocks)
    AUTHORIZATION GUARDS (M2)
      - requireAuth(req,res,next)        401 if no valid token
      - requireRole(role)                403 if token role mismatches
    RATE LIMITING (M5)
      - createRateLimiter({windowMs,max,message})   per-IP limiter factory
      - authLimiter / checkEmailLimiter
    INIT
      - setupDatabaseIndexes()           create the issuers Mango index (idempotent)
    FABRIC
      - getContractAndGateway(identityName,orgName)  org-route → wallet → gateway → chaincert contract
    ROUTE MOUNTING + M9 global error handler
    HELPERS / SHUTDOWN
      - sleep(ms) ; SIGINT graceful gateway disconnect
    STARTUP HOOKS
      - initExpiryCron / initIntegrityCron ; app.listen(4000)
*/

require('dotenv').config();
require('dns').setDefaultResultOrder('ipv4first'); // E1: prefer IPv4 globally (WSL2 has no IPv6 egress → Gmail SMTP fails on AAAA)
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcryptjs = require('bcryptjs');
const multer = require('multer');
const nano = require('nano');

// ------------------------------------------------------------------------------------------------
// M3 (Phase 5 hardening): FAIL CLOSED on a missing JWT signing secret.
// Previously this fell back to a hardcoded 'dev_secret_key'. A signing key that lives in the
// source code means anyone who can read the repo can forge a valid token for ANY account
// (including admin) — total authentication bypass. We now refuse to boot without a real secret
// supplied via the environment (set JWT_SECRET in ~/chaincert-api/.env).
// ------------------------------------------------------------------------------------------------
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim() === '') {
  console.error('❌ FATAL: JWT_SECRET environment variable is not set.');
  console.error('   Refusing to start with an insecure default signing key.');
  console.error('   Add a long random JWT_SECRET to ~/chaincert-api/.env and restart.');
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;
const upload = multer({ storage: multer.memoryStorage() });

const couchdb = require('./couchDB_service');
// M2: the authorization guards now live in securityHelpers so the route files can import them too.
// They used to be file-local declarations here, which is why four of six routers ended up mounted
// with no guard at all — a router had no way to reach them.
const {
  sendServerError,
  requireAuth,
  requireRole,
  createRateLimiter,
  RATE_LIMIT_DISABLED
} = require('./securityHelpers');

const issuerCredentialController = require('./controllers/issuerCredentialController');
const verifierController = require('./controllers/verifierController');
const adminDashboardController = require('./controllers/adminDashboardController');
const authController = require('./controllers/authController');

const app = express();

// ==========================================================================================================================================================================
// MIDDLEWARE SECTION - ORDER MATTERS!
// ==========================================================================================================================================================================

// M5 (prerequisite): trust ONE reverse proxy hop.
// On the VM, Nginx fronts this API, so without this every request arrives with Nginx's own IP as
// the socket peer. req.ip would be identical for every client, meaning the per-IP rate limiter
// would either never trigger (one shared bucket that no single user fills) or, once filled, lock
// out EVERYONE at once — a self-inflicted DoS. With 'trust proxy' set to 1, Express reads the
// rightmost X-Forwarded-For entry, which is the value Nginx itself appends.
//
// The literal 1 (rather than `true`) matters: it trusts exactly one hop. `true` would trust the
// whole chain, letting a client forge X-Forwarded-For and evade the limiter entirely. This is only
// safe while the API is not directly reachable from outside — confirm the VM firewall exposes the
// Nginx port and NOT :4000.
app.set('trust proxy', 1);

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

// M6 (Phase 5 hardening): security response headers. This API serves JSON cross-origin to the SPA on
// :3000, so two helmet defaults are tuned to NOT break that flow:
//   - contentSecurityPolicy: false  — CSP governs HTML page resources; it belongs on the frontend host,
//     not on a JSON API, and helmet's default CSP would otherwise interfere.
//   - crossOriginResourcePolicy: cross-origin — lets the browser allow the :3000 SPA to read :4000 responses.
// Everything valuable stays ON: X-Frame-Options (clickjacking), X-Content-Type-Options: nosniff,
// Referrer-Policy, X-Powered-By removal, etc. HSTS is emitted but browsers ignore it over plain HTTP —
// it only takes effect in Tier 3 once HTTPS fronts the app.
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/*
  JWT-decode middleware
  LAYMAN (Tropang Ex): Tinitingnan kung may "Bearer token" sa request. Kung meron at valid, nilalagay
  ang user info sa req.user; kung wala o sira, req.user = null. HINDI ito humaharang — ang mga guard sa
  baba ang nagdedesisyon kung sino ang papasukin.
  TECHNICAL: Verifies the Authorization: Bearer <token> against JWT_SECRET and populates req.user, or
  sets it null on absence/failure (per CLAUDE.md: absence ⇒ req.user = null, not a hard reject here).
*/
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

// ==========================================================================================================================================================================
// M2 (Phase 5 hardening): CENTRALIZED AUTHORIZATION GUARDS
// --------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// The middleware above only DECODES the token into req.user (or null). It never blocks anyone.
// The guards are the gate, and they now live in securityHelpers.js (imported at the top of this
// file) so the route files can import the SAME copies. While they were declared here they were
// unreachable from any router, which is why /api/auth, /api/issuer, /api/credentials and
// /api/verify were all mounted unguarded.
//   requireAuth            — reject any request that has no valid token.
//   requireRole(role)      — reject any request whose token role doesn't match.
//   requireAnyRole(...r)   — allow any one of several roles (issuer OR admin).
//   requireAdmin / requireIssuer — named shorthands.
// ==========================================================================================================================================================================

// ==========================================================================================================================================================================
// M5 (Phase 5 hardening): LIGHTWEIGHT IN-MEMORY RATE LIMITER
// --------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Caps requests per client IP per time window on sensitive auth endpoints to blunt online
// password brute-force, credential stuffing, and OTP-email spam (KB A-7, P-5). In-memory and
// per-process is sufficient for the single-VM capstone deployment; a shared store (Redis) or the
// express-rate-limit library would be the upgrade path for a multi-instance production setup.
// A separate per-account OTP counter (in accountController.forgotPassword) complements this with
// a persisted, cross-restart limit tied to identity rather than IP.
// ==========================================================================================================================================================================

// createRateLimiter + RATE_LIMIT_DISABLED now live in securityHelpers.js (imported at the top of
// this file) so route files can build their own limiters — needed for the share-link OTP routes,
// whose paths contain a :token parameter and therefore cannot be matched by an app.use prefix.

// 10 attempts per IP per 15 minutes on the sensitive auth routes (login / forgot / reset).
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many attempts from this IP. Please wait a few minutes and try again.'
});

// Anti-enumeration: /api/auth/check-email reveals whether an email is registered, so a script
// could probe it in bulk to harvest valid accounts. Legitimate use is the registration wizard's
// Step 1->2 gate (a handful of checks per signup), so a generous-but-bounded cap blunts bulk
// harvesting without hurting real users.
const checkEmailLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many email checks from this IP. Please wait a few minutes and try again.'
});

// OTP request/confirm endpoints. Deliberately more generous than authLimiter because a single
// legitimate flow legitimately makes several calls (send, mistype, resend, confirm) and the
// per-code wrong-guess budget in securityHelpers is the real brake on guessing. This is the
// per-IP backstop that stops a script from working through many accounts in parallel.
const otpLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many verification-code requests from this IP. Please wait a few minutes and try again.'
});

if (RATE_LIMIT_DISABLED) {
  console.warn('⚠️  ⚠️  RATE LIMITING IS DISABLED (DISABLE_RATE_LIMIT=true in .env). FOR TESTING ONLY — remove it before any demo or deployment.  ⚠️  ⚠️');
}

// The signup email-proof gate had NO startup warning, which made it the one security toggle you
// could not detect by reading the logs — you had to open .env. Now it announces itself like the
// others.
if (process.env.DISABLE_SIGNUP_OTP === 'true') {
  console.warn('⚠️  ⚠️  SIGNUP EMAIL VERIFICATION IS DISABLED (DISABLE_SIGNUP_OTP=true in .env). Accounts can be created with unverified emails. FOR TESTING ONLY — remove it before any demo or deployment.  ⚠️  ⚠️');
}

// M8 (Phase 5 hardening): same testing escape hatch for the password-strength policy.
if (process.env.DISABLE_PASSWORD_POLICY === 'true') {
  console.warn('⚠️  ⚠️  PASSWORD STRENGTH POLICY IS DISABLED (DISABLE_PASSWORD_POLICY=true in .env). FOR TESTING ONLY — remove it before any demo or deployment.  ⚠️  ⚠️');
}

// Group 5 (UAT): issuer enable/disable freeze so testers can't lock out an issuer account.
if (process.env.DISABLE_ISSUER_TOGGLE === 'true') {
  console.warn('⚠️  ⚠️  ISSUER ENABLE/DISABLE IS FROZEN (DISABLE_ISSUER_TOGGLE=true in .env). FOR UAT ONLY — remove it before any demo or deployment.  ⚠️  ⚠️');
}

// F01: the past/same-day expiry guard used to be COMMENTED OUT in source, which is the worst
// possible form of a toggle — invisible in .env, invisible in the logs, and only discoverable by
// reading the controller. It is now on by default and opt-out here.
if (process.env.ALLOW_PAST_EXPIRY === 'true') {
  console.warn('⚠️  ⚠️  PAST-DATED EXPIRY IS ALLOWED (ALLOW_PAST_EXPIRY=true in .env). Credentials can be issued already-expired, permanently, onto an immutable ledger. FOR TESTING ONLY — remove it before any demo or deployment.  ⚠️  ⚠️');
}

/* One consolidated line so an operator can confirm the security posture from a single log entry
   instead of scanning for the absence of four separate warnings. Absence of evidence was being
   treated as evidence of absence — this makes the safe state explicit. */
{
  const activeToggles = [
    ['DISABLE_RATE_LIMIT', RATE_LIMIT_DISABLED],
    ['DISABLE_SIGNUP_OTP', process.env.DISABLE_SIGNUP_OTP === 'true'],
    ['DISABLE_PASSWORD_POLICY', process.env.DISABLE_PASSWORD_POLICY === 'true'],
    ['DISABLE_ISSUER_TOGGLE', process.env.DISABLE_ISSUER_TOGGLE === 'true'],
    ['ALLOW_PAST_EXPIRY', process.env.ALLOW_PAST_EXPIRY === 'true']
  ].filter(([, on]) => on).map(([name]) => name);

  if (activeToggles.length === 0) {
    console.log('🔒 Security toggles: none active (production-safe).');
  } else {
    console.warn(`🔓 Security toggles ACTIVE (${activeToggles.length}): ${activeToggles.join(', ')} — NOT production-safe.`);
  }
}

// ==========================================================================================================================================================================
// DB INIT
// ==========================================================================================================================================================================
// REMOVED: `const docker = new Docker({ socketPath: '/var/run/docker.sock' })`.
// It was instantiated here and never referenced again — dead code that handed the API process a
// handle to the Docker socket, which is root-equivalent access to the host. Keeping an unused
// capability of that magnitude is strictly worse than not having it: it widens the blast radius of
// any RCE in this process for zero functionality. The `dockerode` dependency was dropped with it.
// Fabric's chaincode builder uses the socket from the PEER container, not from this API.

couchdb.initializeDatabases().catch(err => {
  console.error('⚠️  CouchDB init error:', err.message);
});

/*
  Function Name: setupDatabaseIndexes
  LAYMAN (Tropang Ex): Gumagawa ng mga "index" — parang index ng libro — para hindi kailangang
  basahin ng database ang LAHAT ng records tuwing may hahanapin. Dati isa lang (issuers); ang
  dalawang pinaka-abalang database (wallet at notifications) ay walang index kaya bawat hanap ay
  full scan. Idempotent — kung meron na, ok lang.
  TECHNICAL: Creates 5 Mango indexes across issuers, wallet_user_credentials and user_notifications.
  Each is attempted independently so one failure does not skip the others; 409/"already exists"
  counts as success. A failure is logged but non-fatal — an unindexed query still returns correct
  results, just with a full-collection scan. Runs once at boot (setTimeout) after a short delay.
  PARAMS: (none). RETURNS: void (logs a created/existing/failed summary).
*/
const setupDatabaseIndexes = async () => {
  await new Promise(resolve => setTimeout(resolve, 1500));

  /* The `issuers` index was the ONLY one in the project. The two busiest collections had none, so
     every read against them was a full document scan — CouchDB answers them, but it scans every
     doc and logs "no matching index found" each time. They are scanned on essentially every page
     load, and they are also the collections that grow fastest:

       wallet_user_credentials  — read on every wallet/profile/verify load, keyed by holderID
       user_notifications       — read on every dashboard load, keyed by type + owner

     Each entry is created independently so one failure does not skip the rest, and a 409/"already
     exists" is treated as success (this runs on every boot). */
  const indexes = [
    { db: 'issuers',                 fields: ['type', 'status', 'createdAt'], name: 'idx-type-status-created' },
    // Backs getUserCredentialsByHolderId — the holder wallet fetch.
    { db: 'wallet_user_credentials', fields: ['holderID'],                    name: 'idx-holderID' },
    // Backs getBlockedHolderIDsByTemplate, now on the issuance write path (duplicate gate).
    { db: 'wallet_user_credentials', fields: ['templateId'],                  name: 'idx-templateId' },
    // Backs the holder notification queries (type + holderID).
    { db: 'user_notifications',      fields: ['type', 'holderID'],            name: 'idx-type-holderID' },
    // Backs the issuer notification queries (type + issuerId).
    { db: 'user_notifications',      fields: ['type', 'issuerId'],            name: 'idx-type-issuerId' }
  ];

  let created = 0, existing = 0, failed = 0;

  for (const spec of indexes) {
    try {
      await couchdb.couch.use(spec.db).createIndex({
        index: { fields: spec.fields },
        name: spec.name,
        ddoc: 'indexes'
      });
      created++;
    } catch (error) {
      if (error.statusCode === 409 || (error.message || '').includes('already')) {
        existing++;
      } else {
        failed++;
        // Not fatal: the queries still work unindexed, just slowly. Worth surfacing, not worth
        // refusing to boot over — a missing index degrades performance, it does not break behavior.
        console.error(`⚠️  Index ${spec.db}/${spec.name} failed:`, error.message);
      }
    }
  }

  console.log(`✅ Database indexes ready (${created} created, ${existing} already existed${failed ? `, ${failed} FAILED` : ''})`);
};

setTimeout(setupDatabaseIndexes, 2000);

// ==========================================================================================================================================================================
// FABRIC / BLOCKCHAIN HELPERS
// ==========================================================================================================================================================================

const walletPath = path.join(__dirname, 'wallet');

/* ---------------------------------------------------------------------------------------------
   Connection-profile cache.

   WHAT THIS REPLACES: `cachedGateway` / `lastConnectionTime` / `CONNECTION_CACHE_TTL`, which were
   abandoned scaffolding. `CONNECTION_CACHE_TTL` was never read anywhere, and `cachedGateway` was
   overwritten on every call but only ever read by the SIGINT handler — so it did no caching, and
   under concurrency it tracked only the most recent gateway.

   WHY GATEWAYS ARE STILL NOT POOLED: every caller in this codebase owns its gateway and calls
   `gateway.disconnect()` when done (now reliably, via finally). Handing several callers the same
   cached Gateway would mean the first disconnect tears the connection out from under the others.
   Pooling would require removing ~37 disconnect sites and introducing refcounting or a real pool —
   a change that must be validated against a live Fabric network, not reasoned about. Deliberately
   out of scope here.

   WHAT THIS DOES FIX: the connection profile was read from disk with fs.readFileSync and JSON
   .parse'd on EVERY blockchain request. Both are synchronous, so they blocked the entire event
   loop — for all users — once per request, to re-read a file that never changes at runtime. It is
   now read once per path and reused. The Fabric discovery handshake in gateway.connect() remains
   per-request; that is the part pooling would remove.
   --------------------------------------------------------------------------------------------- */
const ccpCache = new Map();   // absolute ccp path -> parsed connection profile
let cachedWallet = null;      // the file-system wallet handle (stateless reader, safe to share)

/*
  Function Name: getContractAndGateway

  LAYMAN (Tropang Ex):
  Ito ang "tulay" papunta sa blockchain. Bibigyan mo ng identity (sino ang gagawa ng transaction) at
  org name, tapos ibabalik nito ang konektadong gateway + ang chaincert contract na pwede mo nang
  i-submit/i-evaluate. Ito ang pinapasa sa lahat ng controller (via app.locals) para makapag-on-chain.

  TECHNICAL:
  Resolves the right connection profile by substring-matching DLSU in orgName/identityName
  (connection-delasalleuniversity.json) else Org1 (connection-org1.json), loads the file-system wallet
  identity (throws "Identity <name> not found" if absent — usually means the enroll/setup script hasn't
  run), connects a Fabric Gateway (discovery enabled, asLocalhost), and returns the chaincert contract
  on chaincert-channel. Caller owns gateway.disconnect(). NOTE: paths are Ubuntu-absolute by design.

  PARAMS:
  - identityName — wallet identity to transact as (e.g. 'chaincert-admin', a DLSU identity).
  - orgName — org used to pick the connection profile (DLSU vs Org1).

  RETURNS:
  { gateway, contract }. THROWS if identity/orgName missing, the connection profile file is absent, or
  the identity isn't in the wallet.

  STEPS
    Step 1 — Validate inputs (identityName + orgName required).
    Step 2 — Pick the connection profile (DLSU substring → DLSU ccp, else Org1 ccp); 404-style throw if file missing.
    Step 3 — Load the wallet identity (throw if not found).
    Step 4 — gateway.connect(ccp, {discovery}); getNetwork('chaincert-channel').getContract('chaincert').
    Step 5 — Cache the gateway (for SIGINT cleanup) and return { gateway, contract }.

  EXAMPLE
    const { gateway, contract } = await getContractAndGateway('chaincert-admin', 'Org1');
    try { await contract.submitTransaction('LogIssuerApproval', ...); } finally { await gateway.disconnect(); }
*/
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
      __dirname,
      '..',
      'fabric-samples',
      'fabric-samples',
      'test-network',
      'organizations',
      'peerOrganizations',
      'dlsu.example.com',
      'connection-delasalleuniversity.json'
    );
  } else {
    ccpPath = path.resolve(
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
  }

  // Read + parse the connection profile ONCE per path, then reuse. The sync fs calls below used to
  // run on every request and block the event loop process-wide; the file does not change while the
  // server is running. A miss still surfaces the same clear error as before.
  let ccp = ccpCache.get(ccpPath);
  if (!ccp) {
    if (!fs.existsSync(ccpPath)) {
      throw new Error(`Connection profile not found at: ${ccpPath}`);
    }
    ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
    ccpCache.set(ccpPath, ccp);
    console.log(`[FABRIC] Loaded connection profile: ${path.basename(ccpPath)} (cached)`);
  }

  // The wallet is a stateless reader over the same directory — building a new one per request bought
  // nothing. Identity lookup still happens per call, so a newly-enrolled identity is picked up
  // without a restart.
  if (!cachedWallet) {
    cachedWallet = await Wallets.newFileSystemWallet(walletPath);
  }
  const wallet = cachedWallet;

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

  // NOTE: the caller owns this gateway and must disconnect it (all call sites now do so in a
  // `finally`). Nothing is cached here on purpose — see the comment above ccpCache.
  return { gateway, contract };
}

// Expose Fabric gateway helper to route handlers
app.locals.getContractAndGateway = getContractAndGateway;

// ==========================================================================================================================================================================
// ROUTE IMPORTS
// ==========================================================================================================================================================================

const systemRoutes = require('./routes/systemRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const issuerRoutes = require('./routes/issuerRoutes');
const credentialRoutes = require('./routes/credentialRoutes');
const verificationRoutes = require('./routes/verificationRoutes');
const walletRoutes = require('./routes/walletRoutes');


// ==========================================================================================================================================================================
// ROUTE MOUNTING
// ==========================================================================================================================================================================

app.use('/api', systemRoutes);

// M5: rate-limit the sensitive auth endpoints. These run BEFORE the routers that ultimately
// handle the request, so excess attempts are rejected with 429 before any auth work happens.
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/reset-password', authLimiter);
app.use('/api/issuer/login', authLimiter);
// Issuer registration is unauthenticated AND expensive (multipart upload + magic-number checks +
// an admin-notification email per admin account), so it gets the same per-IP cap.
app.use('/api/issuer/register', authLimiter);
app.use('/api/auth/check-email', checkEmailLimiter); // anti-enumeration on the email-availability probe

// Coverage gaps closed in the OTP pass. Every one of these either creates an account, changes a
// password, or verifies a one-time code — and all of them were previously unlimited, which meant
// an attacker could simply move off /login (limited) onto /change-password (not limited) and get
// the same brute-force surface back.
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/change-password', authLimiter);
app.use('/api/auth/signup/request-otp', otpLimiter);
app.use('/api/auth/signup/confirm-otp', otpLimiter);
app.use('/api/credentials/verify/request-otp', otpLimiter);
app.use('/api/credentials/verify/confirm-otp', otpLimiter);
// NOTE: /api/auth/profile-share/:token/{request-otp,verify-otp} cannot be matched by a literal
// app.use prefix (the :token segment sits in the middle), so they carry a per-route limiter
// declared in authRoutes.js instead.

app.use('/api/auth', authRoutes);

// M2: every /api/admin route now requires a valid token (closes anonymous access to admin data,
// e.g. the issuer-listing endpoints that previously had no auth at all). Fine-grained role checks
// (admin vs issuer-as-root-authority) are enforced inside adminRoutes / the controllers, because
// this router intentionally serves BOTH admin actions and issuer root-authority actions.
app.use('/api/admin', requireAuth, adminRoutes);

app.use('/api/issuer', issuerRoutes);
app.use('/api/credentials', credentialRoutes);
app.use('/api/verify', verificationRoutes);

// M2 + M1: wallet endpoints require authentication; per-handler ownership checks (M1) then ensure
// a logged-in user can only touch their OWN credentials/notifications.
app.use('/api/wallet', requireAuth, walletRoutes);

// M9 (Phase 5 hardening): global error safety-net. Controllers mostly use sendServerError directly,
// but anything thrown/next'd that reaches here returns a sanitized response (generic message +
// errorId) instead of leaking a stack trace to the client. Must be registered AFTER all routes.
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  return sendServerError(res, err, 'UNHANDLED');
});

// ==========================================================================================================================================================================
// HELPERS / SHUTDOWN
// ==========================================================================================================================================================================

/*
  Function Name: sleep
  LAYMAN (Tropang Ex): Pansamantalang paghinto ng ms milliseconds (await sleep(1000)).
  TECHNICAL: Promise wrapper around setTimeout. PARAMS: ms. RETURNS: Promise<void>.
*/
async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down...');
  /* Previously this disconnected `cachedGateway` — the single most recently created gateway. That
     was misleading rather than useful: under any concurrency it closed one arbitrary connection and
     left the rest, while implying an orderly shutdown.

     Every gateway is now owned and released by its caller in a `finally`, so there is nothing
     server-scoped left to tear down here. */
  process.exit(0);
});

// ==========================================================================================================================================================================
// STARTUP HOOKS
// ==========================================================================================================================================================================

adminDashboardController.initExpiryCron(getContractAndGateway);
adminDashboardController.initIntegrityCron(getContractAndGateway); // Phase 5 M13 — daily 8 AM integrity check + admin alerts

module.exports = {
  getContractAndGateway
};

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`✅ API running on :${PORT}`);
  console.log('✅ CouchDB databases selected');
  console.log('✅ Docker deployment endpoints ready');
});

setInterval(() => {}, 1000);