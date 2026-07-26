# Directory Structure — Windows Working Copy
`CAP-2459-IT-AFTER-RESET/` (root)
> `node_modules/`, `.git/`, and `build/` excluded. Regenerated 2026-07-24 (post `docs/` reorg).

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
│   │       │   ├── compose-couch-archersnetwork.yaml
│   │       │   ├── compose-couch-lasallecomputersociety.yaml
│   │       │   └── compose-dlsu.yaml
│   │       ├── fabric-ca/
│   │       │   └── registerEnrollFORDLSU.sh
│   │       ├── configtx-DEFAULT.yaml
│   │       ├── configtx-WITHDLSU.yaml
│   │       ├── connection-delasalleuniversity.json
│   │       ├── setup_Wallet_DLSU_Subordinate_ARCHERSNETWORK.js
│   │       ├── setup_Wallet_DLSU_Subordinate_LASALLECOMPUTERSOCIETY.js
│   │       └── setupWallet_DLSU.js
│   ├── .env.example
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
├── docs/                                       ← reorganized 2026-07-24 (was one flat "Claude Reference - MD Files" pile)
│   ├── submission/
│   │   ├── cap1/                               ← formal CAP1 submission set (PDFs = as-submitted; .md = working mirrors)
│   │   │   ├── CAP-2459-IT-INSTALLATION-MANUAL.pdf
│   │   │   ├── CAP-2459-IT-TECHNICAL-MANUAL.pdf
│   │   │   ├── CAP-2459-IT-USER-MANUAL.pdf
│   │   │   ├── CAP-2459-IT-WALKTHROUGH.pdf
│   │   │   ├── CAP-2459-IT-PROPOSAL.md          ← untouched since CAP1 (2026-05-22), never revised in CAP2
│   │   │   ├── Defense Knowledge - March 25.md
│   │   │   └── Defense Knowledge - March 25.pdf
│   │   │
│   │   └── cap2/                               ← everything CAP2-specific
│   │       ├── manuals/                        ← current .md manuals (canonical working reference set)
│   │       │   ├── CAP-2459-IT-INSTALLATION-MANUAL.md  ← + Appendix B troubleshooting (17 entries, added post-defense)
│   │       │   ├── CAP-2459-IT-TECHNICAL-MANUAL.md
│   │       │   ├── CAP-2459-IT-USER-MANUAL.md          ← FROZEN historical record (banner points to the 4 role manuals)
│   │       │   ├── CAP-2459-IT-USER-MANUAL-FULL.md     ← FROZEN "UAT Edition" (Ch6 reports results gathered with it)
│   │       │   ├── CAP-2459-IT-USER-MANUAL-HOLDER.md   ← NEW (post-defense D7) per-role manual + troubleshooting
│   │       │   ├── CAP-2459-IT-USER-MANUAL-ISSUER.md   ← NEW (post-defense D7) largest — create/issue/batch/revoke/renewals/reports/subordinates
│   │       │   ├── CAP-2459-IT-USER-MANUAL-ADMIN.md    ← NEW (post-defense D7) approval gate, dossier, audit logs, analytics, integrity check
│   │       │   ├── CAP-2459-IT-USER-MANUAL-VERIFIER.md ← NEW (post-defense D7) no-account flow: OTP, single + bulk PDF verify
│   │       │   ├── CAP-2459-IT-VM-INSTALLATION-MANUAL.md ← THE VM deploy manual (Phases 0–15 + Appendix A/B/C)
│   │       │   └── CAP-2459-IT-WALKTHROUGH.md
│   │       │
│   │       ├── final-document/                 ← gitignored: draft paper chapters, real tester names, still being finalized
│   │       │   ├── CHAPTER 5.md
│   │       │   ├── CHAPTER 6.md
│   │       │   └── CHAPTER 7.md
│   │       │
│   │       ├── defense-presentation/
│   │       │   └── CAP2 - Final Defense Deck (Restructured + Script).md
│   │       │
│   │       ├── references/                     ← post-hoc change logs / defense-prep notes (COMMITTED — keep sanitized)
│   │       │   ├── CAP2 - Final Game Plan.md   ← NEW: sanitized S-1…S-8 + U-1…U-9 execution record (no names/grade/transcript)
│   │       │   ├── CAP2 - Post-Consultation Changes & Defense Notes.md
│   │       │   └── CAP2 - Post-Defense Fix List & Findings.md
│   │       │
│   │       ├── defense-revisions/              ← gitignored: defense form transcription, raw transcript, groupmate summaries, working gameplan
│   │       │
│   │       └── uat/                            ← gitignored: raw tester data + PII
│   │           ├── CAP2 - UAT Final Report.md         ← finalized deliverable (Suggestions/Errors/Links/Appendix)
│   │           ├── UAT - Forms Contents.md            ← full transcription of the actual 84-item unified form
│   │           ├── UAT - Raw Results.md
│   │           ├── UAT - Features Feedback.md
│   │           ├── UAT - System Errors Feedback.md
│   │           ├── UAT - UIUX Feedback.md
│   │           ├── UAT - UAT Forms Feedback.md
│   │           └── UAT - User Manual Feedback.md
│   │
│   ├── reference/                              ← architecture / dev reference (this file lives here)
│   │   ├── CONTROLLER Files and its Responsibilities.md
│   │   ├── ROUTE Files and its Responsibilities.md
│   │   ├── Chaincode - Query Commands.md
│   │   ├── Chaincert Design Details #1.md
│   │   ├── Final Design.md
│   │   ├── Installation Dependencies.md
│   │   ├── Issuer Required Docs per Category.md
│   │   ├── Repository Tree & File Purpose.md
│   │   ├── DIRECTORY - Windows.md              ← this file
│   │   └── Directory - Ubuntu.md               ← ⚠️ stale, needs regen (banner added, tree not rebuilt)
│   │
│   ├── deployment/                             ← ops runbooks
│   │   ├── CAP2 - Deployment Manual Addendum (CAP1 Deltas + Groupmate Journey).md
│   │   ├── Node Creation for DLSU.md
│   │   ├── Redeploy CC Instructions.md
│   │   └── Copy Commands.md
│   │
│   └── design-reference/                       ← design inspiration only (NOT app code)
│       └── halo/  (DESIGN.md, css/, html/, screenshots/, metadata.json)
│
├── security-checklist/                         ← moved OUT of docs/ (generic KB, not ChainCert-specific)
│   ├── README.md
│   ├── Foundations.md
│   ├── Domains.md
│   ├── Review-Checklists.md
│   └── Reference.md
│
├── public/
│   ├── assets/
│   │   ├── background.png
│   │   ├── background2.png
│   │   ├── background3.png
│   │   ├── landing-bg.png
│   │   └── logo512.png
│   ├── favicon.ico
│   ├── index.html
│   ├── manifest.json
│   └── robots.txt
│
├── src/
│   ├── assets/
│   │   ├── about-bg.jpg
│   │   ├── auth-login.jpg
│   │   ├── auth-register.jpg
│   │   ├── hero-rings.jpg
│   │   └── landinghomepage.webm
│   │
│   ├── components/                           ← shared UI components
│   │   ├── analytics/                        ← Phase 4 shared analytics layer
│   │   │   ├── analytics.js                  (pure aggregation helpers)
│   │   │   ├── CredentialHistory.jsx         (unified provenance timeline + proof trail)
│   │   │   ├── DonutChart.jsx
│   │   │   ├── InterpretationBox.jsx
│   │   │   ├── Sparkline.jsx
│   │   │   └── TrendBars.jsx
│   │   ├── ui/                               ← design-system primitives (single source of truth — see tokens.css)
│   │   │   ├── AppShell.jsx
│   │   │   ├── Badge.jsx                     ← StatusPill is the exported one; raw Badge kept internally (StatusPill wraps it)
│   │   │   ├── Button.jsx
│   │   │   ├── Card.jsx                      ← CardHeader removed post-defense (0 consumers)
│   │   │   ├── EmptyState.jsx                ← use for FULL-PANE empties (micro-empties stay plain text)
│   │   │   ├── Feedback.jsx                  ← Spinner / SpinnerBlock / Skeleton*
│   │   │   ├── Field.jsx                     ← Field + Input only (Select/Textarea removed post-defense, 0 consumers)
│   │   │   ├── InfoHint.jsx / InfoHint.css    ← hover/focus "?" explainer (portal-rendered)
│   │   │   ├── Modal.jsx
│   │   │   ├── NotesCard.jsx
│   │   │   ├── Pagination.jsx                ← usePagination hook + <Pagination> control (10/page, centered)
│   │   │   ├── StatusLegend.jsx
│   │   │   ├── useEscapeClose.js             ← NEW: Escape closes the TOPMOST open hand-rolled modal ([isOpen, close] pairs, stacking order)
│   │   │   ├── index.js                      ← barrel export
│   │   │   └── ui.css                        ← incl. .has-sticky-actions (pins a table's trailing Actions column)
│   │   │   (DataTable.jsx DELETED post-defense — 0 consumers)
│   │   ├── navBar_Guest/                     ← empty placeholder dir (no files yet)
│   │   ├── adminProtectedRoutes.js
│   │   ├── appToast.js
│   │   ├── credentialCard.js
│   │   ├── footer.js
│   │   ├── navBar_User.js
│   │   ├── passwordCriteria.jsx              ← password-rule checklist + live confirm-match
│   │   ├── passwordInput.jsx                 ← password field with show/hide reveal toggle
│   │   ├── protectedRoutes.js
│   │   └── welcomeModal.jsx                  ← one-time first-visit role/navigation primer
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
│   │   ├── BadgeDetailsProfilePreviewPage.js
│   │   ├── createAccount.js
│   │   ├── credentialHistoryPage.js
│   │   ├── forgotPassword.js
│   │   ├── helpPage.js
│   │   ├── issuerDashboardPage.js
│   │   ├── issuerDirectory.js
│   │   ├── landingHomePage.js
│   │   ├── loginPage.js
│   │   ├── notifPage.js
│   │   ├── profilePage.js
│   │   ├── profilePreview.js
│   │   ├── requestAccessPage.js
│   │   ├── settingsPage.js
│   │   ├── shareCredentialPage.js
│   │   ├── studentDashboard.js
│   │   ├── transcript.js                     ← unrouted (no route wired in App.js)
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
│   │   ├── authenticationService.js          ← FRONTEND auth helper (window/localStorage); does NOT deploy to backend
│   │   ├── axiosInstance.js                  ← canonical Axios client for frontend
│   │   └── pdfExportService.js               ← jsPDF + qrcode credential export
│   │
│   ├── styles/                               ← per-page and shared CSS
│   │   ├── tokens.css                        ← design-token source of truth (colors, type scale, spacing, radius, shadow)
│   │   ├── analytics.css                     ← Phase 4 analytics grid/card/flag-row/timeline primitives
│   │   ├── App.css
│   │   ├── aboutUsPage.css
│   │   ├── adminDashboard.css
│   │   ├── appToast.css
│   │   ├── badgeDetailsPage.css
│   │   ├── createAccount.css
│   │   ├── dashboard.css
│   │   ├── footer.css
│   │   ├── helpPage.css
│   │   ├── index.css
│   │   ├── issuerDashboardPage.css
│   │   ├── issuerDirectory.css
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
│   │   ├── clipboard.js                      ← HTTP-safe copy-to-clipboard helper
│   │   ├── credentialLineage.js              ← renewal/reissue lineage (getCredentialLineage + getRenewalCount/getRenewalDates, shared by both PDF export paths)
│   │   ├── credentialStatus.js               ← effective-status + maxIssueExpiryDate helpers
│   │   ├── cryptoPolyfill.js                 ← crypto.randomUUID polyfill for plain-HTTP
│   │   ├── formatDate.js
│   │   ├── nameSimilarity.js                 ← NEW: duplicate/near-match credential-name rules. CommonJS — the ONLY src/utils file that ALSO deploys to ~/chaincert-api/utils/
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
├── .env.production.example                   ← REACT_APP_* build-time env template
├── .gitignore
├── CLAUDE.md
├── deploy-sync.sh                             ← VM day-2-update sync script (git pull → deploy-sync → build/restart)
├── package.json
├── package-lock.json
└── README.md
```

---

## Layer quick-reference

| Folder | Purpose | Deploys to |
|---|---|---|
| `src/pages/` | React page components | React bundle (Windows :3000) |
| `src/components/` | Shared UI components + design system | React bundle |
| `src/services/` | Frontend HTTP + PDF (except `authenticationService.js`, also frontend-only) | React bundle |
| `src/styles/` | Design tokens + per-page CSS | React bundle |
| `src/controllers/` | Express controllers | `~/chaincert-api/controllers/` |
| `src/routes/` | Express route definitions | `~/chaincert-api/routes/` |
| `backend/` | API server, CouchDB service, wallet scripts | `~/chaincert-api/` |
| `chaincode/` | Hyperledger Fabric smart contract | `~/chaincert-chaincode/` |
| `docs/submission/` | Formal manuals, chapters, defense material, UAT | Reference only |
| `docs/reference/` | Architecture / dev reference docs | Reference only |
| `docs/deployment/` | Ops runbooks (cp commands, redeploy, node creation) | Reference only |
| `security-checklist/` | Generic security-review KB (not ChainCert-specific) | Reference only |
| `.claude/` | Claude Code config (commands, skills, settings) | Synced to WSL home |

> For the Ubuntu-side equivalent paths, see `docs/reference/Directory - Ubuntu.md` (currently stale — flagged for regen).
