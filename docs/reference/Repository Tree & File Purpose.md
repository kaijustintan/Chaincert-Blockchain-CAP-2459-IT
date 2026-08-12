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
├── ARCHITECTURE.md               System architecture overview (layers, data flow, trust boundaries)
├── LIMITATIONS.md                Accepted limitations + known gaps, with rationale per item
├── LICENSE                       MIT
├── package.json / package-lock   Frontend (React 19 / Vite 7) dependencies + scripts
├── .eslintrc.backend.json        Backend-only ESLint config (CommonJS; the React config does not apply)
├── deploy-sync.sh                VM deploy script: clones canonical repo → runtime API + chaincode dirs, patches paths
│
├── .github/                      Repo automation + policy
│   ├── workflows/ci.yml              Lint + build + test on push/PR
│   ├── workflows/codeql.yml          CodeQL static analysis
│   ├── dependabot.yml                Dependency update automation
│   └── SECURITY.md                   Vulnerability reporting policy
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
├── index.html                    Vite HTML entry point (REPO ROOT — moved out of public/ by the
│                                     Vite migration; public/index.html was deleted)
├── vite.config.js                Build config: build/ output dir, REACT_APP_ env prefix, JSX-in-.js
│                                     loader, CommonJS interop for nameSimilarity.js, Vitest block
│
├── public/                       Static assets copied verbatim into build/ (no longer the HTML root)
│   ├── manifest.json / robots.txt / favicon.ico
│   └── assets/                        Static images/assets served as-is
│
├── src/                          React frontend SPA (EXCEPT controllers/ + routes/, which are backend)
│   ├── App.js                        The only router: public / protected / admin routes + page transitions
│   ├── index.js                      React entry point
│   ├── setupTests.js / reportWebVitals.js   Test setup + metrics scaffolding
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
│   │   ├── profilePage.js / profilePreview.js   Profile + public share links
│   │   ├── credentialHistoryPage.js      Per-credential blockchain history / provenance
│   │   ├── issuerDirectory.js            Public searchable issuer directory
│   │   ├── landingHomePage.js / aboutUsPage.js / helpPage.js   Marketing / info pages
│   │   ├── settingsPage.js               Account settings
│   │   └── BadgeDetailsProfilePreviewPage.js   Public badge detail view
│   │
│   ├── components/                   Shared React components
│   │   ├── ui/                            Design-system primitives (cc-* Button, Card, Modal, StatusPill,
│   │   │                                    Field, EmptyState, Pagination, InfoHint, AppShell/Sidebar)
│   │   ├── analytics/                     Analytics layer: aggregation helpers + chart wrappers
│   │   │   ├── analytics.js                   Pure aggregation helpers (compute* functions, null-tolerant)
│   │   │   ├── DonutChart.jsx / TrendBars.jsx / Sparkline.jsx   recharts wrappers
│   │   │   ├── InterpretationBox.jsx          The "what this means" summary box
│   │   │   └── CredentialHistory.jsx          Shared blockchain-history timeline (holder/issuer/admin)
│   │   ├── navBar_User.js / navBar_Guest/     Navigation bars (authenticated vs guest)
│   │   ├── protectedRoutes.js / adminProtectedRoutes.js   Route guards (JWT / admin role)
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
│   ├── utils/                       Small frontend utilities — EXCEPT nameSimilarity.js (see below)
│   │   ├── credentialStatus.js            Effective status (effective expiry, badge computation)
│   │   ├── credentialLineage.js           Reissue/renewal lineage derivation
│   │   ├── userDisplay.js / clipboard.js  Display-name + clipboard helpers
│   │   ├── nameSimilarity.js              ⚠️ CommonJS — the ONE file here that ALSO deploys to the
│   │   │                                    backend (~/chaincert-api/utils/). Shared by the issuer
│   │   │                                    near-match name check on both sides. Never glob src/utils/
│   │   │                                    when syncing; copy this file by name.
│   │   ├── nameSimilarity.test.js         Vitest unit tests for the near-match rules (15 cases)
│   │   └── cryptoPolyfill.js              Crypto polyfill for the browser
│   │
│   └── styles/                      CSS: design tokens + per-page/component stylesheets (~25 files)
│       └── tokens.css                    Single source of truth for design tokens (colors, spacing, type)
│
└── docs/                         Documentation and reference material (reorganized 2026-07-24)
    ├── submission/                       Everything formally submitted or destined for submission
    │   ├── cap1/                             Formal CAP1 set: 5 submitted PDFs + Proposal + Defense Knowledge (.md)
    │   └── cap2/
    │       ├── manuals/                          Current .md manuals (Installation, VM Installation, Technical, User ×2, Walkthrough)
    │       ├── final-document/                   CHAPTER 5/6/7.md — gitignored (real tester names, still being finalized)
    │       ├── defense-presentation/              Current defense deck outline + script
    │       ├── references/                        Post-Consultation Changes + Post-Defense Fix List
    │       └── uat/                               Gitignored: UAT Final Report, Forms Contents, Raw Results, 5 feedback buckets
    ├── reference/                         Architecture / dev reference (this file lives here)
    │   ├── Final Design.md                   Governance model + subordinate creation workflow
    │   ├── Chaincert Design Details #1.md    Platform vs Consortium architecture rationale
    │   ├── CONTROLLER / ROUTE Files and its Responsibilities.md   Canonical backend placement rules
    │   ├── Chaincode - Query Commands.md     Full CLI catalog for chaincode functions
    │   ├── Issuer Required Docs per Category.md
    │   ├── Installation Dependencies.md
    │   ├── DIRECTORY - Windows.md / Directory - Ubuntu.md   Authoritative directory trees per environment
    │   └── Repository Tree & File Purpose.md   this file
    ├── deployment/                        Ops runbooks
    │   ├── CAP2 - Deployment Manual Addendum.md   CAP1→CAP2 deltas + Docker-29/Fabric-2.5.16 gotchas
    │   ├── Node Creation for DLSU.md         Channel config update dance, peer addition
    │   ├── Redeploy CC Instructions.md       Chaincode redeploy + configtx swap sequence
    │   └── Copy Commands.md                  Windows → Ubuntu cp command list
    └── design-reference/halo/            Design inspiration (Halo template: css/html/screenshots) — NOT app code

security-checklist/                 Generic AI-readable security-review KB — moved OUT of docs/ (repo root, not ChainCert-specific)
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
