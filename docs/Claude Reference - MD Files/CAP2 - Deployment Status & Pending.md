# CAP2 — Deployment Status & Pending

> Single source of truth for the CCSCloud deployment thread. Captured 2026-06-29 (deployment session).
> Companion to `CAP-2459-IT-VM-INSTALLATION-MANUAL.md` (the executable runbook) — this file is the *current state + what's left*.

> ## ✅ UPDATE 2026-07-04 — DEPLOYED (canonical, fresh)
> The full from-scratch deployment of the **canonical `AFTER-Defense` repo** onto the CCSCloud VM is
> **complete and verified** — site live at `http://ccscloud.dlsu.edu.ph:20173`, chaincode committed with
> all 3 orgs endorsing, backend↔chaincode round-trip confirmed. The everything-below (Xeidonn fork,
> re-clone plan, C1–C5 unknowns, env-refactor "pending") is now **historical** — the pending items are done.
> **The step-by-step runbook is now its own manual:** `CAP-2459-IT-VM-INSTALLATION-MANUAL.md`
> (from-scratch + day-2 updates). The live-deploy gotchas are in this doc's companion Addendum, Part E.

---

## Status snapshot

- **LIVE on DLSU CCSCloud VM:** `http://ccscloud.dlsu.edu.ph:20173/` — plain **HTTP**, port **20173** (CCSCloud-mapped). Frontend served **from the VM** (not Vercel). **Remote access confirmed** — login + credential issuance work from a remote browser.
- **Chaincode redeploy works** (the Docker build issue is resolved — see below).
- ⚠️ **The deployed code is the OUTDATED CAP1 / pre-CAP2 fork** (`Xeidonn/ChainCert-Deploy`, throwaway). **Plan: finalize the canonical CAP2 repo → re-clone fresh on the VM.** Do not patch the CAP1 clone.

---

## RESOLVED — Docker 29 vs Fabric chaincode build

- **Symptom:** `./network.sh deployCC` fails — `could not build chaincode: docker build failed: … write unix @->/run/docker.sock: write: broken pipe`.
- **Root cause (verified):** NOT "Docker removed the legacy builder" (the classic builder still exists in Docker 28/29). The peer used the abandoned **`fsouza/go-dockerclient`** library, which is incompatible with **Docker Engine v29's** daemon/API. Refs: hyperledger/fabric **#5350**, **#5441**; fix in **PR #5353** (main) / **#5355** (2.5 backport).
- **Fix (recommended): upgrade Fabric 2.5.14 → 2.5.16, KEEP Docker 29.** v2.5.16 changelog: *"Fixed working with Docker Engine v29+."* It's a same-minor patch (NOT the disruptive 3.x). Fabric **3.x would not help** (bug hits 3.1.3 too).
- **Fallback:** downgrade Docker 29 → 28 (proven on Kai's dev box: Fabric 2.5.14 + Docker 28.5.1 builds fine). More host-level fuss + less future-proof.
- **Going forward:** pin **Fabric 2.5.16** on the VM so a reprovision keeps the fix.
- **Host-level hacks to revert** (survive a network teardown): `daemon.json {"features":{"buildkit":false}}`; **`DOCKER_API_VERSION` (riskiest)**; `DOCKER_BUILDKIT=0`; docker.sock symlink; non-stock `CORE_VM_ENDPOINT`.

---

## Source-code changes for deployment — ✅ APPLIED (June 30 2026, AFTER-Defense)

**DONE (this section is now history):** all URLs/paths below are env-driven; dead `getApiBaseUrl` + dead `FABRIC_SAMPLES_PATH`/`CORE_YAML_PATH` removed; `backend/package.json` gained the missing **`nano`** dep; added **`deploy-sync.sh`** + `backend/.env.example` + `.env.production.example` (+ `.gitignore` now ignores `.env.production` / `backend/.env`). VM layout = **Plan 2 clean split** (source `~/chaincert-src` → runtime `~/chaincert-api` + `~/chaincert-chaincode` via `deploy-sync.sh`; wallet/`.env` persist in the runtime dir, untouched by re-sync; no symlink needed). Env vars introduced: `REACT_APP_API_URL`, `REACT_APP_FRONTEND_URL` (frontend build) + `CORS_ORIGIN`, `FRONTEND_URL` (backend `.env`). `forgotPassword.js` kept raw `fetch` (only the base URL swapped). The DLSU connection profile's `/home/` paths are auto-patched by `deploy-sync.sh`; the Docker-29 org2 `docker.sock` fix is folded into it too.

**Core rule (still the principle):** *frontend* code runs in the browser, so `localhost` = the user's PC (WRONG). *Backend* code runs on the VM, so `localhost` for CouchDB (`:5985`) / Fabric peers = the VM itself (FINE — leave alone).

### 1. localhost URLs + CORS
| File | What |
|---|---|
| `src/services/axiosInstance.js` | API base URL — **the blocker** |
| `src/pages/forgotPassword.js` (×2) | raw `fetch`, **bypasses axiosInstance** — fix separately |
| `src/services/pdfExportService.js` | QR link (points to the **frontend** URL) |
| `src/services/apiService.js` | fallback URL |
| `src/pages/issuerDashboardPage.js` | error-message **text** only (cosmetic) |
| `backend/sdk-server-fixed.js` (CORS) | hardcoded `origin: 'http://localhost:3000'` → allow real frontend origin |

- **No `REACT_APP_*` mechanism exists yet** → introduce `REACT_APP_API_URL` + `REACT_APP_FRONTEND_URL`; CORS reads an allowed-origin env.
- **Code changes are value-independent** (they read from config). The actual values fill a `.env` on the VM. **CRA bakes env at BUILD time → set before `npm run build`.**
- **Mixed-content trap:** HTTPS frontend + HTTP backend = browser blocks everything. (Currently all-HTTP, so fine.)

### 2. Hardcoded file paths (break on a VM with a different Linux username)
| Location | Issue | Fix |
|---|---|---|
| `backend/sdk-server-fixed.js:269` (+`:270` `CORE_YAML_PATH`) | `FABRIC_SAMPLES_PATH = '/home/kaitanz_/…'` | `process.env.FABRIC_SAMPLES_PATH \|\| path.resolve(__dirname,'..','fabric-samples','fabric-samples')` (matches the already-correct pattern at `:367`) |
| `backend/node_creation/dlsu/connection-delasalleuniversity.json` | 7 frozen `/home/kaitanz_/` TLS-cert paths (lines 28–96) | **cp the committed file** (it's the canonical workflow — Copy Commands §10, Installation Manual). It is a **hand-made multi-org profile** (`name: DLSU-MultiOrg`; statically lists Org1+Org2 peers so DLSU submits auto-collect Org1 co-endorsement — see Node Creation for DLSU §18). A `network.sh`-generated single-org profile would FAIL DLSU's endorsement policy → **do NOT regenerate.** After cp, patch the 7 `/home/kaitanz_/` paths for the VM user (sed, or templatize with `${FABRIC_SAMPLES_PATH}`). |

- Everything else is `__dirname`/`$HOME`-relative (portable).
- **BIGGEST TRAP — folder shape:** all relative paths assume the **double-nested** `~/fabric-samples/fabric-samples/` layout. The VM must replicate it, **or** normalize to single-level `~/fabric-samples/` and drop one `fabric-samples` segment in code. (Layout-dependence > username-dependence.)
- `couchdb_connections` (orgName→couchDBUrl) is **data, not code** — re-seeded by the subordinate-provisioning workflow, not by a clone. Verify all URLs are `localhost`.

---

## .env / security (VM-side)

- **UNSET before deploy:** `DISABLE_RATE_LIMIT` (this is the **brute-force protection**), `DISABLE_PASSWORD_POLICY`. `SMTP_OVERRIDE_TO`: unset for real deploy; keep for a demo with fake issuer/admin emails. (Startup banner shouts if the first two are still ON.)
- `JWT_SECRET` **required** (fail-closed): `openssl rand -hex 48`. The backend `.env` is **hand-created on the VM** (not in git).
- **Email:** the VM/office network likely blocks outbound SMTP → may need an HTTP email API at deploy (see memory `email-smtp-network-block`).

---

## Values needed FROM the VM holders (groupmates)

| # | Item | Status |
|---|---|---|
| C1 | Backend public address/port | ❓ get via **DevTools → Network tab** on the live site (Request URL of any API call) |
| C2 | Frontend host | ✅ `ccscloud.dlsu.edu.ph:20173` (the VM, not Vercel) |
| C3 | HTTP vs HTTPS | ✅ HTTP |
| C4 | fabric-samples layout (single vs double-nested) | ❓ **gates the path fix** — `ls ~/fabric-samples` |
| C5 | `couchdb_connections` data all-localhost | ❓ `curl -s http://admin:adminpw@localhost:5985/couchdb_connections/_all_docs?include_docs=true` |

**Note:** the deployed CAP1 build already reaches the backend remotely (credentials issue), so the localhost problem is *already solved in their deployment by some means* — but the CAP2 re-clone reintroduces the hardcodes, so the refactor is still required. The DevTools Request URL tells us exactly what to configure.

---

## Deployment process (VM)

1. **Re-clone the finalized CAP2 repo** (CAP1 fork = throwaway).
2. **Reorg repo → VM layout** (`chaincert-api/` + `chaincert-chaincode/`). Recommended: a checked-in **`setup.sh`** that copies + renames (e.g. `setupWallet_ORG1.js`→`enrollAdmin.js`) and moves `issuerRequirements.js`→`config/`; mirrors `Copy Commands.md`. **All required files ARE committed** (verified: `mailerService.js`, `securityHelpers.js`, `issuerRequirements.js`, 10 controllers, 7 routes, services, wallet scripts). The groupmate's earlier missing-file errors = the stale fork, not gitignore.
3. **Regenerate wallets on the VM** (run the enroll / `setupWallet` / `setup_Wallet_DLSU*` scripts) else `Identity <name> not found`.
4. **Open VM firewall ports.**
5. Apply the source changes above (localhost/CORS/path) and `npm run build` with the right env.

---

## Accepted limitations / Tier-3 (document only — NOT blockers)

HTTPS/TLS + HSTS (M10) · CouchDB creds `admin:adminpw` → env (M11) · JWT in localStorage · no token-blacklist on disable · single orderer · `Date.now()` credential IDs. All conscious capstone-scope decisions — see `Defense_Knowledge_-_March_25.md`.

---

## Critical path (what unblocks finalization)

1. Get **C1 + C4** from groupmates (C1 via DevTools, C4 via `ls ~/fabric-samples`).
2. Do the **localhost + CORS env-var refactor now** (value-independent), then the **path fix** once C4 lands.
3. Finalize repo → groupmates **re-clone** + create `.env` (security toggles + `JWT_SECRET`) + **regenerate wallets** + **cp the committed multi-org connection profile then patch its `/home/` path** (NOT the generated single-org one — see §2) → `npm run build` → working app for remote users.
