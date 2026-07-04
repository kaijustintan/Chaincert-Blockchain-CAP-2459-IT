# ChainCert

Blockchain-backed academic and professional credential platform built on Hyperledger Fabric 2.5.14. Issuers (universities, organizations) issue tamper-proof digital credentials to holders, who can share them with verifiers via a unique credential ID.

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
| React frontend | :3000 | Create React App, Windows |
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
- Node.js 18+
- Git

**Ubuntu/WSL2 side:**
- Docker Engine (via Docker Desktop for Windows)
- Node.js 18+
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
# Then deploy chaincode — see docs/Claude Reference - MD Files/Redeploy_CC_Instructions.md
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
| `npm start` | Windows | React dev server on :3000 |
| `npm run build` | Windows | Production bundle to `build/` |
| `node sdk-server-fixed.js` | Ubuntu | Start the Express API |
| `curl http://localhost:4000/api/health` | Ubuntu | Verify API is up |

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

| Email | Password | Role |
|---|---|---|
| admin1@email.com | pw123 | Admin |
| admin2@email.com | pw123 | Admin |
| dlsu@email.com | pw123 | Issuer (Root — DLSU) |
| lasallecomputersociety@email.com | pw123 | Issuer (Subordinate) |
| kylejustin.tan7@gmail.com | pw123 | Holder |

> Full demo walkthrough: `docs/Claude Reference - MD Files/CAP1 Documents to Submit/CAP-2459-IT-WALKTHROUGH.md`
>
> ⚠️ **These accounts/passwords are the local-dev demo set.** The `pw123` password (5 chars) is now
> **rejected by the password policy (M8, min 10 chars)** — it only works if `DISABLE_PASSWORD_POLICY` is
> set. On the **VM**, the seeded admin accounts are `admin@email.com` / `admin2@email.com` with password
> **`adminpw123`**; other accounts are seeded during UAT (see the VM manual, Phase 15).

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
docs/               Reference docs (.md mirrors preferred over PDFs)
```

> ⚠️ `src/controllers/` and `src/routes/` are Express backend files — not React. They live here for repo organization but deploy to Ubuntu.

---

## Windows → Ubuntu Sync

Backend files must be manually copied to Ubuntu before they take effect. Copy commands:
```
docs/Claude Reference - MD Files/Copy Commands.md
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
> `docs/Claude Reference - MD Files/CAP-2459-IT-VM-INSTALLATION-MANUAL.md`
> (initial install Phases 0–15 + Appendix C for day-2 updates: `git pull` → `deploy-sync.sh` →
> build/redeploy/`pm2 restart`).

---

## Docs

All reference docs are under `docs/Claude Reference - MD Files/` (the canonical `.md` working set). The formally submitted CAP1 PDFs live in `docs/CAP1 Documents to Submit/`.

| Doc | What it covers |
|---|---|
| `CAP-2459-IT-INSTALLATION-MANUAL.md` | Full setup, ports, identities |
| `CAP-2459-IT-TECHNICAL-MANUAL.md` | API routes, dual-write pattern, DB design |
| `CAP-2459-IT-WALKTHROUGH.md` | Demo accounts, scenario scripts |
| `Redeploy_CC_Instructions.md` | Chaincode redeploy procedure |
| `Copy_Commands.md` | Windows → Ubuntu cp commands |
| `Final_Design.md` | Governance model, subordinate creation workflow |
