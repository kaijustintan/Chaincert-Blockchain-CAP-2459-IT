# ChainCert — Windows-side Findings

Read-only investigation snapshot. No files modified.

---

## 1. Repository structure

**Layout (depth 3, excludes node_modules/build/.git/dist):**

```
./
├── .claude/               (commands, skills)
├── .sixth/skills/
├── backend/
│   └── node_creation/dlsu/
├── chaincode/
├── docs/
│   ├── CAP1 Documents to Submit/
│   ├── Claude Reference - MD Files/
│   │   └── CAP1 Documents to Submit/
│   └── Claude Reference - PDF Files/
├── public/assets/
└── src/
    ├── assets/  components/  controllers/  pages/
    ├── routes/  services/    styles/       utils/
```

**Monorepo shape:** ⚠️ Hybrid, not a clean split.
- A `backend/` folder exists with `sdk-server-fixed.js`, `couchDB_service.js`, wallet setup scripts, and its own `package.json`.
- BUT the Express **controllers and routes live under `src/controllers/` and `src/routes/`** alongside React code — they only deploy correctly to Ubuntu (`~/chaincert-api/controllers/`, `~/chaincert-api/routes/`). This is the documented "Windows vs Ubuntu layout" quirk in CLAUDE.md.
- The root `package.json` is the **frontend** (CRA), not a workspace root.
- `chaincode/` is a third sibling with its own `package.json`.

**Fabric / DLSU node provisioning files:** ✅ All present under `backend/node_creation/dlsu/`:
- `configtx-DEFAULT.yaml`, `configtx-WITHDLSU.yaml`
- `connection-delasalleuniversity.json`
- `compose/compose-ca-dlsu.yaml`, `compose-couch-dlsu.yaml`, `compose-couch-archersnetwork.yaml`, `compose-couch-lasallecomputersociety.yaml`, `compose-dlsu.yaml`
- `compose/docker/peercfg/` (peer config)
- `fabric-ca/registerEnrollFORDLSU.sh` ✅ exists (one duplicate was deleted per commit `af23d0c`)

---

## 2. Git state

- **Current branch:** `AFTER-Defense` ✅
- **Recent commits (last 5):**
  ```
  843156d docs: update CLAUDE.md for CCSCloud deployment target ... /review-patterns ... README.md
  10f684d docs: add settings.json to Claude config cp commands
  9bfc37c docs: update CLAUDE.md for CCSCloud deployment target and PDF folder move
  de9c527 basically mga cap documents to in .md and claude code configurations ...
  af23d0c deleted duplicate registerEnrollFORDLSU.sh
  ```

**Full `.gitignore`:**
```
# See https://help.github.com/articles/ignoring-files/ for more about ignoring files.

# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# production
/build

# misc
.DS_Store
.env.local
.env.development.local
.env.test.local
.env.production.local

npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Backend specific
backend/node_modules/
backend/wallet/
backend/connection-*.json
backend/package-lock.json
backend/*.tar.gz
backend/*.backup

# Chaincode specific
chaincode/node_modules/
chaincode/package-lock.json
chaincode/*.tar.gz
```

**Assumption checks:**

| Assumption | Result | Note |
|---|---|---|
| `package-lock.json` gitignored (frontend) | ❌ | Frontend root lock is **NOT** ignored — it's tracked. |
| `package-lock.json` gitignored (backend) | ✅ | `backend/package-lock.json` is ignored. |
| `package-lock.json` gitignored (chaincode) | ✅ | `chaincode/package-lock.json` is ignored. |
| `wallet/` ignored | ⚠️ | Only `backend/wallet/` is ignored. A top-level `wallet/` would NOT be. |
| `connection-*.json` ignored | ⚠️ | Only `backend/connection-*.json`. The actually-tracked file is `backend/node_creation/dlsu/connection-delasalleuniversity.json` (different path → **not** ignored, and currently committed). |
| `.env` ignored | ❌ | `.gitignore` only lists `.env.local` / `.env.*.local`. Plain `.env` is **NOT** ignored. Root `.env` is currently tracked. |

**`git ls-files` matches for sensitive patterns:**
```
.env
backend/node_creation/dlsu/connection-delasalleuniversity.json
backend/node_creation/dlsu/setupWallet_DLSU.js
backend/node_creation/dlsu/setup_Wallet_DLSU_Subordinate_ARCHERSNETWORK.js
backend/node_creation/dlsu/setup_Wallet_DLSU_Subordinate_LASALLECOMPUTERSOCIETY.js
backend/setupWallet_ORG1.js
backend/setupWallet_ORG2.js
package-lock.json                       ← frontend lockfile IS tracked
src/controllers/walletController.js
src/routes/walletRoutes.js
```
(No file under `wallet/` is tracked — only setup scripts and routes containing "wallet" in the name. Good.)

---

## 3. Environment hygiene files

| File | Present? | Notes |
|---|---|---|
| `.nvmrc` | ❌ | Not present anywhere. No Node version pinned. |
| `.tool-versions` / `.node-version` | ❌ | None. |
| `.env.example` / `.env.sample` | ❌ | Neither exists. No documented env-var contract. |
| `.env` | ⚠️ | Exists at root, **43 bytes**. Only two keys: `CHOKIDAR_USEPOLLING=` and `FAST_REFRESH=` (both empty values — CRA dev-server settings, no secrets). |
| `Dockerfile` | ❌ | None in project source. Only matches are inside `node_modules/`. |
| `.dockerignore` | ❌ | None. |
| Setup/sync script (`setup.sh`, `install.sh`, `sync-*.sh`, `copy-*.sh`) | ❌ | None. The only `.sh` in the repo is `backend/node_creation/dlsu/fabric-ca/registerEnrollFORDLSU.sh` (Fabric CA enrollment, not project setup). Sync is manual via `cp` commands documented in `docs/Claude Reference - MD Files/Copy_Commands.md`. |
| README explains required env vars | ❌ | README lists prereqs (Node 18+, Docker, Fabric) but does **not** document any required env variables. CLAUDE.md mentions a `dev_secret_key` JWT fallback but no env-contract doc exists. |

---

## 4. Backend `package.json`

Path: `backend/package.json`

```json
{
  "name": "chaincert-api",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1",
    "start": "node sdk-server-fixed.js"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "description": "",
  "dependencies": {
    "bcryptjs": "^3.0.3",
    "cors": "^2.8.6",
    "dockerode": "^4.0.9",
    "dotenv": "^17.3.1",
    "express": "^5.1.0",
    "fabric-ca-client": "^2.2.20",
    "fabric-network": "^2.2.20",
    "jsonwebtoken": "^9.0.2",
    "multer": "^2.0.2",
    "node-cron": "^4.2.1",
    "nodemailer": "^8.0.2"
  }
}
```

| Check | Result | Note |
|---|---|---|
| Versions pinned | ❌ | All deps use `^` caret ranges. |
| `engines` field | ❌ | Absent — no Node version constraint. |
| Scripts | ⚠️ | Only `start` (real) and a placeholder `test`. No `dev`, `lint`, `format`, or migration scripts. |
| Missing tooling | ⚠️ | No `nano` (used in source via `require('nano')`) listed — pulled transitively or expected as part of Fabric SDK? Worth verifying on Ubuntu. |

---

## 5. Frontend `package.json`

Path: `./package.json` (repo root)

```json
{
  "name": "frontendlatest",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "@fortawesome/fontawesome-free": "^7.0.1",
    "@testing-library/dom": "^10.4.1",
    "@testing-library/jest-dom": "^6.8.0",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^13.5.0",
    "axios": "^1.13.0",
    "jspdf": "^4.2.0",
    "multer": "^2.0.2",
    "qrcode": "^1.5.4",
    "react": "^19.1.1",
    "react-dom": "^19.1.1",
    "react-router-dom": "^7.9.1",
    "react-scripts": "5.0.1",
    "web-vitals": "^2.1.4"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  ...
}
```

| Check | Result | Note |
|---|---|---|
| React version | ✅ | React **19.1.1** + react-dom 19.1.1. |
| Build tool | ✅ | Create React App (`react-scripts 5.0.1`). |
| `engines` field | ❌ | Absent. |
| Hardcoded backend URL | ⚠️ | Not in `package.json` itself, but **yes** in source — `src/services/axiosInstance.js` pins `http://localhost:4000/api`. Several other files repeat `http://localhost:4000` / `localhost:3000`. See §9. |
| Odd dep | ⚠️ | `multer` is in the **frontend** deps — multer is a Node/Express middleware, has no place in a CRA bundle. Likely accidentally added. |

---

## 6. Tool versions (this Windows machine)

| Tool | Version | Note |
|---|---|---|
| node | **v24.11.0** | ⚠️ Significantly newer than README's "Node.js 18+" prereq. No `.nvmrc` to enforce a lower version. Possible engine mismatch with Ubuntu deploy target. |
| npm | 11.6.1 | |
| git | 2.51.2.windows.1 | |
| docker (CLI) | 28.5.1 | Installed |
| docker daemon (`docker ps`) | ❌ NOT running | Error: `open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified.` Docker Desktop is not started (or the WSL engine is offline). |

---

## 7. Backend source files

**`backend/` top-level `.js` files** (all `Mar 26 14:11` — frozen working set):
```
backend/couchDB_service.js
backend/enrollChaincertAdmin.js
backend/issuerRequirements.js
backend/sdk-server-fixed.js
backend/setupWallet_ORG1.js
backend/setupWallet_ORG2.js
backend/node_creation/dlsu/setupWallet_DLSU.js
backend/node_creation/dlsu/setup_Wallet_DLSU_Subordinate_ARCHERSNETWORK.js
backend/node_creation/dlsu/setup_Wallet_DLSU_Subordinate_LASALLECOMPUTERSOCIETY.js
```

**`src/controllers/`** (Express controllers — deploy to Ubuntu, all `Mar 26 14:11`):
```
accountController.js          20363 B
adminAuditController.js       22077
adminDashboardController.js   15775
adminIssuerController.js      23468
authController.js              6977
issuerCredentialController.js 57666   ← largest
issuerOnboardingController.js 12930
rootAuthorityController.js    17044
verifierController.js         25094
walletController.js            6588
```

**`src/routes/`** (all `Mar 26 14:11`):
```
adminRoutes.js         10212
authRoutes.js           2921
credentialRoutes.js     5964
issuerRoutes.js         3193
systemRoutes.js          220
verificationRoutes.js   2276
walletRoutes.js         1487
```

**`src/services/`** (mixed frontend + 1 backend file):
```
apiService.js              78298   (frontend Axios wrappers)
authenticationService.js    2739   ⚠️ BACKEND file living under src/ — deploys to ~/chaincert-api/
axiosInstance.js             419   (frontend)
pdfExportService.js        20024   (frontend)
```

All backend source files share the same `Mar 26 14:11` mtime → nothing has been touched here since the last bulk sync from Ubuntu (or vice versa). Active edits are happening on the Ubuntu copy.

---

## 8. Documentation

**README at repo root:** ✅ Present (`README.md`, 5114 B). Sections:
1. **Architecture** — 3-layer diagram, port/component table.
2. **Prerequisites** — Windows (Node 18+, Git), Ubuntu (Docker, Node 18+, Fabric 2.5.14).
3. **Quick Start** — Frontend, Backend, Fabric Network, Wallet setup.
4. **Key Commands** table.
5. **Roles** table.
6. **Demo Accounts** (5 accounts, all `pw123`).
7. **Project Structure** + a warning that `src/controllers/` and `src/routes/` are Express, not React.
8. **Windows → Ubuntu Sync** (points at `Copy Commands.md`).
9. **Deployment Target (CAP2)** — CCSCloud.
10. **Docs** index table.

**Onboarding / install manuals (checked in):** ✅
- **PDFs:** `docs/CAP1 Documents to Submit/CAP-2459-IT-INSTALLATION-MANUAL.pdf`, `-TECHNICAL-MANUAL.pdf`, `-USER-MANUAL.pdf`, `-WALKTHROUGH.pdf`, `Defense Knowledge - March 25.pdf` + everything under `docs/Claude Reference - PDF Files/`.
- **Markdown mirrors:** `docs/Claude Reference - MD Files/` (and a `CAP1 Documents to Submit/` mirror inside). CLAUDE.md tells future Claude sessions to prefer the `.md` versions to save tokens.

---

## 9. Suspicious patterns

### Hardcoded paths
- `/mnt/c/` or `C:\Users\` in source: **only 1 file** — `.claude/settings.local.json` (a permission allowlist for `wsl cp` commands targeting `/mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET/...`). ✅ Not in shipping code. ⚠️ But it does hard-code the user's exact desktop path — a teammate forking this would hit permission prompts.

### Hardcoded `localhost:` URLs (in shipping JS)
Pervasive. Sample (full list above in tool output):
- `backend/couchDB_service.js:43` — `http://admin:adminpw@localhost:5985` (CouchDB creds in source, documented limitation in CLAUDE.md)
- `backend/sdk-server-fixed.js:34` — CORS origin `http://localhost:3000`
- `backend/setupWallet_ORG1.js:12` — `https://localhost:7054` (Org1 CA)
- `backend/setupWallet_ORG2.js:13` — `https://localhost:8054` (Org2 CA)
- `backend/enrollChaincertAdmin.js:9` — `https://localhost:7054`
- `src/services/axiosInstance.js:4` — `http://localhost:4000/api`
- `src/services/apiService.js:2389` — `http://localhost:4000` fallback
- `src/services/pdfExportService.js:34,342` — verify URLs hardcoded to `http://localhost:3000/...`
- `src/controllers/accountController.js:141,328,392,465` — share URLs + nano CouchDB
- `src/controllers/issuerCredentialController.js:114,949,1085` — nano CouchDB
- `src/controllers/verifierController.js:28` — `COUCHDB_URL` constant
- `src/routes/credentialRoutes.js:56` — nano CouchDB
- `src/pages/forgotPassword.js:24,64` — `http://localhost:4000/api/auth/...`
- `src/pages/issuerDashboardPage.js:197,713` — user-visible error strings mention `http://localhost:4000`

⚠️ **Consequence for CAP2 / CCSCloud deploy:** every one of these breaks the moment the deploy target is not `localhost`. There's no central config / env-var indirection. The frontend in particular cannot point at a remote backend without source edits.

### TODO/FIXME/HACK comments
Grep on `**/*.{js,json}` returned only false positives in `package-lock.json` integrity hashes (`XXX` substrings inside base64). ✅ No real TODO/FIXME/HACK markers in source.

### Other things worth flagging
- **CouchDB credentials (`admin:adminpw`) inline in 8+ JS files.** Documented as accepted limitation in CLAUDE.md §"Accepted limitations", but worth re-flagging — these would leak into any public repo push.
- **Frontend `multer` dependency** is dead weight (server-only library in a CRA bundle).
- **No `.dockerignore` / no `Dockerfile`** — CAP2 deployment plan references a single Ubuntu VM but there's no container packaging for the Node API or React build. Deployment is manual (`cp` + `npm install` + `node sdk-server-fixed.js`).
- **No CI config** (no `.github/workflows`, no Jenkinsfile, etc.) — verified by directory listing.
- **No husky / pre-commit hooks.**
- **Root `.env` is tracked AND `.gitignore` doesn't exclude `.env`.** Currently harmless (only CRA polling toggles) but a footgun — the moment anyone adds `JWT_SECRET=...` to it, it'll be committed.
- **`backend/node_creation/dlsu/connection-delasalleuniversity.json` is committed.** Fabric connection profiles contain TLS certs and CA endpoints — the `.gitignore` rule `backend/connection-*.json` doesn't catch it because the path has an extra `node_creation/dlsu/` segment.
- **Node v24 locally vs README's "Node 18+"** — README understates; nothing enforces.
- **All backend source mtimes are identical (`Mar 26 14:11`)** → Windows copy is a frozen snapshot from a single sync. If real edits happen on Ubuntu, the Windows copy will silently drift.

---

## Summary table

| # | Section | Status | One-line note |
|---|---|---|---|
| 1 | Repository structure | ⚠️ | Hybrid layout — Express controllers/routes live under `src/`, not a clean monorepo. Fabric compose + configtx + DLSU enroll script all present. |
| 2 | Git state | ❌ | `.env` and frontend `package-lock.json` are **not** gitignored; subordinate-DLSU `connection-*.json` slips past the ignore rule and is committed. |
| 3 | Env hygiene files | ❌ | No `.nvmrc`, no `.env.example`, no Dockerfile, no setup script. README doesn't document required env vars. |
| 4 | Backend `package.json` | ⚠️ | All deps caret-ranged, no `engines`, only a `start` script. |
| 5 | Frontend `package.json` | ⚠️ | React 19 + CRA, no `engines`, dead `multer` dep, hardcoded backend URL lives in source not config. |
| 6 | Tool versions | ⚠️ | Node v24.11 (README says 18+), Docker installed but daemon not running. |
| 7 | Backend source files | ⚠️ | All controllers/routes share `Mar 26 14:11` mtime — frozen snapshot, not actively edited on Windows. |
| 8 | Documentation | ✅ | README + full CAP1 manuals (PDF + .md mirrors) present and indexed. |
| 9 | Suspicious patterns | ❌ | `localhost:` hardcoded in 20+ source locations across frontend & backend; CouchDB creds inline; no env indirection → CAP2 cloud deploy will need source edits. |

---

**Report path:** `C:\Users\kaita\OneDrive\Desktop\CAP-2459-IT-AFTER-RESET\WINDOWS_FINDINGS.md`
