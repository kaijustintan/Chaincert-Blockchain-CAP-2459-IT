# ChainCert — Repository Tree & File Purpose

Context map of the ChainCert (CAP-2459-IT) repository for a fresh reader (e.g. Claude web). One-liner descriptions per directory, subdirectory, and key file. Generated from the Windows working copy.

## Critical layout quirk (read first)
This Windows working copy and the Ubuntu/WSL deploy tree have **different layouts**. The folders `src/controllers/` and `src/routes/` are **Express backend code, not React**, and only resolve on the Ubuntu deploy tree (`~/chaincert-api/controllers` and `~/chaincert-api/routes`). Do not "fix" their paths on Windows. Three cooperating layers overall:
- **Frontend** — React SPA in `src/` (minus controllers/routes), served on `:3000`.
- **Backend API** — `backend/` plus the misplaced `src/controllers` + `src/routes`; Express server on `:4000` (Ubuntu/WSL).
- **Chaincode** — Hyperledger Fabric smart contract in `chaincode/`.

Live deployment: `http://ccscloud.dlsu.edu.ph:20173` (DLSU CCSCloud VM).

---

```
CAP-2459-IT-AFTER-RESET/
│
├── CLAUDE.md                     Project guide for Claude Code: architecture, conventions, change log
├── README.md                     Repo readme
├── package.json / package-lock   Frontend (React 19 / CRA) dependencies + scripts
├── deploy-sync.sh                VM deploy script: clones canonical repo → runtime API + chaincode dirs, patches paths
│
├── .claude/                      Claude Code configuration for this repo
│   ├── commands/                 Project slash commands (/new-controller, /sync-backend-only, etc.)
│   └── skills/                   Project skills
│       ├── chaincert-doc-format/     Enforces the ChainCert doc format + factual guardrails
│       └── claude-config-sync/       Reminds to sync .claude / CLAUDE.md between Windows and Ubuntu
│
├── backend/                      Express API layer (deploys to Ubuntu ~/chaincert-api/)
│   ├── sdk-server-fixed.js           Main API server: JWT auth, route mounting, Fabric gateway, cron init
│   ├── couchDB_service.js            Shared CouchDB access layer (users, issuers, credentials, renewals)
│   ├── issuerRequirements.js         Per-category issuer document requirements (→ config/issuerRequirements.js)
│   ├── securityHelpers.js            Password strength, upload validation, generic error responses (M-series)
│   ├── mailerService.js              Nodemailer email sending (fire-and-forget + recipient routing)
│   ├── enrollChaincertAdmin.js       One-time CA enrollment for the chaincert-admin Fabric identity
│   ├── setupWallet_ORG1.js / _ORG2   Org1/Org2 admin wallet provisioning (→ enrollAdmin.js / enrollOrg2Admin.js)
│   ├── package.json                  Backend dependencies (separate from frontend)
│   └── node_creation/dlsu/           DLSU root authority + subordinate provisioning assets
│       ├── configtx-DEFAULT.yaml         Channel config WITHOUT DLSU (swapped in first on redeploy)
│       ├── configtx-WITHDLSU.yaml        Channel config WITH DLSU peer (swapped back after deploy)
│       ├── connection-delasalleuniversity.json  DLSU Fabric connection profile
│       ├── setupWallet_DLSU.js           DLSU root identity wallet import
│       ├── setup_Wallet_DLSU_Subordinate_ARCHERSNETWORK.js       ARCHERSNETWORK subordinate wallet import
│       ├── setup_Wallet_DLSU_Subordinate_LASALLECOMPUTERSOCIETY.js  LSCS subordinate wallet import
│       ├── compose/                      Docker Compose files for DLSU peer + subordinate CouchDBs
│       └── fabric-ca/                    Fabric CA config for the DLSU certificate authority
│
├── chaincode/                    Hyperledger Fabric smart contract (deploys to ~/chaincert-chaincode/)
│   ├── index.js                      ChainCertContract: issuance, revoke, expire, verify, audit logs (40+ fns)
│   └── package.json                  Chaincode dependencies
│
├── chaincode/... (channel: chaincert-channel, contract: chaincert)
│
├── public/                       CRA static root
│   ├── index.html                    HTML shell
│   ├── manifest.json / robots.txt / favicon.ico
│   └── assets/                        Static images/assets served as-is
│
├── src/                          React frontend SPA (EXCEPT controllers/ + routes/, which are backend)
│   ├── App.js                        The only router: public / protected / admin routes + page transitions
│   ├── index.js                      React entry point
│   ├── App.test.js / setupTests.js / reportWebVitals.js   CRA test + metrics scaffolding
│   ├── logo.svg
│   │
│   ├── assets/                       Frontend images, logos, badge art
│   │
│   ├── pages/                        Role-scoped page components (dashboards + public pages)
│   │   ├── studentDashboard.js           Holder wallet + credential health + verification insights
│   │   ├── issuerDashboardPage.js        Issuer: create/issue/revoke, batch ops, analytics, renewals
│   │   ├── adminDashboard.js             Admin: issuer queues, users, audit, analytics & reports
│   │   ├── verifierDashboard.js          Verifier: single + bulk credential verification
│   │   ├── loginPage.js / createAccount.js / forgotPassword.js   Auth flows (with signup OTP)
│   │   ├── profilePage.js / profilePreview.js / shareCredentialPage.js   Profile + public share links
│   │   ├── credentialHistoryPage.js      Per-credential blockchain history / provenance
│   │   ├── issuerDirectory.js            Public searchable issuer directory
│   │   ├── landingHomePage.js / aboutUsPage.js / helpPage.js   Marketing / info pages
│   │   ├── notifPage.js / settingsPage.js / requestAccessPage.js   Notifications, settings, access requests
│   │   ├── BadgeDetailsProfilePreviewPage.js   Public badge detail view
│   │   └── transcript.js                 Unrouted / legacy (not wired into App.js)
│   │
│   ├── components/                   Shared React components
│   │   ├── ui/                            Design-system primitives (cc-* Button, Card, Modal, DataTable, etc.)
│   │   ├── analytics/                     Analytics layer: aggregation helpers + chart wrappers
│   │   │   ├── analytics.js                   Pure aggregation helpers (compute* functions, null-tolerant)
│   │   │   ├── DonutChart.jsx / TrendBars.jsx / Sparkline.jsx   recharts wrappers
│   │   │   ├── InterpretationBox.jsx          The "what this means" summary box
│   │   │   └── CredentialHistory.jsx          Shared blockchain-history timeline (holder/issuer/admin)
│   │   ├── navBar_User.js / navBar_Guest/     Navigation bars (authenticated vs guest)
│   │   ├── protectedRoutes.js / adminProtectedRoutes.js   Route guards (JWT / admin role)
│   │   ├── credentialCard.js              Wallet credential card
│   │   ├── passwordInput.jsx / passwordCriteria.jsx   Password field with reveal + strength UI
│   │   ├── welcomeModal.jsx               First-visit role/nav primer
│   │   ├── appToast.js / footer.js        Toast notifications, footer
│   │
│   ├── controllers/                 EXPRESS BACKEND CONTROLLERS (not React) → ~/chaincert-api/controllers/
│   │   ├── authController.js              Login, register, signup OTP, unified login
│   │   ├── accountController.js           Profile/account data, profile picture, share links
│   │   ├── issuerOnboardingController.js  Issuer registration, requirements, onboarding review
│   │   ├── issuerCredentialController.js  Issuer credential lifecycle, renewals, Verification Reach
│   │   ├── adminIssuerController.js       Admin issuer queues + approve/reject/enable/disable
│   │   ├── adminAuditController.js        Audit logs, admin password change, user enable/disable
│   │   ├── adminDashboardController.js    Dashboard aggregation, integrity check, expiry cron
│   │   ├── rootAuthorityController.js     Root authority over subordinate issuers
│   │   ├── walletController.js            Holder wallet state, my-verifications, renewal requests
│   │   └── verifierController.js          Credential verification + verification logs + verifier OTP
│   │
│   ├── routes/                      EXPRESS BACKEND ROUTES (not React) → ~/chaincert-api/routes/
│   │   ├── authRoutes.js                  /api/auth/*
│   │   ├── adminRoutes.js                 /api/admin/*
│   │   ├── issuerRoutes.js                /api/issuer/*
│   │   ├── credentialRoutes.js            /api/credentials/*
│   │   ├── walletRoutes.js                /api/wallet/*
│   │   ├── verificationRoutes.js          /api/verify/*
│   │   └── systemRoutes.js                /api/health
│   │
│   ├── services/                    Frontend HTTP + export helpers
│   │   ├── axiosInstance.js               Canonical Axios client (injects JWT, base URL from env)
│   │   ├── apiService.js                  API call wrappers over axiosInstance
│   │   ├── authenticationService.js       FRONTEND auth helper (localStorage/window) — NOT a backend file
│   │   └── pdfExportService.js            Credential PDF rendering (jsPDF + qrcode)
│   │
│   ├── utils/                       Small frontend utilities
│   │   ├── credentialStatus.js            Effective status (effective expiry, badge computation)
│   │   ├── credentialLineage.js           Reissue/renewal lineage derivation
│   │   ├── formatDate.js / userDisplay.js / clipboard.js   Formatting + clipboard helpers
│   │   └── cryptoPolyfill.js              Crypto polyfill for the browser
│   │
│   └── styles/                      CSS: design tokens + per-page/component stylesheets (~25 files)
│       └── tokens.css                    Single source of truth for design tokens (colors, spacing, type)
│
└── docs/                         Documentation and reference material
    ├── CAP1 Documents to Submit/         Formally submitted CAP1 PDFs (do not edit; read the .md mirrors)
    ├── Claude Reference - MD Files/      Canonical working docs (the .md set Claude reads)
    │   ├── CAP1 Documents to Submit/         .md mirrors of the formal CAP1 manuals (Installation, Technical, User, Walkthrough)
    │   ├── CAP2 - *.md                       CAP2 records: deployment status, post-consultation changes, defense notes
    │   ├── CAP2 - Final Defense *.md         Defense presentation plan(s) + scripts (this planning work)
    │   ├── Final_Design.md                   Governance model + subordinate creation workflow
    │   ├── Redeploy_CC_Instructions.md / Predemo_Setup.md   Chaincode redeploy + demo setup runbooks
    │   ├── DIRECTORY - Windows.md / Directory - Ubuntu.md   Authoritative directory trees per environment
    │   └── (Chaincode query commands, controller/route responsibilities, copy commands, etc.)
    ├── July 7, Consultation/             Adviser (Sir Danny) July 7 consultation raw material
    ├── UAT Results/                      UAT raw feedback + updated Final Document chapters (5, 6, 7)
    ├── Security Checklist/               Security hardening checklist / notes
    └── design-reference/halo/            Design inspiration (Halo template: css/html/screenshots) — NOT app code
```

---

## Data & identity quick reference
- **Databases (CouchDB):** central admin on `:5985`; DLSU issuer `:9084`; ARCHERSNETWORK `:9085`; LASALLECOMPUTERSOCIETY `:9086`.
- **Fabric:** channel `chaincert-channel`, contract `chaincert`, JavaScript chaincode, Hyperledger Fabric 2.5.14; orgs Org1 / Org2 / DLSU (+ subordinates), 1 orderer, 3 peers, 4 CAs.
- **Roles:** student (holder), issuer (root or subordinate), admin, verifier.
- **Dual-write pattern:** blockchain first (source of truth), then CouchDB mirror (fast reads).

## Provisioned issuer accounts (only these can issue on the live system)
- `dlsu@email.com` → DLSU root authority (CouchDB :9084)
- `lasallecomputersociety@email.com` → LSCS subordinate (:9086)
- ARCHERSNETWORK subordinate (:9085)
```
