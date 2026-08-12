# ChainCert

Blockchain-backed academic and professional credential platform built on Hyperledger Fabric. Issuers (universities, organizations) issue tamper-evident digital credentials to holders, who can share them with verifiers via a unique credential ID.

> **Academic capstone project (CAP-2459-IT).** Published for reference and study — not production
> software. Read **[LIMITATIONS.md](LIMITATIONS.md)** before deploying it anywhere that handles real
> credentials.

| | |
|---|---|
| **[ARCHITECTURE.md](ARCHITECTURE.md)** | How the three layers fit together, the authorization model, governance, and the dual-write pattern |
| **[LIMITATIONS.md](LIMITATIONS.md)** | Known constraints and accepted tradeoffs, with the reasoning for each |
| **[.github/SECURITY.md](.github/SECURITY.md)** | How to report a security issue |

---

## Architecture

Three cooperating layers:

```
React Frontend (Windows :3000)
        ↓ Axios
Express API (Ubuntu/WSL2 :4000)
        ↓ Fabric Gateway SDK
Hyperledger Fabric Network (Docker containers)
        + CouchDB (off-chain mirror + state databases)
```

| Component | Address | Notes |
|---|---|---|
| React frontend | :3000 | React 19 + Vite |
| Express API | :4000 | Node.js, Ubuntu/WSL2 |
| Orderer | :7050 | Single Raft orderer |
| Org1 peer / CA | :7051 / :7054 | |
| Org2 peer / CA | :9051 / :8054 | |
| DLSU peer / CA | :12051 / :12054 | |
| Central CouchDB | :5985 | Non-standard port (not 5984) |
| DLSU issuer CouchDB | :9084 | |
| ARCHERSNETWORK subordinate CouchDB | :9085 | |
| LASALLECOMPUTERSOCIETY subordinate CouchDB | :9086 | |

---

## Prerequisites

**Windows side:**
- Node.js 20.19+ (or 22.12+) — required by Vite 7; Node 18 will fail to build
- Git

**Ubuntu/WSL2 side:**
- Docker Engine (via Docker Desktop for Windows)
- Node.js 20.19+ (or 22.12+) for the frontend build; the Express API itself runs on 18+
- Hyperledger Fabric 2.5.14 binaries + Docker images
- `fabric-samples` at `~/fabric-samples/fabric-samples/`
- Chaincode at `~/chaincert-chaincode/`
- API at `~/chaincert-api/`

---

## Quick Start

### 1. Frontend (Windows)
```bash
npm install
npm start
# Runs on http://localhost:3000
```

### 2. Backend API (Ubuntu/WSL2)
```bash
cd ~/chaincert-api
node sdk-server-fixed.js
# Runs on http://localhost:4000
# Health check: curl http://localhost:4000/api/health
```

### 3. Fabric Network (Ubuntu/WSL2)
```bash
cd ~/fabric-samples/fabric-samples/test-network
./network.sh up createChannel -c chaincert-channel -ca
# Then deploy chaincode — see docs/deployment/Redeploy CC Instructions.md
```

### 4. Wallet setup (Ubuntu/WSL2 — first time only)
```bash
cd ~/chaincert-api
node enrollAdmin.js
node enrollOrg2Admin.js
node enrollChaincertAdmin.js
node setup_Wallet_DLSU.js
node setup_Wallet_DLSU_Subordinate_ARCHERSNETWORK.js
node setup_Wallet_DLSU_Subordinate_LASALLECOMPUTERSOCIETY.js
```

---

## Key Commands

| Command | Where | What it does |
|---|---|---|
| `npm start` | Windows | Vite dev server on :3000 (`npm run dev` is an alias) |
| `npm run build` | Windows | Production bundle to `build/` |
| `npm run preview` | Windows | Serve the built `build/` locally to sanity-check a production bundle |
| `npm test` | Windows | Vitest, single run (`npm run test:watch` for watch mode) |
| `npm run lint:backend` | Windows | ESLint over the CommonJS backend + chaincode files |
| `node sdk-server-fixed.js` | Ubuntu | Start the Express API |
| `curl http://localhost:4000/api/health` | Ubuntu | Verify API is up |

> The build system is **Vite**, not Create React App. `build/` (not `dist/`) is kept as the output
> directory and `REACT_APP_` is kept as the env prefix, so Nginx config, `deploy-sync.sh`, and every
> existing `.env` continue to work unchanged. See `vite.config.js` for why each choice was made.

---

## Roles

| Role | Description |
|---|---|
| Admin | Manages issuer approvals, user accounts, audit logs |
| Issuer (Root Authority) | University/org with its own Fabric peer — issues credentials |
| Issuer (Subordinate) | Department/org under a root authority — no own peer |
| Holder / Student | Receives and shares credentials |
| Verifier | Verifies credentials by credential ID |

---

## Demo Accounts

The demo environment seeds one account per role. Passwords are **not** published here.

| Account | Role |
|---|---|
| `admin1@email.com`, `admin2@email.com` | Admin |
| `dlsu@email.com` | Issuer (Root Authority — DLSU) |
| `lasallecomputersociety@email.com` | Issuer (Subordinate) |
| A seeded holder account | Holder / Student |

> Credentials are shared out-of-band with the team. Full demo walkthrough:
> `docs/submission/cap2/manuals/CAP-2459-IT-WALKTHROUGH.md`
>
> ⚠️ Seeded demo accounts are for the local development environment. Set your own strong passwords
> when standing up an environment — the password policy requires at least 10 characters, and the
> `DISABLE_PASSWORD_POLICY` / `DISABLE_RATE_LIMIT` / `DISABLE_SIGNUP_OTP` toggles must be unset for
> any deployment.

---

## Project Structure

```
chaincode/          Smart contract (ChainCertContract) — deploys to ~/chaincert-chaincode/
backend/            API server, services, wallet scripts — deploys to ~/chaincert-api/
src/controllers/    Express controllers — deploys to ~/chaincert-api/controllers/
src/routes/         Express routes — deploys to ~/chaincert-api/routes/
src/services/       Frontend API helpers + authenticationService (backend)
src/pages/          Role-scoped dashboard pages
src/components/     Shared UI components
src/utils/          Frontend helpers — EXCEPT nameSimilarity.js, which is CommonJS and
                    also deploys to ~/chaincert-api/utils/ (shared with the backend)
docs/               Reference docs (.md mirrors preferred over PDFs)
index.html          Vite entry point (repo root, not public/)
vite.config.js      Build config — output dir, env prefix, JSX-in-.js, CJS interop
ARCHITECTURE.md     System architecture overview
LIMITATIONS.md      Accepted limitations and known gaps, with rationale
```

> ⚠️ `src/controllers/` and `src/routes/` are Express backend files — not React. They live here for repo organization but deploy to Ubuntu.

---

## Windows → Ubuntu Sync

Backend files must be manually copied to Ubuntu before they take effect. Copy commands:
```
docs/deployment/Copy Commands.md
```

---

## Deployment (CAP2) — DEPLOYED on the CCSCloud VM ✅

ChainCert is deployed and live on the DLSU **CCSCloud VM** at **http://ccscloud.dlsu.edu.ph:20173**
(fresh canonical `AFTER-Defense` deploy, 2026-07-04).

> ⚠️ The VM setup is **NOT** "the same as local WSL2." The Quick Start above is for **local
> development**. The VM is native Ubuntu (no WSL), runs **Fabric 2.5.16** (not 2.5.14 — a Docker-29
> compatibility patch; cite 2.5.14 in defense materials), uses **`deploy-sync.sh`** instead of manual
> `cp` commands, and serves the built frontend through **Nginx + PM2**.
>
> **To deploy or update on the VM, follow the dedicated manual — not this README:**
> `docs/submission/cap2/manuals/CAP-2459-IT-VM-INSTALLATION-MANUAL.md`
> (initial install Phases 0–15 + Appendix C for day-2 updates: `git pull` → `deploy-sync.sh` →
> build/redeploy/`pm2 restart`).

---

## Docs

Reference docs live under `docs/submission/cap2/manuals/` (current manuals), `docs/reference/` (architecture/dev), and `docs/deployment/` (ops runbooks). The formally submitted CAP1 PDFs live in `docs/submission/cap1/`.

All paths below are relative to the repo root.

| Doc | Location | What it covers |
|---|---|---|
| `CAP-2459-IT-INSTALLATION-MANUAL.md` | `docs/submission/cap2/manuals/` | Full LOCAL setup, ports, identities |
| `CAP-2459-IT-TECHNICAL-MANUAL.md` | `docs/submission/cap2/manuals/` | API routes, dual-write pattern, DB design |
| `CAP-2459-IT-USER-MANUAL.md` | `docs/submission/cap2/manuals/` | Role-by-role UX flows, status terminology, troubleshooting |
| `CAP-2459-IT-WALKTHROUGH.md` | `docs/submission/cap2/manuals/` | Demo accounts, scenario scripts |
| `CAP-2459-IT-VM-INSTALLATION-MANUAL.md` | `docs/submission/cap2/manuals/` | CCSCloud VM deploy + day-2 update runbook |
| `Redeploy CC Instructions.md` | `docs/deployment/` | Chaincode redeploy procedure |
| `Copy Commands.md` | `docs/deployment/` | Windows → Ubuntu cp commands |
| `CAP2 - Ops Cheat Sheet (VM vs Local).md` | `docs/deployment/` | Day-to-day ops, VM and local side by side |
| `Final Design.md` | `docs/reference/` | Governance model, subordinate creation workflow |
| `ARCHITECTURE.md` | repo root | System architecture overview |
| `LIMITATIONS.md` | repo root | Accepted limitations and known gaps |

---

## Security

This is a **capstone prototype**, not production software. Known gaps and the reasoning behind each
accepted limitation are documented in `LIMITATIONS.md`. To report a vulnerability, see
`.github/SECURITY.md`.
