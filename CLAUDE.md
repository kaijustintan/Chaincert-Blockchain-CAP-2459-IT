CLAUDE.md
This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
Project: ChainCert
Blockchain-backed academic / professional credential platform. Three cooperating layers:

Frontend (src/) — React 19 SPA bootstrapped from Create React App. Served from Windows on :3000.
Backend API (backend/ + the misplaced src/controllers/ and src/routes/ — see "Windows vs Ubuntu layout" below) — Express server (sdk-server-fixed.js) that bridges the SPA to Hyperledger Fabric and CouchDB. Runs in Ubuntu/WSL2 on :4000.
Chaincode (chaincode/) — Hyperledger Fabric smart contract (ChainCertContract). Deployed to channel chaincert-channel, contract name chaincert.

CAP2 deployment target is a single Ubuntu cloud VM (AWS EC2 or DigitalOcean) hosting Docker + Fabric + CouchDB + Node API + React frontend. Ports 3000 and 4000 must be opened in the security group. Vercel is optional for a prettier frontend URL — backend, Fabric, and CouchDB still run on the VM.

📄 Doc-reading tip — prefer .md over .pdf to save tokens. When referencing project docs, read the .md mirrors under docs/Claude Reference - MD Files/ (and docs/Claude Reference - MD Files/CAP1 Documents to Submit/ for the formal CAP1 submission manuals) instead of the original PDFs in docs/. The .md files have identical content and are dramatically cheaper to consume. The full doc index lives in the Canonical docs section at the bottom of this file.

Commands
Frontend (run from repo root, Windows side — runs npm start against the WSL backend):

npm start — dev server on :3000 (Create React App, polling enabled via .env).
npm run build — production bundle to build/.
npm test — Jest + React Testing Library in watch mode. npm test -- <pattern> to filter, npm test -- --watchAll=false for a single run.

Backend (run from ~/chaincert-api/ inside Ubuntu/WSL):

node sdk-server-fixed.js (or npm start) — boots the API against CouchDB and Fabric. There is no test script.
node enrollChaincertAdmin.js — one-time CA enrollment for the chaincert-admin identity into ~/chaincert-api/wallet/.
node enrollAdmin.js / enrollOrg2Admin.js — Org1/Org2 admin wallet provisioning (these correspond to setupWallet_ORG1.js/setupWallet_ORG2.js in the Windows tree).
node setup_Wallet_DLSU.js and setup_Wallet_DLSU_Subordinate_INNOCENCIO.js / ..._LASALLECOMPUTERSOCIETY.js — DLSU root + subordinate identity wallet imports.
Health check: curl http://localhost:4000/api/health.

Chaincode (run from ~/chaincert-chaincode/ inside Ubuntu/WSL):

npm start — fabric-chaincode-node start (used when chaincode runs as an external service).

Windows vs Ubuntu layout — important quirk
This Windows working copy and the Ubuntu deploy tree have different layouts. Every backend script and controller is written for the Ubuntu layout; relative requires (../couchDB_service, ../config/issuerRequirements) and absolute paths (/home/kaitanz_/fabric-samples/..., /var/run/docker.sock) inside sdk-server-fixed.js only resolve there. Do not "fix" the paths to make them resolve on Windows — that breaks deployment. The marker // UBUNTU DIRECTORY BASED in some files flags this.
Mapping (Windows → Ubuntu) — also enumerated as cp commands in docs/Claude Reference - MD Files/Copy_Commands.md:
Windows pathUbuntu pathchaincode/index.js~/chaincert-chaincode/index.jsbackend/sdk-server-fixed.js~/chaincert-api/sdk-server-fixed.jsbackend/couchDB_service.js~/chaincert-api/couchDB_service.jsbackend/setupWallet_ORG1.js / ORG2.js~/chaincert-api/enrollAdmin.js / enrollOrg2Admin.js (renamed)backend/enrollChaincertAdmin.js~/chaincert-api/enrollChaincertAdmin.jsbackend/issuerRequirements.js~/chaincert-api/config/issuerRequirements.jsbackend/node_creation/dlsu/setupWallet_DLSU.js (and subordinate setups)~/chaincert-api/setup_Wallet_DLSU*.jssrc/controllers/*.js~/chaincert-api/controllers/*.js (these are Express, not React)src/routes/*.js~/chaincert-api/routes/*.js (these are Express, not React)src/services/authenticationService.js~/chaincert-api/authenticationService.js (backend file under src/services for historical reasons)backend/node_creation/dlsu/configtx-DEFAULT.yaml / configtx-WITHDLSU.yaml~/fabric-samples/.../test-network/configtx/configtx.yaml (one is copied in at a time)backend/node_creation/dlsu/connection-delasalleuniversity.json~/fabric-samples/.../peerOrganizations/dlsu.example.com/connection-delasalleuniversity.jsonbackend/node_creation/dlsu/compose/*.yaml~/fabric-samples/.../test-network/addDLSU/compose/*.yaml
The Windows folder name must be exactly CAP-2459-IT-AFTER-RESET at the user's desktop — many cp commands hard-code /mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET/.... See docs/Claude Reference - MD Files/Predemo_Setup.md and docs/Claude Reference - MD Files/Copy_Commands.md.
Architecture
End-to-end flow
The SPA talks only to the Express API via Axios. The API holds the Fabric admin wallets and is the single chokepoint that:

Authenticates the request (JWT middleware in sdk-server-fixed.js populates req.user from Authorization: Bearer …).
Reads/writes off-chain state in CouchDB via couchDB_service.js.
Submits/queries on-chain transactions through getContractAndGateway(identityName, orgName), which loads the connection profile, opens a Gateway, and returns the chaincert contract handle.

getContractAndGateway is exposed to controllers as app.locals.getContractAndGateway and injected into route handlers — controllers receive it as a parameter rather than importing the gateway directly. Init functions follow the same pattern (e.g. adminDashboardController.initExpiryCron(getContractAndGateway) is wired at server startup).
Governance model (final design — see docs/Claude Reference - MD Files/Final_Design.md)
ChainCert operates as a consortium, not a single-authority registry. Two issuer tiers:

Root Authority (sovereign member, e.g. DLSU, Ateneo) — has its own MSP and peer, maintains a ledger copy, participates in endorsement. Provisioning a new root authority requires a channel config update (the configtx swap dance — see "Predemo / chaincode redeploy" below).
Subordinate Issuer (e.g. a department or bootcamp under DLSU) — does NOT get a peer or a new MSP. It receives a Fabric identity registered under the root authority's CA, and operates under the root MSP. No channel config change needed. Subordinates additionally get their own CouchDB instance for credential storage; the central couchdb_connections database (on the main CouchDB at :5985) maps orgName → couchDBUrl so the API can route subordinate writes to the right CouchDB. The subordinate's MSP files are produced by the manual workflow in docs/Claude Reference - MD Files/Final_Design.md (Phases 1–12) using fabric-ca-client register/enroll against the DLSU CA at port 12054.

Issuer registration is category-driven. Categories live in backend/issuerRequirements.js (ISSUER_CATEGORY_REQUIREMENTS): university, government, training_provider, industry_certifier, others. Each category has its own required-documents list (e.g. universities upload CHED recognition + SEC/charter + board resolution). The frontend renders the upload checklist dynamically from GET /api/auth/issuer-requirements/:category. Validation happens in the app layer — Fabric handles identity, endorsement, and immutable logging only.
Approval flow:

Issuer submits registration (Part 1: basic, Part 2: type/category, Part 3: docs, Part 4: review). Subordinates additionally pick a rootAuthorityId.
If subordinate → root authority approves first via rootAuthorityController.rootApproveSubordinateIssuer → writes LogRootSubordinateApproval to chaincode.
Admin approves via adminIssuerController.Approve_Issuer → writes LogIssuerApproval to chaincode and assigns fabricIdentity, couchDBUrl, walletId.
Issuer becomes active. Every status transition (approve/reject/disable/enable) at any tier produces an immutable on-chain log via the Log* chaincode functions.

Issuer status lifecycle
Status strings used in CouchDB issuers docs and chaincode LogIssuerStatusChange:

pending_review — newly submitted, awaiting first decision.
pending_root_approval — subordinate awaiting root authority's gate.
root_approved — root has approved; awaiting admin (subordinates only).
approved / active — fully approved; can log in and issue.
rejected — admin or root denied; reason logged on-chain.
disabled — admin-restricted (reversible via Enable_Issuer).

Subordinate gate: adminIssuerController.Approve_Issuer must check rootApprovalStatus before acting — admin approval is blocked until the root authority approves. Both decisions emit immutable Log* chaincode entries.
Frontend layout (src/)

App.js is the only router. Routes split into public, protected (JWT in localStorage, gated by components/protectedRoutes.js), and admin-only (components/adminProtectedRoutes.js). Catch-all redirects to /.
services/axiosInstance.js is the canonical HTTP client — injects Authorization from localStorage.token, points at http://localhost:4000/api. New API calls should go through it (or services/apiService.js, which wraps it). On EC2 the base URL must be the public IP, not localhost.
pages/ are role-scoped dashboards: studentDashboard, issuerDashboardPage, verifierDashboard, adminDashboard, plus credential / profile / share pages. Public profile shares route through /profile/:token → profilePreview.js.
services/pdfExportService.js handles credential PDF rendering (jsPDF + qrcode).
⚠️ src/services/authenticationService.js is a backend file that lives under src/ for historical reasons — it deploys to ~/chaincert-api/authenticationService.js, not the React bundle. Don't import it from frontend code.

Backend route mounting (sdk-server-fixed.js)
/api          -> systemRoutes        (health checks)
/api/auth     -> authRoutes          (authController, accountController)
/api/admin    -> adminRoutes         (adminDashboardController, adminIssuerController, adminAuditController, rootAuthorityController)
/api/issuer   -> issuerRoutes        (issuerOnboardingController, issuerCredentialController)
/api/credentials -> credentialRoutes (credential lifecycle: issue/revoke/history/verify)
/api/verify   -> verificationRoutes  (verifierController)
/api/wallet   -> walletRoutes        (walletController — student wallet UI state)
Where to put new backend code
Per docs/Claude Reference - MD Files/CONTROLLER_Files_and_its_Responsibilities.md and docs/Claude Reference - MD Files/ROUTE_Files_and_its_Responsibilities.md — the team uses these as the canonical file-placement rules. Follow them when adding new endpoints; don't pile everything into authController.js just because it's the largest.
ControllerResponsibilityauthControllerLogin, register, password change — authentication / access entry onlyaccountControllerProfile/account data: getUserInfo, updateProfile, uploadProfilePictureissuerOnboardingControllerIssuer registration, requirements lookup, onboarding document reviewissuerCredentialControllerIssuer credential lifecycle: create template, issue, revoke, history, eligible usersadminIssuerControllerAdmin managing issuer queues: pending/approved/rejected/disabled lists, approve/reject/enable/disablerootAuthorityControllerRoot authority over subordinates: list/approve/reject subordinate issuersadminAuditControllerAudit logs (status/decision logs), admin password change, admin enable/disable usersadminDashboardControllerAdmin dashboard aggregation + maintenance (e.g. triggerExpiryCheck, expiry cron init)walletControllerStudent wallet display state: visibility/order/credentials listverifierControllerCredential verification + verification logs/stats
Route fileDepartmentauthRoutes/api/auth/* — login, register, profile, passwordadminRoutes/api/admin/* — admin dashboard actionsissuerRoutes/api/issuer/* — issuer onboarding + dashboardcredentialRoutes/api/credentials/* — credential lifecyclewalletRoutes/api/wallet/* — student wallet UI stateverificationRoutes/api/verify/* — verifier flowssystemRoutes/api/health — diagnostics
Service layer (couchDB_service.js) holds shared CouchDB access; chaincode (chaincode/index.js) is the on-chain source of truth.
Data layer

Central CouchDB at http://admin:adminpw@localhost:5985 (note non-standard port). Databases: users, issuers, user_notifications, admin_notifications, profile_share_links, couchdb_connections (subordinate CouchDB URL mapping). couchDB_service.initializeDatabases() runs on boot; a Mango index idx-type-status-created is created on issuers.
Subordinate CouchDBs run on separate ports (e.g. :9085 for INNOCENCIO) via dedicated compose-couch-<sub>.yaml files. Each holds wallet_issuer_credentials and issued_credentials for that subordinate. The backend resolves the right CouchDB by looking up orgName in the couchdb_connections map.
Fabric — channel chaincert-channel, contract chaincert. Org routing inside getContractAndGateway decides between connection-org1.json and connection-delasalleuniversity.json by substring-matching orgName/identityName. DLSU peer is at localhost:12051 with MSP DLSUMSP; DLSU CA is at localhost:12054.
Wallets — file system wallet at ~/chaincert-api/wallet/ (gitignored). Identities seeded by the setup_Wallet_*.js and enrollChaincertAdmin.js scripts. The API will throw Identity ${identityName} not found if a script hasn't been run for that identity.

Identity & port reference
ComponentAddress / PortIdentity / MSPFrontend dev server:3000—Backend API:4000—Orderer:7050OrdererMSP (single Raft orderer)Org1 peer / CA:7051 / :7054Org1MSPOrg2 peer / CA:9051 / :8054Org2MSPDLSU peer / CA:12051 / :12054DLSUMSPAdmin CouchDB:5985 (note: NOT default 5984)admin:adminpwDLSU issuer CouchDB:9084admin:adminpwINNOCENCIO subordinate CouchDB:9085admin:adminpwLASALLECOMPUTERSOCIETY subordinate CouchDB:9086admin:adminpw
Identity types (don't conflate these):

System account (e.g. admin1@email.com) — CouchDB login row, used by the web dashboard.
Fabric admin identity (chaincert-admin) — system-level chaincode invokes from the API.
Root authority identity (delasalleuniversity-admin) — DLSU credential operations.
Subordinate identity (delasalleuniversity-subordinate-innocencio, …-lasallecomputersociety) — issued under DLSU's CA, operates under DLSUMSP, no own peer.

Dual-write pattern
Every credential lifecycle action (template create, issue, revoke, expire) and every governance action (issuer/user status change) follows the same order: blockchain first, then CouchDB. Rationale: the ledger is the source of truth; the CouchDB mirror exists for fast reads.
Failure semantics: if the chaincode invoke succeeds but the CouchDB write fails, the controller returns a partial-success response with a warning rather than rolling back — CouchDB does not support cross-database transactions, and the immutable record is already on-chain. The admin integrity check (adminDashboardController) reconciles by comparing CouchDB rows against ledger records field-by-field; it is one-directional (CouchDB → ledger). When adding new lifecycle operations, follow the same order and same partial-failure response shape; do not try to rollback the chaincode write.
Chaincode (chaincode/index.js)
Single class ChainCertContract. Three operational areas:

Templates — CreateCredentialTemplate stores a record with isTemplate: true and empty holderID.
Issued instances — IssueCredential(templateId, holderID, expiryDate) derives an issued credential from a template. Plus RevokeCredential, ExpireCredential, VerifyCredential, Check_CredentialExists, and the Get_* query family (Get_HolderCredentials, Get_IssuerCredentialTemplates, Get_IssuerIssuedCredentials, Get_CredentialTemplateOrIssuedCredentialHistory, Get_IssuerCredentialsHistory).
Immutable audit logs — every governance action is mirrored on-chain:

LogIssuerApproval / LogIssuerRejection / LogIssuerStatusChange
LogRootSubordinateApproval / LogRootSubordinateRejection
LogUserStatusChange, LogAdminChangePassword
LogVerification (verifier scan log)
Read-side: GetAllStatusLogs, GetAllIssuerDecisionLogs, GetAllRootSubordinateLogs, GetRootSubordinateLogsByRootAuthority, GetAdminPasswordChangeLogs, GetAllVerificationLogs, GetVerificationLogById, etc. Full CLI catalog in docs/Claude Reference - MD Files/Chaincode_-_Query_Commands.md.



CouchDB stores a mirror copy of issued credentials (see Issue_Credential_DB in couchDB_service.js) so the issuer dashboard renders fast without round-tripping the ledger. On-chain remains source of truth for verification.
Background jobs
adminDashboardController.initExpiryCron(getContractAndGateway) is wired in sdk-server-fixed.js at startup and uses node-cron to expire credentials on schedule (calls ExpireCredential on the chaincode). New periodic work should follow that pattern (init function called from the server, gateway injected).
Working issuer accounts & demo environment
Only three issuer accounts have fully provisioned Fabric identities + dedicated CouchDB:

dlsu@email.com → delasalleuniversity-admin (root, DLSU CouchDB :9084)
lasallecomputersociety@email.com → delasalleuniversity-subordinate-lasallecomputersociety (:9086)
INNOCENCIO subordinate → delasalleuniversity-subordinate-innocencio (:9085)

Demo credentials in docs/Claude Reference - MD Files/CAP1 Documents to Submit/CAP-2459-IT-WALKTHROUGH.md §3. Plus admins admin1@email.com / admin2@email.com and holder kylejustin.tan7@gmail.com (all pw123).
A new issuer registration through the UI will NOT be able to issue credentials immediately after admin approval. Approval flips the status, but a working subordinate also requires the 12-phase manual workflow in docs/Claude Reference - MD Files/Final_Design.md (CA register/enroll → MSP NodeOU → wallet import → CouchDB instance → couchdb_connections row). If the API throws Identity <name> not found, that workflow hasn't been run for that account — it is not a code bug. Same for "no CouchDB URL for org" failures: check the couchdb_connections mapping.
Predemo / chaincode redeploy procedure
When you change chaincode/index.js, you must redeploy. The full procedure is in docs/Claude Reference - MD Files/Redeploy_CC_Instructions.md and docs/Claude Reference - MD Files/Predemo_Setup.md; the gist:

Stop the API (Ctrl+C in the API terminal).
Re-run the relevant cp commands (when in doubt, do them all).
From ~/fabric-samples/fabric-samples/test-network/, export PATH and FABRIC_CFG_PATH and switch to the DLSU peer context (CORE_PEER_LOCALMSPID="DLSUMSP", port 12051, MSP path under dlsu.example.com/users/Admin@dlsu.example.com/msp).
Swap configtx: copy in configtx-DEFAULT.yaml first.
Deploy: ./network.sh deployCC -c chaincert-channel -ccn chaincert -ccl javascript -ccp ~/chaincert-chaincode -ccv <bumped version> (bump -ccv each redeploy).
Swap configtx back: copy in configtx-WITHDLSU.yaml so DLSU rejoins.
Run the channel-membership / install / approveformyorg / commit sequence as DLSU admin (the "16. Verify Channel Membership and Install Chaincode" block).
Restart API and curl http://localhost:4000/api/health.

This dance is required because DLSU joins as an additional org after the initial chaincode deploy on the default 2-org channel.
Conventions worth knowing

File-level outline comments at the top of major backend files (couchDB_service.js, sdk-server-fixed.js, controllers, chaincode index.js) list public functions by category. Keep these in sync when adding or renaming exports — the team uses them as a quick-reference index.
Auth: tokens live in localStorage.token on the client; backend treats absence of Authorization as req.user = null rather than rejecting at middleware. Per-route auth checks live in the controllers.
Roles: student (holder), issuer (root or subordinate), admin, verifier. Plus the chaincode-level chaincert-admin Fabric identity used by the API for system-level invokes.
When in doubt about layout: read docs/DIRECTORY - Ubuntu.txt and docs/Claude Reference - MD Files/DIRECTORY_-_Windows.md for the authoritative directory tree on each side.

Accepted limitations (don't "fix" these without explicit ask)
These are conscious capstone-scope decisions, not oversights. Rationale per item lives in docs/Claude Reference - MD Files/Defense_Knowledge_-_March_25.md.

JWT in localStorage (XSS-vulnerable) — production would use httpOnly cookies.
JWT secret has a dev_secret_key fallback if .env is missing.
CouchDB creds hardcoded as admin:adminpw across files.
No HTTPS, no rate limiting, no token blacklist on disable (24h TTL).
Single orderer (no Raft cluster); all infra on one host.
Credential expiry has a timing gap — VerifyCredential chaincode does not re-check expiry in real time; the cron job in adminDashboardController.initExpiryCron flips status.
Duplicate issuance prevention is CouchDB-based, not chaincode-level.
Credential IDs use Date.now() + Math.random() — not cryptographically secure, but the ID is not a security token.
Integrity check is one-directional (CouchDB → ledger only).

Touch these only when the user explicitly asks to.
Canonical docs
Always prefer the .md mirrors below over the original PDFs in docs/ — same content, far cheaper on tokens.
docs/Claude Reference - MD Files/CAP1 Documents to Submit/ (formal CAP1 submission manuals)

CAP-2459-IT-INSTALLATION-MANUAL.md — phased setup; canonical for ports, identities, CouchDB DB names.
CAP-2459-IT-TECHNICAL-MANUAL.md — API route catalog, dual-write detail, database design.
CAP-2459-IT-USER-MANUAL.md — role-by-role UX flows, status terminology, troubleshooting.
CAP-2459-IT-WALKTHROUGH.md — demo accounts, scenario scripts, blockchain CLI verification (Appendix A).
CAP-2459-IT-PROPOSAL.md — original problem statement (Problems #1–#9) and proposal context.

docs/Claude Reference - MD Files/ (working / internal docs)

Final_Design.md — governance model, 12-phase subordinate creation workflow, 4-part issuer registration form with prerequisites. (Note: Chaincert_Design_Details__2.md is a near-identical earlier copy of this — prefer Final_Design.md.)
Defense_Knowledge_-_March_25.md — rationale for every accepted limitation, Q&A style; consult before proposing hardening changes.
Chaincode_-_Query_Commands.md — full CLI catalog for chaincode functions (GET vs INVOKE).
Node_Creation_for_DLSU.md — channel config update dance, peer addition, and the "Quick Reference" peer/org switch commands.
Redeploy_CC_Instructions.md + Predemo_Setup.md — exact configtx swap sequence and DLSU peer login env vars.
Issuer_Required_Docs_per_Category.md — rationale per required document in backend/issuerRequirements.js.
Chaincert_Design_Details__1.md — Platform vs Consortium architecture rationale.
CAP2_-_Deployment_Gameplan.md — EC2/DigitalOcean target plan (CAP2 only; current prototype is local).
CONTROLLER_Files_and_its_Responsibilities.md — canonical controller-placement rules.
ROUTE_Files_and_its_Responsibilities.md — canonical route-placement rules.
Copy_Commands.md — full Windows → Ubuntu cp command list.
Installation_Dependencies.md — full npm/system dependency list per layer.
DIRECTORY_-_Windows.md — Windows working-copy directory tree.