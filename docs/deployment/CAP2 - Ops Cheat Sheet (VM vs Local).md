# ChainCert Ops Cheat Sheet — VM vs Local

> **Scope:** day-to-day operations for the two environments ChainCert runs in. The VM (CCSCloud) is the
> deployed/demo environment; Local (Windows + WSL2 Ubuntu) is the development environment that survives
> after the VM expires. Full runbooks live in `CAP-2459-IT-VM-INSTALLATION-MANUAL.md` (VM) and
> `CAP-2459-IT-INSTALLATION-MANUAL.md` (local). This file is the quick-reference, not the from-scratch guide.

> 🔐 **Credentials are deliberately NOT in this file.** This doc is git-tracked. Keep SSH passwords, the
> GitHub PAT, and the Gmail app password in your own private note (or a gitignored file). Placeholders
> below read `<SEE PRIVATE NOTE>`.

---

## 0. System Details

| | **VM (CCSCloud)** | **Local (Windows + WSL2)** |
|---|---|---|
| Site URL | `http://ccscloud.dlsu.edu.ph:20173/` | `http://localhost:3000` |
| API | `:4000`, behind Nginx at `/api` | `:4000`, direct (no proxy) |
| Frontend served by | Nginx (static `build/`) | Vite dev server (`npm start`) |
| Process manager | PM2 (`chaincert-api`) | none — plain `node`, foreground |
| Git clone lives at | `~/chaincert-src` | `/mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET` (the Windows repo, read in place) |
| API runtime | `~/chaincert-api` | `~/chaincert-api` (same) |
| Chaincode runtime | `~/chaincert-chaincode` | `~/chaincert-chaincode` (same) |
| Fabric | 2.5.16 | 2.5.14 |
| Docker Engine | 29.x | 28.5.1 |
| DLSU subordinate | ARCHERSNETWORK | **INNOCENCIO** (the rename never reached local; deliberate, see §6) |
| SSH | `ssh -p 20172 -o ServerAliveInterval=60 chaincert@ccscloud.dlsu.edu.ph` | n/a |
| CouchDB access | SSH tunnel required (§4) | direct, no tunnel |
| Node | **must be 20.19+** — VM was provisioned with 18, upgrade before building | 20.19+ (24.x in use) |
| Build tool | Vite 7 (`build/` output, `REACT_APP_` prefix preserved) | same |

**Shared by both** (identical in each environment): channel `chaincert-channel`, contract `chaincert`,
orderer `:7050`, Org1 peer/CA `:7051`/`:7054`, Org2 `:9051`/`:8054`, DLSU `:12051`/`:12054`,
admin CouchDB `:5985`, DLSU CouchDB `:9084`.

> **Why the Fabric versions differ:** Docker Engine 29 breaks Fabric 2.5.14 chaincode builds. The VM runs
> Docker 29, so it was bumped to 2.5.16. Local runs Docker 28, which pairs fine with 2.5.14. If local Docker
> ever auto-updates to 29, chaincode deploys will start failing and local must be bumped to 2.5.16 too.

---

## 1. How to Start the System

**Technical:** the VM's services are already running under PM2 + Nginx and survive reboots; local has no
process supervisor, so both halves are started by hand in two terminals.

**Tropang Ex:** sa VM, laging bukas na — tingin ka lang kung buhay pa. Sa local, ikaw mag-o-on ng dalawa:
backend sa WSL, frontend sa Windows.

### VM — nothing to start, just verify

```bash
pm2 status
```

```bash
docker ps --format "table {{.Names}}\t{{.Status}}"
```

```bash
curl -s http://localhost:4000/api/health
```

If the API is down: `pm2 restart chaincert-api`. If containers are down, see the VM manual Appendix A.

### Local — start both halves

1. **Confirm Docker Desktop is running** and WSL integration is enabled for this distro. If `docker ps`
   says "could not be found in this WSL 2 distro," open Docker Desktop → Settings → Resources →
   WSL Integration → enable it. Nothing else works until this is on.

2. **Confirm the Fabric containers are up** (WSL):
   ```bash
   docker ps --format "table {{.Names}}\t{{.Status}}"
   ```
   Expect the orderer, 3 peers, 4 CAs, and the CouchDB instances. Docker Desktop usually revives them
   automatically on start.

3. **Start the API** (WSL, leave this terminal open):
   ```bash
   cd ~/chaincert-api && node sdk-server-fixed.js
   ```
   Wait for `✅ API running on :4000`.

4. **Start the frontend** (Windows terminal, repo root):
   ```bash
   npm start
   ```

5. Open `http://localhost:3000`.

> ⚠️ **Never run `./network.sh down` to "reset" a local problem.** It deletes `organizations/`, which is the
> crypto material every wallet identity is cryptographically bound to — and the DLSU org was added by hand
> through the 12-phase workflow, so losing it means redoing that entire dance. Stopping/starting containers
> is safe; `down` is not.

---

## 2. How to Sync Changes (source code)

**Technical:** both environments reshape a source tree into the `~/chaincert-api` + `~/chaincert-chaincode`
runtime layout using the same `deploy-sync.sh`. Only the `SRC` differs: the VM pulls from a git clone,
local reads the Windows repo directly over the `/mnt/c` mount.

**Tropang Ex:** pareho lang yung script. Ang kaibahan lang, saan siya kukuha ng files — sa VM galing git
clone, sa local galing mismo sa Windows folder mo.

### VM

```bash
cd ~/chaincert-src
```

```bash
git pull origin AFTER-Defense
```
(Username = your GitHub username, Password = the PAT. See `<SEE PRIVATE NOTE>`.)

```bash
rm -rf ~/chaincert-src/docs
```
(Docs contain tester PII — strip them from the VM.)

```bash
bash ~/chaincert-src/deploy-sync.sh
```

```bash
pm2 restart chaincert-api
```
(Only needed if backend files changed.)

```bash
CI=false npm run build
```
(Only needed if frontend files changed. Nginx serves the new `build/` instantly, no restart.)

### Local

```bash
update-ubuntu
```

That alias (in `~/.bashrc`) expands to:
```bash
SRC=/mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET bash /mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET/deploy-sync.sh
```

Then restart the API: `Ctrl+C` in the API terminal, then `node sdk-server-fixed.js` again.
The frontend needs no sync at all — `npm start` reads the Windows repo live and hot-reloads.

> **Single-file sync instead of the whole script:** `docs/deployment/Copy Commands.md` has the per-file
> `cp` commands. Useful when you edited exactly one controller and don't want a full resync.

### Env var changes (both environments)

| Changed what | What applies it |
|---|---|
| `~/chaincert-api/.env` (backend) | restart the API (`pm2 restart chaincert-api` / `Ctrl+C` + rerun) — dotenv reads it at boot only |
| `REACT_APP_*` (frontend) | **rebuild**, not restart — Vite bakes these in at build time (the `REACT_APP_` prefix is kept via `envPrefix` in `vite.config.js`). VM: edit `~/chaincert-src/.env.production` then `npm run build`. Local: edit `.env.development` then restart `npm start`. |
| `package.json` | `npm install` in the affected directory first |

---

## 3. How to Redeploy Chaincode

**Technical:** required only when `chaincode/index.js` changes. The configtx swap is necessary because
`network.sh deployCC` only understands the default 2-org channel, while the live channel also has DLSU —
so DLSU is temporarily swapped out, the deploy runs for Org1+Org2, then DLSU is swapped back in and
approves manually.

**Tropang Ex:** yung script kasi ni Fabric, 2 orgs lang alam niya. Kaya tinatago muna natin si DLSU, tapos
pagkatapos mag-deploy, ibabalik at pipirma siya mano-mano.

### Step 0 — find the current version

```bash
peer lifecycle chaincode querycommitted --channelID chaincert-channel --name chaincert
```

Whatever version/sequence it reports, **increment both** for the new deploy. As of 2026-08-12 local is at
`Version: 25.0, Sequence: 25`, so the next local redeploy is `-ccv 26.0` at `--sequence 26`.

> The 25.0 redeploy carried the `VerifyCredential` template guard and the `IssueCredential` input
> validation from the security pass (see `LIMITATIONS.md`). Counters are **per-environment** — local's
> 25 has no relationship to whatever the VM is at, so always run Step 0 rather than assuming.

### Step 1 — stop the API

VM: `pm2 stop chaincert-api`. Local: `Ctrl+C` in the API terminal.

### Step 2 — set up the CLI as the DLSU peer

```bash
cd ~/fabric-samples/fabric-samples/test-network
```

```bash
export PATH=${PWD}/../bin:$PATH
export FABRIC_CFG_PATH=${PWD}/../config/
export CORE_PEER_TLS_ENABLED=true
export ORDERER_CA=${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem
```

```bash
export CORE_PEER_LOCALMSPID="DLSUMSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/dlsu.example.com/peers/peer0.dlsu.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/dlsu.example.com/users/Admin@dlsu.example.com/msp
export CORE_PEER_ADDRESS=localhost:12051
```

### Step 3 — swap in the 2-org configtx

VM (`SRC` = `~/chaincert-src`), Local (`SRC` = the `/mnt/c/...` repo path):

```bash
cp <SRC>/backend/node_creation/dlsu/configtx-DEFAULT.yaml ~/fabric-samples/fabric-samples/test-network/configtx/configtx.yaml
```

### Step 4 — deploy (bump the version)

```bash
./network.sh deployCC -c chaincert-channel -ccn chaincert -ccl javascript -ccp ~/chaincert-chaincode -ccv <NEW_VERSION>
```

This installs + approves for Org1 and Org2 automatically and produces `chaincert.tar.gz`. It will report
`DLSUMSP: false` — expected, DLSU signs in Step 6.

### Step 5 — swap configtx back

```bash
cp <SRC>/backend/node_creation/dlsu/configtx-WITHDLSU.yaml ~/fabric-samples/fabric-samples/test-network/configtx/configtx.yaml
```

### Step 6 — install + approve on the DLSU peer

```bash
docker exec peer0.dlsu.example.com peer channel list
```
(Should list `chaincert-channel`. If empty, stop — DLSU has fallen off the channel.)

```bash
peer lifecycle chaincode install chaincert.tar.gz
```

```bash
peer lifecycle chaincode queryinstalled
```
Copy the **full** `chaincert_<NEW_VERSION>:<hash>` package ID from the output. It is different every deploy —
never reuse one from a doc or a previous run.

```bash
peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --channelID chaincert-channel --name chaincert --version <NEW_VERSION> --package-id <PASTE_PACKAGE_ID> --sequence <NEW_SEQUENCE> --tls --cafile "$ORDERER_CA"
```

### Step 7 — verify all three orgs approved

```bash
peer lifecycle chaincode querycommitted --channelID chaincert-channel --name chaincert
```

Expect `Approvals: [DLSUMSP: true, Org1MSP: true, Org2MSP: true]`.

### Step 8 — restart the API and prove the new code is live

VM: `pm2 restart chaincert-api`. Local: `node sdk-server-fixed.js`.

Then call a function that only exists in the new build. For the July 2026 renewal-logging build:

```bash
peer chaincode query -C chaincert-channel -n chaincert -c '{"function":"GetRenewalDecisionLogs","Args":[]}'
```

`[]` means the new chaincode is live. `You've asked to invoke a function that does not exist` means the old
build is still committed.

---

## 4. How to Access CouchDB

**Technical:** CouchDB ports are never exposed publicly on the VM, so they are reached through an SSH
tunnel. Locally they are already on `localhost`, so Fauxton opens directly.

**Tropang Ex:** sa VM, kailangan mo munang mag-tunnel kasi nakasara sa labas. Sa local, bukas na agad —
diretso ka lang sa browser.

### VM — tunnel first

```bash
ssh -L 5985:localhost:5985 -L 7984:localhost:7984 -L 9084:localhost:9084 -L 9085:localhost:9085 -L 9086:localhost:9086 -p 20172 chaincert@ccscloud.dlsu.edu.ph
```

Leave that session open, then browse to `http://localhost:5985/_utils`. Closing the SSH session kills the
tunnel and the tabs stop loading.

> If the SSH just hangs with no error: the office/campus network silently firewalls port 20172. Use a phone
> hotspot or the DLSU VPN.

### Local — no tunnel, browse directly

`http://localhost:5985/_utils`

### Port → database map (same in both, except :9085)

| URL | Database |
|---|---|
| `localhost:5985/_utils` | **Admin / system-wide** — `users`, `issuers`, `user_notifications`, `admin_notifications`, `profile_share_links`, `couchdb_connections`, `wallet_user_credentials` |
| `localhost:9084/_utils` | DLSU issuer — `issued_credentials`, `wallet_issuer_credentials` |
| `localhost:9085/_utils` | VM: Archers Network · **Local: Innocencio** |
| `localhost:9086/_utils` | La Salle Computer Society |
| `localhost:7984/_utils` | Fabric peer state DB (not app data — don't edit) |

Login for all: `admin` / `adminpw`.

---

## 5. Live Logs and Health Checks

**Technical:** the app layer (Node/Express) and the blockchain layer (Fabric containers) log in completely
separate places. PM2 never shows blockchain activity, and `docker logs` never shows API activity.

**Tropang Ex:** dalawang magkaibang lugar tumitingin. Kung wala sa PM2, nasa Docker. Huwag mo hanapin
yung blockchain logs sa PM2, wala doon.

### App layer

```bash
pm2 logs chaincert-api --lines 100
```
(VM only. Local: the logs are just printed in the terminal running `node sdk-server-fixed.js`.)

```bash
curl -s http://localhost:4000/api/health
```

```bash
sudo tail -f /var/log/nginx/access.log
```
(VM only — frontend requests and the `/api` proxy.)

### Blockchain layer (both environments)

First find the auto-generated chaincode container name:
```bash
docker ps --format '{{.Names}}' | grep -i -E 'peer0|orderer|dev-peer|chaincert'
```

```bash
docker logs -f peer0.dlsu.example.com
```
(Peer — every committed transaction, `Committed block [N]`.)

```bash
docker logs -f orderer.example.com
```
(Orderer — block cutting / consensus. Check here if commits stall.)

```bash
docker logs -f <dev-peer-chaincode-container-name>
```
(Your contract's own `console.log` output.)

> **PM2 log gotcha (VM):** `pm2 logs` replays historical errors from the log file, so an error you already
> fixed keeps reappearing. Judge health from a fresh `✅ API running on :4000` line or run `pm2 flush` first.

---

## 6. Environment Gotchas Worth Remembering

**Local subordinate is INNOCENCIO, not ARCHERSNETWORK.** The rename happened during the VM era and never
reached the local machine. Running `setup_Wallet_DLSU_Subordinate_ARCHERSNETWORK.js` locally fails with
`ENOENT ... signcerts/cert.pem` — that is **not a bug**. That script only *imports* an existing certificate
into the wallet; it does not create the identity. Provisioning ARCHERSNETWORK locally would require the full
12-phase workflow in `docs/reference/Final Design.md`. For local development, use `dlsu@email.com` (root) or
`lasallecomputersociety@email.com` — both have working identities.

**`Identity <name> not found` is a provisioning gap, not a code bug.** Same cause as above: the enroll/setup
script for that identity has not been run in this environment.

**`REACT_APP_API_URL` differs and must.** VM uses `/api` (relative) because Nginx proxies same-origin.
Local uses `http://localhost:4000/api` (absolute) because there is no proxy and `:3000` and `:4000` are
different origins. Copying the VM value to local produces silent 404s on every API call.

**Testing toggles must be off before any demo.** `DISABLE_RATE_LIMIT`, `DISABLE_PASSWORD_POLICY`, and
`DISABLE_SIGNUP_OTP` in `~/chaincert-api/.env` each print a loud startup warning while active. Also restore
the commented-out F01 same-day/past-expiry issuance guard in `issuerCredentialController.js` (~L386-404).

**`GetAllVerificationLogs` does a full ledger scan.** Its cost grows with total verification count. The
holder and issuer dashboards defer this call rather than firing it on mount, which is a mitigation and not a
cure. If verification volume grows a lot, expect slow dashboards.

**OTP email needs working SMTP.** `SMTP_USER` + `SMTP_APP_PASSWORD` must be set in `~/chaincert-api/.env`,
and Gmail app passwords expire. If OTP sends fail, check the app password first. The WSL2 IPv6 routing issue
that used to cause `ENETUNREACH` is already patched (`family: 4` in `mailerService.js`).

---

## 7. Fast Reference — most-used commands

| Task | Command |
|---|---|
| Sync source (local) | `update-ubuntu` |
| Sync source (VM) | `cd ~/chaincert-src && git pull origin AFTER-Defense && bash deploy-sync.sh` |
| Restart API (VM) | `pm2 restart chaincert-api` |
| Restart API (local) | `Ctrl+C`, then `cd ~/chaincert-api && node sdk-server-fixed.js` |
| Rebuild frontend (VM) | `CI=false npm run build` |
| Start frontend (local) | `npm start` (Windows, repo root) |
| Health check | `curl -s http://localhost:4000/api/health` |
| Running containers | `docker ps --format "table {{.Names}}\t{{.Status}}"` |
| Current chaincode version | `peer lifecycle chaincode querycommitted --channelID chaincert-channel --name chaincert` |
| CouchDB (local) | `http://localhost:5985/_utils` |
| CouchDB (VM) | SSH tunnel first, then `http://localhost:5985/_utils` |
