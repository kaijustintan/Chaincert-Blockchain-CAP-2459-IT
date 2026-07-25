# ChainCert — VM Installation & Deployment Manual (CCSCloud)

> **What this is.** The step-by-step manual for deploying ChainCert **from scratch onto a Linux VM**
> (the DLSU CCSCloud server). It is the **companion** to the local `CAP-2459-IT-INSTALLATION-MANUAL.md`
> (which targets a Windows + WSL2 developer machine). It mirrors that manual's structure and per-step
> format, but the **commands, prerequisites, and sequence differ** because the target is a native Linux
> server, not a Windows laptop.
>
> **How to read it.** Each phase opens with a **⚠️ Difference from Local Installation** box so anyone
> familiar with the local guide can immediately see *what changed and why*. Every step keeps the local
> manual's fields: **Directory → Command(s) → What it does → Expected Output → Rationale**.
>
> **Provenance.** This manual documents the actual, verified deployment performed 2026-07-04 (Fabric
> **2.5.16**, Docker 29.1.3, Ubuntu 22.04). Detailed rationale for the CAP1→CAP2 deltas, plus the
> version/Docker analysis, lives in `CAP2 - Deployment Manual Addendum (CAP1 Deltas + Groupmate Journey).md`.
>
> **Version note.** State Fabric **2.5.14** in formal defense materials; the VM runs **2.5.16** purely
> as a Docker-29 compatibility patch. Both are real — see the Addendum's "Version reconciliation."

---

## Table of Contents

- Phase 0: System Identity Architecture
- Phase 1: VM Access & Environment
- Phase 2: Teardown (redeploy-over-existing only)
- Phase 3: Install Hyperledger Fabric 2.5.16
- Phase 4: Clone Repo + Reshape with `deploy-sync.sh`
- Phase 5: Admin CouchDB + `.env` + Backend API + Admin Accounts
- Phase 6: Start the Fabric Network
- Phase 7: Create the Fabric Admin Identities
- Phase 8: Root Authority (DLSU) Organization Node Creation
- Phase 9: Import DLSU Admin + Connection Profile
- Phase 10: Create Subordinate Issuer (ARCHERSNETWORK)
- Phase 11: Create Subordinate Issuer (La Salle Computer Society)
- Phase 12: Start Issuer CouchDB Containers
- Phase 13: Build the Frontend
- Phase 14: Nginx + PM2 + Reboot Persistence
- Phase 15: Demo Data & UAT
- Pre-Demo Security Checklist (re-enable controls before the defense)
- Final System State
- Appendix A: VM Gotchas & Troubleshooting
- Appendix B: CCSCloud Access (SSH, tunnels, Proxmox)
- Appendix C: Updating a Running Deployment (Day-2 Operations)

---

## Phase 0: System Identity Architecture

Identical to the local manual — the identity model is the same regardless of host. Before starting,
distinguish the four identity types (mixing them up is the #1 cause of setup failure):

| Identity Type | Example | Purpose |
|---|---|---|
| System Admin Account | `admin@email.com` | Login to the Web Dashboard (stored in CouchDB) |
| Fabric Admin Identity | `chaincert-admin` | System-level blockchain operations from the API |
| Root Authority Identity | `delasalleuniversity-admin` | DLSU credential operations |
| Subordinate Identity | `delasalleuniversity-subordinate-archersnetwork` / `…-lasallecomputersociety` | Department issuing under DLSU's CA (no own peer) |

> **⚠️ Difference from Local Installation:** None. This phase is conceptual. The subordinate issuer is
> **ARCHERSNETWORK** throughout this manual (formerly named INNOCENCIO in older data/clones — see the
> Addendum §B8).

---

## Phase 1: VM Access & Environment

> **⚠️ Difference from Local Installation:** The local manual's Phase 1 installs **WSL2 + Ubuntu** on
> Windows because Docker/Fabric need Linux. On the VM this is **skipped entirely** — the server is
> already native **Ubuntu 22.04 LTS**, and Docker 29, Node 18, Nginx, and PM2 were pre-provisioned by
> the CCSCloud team. Phase 1 here is **connect + verify**, not install.

### 1.1 SSH into the VM

**Directory:** Your laptop terminal (PowerShell / bash)

```bash
ssh -p 20172 -o ServerAliveInterval=60 chaincert@ccscloud.dlsu.edu.ph
```

**What it does:** Opens a shell on the CCSCloud VM as user `chaincert`. `ServerAliveInterval=60` keeps
the session from idling out.

**Rationale:** All subsequent commands run on the VM.

> **Note:** The **office/campus WiFi firewalls SSH port 20172** (silent timeout). Use a **phone hotspot
> or the DLSU VPN**. See Appendix B.

### 1.2 Rotate the SSH password (first action on the box)

**Directory:** VM shell

```bash
passwd
```

**What it does:** Sets a fresh SSH password. Enter the current one, then a new strong one twice.

**Rationale:** Security hygiene — the initial password was shared in handoff docs. Share the new one
out-of-band (never in git or a committed file).

### 1.3 Verify the pre-installed toolchain

**Directory:** VM shell

```bash
docker --version        # expect 29.x
node --version          # expect v18.x
npm --version
nginx -v
pm2 --version
```

**Expected Output:** `Docker version 29.x`, `v18.x`, an npm version, `nginx/1.18.x`, a pm2 version.

**Rationale:** Confirms the base stack is present. **Docker 29 is expected and correct** — do NOT
downgrade; Fabric 2.5.16 (Phase 3) is what makes chaincode builds work on Docker 29.

### 1.4 (If re-provisioning) Update packages

**Directory:** VM shell

```bash
sudo apt update && sudo apt upgrade -y
```

**Rationale:** Only needed on a brand-new/unpatched VM; the CCSCloud VM is already provisioned.

---

## Phase 2: Teardown (redeploy-over-existing ONLY)

> **⚠️ Difference from Local Installation:** This phase **has no local equivalent.** It exists only
> because a VM may already be running a previous deployment that must be wiped for a clean, canonical
> re-deploy. **Skip this entire phase on a fresh VM.**

### 2.1 Full teardown

**Directory:** VM shell

```bash
pm2 delete all 2>/dev/null; pm2 kill 2>/dev/null
docker stop $(docker ps -aq) 2>/dev/null
docker rm -f $(docker ps -aq) 2>/dev/null
docker volume rm $(docker volume ls -q) 2>/dev/null      # REQUIRED — a reboot does NOT clear volumes
docker network prune -f
sudo rm -rf ~/fabric-samples ~/chaincert-deploy ~/chaincert-src ~/chaincert-api ~/chaincert-chaincode
```

**What it does:** Stops PM2, removes every container + volume + custom network, and deletes the old
app + Fabric directories. `sudo` is needed on `~/fabric-samples` because the Fabric CA writes
root-owned cert files.

**Expected Output:** `docker ps -aq` and `docker volume ls -q` both empty afterward.

**Rationale:** Fabric ledger state lives in Docker **volumes**; leaving them causes
`ledger … already exists` on the next `network.sh up`.

### 2.2 Clear host-level Docker hacks (if present)

**Directory:** VM shell

```bash
cat /etc/docker/daemon.json 2>/dev/null           # if it has {"features":{"buildkit":false}}, empty it:
# echo '{}' | sudo tee /etc/docker/daemon.json && sudo systemctl restart docker
grep -i DOCKER_API_VERSION ~/.bashrc               # if present, delete that line
```

**Rationale:** Groupmates' abandoned Docker-fix attempts left these; with Fabric 2.5.16 they are
unnecessary and can interfere. (Our verified VM had **none** present.)

---

## Phase 3: Install Hyperledger Fabric 2.5.16

> **⚠️ Difference from Local Installation:** The local manual installs Fabric **2.5.14** (`bash -s -- 2.5.14 1.5.5`).
> On the VM you MUST install **2.5.16 / CA 1.5.17** — Docker 29 cannot build chaincode on 2.5.14 (the
> abandoned `fsouza/go-dockerclient` bug). Use the classic `bootstrap.sh` (NOT the newer
> `install-fabric.sh`) so the binaries land in the double-nested `~/fabric-samples/fabric-samples/bin`
> layout the code assumes.

### 3.1 Download Fabric 2.5.16 binaries + images

**Directory:** VM shell

```bash
mkdir -p ~/fabric-samples && cd ~/fabric-samples
curl -sSL https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/bootstrap.sh | bash -s -- 2.5.16 1.5.17
```

**What it does:** Clones `fabric-samples` (into `~/fabric-samples/fabric-samples`), downloads the
2.5.16 binaries + CA 1.5.17, and pulls the 2.5.16 Docker images.

**Expected Output:** Downloads of `hyperledger-fabric-linux-amd64-2.5.16.tar.gz` and the CA 1.5.17
binary; `fabric-peer:2.5.16`, `fabric-orderer:2.5.16`, `fabric-ca:1.5.17` images pulled. *(A "samples
v2.5.16 tag does not exist, defaulting to main" note is normal — only the sample scripts come from
main; the binaries are 2.5.16.)*

### 3.2 Add Fabric binaries to PATH + verify

**Directory:** VM shell

```bash
grep -q 'fabric-samples/fabric-samples/bin' ~/.bashrc || echo 'export PATH=$PATH:~/fabric-samples/fabric-samples/bin' >> ~/.bashrc
source ~/.bashrc
peer version
ls ~/fabric-samples/fabric-samples/bin
ls ~/fabric-samples/fabric-samples/test-network | head
```

**Expected Output:** `peer: Version: v2.5.16`; `bin/` shows `peer configtxgen configtxlator
fabric-ca-client …`; `test-network/` shows `network.sh organizations compose configtx …`.

**Rationale:** All relative paths in the code + `deploy-sync.sh` assume the double-nested
`~/fabric-samples/fabric-samples/` layout — `bin` and `test-network` must both be there.

---

## Phase 4: Clone Repo + Reshape with `deploy-sync.sh`

> **⚠️ Difference from Local Installation:** The local manual's Phases 3, 4, and 5 hand-create the
> chaincode/backend directories, `npm init` them, and run a long manual `cp` dance from `/mnt/c/…`.
> On the VM, **one script — `deploy-sync.sh` — does all of that**: it copies + renames code from the
> git clone into the runtime layout, installs deps, and **never touches `wallet/` or `.env`**.

### 4.1 Clone the canonical repo

**Directory:** VM shell (`~`)

```bash
git clone -b AFTER-Defense https://github.com/kaijustintan/CAP-2459-IT.git ~/chaincert-src
```

**What it does:** Clones the `AFTER-Defense` branch to `~/chaincert-src` (the **source** dir).

> **Security:** Do NOT embed a PAT in the URL — it gets written into `.git/config` in plaintext. Let git
> prompt for credentials, or use a credential manager. If the repo is private, generate a **short-lived**
> PAT at clone time and revoke it after. (See Appendix A #6.)

### 4.2 Reshape into the runtime layout

**Directory:** VM shell

```bash
bash ~/chaincert-src/deploy-sync.sh
rm -rf ~/chaincert-src/docs
```

**What it does:** `deploy-sync.sh` builds `~/chaincert-api` + `~/chaincert-chaincode` from the clone
(applying the documented renames, e.g. `setupWallet_ORG1.js`→`enrollAdmin.js`), applies the Fabric
compose fixes, and `npm install`s both. `rm -rf docs` trims the VM footprint (docs aren't needed at
runtime; Nginx only serves `build/`).

**Expected Output:** `== done ==` with `Left untouched (on purpose): …/wallet/ and …/.env`. It prints
`(skip connection profile — create the DLSU org first)` — **that is correct** (we place it in Phase 9).

**Verify:**
```bash
ls ~/chaincert-api                                  # config/ controllers/ routes/ sdk-server-fixed.js …
echo "controllers: $(ls ~/chaincert-api/controllers | wc -l)  (expect 10)"
echo "routes: $(ls ~/chaincert-api/routes | wc -l)  (expect 7)"
ls ~/chaincert-api/setup_Wallet_DLSU_Subordinate_*.js   # ARCHERSNETWORK + LASALLECOMPUTERSOCIETY
```

---

## Phase 5: Admin CouchDB + `.env` + Backend API + Admin Accounts

> **⚠️ Difference from Local Installation:** Two VM-specific changes. **(a)** The backend now **refuses
> to boot without `JWT_SECRET`** (M3 hardening), so the `.env` must be created *before* starting the
> API — the local manual (pre-M3) had a dev-secret fallback. **(b)** The API runs under **PM2**, not a
> raw `node` in a second terminal.

### 5.1 Start the admin CouchDB

**Directory:** VM shell

```bash
docker run -d --name couchdb-admin -p 5985:5984 -e COUCHDB_USER=admin -e COUCHDB_PASSWORD=adminpw apache/couchdb:latest
```

**Expected Output:** a container ID. (Note the non-standard port **5985**.)

### 5.2 Create the 7 admin databases

**Directory:** VM shell

```bash
for db in users issuers user_notifications couchdb_connections profile_share_links admin_notifications wallet_user_credentials; do
  curl -X PUT http://admin:adminpw@localhost:5985/$db
done
```

**Expected Output:** `{"ok":true}` ×7.

### 5.3 Create the backend `.env` (REQUIRED before the API boots)

**Directory:** `~/chaincert-api`

```bash
cd ~/chaincert-api
cat > .env <<EOF
JWT_SECRET=$(openssl rand -hex 48)
CORS_ORIGIN=http://ccscloud.dlsu.edu.ph:20173
FRONTEND_URL=http://ccscloud.dlsu.edu.ph:20173
COUCHDB_URL=http://admin:adminpw@localhost:5985
EOF
sed 's/\(JWT_SECRET=\).*/\1<redacted>/' .env
```

**What it does:** Writes `.env` with a freshly generated `JWT_SECRET` + the VM's public origin. The
`sed` prints it back with the secret redacted (safe to screenshot).

**Rationale:** `JWT_SECRET` is fail-closed (M3). `CORS_ORIGIN`/`FRONTEND_URL` = the public URL.
`COUCHDB_URL` points the backend at the admin CouchDB instance on port 5985 (the backend reads it at
boot, falling back to `http://admin:adminpw@localhost:5985` if unset). For a
defense/demo build, leave **all** `DISABLE_*` toggles unset — `DISABLE_RATE_LIMIT`,
`DISABLE_PASSWORD_POLICY`, `DISABLE_SIGNUP_OTP`, `DISABLE_ISSUER_TOGGLE` — so every protection stays ON
(see the **Pre-Demo Security Checklist**). SMTP left blank (email is non-fatal at boot; configure before
a real demo).

### 5.4 Start the API under PM2

**Directory:** `~/chaincert-api`

```bash
pm2 start sdk-server-fixed.js --name chaincert-api
pm2 logs chaincert-api --lines 15 --nostream
curl http://localhost:4000/api/health
```

**Expected Output:** `✅ API running on :4000` in the logs, `{"status":"OK"}` from health. *(Chaincode
calls fail for now — Fabric isn't up yet — but boot only needs JWT_SECRET + CouchDB.)*

### 5.5 Register the system admin accounts

**Directory:** VM shell

```bash
curl -X POST http://localhost:4000/api/auth/register -H "Content-Type: application/json" -d '{"username":"admin","email":"admin@email.com","password":"<ADMIN_PASSWORD>","role":"admin"}'
curl -X POST http://localhost:4000/api/auth/register -H "Content-Type: application/json" -d '{"username":"admin2","email":"admin2@email.com","password":"<ADMIN_PASSWORD>","role":"admin"}'
```

**Expected Output:** `{"success":true,"message":"User registered successfully",…}` ×2.

> **⚠️ Password note:** use a strong password of **at least 10 characters** so it passes the M8 policy.
> A 5-character password (like the old `pw123`) is **rejected** by the password policy. Use the same
> password to log in later, and keep the real demo passwords out-of-band (never committed to the repo).

---

## Phase 6: Start the Fabric Network

> **⚠️ Difference from Local Installation:** `deploy-sync.sh` does **not** copy the `configtx-*.yaml`
> files, so you must copy `configtx-DEFAULT.yaml` into place **before** `network.sh up`. (On local, the
> cp dance / Appendix A handled this.)

### 6.1 Copy the default channel config

**Directory:** VM shell

```bash
cp ~/chaincert-src/backend/node_creation/dlsu/configtx-DEFAULT.yaml ~/fabric-samples/fabric-samples/test-network/configtx/configtx.yaml
```

### 6.2 Bring up the 2-org network + create the channel

**Directory:** `~/fabric-samples/fabric-samples/test-network`

```bash
cd ~/fabric-samples/fabric-samples/test-network
./network.sh up createChannel -ca -s couchdb -c chaincert-channel
docker ps --format "table {{.Names}}\t{{.Status}}"
```

**Expected Output:** `LOCAL_VERSION=v2.5.16`, `Channel 'chaincert-channel' created`, both peers joined,
anchor peers set. `docker ps` shows orderer, peer0.org1, peer0.org2, ca_org1/org2/orderer, couchdb0/1
all **Up** (plus couchdb-admin).

> **Note:** If `peer0.org2` ever exits on a CouchDB timing race, `docker start peer0.org2.example.com`.
> (Did not occur on clean 2.5.16.)

---

## Phase 7: Create the Fabric Admin Identities

> **⚠️ Difference from Local Installation:** Same as local for `chaincert-admin`, **plus** you also
> enroll the Org1/Org2 admin identities — the app's verification-log reads use the Org1 `admin`
> identity.

### 7.1 Register + enroll `chaincert-admin`

**Directory:** `~/fabric-samples/fabric-samples/test-network`

```bash
cd ~/fabric-samples/fabric-samples/test-network
export FABRIC_CA_CLIENT_HOME=${PWD}/organizations/peerOrganizations/org1.example.com/
fabric-ca-client register --caname ca-org1 --id.name chaincertadmin --id.secret chaincertadminpw --id.type client --tls.certfiles "${PWD}/organizations/fabric-ca/org1/ca-cert.pem"
cd ~/chaincert-api
node enrollChaincertAdmin.js
```

### 7.2 Enroll the Org1 + Org2 admin identities

**Directory:** `~/chaincert-api`

```bash
node enrollAdmin.js
node enrollOrg2Admin.js
ls wallet/
```

**Expected Output:** `wallet/` contains **`chaincert-admin.id`, `admin.id`, `admin-org2.id`**.

---

## Phase 8: Root Authority (DLSU) Organization Node Creation

> **⚠️ Difference from Local Installation:** The workflow is the same 12-step configtx dance, **but two
> VM-specific gotchas surface here** — the peer's docker.sock mount alignment, and the docker-compose
> v1 `--force-recreate` crash. Both are handled below / in Appendix A. And **`deployCC` is the moment
> the Docker-29/2.5.16 fix proves out** — the chaincode image build that failed on 2.5.14.

Follow the CAP1 Installation Manual's Phase 9 (steps 9.1–9.12) **verbatim** for the command sequence
(CA up → `registerEnroll.sh createDLSU` → `configtx-WITHDLSU` swap → generate DLSUMSP.json →
fetch/decode/merge/envelope → sign as Org1 + Org2 → submit → start DLSU peer → join → `deployCC` →
DLSU install/approve). The commands are identical on the VM. The only **VM notes**:

- **9.4 configtx-WITHDLSU source path:** `cp ~/chaincert-src/backend/node_creation/dlsu/configtx-WITHDLSU.yaml configtx/configtx.yaml`
- **9.3 `infoln: command not found`** during `registerEnroll.sh` is **harmless** (missing log helpers; the enrollments still succeed — verify `dlsu.example.com/` is populated).
- **`core.yaml`** for the DLSU peer is already at `addDLSU/compose/docker/peercfg/core.yaml` (placed by `deploy-sync.sh`) — verify before 9.10.
- **9.12 `deployCC`** — if the org1 install fails with `dial unix /host/var/run/docker.sock: no such file or directory`, apply the **docker.sock fix (Appendix A #1)** and recreate the peers with **`rm -f` + `up` (NOT `--force-recreate`, Appendix A #2)**, then re-run `deployCC`.

**Success indicator (end of Phase 8):**
```bash
peer lifecycle chaincode querycommitted --channelID chaincert-channel --name chaincert
# → Approvals: [DLSUMSP: true, Org1MSP: true, Org2MSP: true]
```

---

## Phase 9: Import DLSU Admin + Connection Profile

> **⚠️ Difference from Local Installation:** The connection profile's frozen `/home/kaitanz_/` paths
> must be patched to this VM's home. On local, the manual copied it to `~/chaincert-api`; the current
> code reads it from the **fabric-samples DLSU peerOrg dir**, so it goes there instead.

### 9.1 Place + patch the DLSU connection profile

**Directory:** VM shell

```bash
cp ~/chaincert-src/backend/node_creation/dlsu/connection-delasalleuniversity.json ~/fabric-samples/fabric-samples/test-network/organizations/peerOrganizations/dlsu.example.com/connection-delasalleuniversity.json
sed -i "s|/home/kaitanz_/fabric-samples|$HOME/fabric-samples|g" ~/fabric-samples/fabric-samples/test-network/organizations/peerOrganizations/dlsu.example.com/connection-delasalleuniversity.json
grep -c "/home/chaincert/fabric-samples" ~/fabric-samples/fabric-samples/test-network/organizations/peerOrganizations/dlsu.example.com/connection-delasalleuniversity.json   # expect 7
grep -c "/home/kaitanz_" ~/fabric-samples/fabric-samples/test-network/organizations/peerOrganizations/dlsu.example.com/connection-delasalleuniversity.json                    # expect 0
```

### 9.2 Import the DLSU admin identity

**Directory:** `~/chaincert-api`

```bash
cd ~/chaincert-api
node setup_Wallet_DLSU.js
ls wallet/
```

**Expected Output:** `delasalleuniversity-admin.id` added (wallet now has 4 identities).

---

## Phase 10: Create Subordinate Issuer (ARCHERSNETWORK)

> **⚠️ Difference from Local Installation:** This is the **ARCHERSNETWORK** subordinate — org name
> `archersnetwork`, secret `archersnetworkpw`, the **Convention-B** MSP folder, the
> `setup_Wallet_DLSU_Subordinate_ARCHERSNETWORK.js` wallet script + `compose-couch-archersnetwork.yaml`,
> and the lowercase `archersnetwork` couchdb_connections row. Port **9085**. (This subordinate was
> called INNOCENCIO in older clones/data; everything here uses `archersnetwork`.)

**Directory:** `~/fabric-samples/fabric-samples/test-network` (then `~/chaincert-api` for the wallet import)

```bash
cd ~/fabric-samples/fabric-samples/test-network
export FABRIC_CA_CLIENT_HOME=${PWD}/organizations/peerOrganizations/dlsu.example.com/

# 10.1 register
fabric-ca-client register --caname ca-dlsu --id.name delasalleuniversity-subordinate-archersnetwork --id.secret archersnetworkpw --id.type client --tls.certfiles "${PWD}/organizations/fabric-ca/dlsu/ca-cert.pem"

# 10.2 enroll (Convention-B MSP folder — matches the wallet script's read path)
fabric-ca-client enroll -u https://delasalleuniversity-subordinate-archersnetwork:archersnetworkpw@localhost:12054 --caname ca-dlsu -M "${PWD}/organizations/peerOrganizations/dlsu.example.com/users/delasalleuniversity-subordinate-archersnetwork@dlsu.example.com/msp" --tls.certfiles "${PWD}/organizations/fabric-ca/dlsu/ca-cert.pem"

# 10.3 NodeOU config
cp "${PWD}/organizations/peerOrganizations/dlsu.example.com/msp/config.yaml" "${PWD}/organizations/peerOrganizations/dlsu.example.com/users/delasalleuniversity-subordinate-archersnetwork@dlsu.example.com/msp/config.yaml"

# 10.4 import into wallet
cd ~/chaincert-api
node setup_Wallet_DLSU_Subordinate_ARCHERSNETWORK.js

# 10.5 CouchDB (port 9085) + DBs + routing row
cd ~/fabric-samples/fabric-samples/test-network/addDLSU/compose
docker-compose -f compose-couch-archersnetwork.yaml up -d
cd ~
curl -X PUT http://admin:adminpw@localhost:9085/wallet_issuer_credentials
curl -X PUT http://admin:adminpw@localhost:9085/issued_credentials
curl -X POST http://admin:adminpw@localhost:5985/couchdb_connections -H "Content-Type: application/json" -d '{"orgName":"archersnetwork","couchDBUrl":"http://admin:adminpw@localhost:9085"}'
```

**Expected Output:** wallet import prints `✅ Successfully imported delasalleuniversity-subordinate-archersnetwork`;
`couchdb_archersnetwork` Up; three `{"ok":true}` responses.

> **Note (Appendix A #3):** if the `curl -X PUT` DB creates return "Recv failure: Connection reset by
> peer", the CouchDB container wasn't ready — wait a couple seconds and re-run the two PUTs.

---

## Phase 11: Create Subordinate Issuer (La Salle Computer Society)

> **⚠️ Difference from Local Installation:** Same pattern as ARCHERSNETWORK. Secret `lscspw`, port
> **9086**, orgName `lasallecomputersociety`. The LSCS wallet script now also reads the **Convention-B**
> MSP folder (reconciled this session), so enroll to the descriptive folder (matching the manual).

**Directory:** `~/fabric-samples/fabric-samples/test-network` → `~/chaincert-api`

```bash
cd ~/fabric-samples/fabric-samples/test-network
export FABRIC_CA_CLIENT_HOME=${PWD}/organizations/peerOrganizations/dlsu.example.com/
fabric-ca-client register --caname ca-dlsu --id.name delasalleuniversity-subordinate-lasallecomputersociety --id.secret lscspw --id.type client --tls.certfiles "${PWD}/organizations/fabric-ca/dlsu/ca-cert.pem"
fabric-ca-client enroll -u https://delasalleuniversity-subordinate-lasallecomputersociety:lscspw@localhost:12054 --caname ca-dlsu -M "${PWD}/organizations/peerOrganizations/dlsu.example.com/users/delasalleuniversity-subordinate-lasallecomputersociety@dlsu.example.com/msp" --tls.certfiles "${PWD}/organizations/fabric-ca/dlsu/ca-cert.pem"
cp "${PWD}/organizations/peerOrganizations/dlsu.example.com/msp/config.yaml" "${PWD}/organizations/peerOrganizations/dlsu.example.com/users/delasalleuniversity-subordinate-lasallecomputersociety@dlsu.example.com/msp/config.yaml"
cd ~/chaincert-api
node setup_Wallet_DLSU_Subordinate_LASALLECOMPUTERSOCIETY.js
cd ~/fabric-samples/fabric-samples/test-network/addDLSU/compose
docker-compose -f compose-couch-lasallecomputersociety.yaml up -d
cd ~
curl -X PUT http://admin:adminpw@localhost:9086/wallet_issuer_credentials
curl -X PUT http://admin:adminpw@localhost:9086/issued_credentials
curl -X POST http://admin:adminpw@localhost:5985/couchdb_connections -H "Content-Type: application/json" -d '{"orgName":"lasallecomputersociety","couchDBUrl":"http://admin:adminpw@localhost:9086"}'
```

> **⚠️ Convention note:** on a **stale clone** whose LSCS script still reads
> `SubordinateLASALLECOMPUTERSOCIETY@…`, enroll to *that* folder instead. The committed repo is now
> Convention B (fixed this session).

---

## Phase 12: Start Issuer CouchDB Containers (DLSU root, port 9084)

**Directory:** `~/fabric-samples/fabric-samples/test-network/addDLSU/compose`

```bash
cd ~/fabric-samples/fabric-samples/test-network/addDLSU/compose
docker-compose -f compose-couch-dlsu.yaml up -d
cd ~
curl -X PUT http://admin:adminpw@localhost:9084/wallet_issuer_credentials
curl -X PUT http://admin:adminpw@localhost:9084/issued_credentials
curl -X POST http://admin:adminpw@localhost:5985/couchdb_connections -H "Content-Type: application/json" -d '{"orgName":"delasalleuniversity","couchDBUrl":"http://admin:adminpw@localhost:9084"}'
```

**Verify Phases 10–12:**
```bash
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -i couchdb   # 6 CouchDBs Up
ls ~/chaincert-api/wallet/                                             # 6 identities
for p in 9084 9085 9086; do echo "$p:"; curl -s http://admin:adminpw@localhost:$p/_all_dbs; done
```

---

## Phase 13: Build the Frontend

> **⚠️ Difference from Local Installation:** The local machine just runs `npm start` (a dev server).
> The VM serves a **production static build** through Nginx. Also — `jspdf@4` needs **`dompurify`**,
> which must be installed or the build fails.

### 13.1 Frontend build

**Directory:** `~/chaincert-src`

```bash
cd ~/chaincert-src
cat > .env.production <<EOF
REACT_APP_API_URL=/api
REACT_APP_FRONTEND_URL=http://ccscloud.dlsu.edu.ph:20173
EOF
npm install
npm install dompurify           # Gotcha #4 — jspdf@4 needs it; skip if already in package.json
CI=false npm run build
ls ~/chaincert-src/build         # index.html + static/
```

**Expected Output:** `Compiled … The build folder is ready to be deployed`; `build/` contains
`index.html` + `static/js` + `static/css`.

**Rationale:** `REACT_APP_API_URL=/api` (relative) makes the SPA call the backend same-origin through
Nginx — no CORS, no hardcoded IP. CRA bakes `REACT_APP_*` at build time. `CI=false` treats lint
warnings as warnings, not errors.

---

## Phase 14: Nginx + PM2 + Reboot Persistence

> **⚠️ Difference from Local Installation:** No local equivalent — local dev has no reverse proxy and
> no process manager. On the VM, Nginx serves the build + proxies `/api`, and PM2 + Docker restart
> policies keep everything alive across reboots.

### 14.1 Nginx config

**Directory:** VM shell

```bash
sudo tee /etc/nginx/sites-available/chaincert > /dev/null <<'EOF'
server {
    listen 80;
    server_name _;
    root /home/chaincert/chaincert-src/build;
    index index.html;
    client_max_body_size 25M;
    location / { try_files $uri /index.html; }
    location /api/ {
        proxy_pass http://localhost:4000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
sudo ln -sf /etc/nginx/sites-available/chaincert /etc/nginx/sites-enabled/chaincert
sudo rm -f /etc/nginx/sites-enabled/default
sudo chmod o+x /home/chaincert /home/chaincert/chaincert-src
sudo nginx -t && sudo systemctl reload nginx
```

**What it does:** Serves `build/`, SPA-routes via `try_files`, proxies `/api`→:4000, allows 25 MB
uploads, and (crucially) `chmod o+x` lets Nginx's `www-data` **traverse** into the home dir to reach
`build/` (else 403).

**Expected Output:** `nginx: … test is successful`.

**Verify:**
```bash
curl -s http://localhost/api/health; echo        # {"status":"OK"}
curl -s -I http://localhost/ | head -3            # HTTP/1.1 200 OK
```
Then open **`http://ccscloud.dlsu.edu.ph:20173`** in a browser — the landing page should load.

### 14.2 Reboot persistence

**Directory:** VM shell

```bash
pm2 startup                                        # then RUN the printed `sudo env … pm2 startup …` line
pm2 save
docker update --restart=unless-stopped $(docker ps -q)
```

**Rationale:** `pm2 startup` installs the systemd service; `pm2 save` freezes the process list;
`docker update --restart` makes all containers come back on boot (peers reload their ledger from the
persistent volumes).

---

## Phase 15: Demo Data & UAT

> **⚠️ Difference from Local Installation:** On a fresh VM the `issuers`/credentials are **empty** — the
> Fabric identities + CouchDBs exist, but the issuer **login accounts + issuer docs** do not. Seed them.

1. **Register** the DLSU / ARCHERSNETWORK / LSCS issuers through the UI with the **correct orgName** so
   the derived Fabric identity matches the wallet (`delasalleuniversity`, `archersnetwork`,
   `lasallecomputersociety`). Root approves the subordinates, then admin approves. Because the
   identities exist, approval **succeeds** and they can issue.
2. **Register a holder**, issue a few credentials, and seed a few verifications (incl. one forged /
   one revoked) so the analytics/dashboards render.

> **Approval-guard behavior (expected, not a bug):** if a tester registers a *new* issuer you never
> provisioned a Fabric identity for, **admin approval is blocked with a 400** — "Fabric identity '…'
> was not found in the wallet." That's the `ensureIssuerFabricIdentityExists` guard
> (`adminIssuerController.js`). Frame it as a security feature: UI approval alone can't fabricate a
> credential-issuing authority; a real CA-enrolled identity is required.

---

## Pre-Demo Security Checklist (re-enable controls before the defense)

> **⚠️ Read this before every defense/demo.** During UAT and group stress-testing several security
> controls were **switched OFF** via `.env` toggles so testers wouldn't get blocked. They MUST be turned
> back ON for the defense, or the panel will (rightly) see a system running with its protections disabled.
> This is the single most important pre-demo step.

**The rule of thumb:** remove the four backend `DISABLE_*` toggles and the one frontend
`REACT_APP_DISABLE_ISSUER_TOGGLE`, **but KEEP the two past-expiry knobs** (the demo issues already-expired
credentials on purpose).

### Step 1 — Backend: remove the `DISABLE_*` toggles

**Directory:** `~/chaincert-api`

```bash
nano ~/chaincert-api/.env
```
Delete (or comment out) all four of these lines if present:

| Toggle to REMOVE | What it disables when set | Control restored when removed |
|---|---|---|
| `DISABLE_RATE_LIMIT` | per-IP login/forgot/reset throttle (M5) | Rate limiting **ON** |
| `DISABLE_PASSWORD_POLICY` | min-10 + common-password blocklist (M8) | Password policy **ON** |
| `DISABLE_SIGNUP_OTP` | email-ownership OTP gate on user signup | Signup OTP **ON** |
| `DISABLE_ISSUER_TOGGLE` | backend guard behind issuer enable/disable | Issuer enable/disable **ON** |

Then restart the API so it re-reads `.env`:
```bash
pm2 restart chaincert-api --update-env
pm2 logs chaincert-api --lines 30 --nostream
```

**Confirm the toggles are OFF by their absence in the boot banner.** When a toggle is set, the API prints
a **loud startup warning**. Once removed, these banners must **NOT** appear:

- `RATE LIMITING DISABLED` (from `DISABLE_RATE_LIMIT`)
- `PASSWORD POLICY DISABLED` (from `DISABLE_PASSWORD_POLICY`)
- `ISSUER ENABLE-DISABLE …` warning (from `DISABLE_ISSUER_TOGGLE`)

If you still see any of them, the toggle is still in `.env` — remove it and restart again.
*(Note: `DISABLE_SIGNUP_OTP` has no loud boot banner wired, so verify it by removing the line and confirming
user signup now demands the emailed 6-digit code.)*

**Also decide on `SMTP_OVERRIDE_TO` in the same `.env`.** It is not a security toggle and has no boot
banner, so it is easy to forget — but it silently redirects **all** outgoing mail to a single inbox.

| Setting | Effect | When to use |
|---|---|---|
| `SMTP_OVERRIDE_TO=<inbox>` **set** | every email goes to that one inbox, regardless of recipient | Demo with fake issuer/admin addresses, so nothing is lost to non-existent mailboxes. Holder and verifier emails still reach real recipients — those sends bypass the override deliberately. |
| `SMTP_OVERRIDE_TO=` **unset** | every email goes to its true recipient | Real deployment, or any demo where the accounts use real addresses |

If a demo depends on someone actually receiving an email, unset it and use a real address for that
account. See Appendix A gotcha on outbound SMTP if mail still does not arrive.

### Step 2 — Frontend: remove `REACT_APP_DISABLE_ISSUER_TOGGLE` and rebuild

**Directory:** `~/chaincert-src`

```bash
nano ~/chaincert-src/.env.production      # delete the REACT_APP_DISABLE_ISSUER_TOGGLE line
cd ~/chaincert-src && CI=false npm run build
```

`REACT_APP_*` vars are baked at **build time**, so a **rebuild** (not a restart) is what actually removes
the toggle from the served bundle. Nginx serves the new `build/` immediately.

### Step 3 — KEEP these two (do NOT remove) — the demo needs past-dated credentials

| Keep as-is | Where | Why keep it |
|---|---|---|
| `REACT_APP_ALLOW_PAST_EXPIRY=true` | `~/chaincert-src/.env.production` | lets the UI accept an expiry date in the past so the demo can show an already-expired credential |
| F01 past-expiry **issuance guard COMMENTED** | `issuerCredentialController.js` (~L418–436) | the backend must also accept a past/same-day expiry for that same demo credential; leave it commented |

These two are intentional demo affordances, not security holes — every OTHER control above is back ON.

---

## Final System State

| Component | VM Port (internal) | External (CCSCloud) | Notes |
|---|---|---|---|
| Public site (Nginx) | 80 | **20173** | serves `build/` + proxies `/api` |
| Backend API (PM2) | 4000 | (20171, testing) | `chaincert-api` |
| React dev server | 3000 | (20170, testing) | not used in prod |
| SSH | 22 | **20172** | office WiFi firewalls this |
| Orderer | 7050 | — | |
| Org1 / Org2 / DLSU peers | 7051 / 9051 / 12051 | — | |
| Org1 / Org2 / DLSU CAs (certificate issuance) | 7054 / 8054 / 12054 | — | orderer CA is **9054** |
| Admin CouchDB | 5985 | — | non-standard; SSH-tunnel to browse |
| DLSU / ARCHERSNETWORK / LSCS issuer CouchDB | 9084 / 9085 / 9086 | — | |

- **~17 containers** Up · **6 wallet identities** · **3 issuer routing rows** · chaincode `chaincert`
  v1.0 committed with `[DLSUMSP: true, Org1MSP: true, Org2MSP: true]`.
- **VM user/home:** `chaincert` / `/home/chaincert`.

---

## Appendix A: VM Gotchas & Troubleshooting

*(Items 1-6 were debugged live on 2026-07-04; item 7 is a recurring operational issue. Repo fixes are committed, so a fresh clone shouldn't hit
them — but a stale clone or different box might.)*

1. **`deployCC` → "dial unix /host/var/run/docker.sock: no such file or directory."** The peer's socket
   mount and `CORE_VM_ENDPOINT` disagree. Fix:
   `sed -i 's|:/run/docker.sock|:/host/var/run/docker.sock|g' ~/fabric-samples/fabric-samples/test-network/compose/docker/docker-compose-test-net.yaml`,
   then recreate the peers (#2). *(Now fixed in `deploy-sync.sh`.)*
2. **docker-compose v1 crashes on `--force-recreate`** (`KeyError: 'ContainerConfig'` on Docker 29) and
   leaves `<id>_peer…` **zombie containers**. **Never `--force-recreate`.** Instead:
   `docker ps -a --format '{{.Names}}' | grep peer0.org1.example.com | xargs -r docker rm -f`, then
   `docker-compose -f compose/compose-test-net.yaml -f compose/compose-couch.yaml -f compose/docker/docker-compose-test-net.yaml up -d --no-deps peer0.org1.example.com peer0.org2.example.com`.
3. **CouchDB startup race:** `curl -X PUT` DB creates right after a fresh CouchDB container fail with
   "Recv failure: Connection reset by peer." Wait ~2s and re-run the PUTs (idempotent).
4. **Frontend build: "Can't resolve 'dompurify'."** `jspdf@4` needs it. `npm install dompurify`.
   *(Now a direct dep in `package.json`.)*
5. **Subordinate wallet import: "cert.pem not found."** The wallet script's read-path ≠ the enroll `-M`
   path. Both ARCHERSNETWORK and LSCS are now on **Convention B**
   (`delasalleuniversity-subordinate-<org>@dlsu.example.com`). Enroll to the folder the script reads.
6. **Leaked PAT / SSH password:** never embed a PAT in a git remote URL (it lands in `.git/config`) or
   paste a password into a shared doc. If done: `git remote set-url origin https://github.com/…` (no
   token) + **revoke the PAT**; `passwd` to rotate + share out-of-band.
7. **Notification emails not arriving.** In-app notifications appear but no email does. Check these
   four in order, most likely first:
   (a) **`SMTP_OVERRIDE_TO` is set** — the demo catch-all is redirecting everything to one inbox:
   `grep SMTP_ ~/chaincert-api/.env` (see the Pre-Demo Security Checklist for when to keep vs unset it).
   (b) **The network blocks outbound SMTP** — campus and office WiFi commonly do, phone hotspots
   usually do not: `curl -v telnet://smtp.gmail.com:587` (a hang means blocked).
   (c) **The recipient is a placeholder demo address** that does not exist.
   (d) **Spam folder.**
   Then confirm the send attempt reached the mail layer:
   `pm2 logs chaincert-api --lines 50 --nostream | grep -i mail`.
   *Expected result:* the log records a successful send and the message arrives at the real address.
   *(Note: all mail sends from one platform mailbox on behalf of issuers, not from each issuer's own
   domain — sending as an unauthorized domain without SPF/DKIM gets flagged as spam. Per-issuer
   sending addresses are future work.)*

---

## Appendix B: CCSCloud Access (SSH, tunnels, Proxmox)

- **SSH:** `ssh -p 20172 -o ServerAliveInterval=60 chaincert@ccscloud.dlsu.edu.ph`. **Office/campus WiFi
  firewalls port 20172** (silent timeout) → use a **phone hotspot or the DLSU VPN**.
- **Browse CouchDB (Fauxton) from your laptop** — the CouchDB ports aren't public, so **SSH-tunnel**:
  ```bash
  ssh -L 5985:localhost:5985 -L 9084:localhost:9084 -L 9085:localhost:9085 -L 9086:localhost:9086 -p 20172 chaincert@ccscloud.dlsu.edu.ph
  ```
  then open `http://localhost:5985/_utils` (login `admin`/`adminpw`).
- **Proxmox** (VM console): `https://ccscloud.dlsu.edu.ph`. The web console does **not** support paste —
  always SSH from your laptop for real work. (VM/Proxmox credentials live in the team's password store,
  never in git.)
- **A reboot ≠ redeploy** — with the Phase-14 persistence in place, containers + API auto-return on
  reboot; nothing to rebuild.

---

## Appendix C: Updating a Running Deployment (Day-2 Operations)

> The VM counterpart to the local `Copy Commands.md` + `Redeploy CC Instructions.md`.
> **Key idea: `deploy-sync.sh` replaces the manual `cp` dance.** It re-copies code from `~/chaincert-src`
> into the runtime dirs and **never touches `wallet/` or `.env`**.

### C.1 Backend change (controller / route / service / `sdk-server-fixed.js` / `couchDB_service.js`)
```bash
cd ~/chaincert-src
git pull origin AFTER-Defense    # prompts: Username = kaijustintan, Password = PASTE YOUR PAT (not your GitHub password)
bash ~/chaincert-src/deploy-sync.sh
pm2 restart chaincert-api
pm2 logs chaincert-api --lines 20 --nostream && curl -s http://localhost:4000/api/health
```
> **The PAT prompt (git):** GitHub disabled plain-password auth, so `git pull` asks for a **Personal Access
> Token** as the password. Generate a fresh short-lived one at *github.com → Settings → Developer settings →
> Personal access tokens* if yours expired. If `git pull` **never** prompts, a token is baked into the remote
> URL — check `git remote -v` and scrub it (see C.6). The same `git pull origin AFTER-Defense` line begins the
> frontend (C.2) and chaincode (C.3) flows too.

> **If `git pull` aborts with "Your local changes to `package.json` would be overwritten by merge":** the VM's
> `package.json` was dirtied by a direct `npm install` on the VM (e.g. the Phase 13 `dompurify` step), so it
> diverges from the repo. Discard the local edit and re-pull — the dependency is restored by `npm install`:
> ```bash
> git diff package.json                                 # confirm it's only the dependency line (e.g. dompurify)
> git checkout -- package.json
> git pull origin AFTER-Defense
> grep -q dompurify package.json || npm install dompurify   # re-add only if the pulled file lacks it
> npm install
> ```

### C.2 Frontend change (pages / components / services / styles)
```bash
cd ~/chaincert-src && git pull
npm install                     # only if package.json changed
CI=false npm run build          # Nginx serves the new build/ immediately — no reload needed
```

### C.3 Chaincode change (`chaincode/index.js`) — the redeploy dance
```bash
cd ~/chaincert-src && git pull
bash ~/chaincert-src/deploy-sync.sh          # copies chaincode → ~/chaincert-chaincode
cd ~/fabric-samples/fabric-samples/test-network
# switch to the DLSU peer context, then:
cp ~/chaincert-src/backend/node_creation/dlsu/configtx-DEFAULT.yaml configtx/configtx.yaml
./network.sh deployCC -c chaincert-channel -ccn chaincert -ccl javascript -ccp ~/chaincert-chaincode -ccv <BUMP>   # 1.0 → 2.0 → …
cp ~/chaincert-src/backend/node_creation/dlsu/configtx-WITHDLSU.yaml configtx/configtx.yaml
# DLSU install + approveformyorg + (commit if sequence bumped), then:
pm2 restart chaincert-api
```
- **Bump `-ccv` every redeploy.** The docker.sock fix is already in the compose, so builds work — but if
  peers get recreated, use **`rm -f` + `up`, never `--force-recreate`** (Appendix A #2).

### C.4 Backend env / config change (`~/chaincert-api/.env`)
```bash
nano ~/chaincert-api/.env         # deploy-sync never overwrites this — safe to hand-edit
pm2 restart chaincert-api         # the API loads .env via dotenv at BOOT, so a plain restart re-reads it —
                                  # PM2's "Use --update-env to update environment variables" hint is safe to ignore
```

### C.4b Frontend env change (`~/chaincert-src/.env.production`)
Frontend `REACT_APP_*` vars are baked in at **build time** (CRA), not read at runtime — so a **rebuild**, not a
restart, applies them. `deploy-sync` never overwrites this file either. Example (the UAT toggles):
```bash
nano ~/chaincert-src/.env.production      # e.g. REACT_APP_ALLOW_PAST_EXPIRY=true, REACT_APP_DISABLE_ISSUER_TOGGLE=true
cd ~/chaincert-src && CI=false npm run build
```

### C.5 Predemo reset (clean demo data)
Fabric's ledger is append-only, so a truly clean slate needs a full teardown + re-provision (Phase 2 →
Phase 15). For a lighter reset, status-flip / re-seed existing records.

### C.6 Prerequisite — credential-clean git remote
The VM remote must be token-less (`git remote -v` shows no `ghp_…`). `git pull` prompts for a fresh,
short-lived PAT each time — don't bake a token into the remote URL.

### C.7 Live logs (watch while the system is in use)
Run any of these in a spare SSH session while demoing / testing. `Ctrl+C` to stop (does not affect the service).
```bash
pm2 logs chaincert-api                         # live API logs (stream)
pm2 logs chaincert-api --lines 100             # live API logs + last 100 lines of backscroll
docker logs -f peer0.dlsu.example.com          # live DLSU peer / chaincode-container logs
sudo tail -f /var/log/nginx/access.log         # live Nginx requests (frontend + /api proxy)
sudo tail -f /var/log/nginx/error.log          # live Nginx errors (502s, upstream failures)
pm2 monit                                      # live dashboard: CPU/mem + logs for all PM2 apps
```
- **API not responding?** `pm2 logs chaincert-api` first — boot errors (missing `JWT_SECRET`, Fabric/CouchDB
  connect failures) surface here.
- **Frontend 502 / blank?** `sudo tail -f /var/log/nginx/error.log` — usually the API is down or `/api` proxy
  target is wrong.
- **Chaincode invoke failing?** `docker logs -f peer0.dlsu.example.com` — endorsement / build errors show here.

---

> **Cross-references:** `CAP2 - Deployment Manual Addendum (CAP1 Deltas + Groupmate Journey).md`
> (deltas + gotchas rationale) ·
> `CAP-2459-IT-INSTALLATION-MANUAL.md` (the local/CAP1 sibling this parallels) · `deploy-sync.sh`.
