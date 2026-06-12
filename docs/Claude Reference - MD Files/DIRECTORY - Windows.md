# Directory Structure — Windows Working Copy
`CAP-2459-IT-AFTER-RESET/` (root)
> `node_modules/` and `.git/` excluded. Generated 2026-05-30.

```
CAP-2459-IT-AFTER-RESET/
├── .claude/
│   ├── commands/
│   │   ├── commit-documentation.md
│   │   ├── context-for-next-session.md
│   │   ├── new-controller.md
│   │   ├── new-feature.md
│   │   ├── review-patterns.md
│   │   ├── sync-backend-only.md
│   │   ├── sync-backend-with-chaincode.md
│   │   └── tropang-explain.md
│   ├── skills/
│   │   ├── chaincert-doc-format/
│   │   │   └── SKILL.md
│   │   └── claude-config-sync/
│   │       └── SKILL.md
│   ├── settings.json
│   └── settings.local.json
│
├── backend/
│   ├── node_creation/
│   │   └── dlsu/
│   │       ├── compose/
│   │       │   ├── docker/
│   │       │   │   └── peercfg/
│   │       │   │       └── core.yaml
│   │       │   ├── compose-ca-dlsu.yaml
│   │       │   ├── compose-couch-dlsu.yaml
│   │       │   ├── compose-couch-innocencio.yaml
│   │       │   ├── compose-couch-lasallecomputersociety.yaml
│   │       │   └── compose-dlsu.yaml
│   │       ├── fabric-ca/
│   │       │   └── registerEnrollFORDLSU.sh
│   │       ├── configtx-DEFAULT.yaml
│   │       ├── configtx-WITHDLSU.yaml
│   │       ├── connection-delasalleuniversity.json
│   │       ├── setup_Wallet_DLSU_Subordinate_INNOCENCIO.js
│   │       ├── setup_Wallet_DLSU_Subordinate_LASALLECOMPUTERSOCIETY.js
│   │       └── setupWallet_DLSU.js
│   ├── couchDB_service.js
│   ├── enrollChaincertAdmin.js
│   ├── issuerRequirements.js
│   ├── mailerService.js
│   ├── package.json
│   ├── package-lock.json
│   ├── sdk-server-fixed.js
│   ├── securityHelpers.js
│   ├── setupWallet_ORG1.js
│   └── setupWallet_ORG2.js
│
├── chaincode/
│   ├── index.js
│   └── package.json
│
├── docs/
│   ├── CAP1 Documents to Submit/             ← formal CAP1 submission PDFs
│   │   ├── CAP-2459-IT-INSTALLATION-MANUAL.pdf
│   │   ├── CAP-2459-IT-TECHNICAL-MANUAL.pdf
│   │   ├── CAP-2459-IT-USER-MANUAL.pdf
│   │   ├── CAP-2459-IT-WALKTHROUGH.pdf
│   │   └── Defense Knowledge - March 25.pdf
│   │
│   ├── Claude Reference - MD Files/          ← .md mirrors (prefer these over PDFs)
│   │   ├── CAP1 Documents to Submit/
│   │   │   ├── CAP-2459-IT-INSTALLATION-MANUAL.md
│   │   │   ├── CAP-2459-IT-TECHNICAL-MANUAL.md
│   │   │   ├── CAP-2459-IT-USER-MANUAL.md
│   │   │   ├── CAP-2459-IT-WALKTHROUGH.md
│   │   │   └── Defense Knowledge - March 25.md
│   │   ├── CAP2 - Deployment Gameplan.md
│   │   ├── CAP-2459-IT-PROPOSAL.md
│   │   ├── CAP-2459-IT-WALKTHROUGH-OUTDATED.md
│   │   ├── Chaincert Design Details #1.md
│   │   ├── Chaincert Design Details #2.md
│   │   ├── Chaincode - Query Commands.md
│   │   ├── CONTROLLER Files and its Responsibilities.md
│   │   ├── Copy Commands.md
│   │   ├── DIRECTORY - Windows.md            ← this file
│   │   ├── Final Design.md
│   │   ├── Installation Dependencies.md
│   │   ├── Issuer Required Docs per Category.md
│   │   ├── Node Creation for DLSU.md
│   │   ├── Predemo Setup.md
│   │   ├── Redeploy CC Instructions.md
│   │   └── ROUTE Files and its Responsibilities.md
│   │
│   ├── Claude Reference - PDF Files/         ← original PDFs (working/internal docs)
│   │   ├── DIRECTORY - Ubuntu.txt
│   │   ├── CAP2 - Deployment Gameplan.pdf
│   │   ├── CAP-2459-IT-PROPOSAL.pdf
│   │   ├── CAP-2459-IT-WALKTHROUGH-OUTDATED.pdf
│   │   ├── Chaincert Design Details #1.pdf
│   │   ├── Chaincert Design Details #2.pdf
│   │   ├── Chaincode - Query Commands.pdf
│   │   ├── CONTROLLER Files and its Responsibilities.pdf
│   │   ├── Copy Commands.pdf
│   │   ├── DIRECTORY - Windows.pdf
│   │   ├── Final Design.pdf
│   │   ├── Installation Dependencies.pdf
│   │   ├── Issuer Required Docs per Category.pdf
│   │   ├── Node Creation for DLSU.pdf
│   │   ├── Predemo Setup.pdf
│   │   ├── Redeploy CC Instructions.pdf
│   │   └── ROUTE Files and its Responsibilities.pdf
│   │
│   └── Security Checklist/                   ← AI-readable security review framework (KB)
│       ├── README.md
│       ├── Foundations.md
│       ├── Domains.md
│       ├── Review-Checklists.md
│       └── Reference.md
│
├── public/
│   ├── assets/
│   │   ├── landing-bg.png
│   │   └── logo512.png
│   ├── favicon.ico
│   ├── index.html
│   ├── manifest.json
│   └── robots.txt
│
├── src/
│   ├── assets/
│   │   └── landinghomepage.webm
│   │
│   ├── components/                           ← shared UI components
│   │   ├── navBar_Guest/
│   │   ├── adminProtectedRoutes.js
│   │   ├── appToast.js
│   │   ├── button.js
│   │   ├── credentialCard.js
│   │   ├── footer.js
│   │   ├── navBar_User.js
│   │   └── protectedRoutes.js
│   │
│   ├── controllers/                          ← Express controllers (deploy → ~/chaincert-api/controllers/)
│   │   ├── accountController.js
│   │   ├── adminAuditController.js
│   │   ├── adminDashboardController.js
│   │   ├── adminIssuerController.js
│   │   ├── authController.js
│   │   ├── issuerCredentialController.js
│   │   ├── issuerOnboardingController.js
│   │   ├── rootAuthorityController.js
│   │   ├── verifierController.js
│   │   └── walletController.js
│   │
│   ├── pages/                                ← role-scoped React page components
│   │   ├── aboutUsPage.js
│   │   ├── adminDashboard.js
│   │   ├── badgeDetailsPage.js
│   │   ├── BadgeDetailsProfilePreviewPage.js
│   │   ├── createAccount.js
│   │   ├── credentialDetails.js
│   │   ├── credentialHistoryPage.js
│   │   ├── forgotPassword.js
│   │   ├── helpPage.js
│   │   ├── issuerDashboardPage.js
│   │   ├── landingHomePage.js
│   │   ├── loginPage.js
│   │   ├── notifPage.js
│   │   ├── profilePage.js
│   │   ├── profilePreview.js
│   │   ├── requestAccessPage.js
│   │   ├── settingsPage.js
│   │   ├── shareCredentialPage.js
│   │   ├── studentDashboard.js
│   │   ├── TestPage.js
│   │   ├── transcript.js
│   │   └── verifierDashboard.js
│   │
│   ├── routes/                               ← Express routes (deploy → ~/chaincert-api/routes/)
│   │   ├── adminRoutes.js
│   │   ├── authRoutes.js
│   │   ├── credentialRoutes.js
│   │   ├── issuerRoutes.js
│   │   ├── systemRoutes.js
│   │   ├── verificationRoutes.js
│   │   └── walletRoutes.js
│   │
│   ├── services/
│   │   ├── apiService.js                     ← frontend HTTP wrapper
│   │   ├── authenticationService.js          ← backend file (deploys to ~/chaincert-api/); do NOT import from React
│   │   ├── axiosInstance.js                  ← canonical Axios client for frontend
│   │   └── pdfExportService.js               ← jsPDF credential export
│   │
│   ├── styles/                               ← per-page and shared CSS
│   │   ├── aboutUsPage.css
│   │   ├── adminDashboard.css
│   │   ├── App.css
│   │   ├── appToast.css
│   │   ├── badgeDetailsPage.css
│   │   ├── createAccount.css
│   │   ├── credentialCard.css
│   │   ├── dashboard.css
│   │   ├── footer.css
│   │   ├── helpPage.css
│   │   ├── index.css
│   │   ├── issuerDashboardPage.css
│   │   ├── landingHomePage.css
│   │   ├── loginPage.css
│   │   ├── navBar.css
│   │   ├── profilePage.css
│   │   ├── profilePreview.css
│   │   ├── settingsPage.css
│   │   ├── shareCredentialPage.css
│   │   ├── studentDashboard.css
│   │   ├── transcript.css
│   │   └── verifierDashboard.css
│   │
│   ├── utils/
│   │   ├── formatDate.js
│   │   └── userDisplay.js
│   │
│   ├── App.js
│   ├── App.test.js
│   ├── index.js
│   ├── logo.svg
│   ├── reportWebVitals.js
│   └── setupTests.js
│
├── .env
├── .gitignore
├── CLAUDE.md
├── package.json
├── package-lock.json
├── README.md
└── WINDOWS_FINDINGS.md
```

---

## Layer quick-reference

| Folder | Purpose | Deploys to |
|---|---|---|
| `src/pages/` | React page components | React bundle (Windows :3000) |
| `src/components/` | Shared UI components | React bundle |
| `src/services/` | Frontend HTTP + PDF (except `authenticationService.js`) | React bundle |
| `src/styles/` | Per-page CSS | React bundle |
| `src/controllers/` | Express controllers | `~/chaincert-api/controllers/` |
| `src/routes/` | Express route definitions | `~/chaincert-api/routes/` |
| `backend/` | API server, CouchDB service, wallet scripts | `~/chaincert-api/` |
| `chaincode/` | Hyperledger Fabric smart contract | `~/chaincert-chaincode/` |
| `docs/` | Project docs (PDFs + MD mirrors) | Reference only |
| `.claude/` | Claude Code config (commands, skills, settings) | Synced to WSL home |

> For the Ubuntu-side equivalent paths, see `docs/Claude Reference - PDF Files/DIRECTORY - Ubuntu.txt`.
