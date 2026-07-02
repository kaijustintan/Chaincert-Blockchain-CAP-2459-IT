# ChainCert — Session Handoff: CAP2 VM Deployment

> **For a fresh Claude session on a DIFFERENT account (no memory carryover).** Read this top-to-bottom before acting. Paste it as your first message.

## Session date
2026-06-30

## TL;DR — where we are
We finalized the **canonical `AFTER-Defense` repo** so a fresh clone deploys cleanly on the DLSU **CCSCloud VM**. All deployment **source-code + tooling changes are committed** (`e4bbc94`, tree clean). We are **now starting the actual VM deployment (Part C)** — the live VM still runs the **outdated CAP1 throwaway fork** which we are about to tear down and replace. Next action = run the teardown + clone + `deploy-sync.sh` on the VM, then go phase-by-phase.

## What was accomplished this session
- **Analyzed groupmates' June 30 deploy docs** — they fully deployed the CAP1 fork to the VM using **Fabric 2.5.16** (NOT Docker downgrade); proven 21-step runbook exists.
- **Audited `AFTER-Defense`** for hardcoded `localhost` URLs/paths + VM structure.
- **Part A — env-var'd 6 source files** (read-from-env, localhost fallback so local dev is unchanged): `src/services/axiosInstance.js` (→`REACT_APP_API_URL`), `src/pages/forgotPassword.js` ×2 raw fetches, `src/services/pdfExportService.js` `buildVerifyUrl` (→`REACT_APP_FRONTEND_URL`), removed dead `getApiBaseUrl` from `apiService.js`, `backend/sdk-server-fixed.js` CORS (→`CORS_ORIGIN`) + deleted dead `FABRIC_SAMPLES_PATH`/`CORE_YAML_PATH`, `src/controllers/accountController.js` ×3 share links (→`FRONTEND_URL`).
- **Part B — tooling:** created **`deploy-sync.sh`** (repo root), `backend/.env.example`, `.env.production.example`; added missing **`nano`** dep to `backend/package.json`; `.gitignore` now ignores `.env.production` + `backend/.env`.
- **Verified** `CI=false npm run build` compiles.
- **Updated docs/memory:** `CLAUDE.md`, `CAP2 - Deployment Status & Pending.md`, `Copy Commands.md`, memory `project-predeploy-checklist`.
- **Committed** all of it as **`e4bbc94`** ("DEPLOYMENT - env-drive URLs/paths + add deploy-sync.sh (Plan 2 split)"); cp'd the 3 backend files to local WSL.

## Files changed this session (all in commit e4bbc94)
| File | What | Synced |
|---|---|---|
| src/services/axiosInstance.js, forgotPassword.js, pdfExportService.js, apiService.js | env-var URLs / dead-code removal | frontend-only |
| backend/sdk-server-fixed.js | CORS env + dead-code removal | yes (WSL) |
| src/controllers/accountController.js | share-link env | yes (WSL) |
| backend/package.json | +nano | yes (WSL) |
| deploy-sync.sh, backend/.env.example, .env.production.example, .gitignore | NEW tooling/config | committed |
| CLAUDE.md, CAP2 Deployment doc, Copy Commands.md | doc updates | committed |

## Decisions made (DO NOT re-litigate)
- **VM layout = "Plan 2 clean split":** git clone `~/chaincert-src` (source) → runtime `~/chaincert-api` + `~/chaincert-chaincode`, copied by `deploy-sync.sh`. **Wallet + `.env` live in the runtime dir and persist** (re-sync never wipes them). No symlink needed.
- **DLSU connection profile MUST be cp'd, NOT regenerated** — it's a **hand-made multi-org profile** (`name: DLSU-MultiOrg`) that statically lists Org1 so DLSU submits auto-collect Org1's co-endorsement (Node Creation for DLSU §18). A generated single-org profile FAILS endorsement. `deploy-sync.sh` cp's it then seds its `/home/kaitanz_/` paths → `$HOME`.
- **`FABRIC_SAMPLES_PATH` (sdk-server:269) was DEAD CODE** — removed (not a live break).
- **`express-rate-limit` is NOT a dependency** (M5 is a custom in-memory limiter); only `nano` was genuinely missing (added).
- **`authenticationService.js` is FRONTEND** — do NOT copy it to the backend runtime.
- **CouchDB stays `localhost`** (same VM as backend); `admin:adminpw` hardcoding is Tier-3/M11, not a deploy blocker.
- **Docker 29 + Fabric 2.5.16** (keep Docker 29; do NOT downgrade).

## What is NOT done yet / pending
### Uncommitted / unsynced
- **None.** Working tree clean; everything in `e4bbc94`.
### Deferred / blocked
- The entire **VM deployment (Part C)** — not started on the box yet.
- dcops/techserve email-on-final-approval question — user said disregard.

## Current phase status
Part A (source env-var): **DONE** · Part B (tooling/docs): **DONE** · Committed: **DONE** · Part C (VM run): **NOT STARTED** (commands issued, awaiting execution).

## Next session — START HERE (drive the VM deploy, phase-by-phase)
The user is SSH'd into the VM (`ssh -p 20172 -o ServerAliveInterval=60 chaincert@ccscloud.dlsu.edu.ph`, pw `<VM_SSH_PASSWORD — kept out of git; ask the team>`) **via phone hotspot** (office WiFi firewalls port 20172 — confirmed). Reuse the proven Fabric 2.5.16 runbook in `docs/Claude Reference - MD Files/CAP2 - Deployment Status & Pending.md` + the groupmates' Complete Deployment Guide.

**Step 0 (off-VM):** `git push origin AFTER-Defense`; have a GitHub PAT (private repo `kaijustintan/CAP-2459-IT`).
**Step 1 — teardown (⚠️ wipes CAP1 demo):** `pm2 delete all`; `cd ~/fabric-samples/fabric-samples/test-network && ./network.sh down`; `docker stop/rm -f $(docker ps -aq)`; `docker volume rm $(docker volume ls -q)`; `docker network prune -f`; `rm -rf ~/chaincert-deploy`.
**Step 2 — clone:** `git clone -b AFTER-Defense https://kaijustintan:<PAT>@github.com/kaijustintan/CAP-2459-IT.git ~/chaincert-src`.
**Step 3 — sync:** `bash ~/chaincert-src/deploy-sync.sh` (copies code, applies docker.sock fix, npm installs; PRINTS "skip connection profile" — correct, DLSU org not created yet; re-run after Phase 7). Verify `ls ~/chaincert-api` + `ls ~/chaincert-chaincode`.
**Then phases:** 4) admin CouchDB :5985 + 7 DBs · 5) `network.sh up createChannel -ca -s couchdb -c chaincert-channel` (copy `configtx-DEFAULT.yaml` first) + `deployCC ... -ccv 1.0` (org2 docker.sock fix already applied) · 6) enroll chaincert-admin/Org1/Org2 · 7) **add DLSU org** (configtx-WITHDLSU swap → fetch/decode/modify/encode/sign-Org1/submit-Org2 channel update → start DLSU peer → join → install/approve) · 8) register subordinates + **re-run `deploy-sync.sh`** (drops+patches connection profile) + run the 6 `node setup_Wallet_*`/`enroll*` scripts from `~/chaincert-api` · 9) issuer CouchDBs 9084/85/86 + `couchdb_connections` rows · 10) create `~/chaincert-api/.env` (`JWT_SECRET`=`openssl rand -hex 48`, `CORS_ORIGIN`+`FRONTEND_URL`=`http://ccscloud.dlsu.edu.ph:20173`, toggles OFF) · 11) `pm2 start ~/chaincert-api/sdk-server-fixed.js` + `curl :4000/api/health` · 12) in `~/chaincert-src`: `.env.production` (`REACT_APP_API_URL=/api`, `REACT_APP_FRONTEND_URL=http://ccscloud.dlsu.edu.ph:20173`) → `npm install` → `npm run build` · 13) Nginx root `~/chaincert-src/build`, proxy `/api`→:4000, `client_max_body_size 25M` · 14) demo accounts + seed verifications + UAT. **Go ONE block at a time; have user paste output before the next.**

## Key config / environment facts
- **Public URL:** `http://ccscloud.dlsu.edu.ph:20173` (HTTP). **SSH** port **20172** (VM user `chaincert`). **Proxmox** `https://ccscloud.dlsu.edu.ph`, login `CAP-2459-IT`. VM 11620, node Mayari. (Secrets are in the groupmates' throwaway docs — NOT in the repo; user said keep them out.)
- **Office network firewalls the VM** (silent timeout) → hotspot or DLSU VPN. See memory [[ccscloud-vm-access]] (won't exist on the new account — facts are above).
- **Fabric double-nested:** `~/fabric-samples/fabric-samples/test-network`. Keep it.
- **Demo:** admins `admin1@/admin2@email.com`, holder `kylejustin.tan7@gmail.com` (pw123-ish); 3 working issuers: `dlsu@email.com` (root), `lasallecomputersociety@email.com`, INNOCENCIO.
- **Sync rules:** Claude **never runs git** (reminder only). Backend files run on Ubuntu — local single-file syncs via cp (`/mnt/c/...` absolute, quoted). On the VM use `deploy-sync.sh`, not manual cp.
- **Env vars:** frontend build `REACT_APP_API_URL` (VM `/api`), `REACT_APP_FRONTEND_URL`; backend `.env` `CORS_ORIGIN`, `FRONTEND_URL`, `JWT_SECRET` (required), `DISABLE_RATE_LIMIT`/`DISABLE_PASSWORD_POLICY` (OFF for demo), `SMTP_*`.

## Reminder checklist before closing
- [x] Backend files synced to Ubuntu (local WSL)
- [x] Commit pushed locally (`e4bbc94`) — **user must `git push origin AFTER-Defense`** before VM clone
- [x] Plan file + CLAUDE.md + CAP2 doc + memory updated
- [ ] Ubuntu API restart — N/A (VM redeploy pending)
- [ ] Remind: update `DIRECTORY - Windows.md` (both locations) — 3 new files added this session
