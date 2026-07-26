<!-- Auto-generated Markdown reference from "CAP-2459-IT-INSTALLATION-MANUAL.pdf". The PDF remains the human-readable source of truth. -->

# ChainCert — Full Installation & Setup Manual

**ChainCert** — Blockchain-Based Credential Issuance and Verification Platform
March 25, 2026 — CAP-2459-IT

## Table of Contents

- Phase 0: System Identity Architecture (Key Concepts)
- Deployment Architecture Note
- Phase 1: Environment Setup (WSL2, Ubuntu, Node.js)
- Phase 2: Hyperledger Fabric Installation
- Phase 3: Chaincode Development Setup
- Phase 4: Backend API Setup
- Phase 5: Copy Project Files from Windows to Ubuntu
- Phase 6: CouchDB Admin Database Setup
- Phase 7: Start the Fabric Network
- Phase 8: Create Chaincert Admin Identity
- Phase 9: Root Authority (DLSU) Organization Node Creation
- Phase 10: Import DLSU Admin into Backend Wallet
- Phase 11: Create Subordinate Issuer (ARCHERSNETWORK)
- Phase 12: Create Subordinate Issuer (La Salle Computer Society)
- Phase 13: Start Issuer CouchDB Containers
- Final System State
- Appendix A: Master Copy Commands Reference
- Appendix B: Troubleshooting

---

## Phase 0: System Identity Architecture

Before starting the installation, it is critical to distinguish between the different types of identities used in the ChainCert ecosystem. Mixing these up is the most common cause of setup failure.

### Identity Breakdown Table

| Identity Type | Example | Purpose |
|---|---|---|
| System Admin Account | `admin@email.com` | Login to Web Dashboard (stored in CouchDB) |
| Fabric Admin Identity / Issuer Fabric Identity | `chaincert-admin` | Performs Blockchain Operations (e.g., registering new issuers) |
| Root Authority Identity | `delasalleuniversity-admin` | Root Authority that signs and issues credentials |
| Subordinate Identity | `delasalleuniversity-subordinate-archersnetwork` | Department authorized to issue under the Root |
| Subordinate Identity | `delasalleuniversity-subordinate-lasallecomputersociety` | Department authorized to issue under the Root |

### Deployment Architecture Note

This installation manual documents the complete setup procedure for **Design 1 (Platform Model)** — the current ChainCert deployment, where all infrastructure (peers, orderers, CAs, CouchDB instances) is managed and operated by ChainCert on a single server. This is the deployment model used for the prototype and is sufficient to demonstrate the system's full credential issuance, verification, and auditability capabilities.

ChainCert's architecture supports two additional deployment models:

1. **Design 2 (Hybrid)** — Issuers deploy their own peer, CA, and CouchDB on their own servers while ChainCert retains governance authority. Key differences from this manual:
   - The issuer executes Phases 9–13 on their own infrastructure using a deployment kit provided by ChainCert.
   - Connection profiles change from `localhost` to the issuer's server address.
   - Gateway discovery `asLocalhost` changes from `true` to `false` in the backend configuration.
2. **Design 3 (Full Consortium)** — Same infrastructure as Design 2, but the `configtx.yaml` Admins policy changes from `OR(Org1MSP.admin)` to `MAJORITY(all member MSPs)`, requiring channel configuration updates to be signed by multiple existing organizations before a new org can join.

For detailed technical guidance on Design 2 and Design 3 deployment processes, refer to the Technical Manual (CAP-2459-IT), Section 19: Scalability and Future Architecture.

---

## Phase 1: Environment Setup

### 1.1 Install WSL2

**Directory:** Windows PowerShell (Run as Administrator)

```powershell
wsl --install
```

**What it does:** Installs Windows Subsystem for Linux (WSL2) along with the default Ubuntu distribution. This allows you to run a Linux environment directly within Windows.

**Expected Output:**
```
Installing: Ubuntu
Installation successful. Restart required.
```

**Rationale:** Hyperledger Fabric and Docker are designed to run in Linux environments. WSL2 provides a lightweight Linux environment that allows these tools to run without needing a full virtual machine.

Source: OG SETUP

> **Note:** If WSL is already installed, this command may return an error such as 'WSL is already installed.' This is expected and can be safely ignored.

### 1.2 Set WSL Default Version

**Directory:** Windows PowerShell (Administrator)

```powershell
wsl --set-default-version 2
```

**What it does:** Configures WSL so that any installed Linux distribution runs using WSL2, which provides improved virtualization and kernel compatibility.

**Expected Output:**
```
The operation completed successfully.
```

**Rationale:** WSL2 uses a full Linux kernel which is required for Docker container support and Hyperledger Fabric networking.

Source: OG SETUP

### 1.3 Verify WSL Installation

**Directory:** Windows PowerShell

```powershell
wsl -l -v
```

**What it does:** Displays all installed WSL distributions along with their running state and WSL version.

**Expected Output:**
```
NAME    STATE    VERSION
Ubuntu  Running  2
```

**Rationale:** This step confirms that Ubuntu is installed and running under WSL2, ensuring compatibility with Docker and Fabric tools.

Source: OG SETUP

> **Note:** The STATE may show 'Stopped' if the distribution is not currently running. A 'docker-desktop' entry may also appear — this is normal.

### 1.4 Prepare Ubuntu Environment

**Directory:** Ubuntu Terminal (WSL)

```bash
sudo apt update && sudo apt upgrade -y
```

**What it does:** Updates Ubuntu's package lists and upgrades all installed system packages to the latest versions available.

**Expected Output:**
```
Reading package lists... Done
Building dependency tree
Calculating upgrade... Done
```

**Rationale:** Ensures the Linux environment has up-to-date dependencies and security patches before installing development tools such as Node.js and Hyperledger Fabric.

Source: OG SETUP

> **Note:** Actual output will be significantly more verbose than shown. The key indicator of success is the final line showing upgrade completion with no errors.

### 1.5 Install Essential Development Tools

**Directory:** Ubuntu Terminal (WSL)

```bash
sudo apt install curl wget git -y
```

**What it does:** Installs essential command-line tools: `curl` (download scripts), `wget` (file downloader), `git` (version control).

**Expected Output:**
```
Setting up curl...
Setting up git...
```

**Rationale:** These utilities are required for downloading Hyperledger Fabric binaries, cloning repositories, and running installation scripts.

Source: OG SETUP

### 1.6 Install Node.js v18

**Directory:** Ubuntu Terminal (WSL)

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**What it does:** Adds the NodeSource repository and installs Node.js version 18, including npm.

**Expected Output:**
```
node --version  v18.x.x
npm --version   9.x.x
```

**Rationale:** Node.js is required for running Fabric chaincode written in JavaScript and running the ChainCert backend API.

Source: OG SETUP

---

## Phase 2: Hyperledger Fabric Installation

### 2.1 Download Fabric Samples and Binaries

**Directory:** Ubuntu Terminal (WSL)

```bash
mkdir -p ~/fabric-samples
cd ~/fabric-samples
curl -sSL https://bit.ly/2ysbOFE | bash -s -- 2.5.14 1.5.5
```

**What it does:** Downloads the official Hyperledger Fabric samples repository, including Fabric CLI binaries, Docker container images, and example networks (such as test-network).

> **VERSION NOTE:** This Capstone-1 local development setup uses Hyperledger Fabric **2.5.14**. The Capstone-2 cloud deployment (CCSCloud VM) pins Fabric **2.5.16** to stay compatible with Docker Engine 29, which breaks Fabric 2.5.14 chaincode builds. If deploying on Docker 29, substitute `2.5.16` above.

**Expected Output:**
```
Installing Hyperledger Fabric binaries
Pulling fabric-peer image
Pulling fabric-orderer image
```

**Rationale:** The test-network inside this repository serves as the base blockchain infrastructure for the ChainCert project.

Source: OG SETUP

### 2.2 Add Fabric Binaries to PATH

**Directory:** Ubuntu Terminal

```bash
echo 'export PATH=$PATH:~/fabric-samples/fabric-samples/bin' >> ~/.bashrc
source ~/.bashrc
```

**What it does:** Adds Hyperledger Fabric CLI binaries to the global system path so commands like `peer`, `configtxgen`, and `configtxlator` can be executed from any directory.

**Rationale:** Without adding the Fabric binaries to PATH, you would need to manually navigate to the Fabric bin directory before running Fabric commands.

Source: OG SETUP

> **IMPORTANT:** Single quotes are required to prevent `$PATH` from expanding immediately. On WSL2, the Windows PATH contains spaces and parentheses (e.g. `Program Files (x86)`) that would corrupt `.bashrc` if expanded. The correct path is `fabric-samples/fabric-samples/bin` because the bootstrap script clones the repository as a subdirectory.

---

## Phase 3: Chaincode Development Setup

### 3.1 Create Chaincode Directory

**Directory:** Ubuntu Terminal

```bash
mkdir -p ~/chaincert-chaincode
cd ~/chaincert-chaincode
```

**What it does:** Creates the project directory where the ChainCert smart contract (chaincode) will be stored.

**Rationale:** Separating the chaincode into its own directory keeps the blockchain logic isolated from the backend API.

Source: OG SETUP

### 3.2 Initialize Node Project

**Directory:** `~/chaincert-chaincode`

```bash
npm init -y
```

**What it does:** Creates a `package.json` file which manages dependencies for the chaincode project.

**Rationale:** NodeJS chaincode requires a `package.json` file to manage dependencies such as Fabric libraries.

Source: OG SETUP

### 3.3 Install Fabric Chaincode Libraries

**Directory:** `~/chaincert-chaincode`

```bash
npm install fabric-contract-api fabric-shim
```

**What it does:** Installs the Fabric libraries required to write and run smart contracts.

**Rationale:** The `fabric-contract-api` library allows developers to implement blockchain logic using JavaScript classes.

Source: OG SETUP

---

## Phase 4: Backend API Setup

### 4.1 Create Backend Directory

**Directory:** Ubuntu Terminal

```bash
mkdir -p ~/chaincert-api
cd ~/chaincert-api
```

**What it does:** Creates the directory that will contain the ChainCert backend API.

**Rationale:** This directory hosts the NodeJS backend responsible for interacting with the blockchain network.

Source: OG SETUP

### 4.2 Initialize Backend Project

**Directory:** `~/chaincert-api`

```bash
npm init -y
```

**What it does:** Creates the `package.json` configuration file for the backend project.

**Rationale:** The backend API requires dependency management for packages such as Express, Fabric SDK, and authentication libraries.

Source: OG SETUP

### 4.3 Install Backend Dependencies

**Directory:** `~/chaincert-api`

```bash
npm install express cors fabric-network fabric-ca-client jsonwebtoken bcryptjs multer dockerode node-cron nodemailer nano dotenv
# Install frontend dependencies (run from Windows project folder)
npm install jspdf qrcode
```

**What it does:** Installs backend dependencies: Express (REST API server), Fabric SDK (blockchain interaction), JWT (authentication), bcrypt (password hashing), multer (file uploads), dockerode (Docker control), node-cron (credential expiry automation), nodemailer (email OTP), nano (CouchDB client), dotenv (environment variables).

**Rationale:** These libraries enable the backend API to authenticate users, interact with blockchain, manage document uploads, and control Docker containers. Node-cron allows the system to periodically check for credentials whose expiration date has passed.

Source: COPY COMMANDS / OG SETUP

---

## Phase 5: Copy Project Files from Windows to Ubuntu

### 5.1 Execute Global Copy Commands

> **NOTE:** Refer to Appendix A: Copy Commands Reference at the end of this manual for the full list of specific commands required to sync your environment.

**Directory:** Ubuntu Terminal (WSL)

**Command (Example):**

```bash
cp "/mnt/c/Users/<USERNAME>/<PATH_TO_PROJECT>/backend/sdk-server-fixed.js" ~/chaincert-api/sdk-server-fixed.js
```

**What it does:** Transfers the necessary application and configuration files from the Windows filesystem directly into the corresponding Ubuntu directories.

**Rationale:** By using the full path starting from `/mnt/c/`, files can be moved in a single command without needing to change directories first. This ensures all backend, chaincode, and network configuration files are placed in their required runtime locations.

Source: COPY COMMANDS

> **IMPORTANT:** Before copying `issuerRequirements.js`, create the `config/` directory first:
> ```bash
> mkdir -p ~/chaincert-api/config
> ```
> Then copy:
> ```bash
> cp "<PROJECT_ROOT>/backend/issuerRequirements.js" ~/chaincert-api/config/issuerRequirements.js
> ```
> The `config/` directory does not exist by default. Without it, the `cp` command fails and the backend will crash when processing issuer registrations.

> **IMPORTANT:** Shell scripts copied from Windows will have Windows line endings (`\r\n`) that bash cannot parse. After copying any `.sh` file, run:
> ```bash
> sed -i 's/\r//' <filename>.sh
> ```
> This removes the carriage return characters. This is required for `registerEnrollFORDLSU.sh` and any other shell scripts.

---

## Phase 6: CouchDB Admin Database Setup

> **NOTE:** Phase 6.3 requires the backend API to be running on port 4000. Start the backend first with:
> ```bash
> cd ~/chaincert-api && node sdk-server-fixed.js
> ```

### 6.1 Start CouchDB Container

**Directory:** Ubuntu Terminal

```bash
docker run -d \
 --name couchdb-admin \
 -p 5985:5984 \
 -e COUCHDB_USER=admin \
 -e COUCHDB_PASSWORD=adminpw \
 apache/couchdb:latest
```

**What it does:** Creates a CouchDB container used to store issuer records, user accounts, and notification logs.

**Expected Output:** Docker returns a container ID indicating successful startup.

**Rationale:** The backend API uses CouchDB as a database to manage system records separate from the blockchain ledger.

Source: OG SETUP

### 6.2 Create Required Databases

**Directory:** Ubuntu Terminal

```bash
curl -X PUT http://admin:adminpw@localhost:5985/users
curl -X PUT http://admin:adminpw@localhost:5985/issuers
curl -X PUT http://admin:adminpw@localhost:5985/user_notifications
curl -X PUT http://admin:adminpw@localhost:5985/couchdb_connections
curl -X PUT http://admin:adminpw@localhost:5985/profile_share_links
curl -X PUT http://admin:adminpw@localhost:5985/admin_notifications
curl -X PUT http://admin:adminpw@localhost:5985/wallet_user_credentials
```

**What it does:** Creates all seven required databases for the ChainCert admin CouchDB instance.

**Expected Output:** CouchDB returns: `{"ok":true}`

**Rationale:** These databases store system metadata used by the backend application:
- `users` — user accounts and admin accounts
- `issuers` — issuer registration records and status
- `user_notifications` — student/user credential notifications
- `couchdb_connections` — maps issuer IDs to their CouchDB URLs
- `profile_share_links` — share link tokens, expiry, view tracking
- `admin_notifications` — admin dashboard notification events
- `wallet_user_credentials` — user-side credential copies (student wallets)

Source: OG SETUP

### 6.3 Create System Admin Account

**Directory:** Ubuntu Terminal (WSL)

> **PREREQUISITE (hardened backend):** `/api/auth/register` now requires `JWT_SECRET` to be set in `~/chaincert-api/.env` (the API refuses to boot without it) and, by default, a valid signup-OTP token. For a scripted/`curl` admin creation like the one below, set `DISABLE_SIGNUP_OTP=true` in `~/chaincert-api/.env` first so the OTP gate is bypassed. See the env-var table in `Installation Dependencies.md`. (Unset `DISABLE_SIGNUP_OTP` again before a real demo.)

```bash
curl -X POST http://localhost:4000/api/auth/register \
 -H "Content-Type: application/json" \
 -d '{
   "username": "admin",
   "email": "admin@email.com",
   "password": "<ADMIN_PASSWORD>",
   "role": "admin"
 }'

curl -X POST http://localhost:4000/api/auth/register \
 -H "Content-Type: application/json" \
 -d '{
   "username": "admin2",
   "email": "admin2@email.com",
   "password": "<ADMIN_PASSWORD>",
   "role": "admin"
 }'
```

**What it does:** Registers the initial system administrator accounts used to access the admin dashboard. These accounts are stored in the `users` CouchDB database and allow administrative operations such as approving issuer registrations, viewing system users, managing credentials, and approving subordinate issuers.

**Expected Output:** `{ "success": true, "message": "User registered successfully" }`

**Rationale:** The system requires at least one administrative account to approve issuer registrations and manage the platform. Without creating this account, no administrator would exist to approve root authorities or subordinate issuers.

Source: PREREQUISITES (Admin Dashboard Setup)

---

## Phase 7: Start the Fabric Network

> Before starting the network, verify no conflicting containers are running: `docker ps`. If containers from a previous session are still running, stop them with: `docker stop $(docker ps -aq)`

### 7.1 Navigate to Test Network Directory

**Directory:** Ubuntu Terminal

```bash
cd ~/fabric-samples/fabric-samples/test-network
```

**What it does:** Moves into the Fabric test network directory where network scripts are located.

**Rationale:** All Fabric network lifecycle commands must be executed from this directory.

Source: NODE CREATION

### 7.2 Start Fabric Network and Create Channel

**Directory:** `~/fabric-samples/fabric-samples/test-network`

```bash
./network.sh up createChannel -ca -s couchdb -c chaincert-channel
```

**What it does:** Starts the Fabric blockchain network (peers, orderer, CAs, CouchDB) and creates the `chaincert-channel`. Docker containers for peer nodes, orderer, certificate authorities, and CouchDB will start.

**Rationale:** The Fabric network must be running before smart contracts and organizations can interact with the blockchain.

Source: NODE CREATION

---

## Phase 8: Create Chaincert Admin Identity

### 8.1 Set CA Client Home Directory

**Directory:** `~/fabric-samples/fabric-samples/test-network`

```bash
export FABRIC_CA_CLIENT_HOME=${PWD}/organizations/peerOrganizations/org1.example.com/
```

**What it does:** Sets the Fabric CA client working directory to Org1's MSP directory. This tells the CA client which admin enrollment credentials to use for authenticating the register command. Without this, the CA client will not find valid enrollment information and will fail with 'Enrollment information does not exist.'

**Rationale:** The `fabric-ca-client` command needs to know which organization's admin enrollment to use for authentication. Setting `FABRIC_CA_CLIENT_HOME` points it to Org1's MSP where the admin certificate and private key reside.

Source: PREREQUISITES

### 8.2 Register Fabric Admin Identity

**Directory:** `~/fabric-samples/fabric-samples/test-network`

```bash
fabric-ca-client register \
 --caname ca-org1 \
 --id.name chaincertadmin \
 --id.secret chaincertadminpw \
 --id.type client \
 --tls.certfiles "${PWD}/organizations/fabric-ca/org1/ca-cert.pem"
```

**What it does:** Registers a new identity in the Fabric Certificate Authority.

**Rationale:** This step defines the admin identity in the CA database. The `--tls.certfiles` flag is required for TLS-enabled CA communication.

Source: PREREQUISITES

### 8.3 Enroll Fabric Admin Identity

**Directory:** `~/chaincert-api`

```bash
node enrollChaincertAdmin.js
```

**What it does:** Creates the Fabric identity and stores it inside the backend wallet at `wallet/chaincert-admin.id`.

**Expected Output:** A file appears inside: `wallet/chaincert-admin.id`

**Rationale:** The backend API uses this identity to sign blockchain transactions.

Source: PREREQUISITES

---

## Phase 9: Root Authority (DLSU) Organization Node Creation

This phase includes deploying the DLSU Certificate Authority, registering/enrolling the DLSU admin and peer, generating MSP artifacts, creating the organization definition, updating the channel configuration, starting the DLSU peer, joining it to the channel, and installing/approving chaincode.

### 9.1 Prepare DLSU Directory Structure

> **IMPORTANT:** At this point, other DLSU-Related directories were already created during Phase 5 upon following Appendix A.5

**Directory:** `~/fabric-samples/fabric-samples/test-network`

```bash
mkdir -p organizations/fabric-ca/dlsu
```

**What it does:** Creates the directory structure required for DLSU organization files (compose files, CA scripts, etc.).

**Rationale:** The DLSU node requires dedicated directories for Docker Compose files, CA enrollment scripts, and peer configuration.

Source: NODE CREATION

### 9.2 Deploy DLSU Certificate Authority

**Directory:** `~/fabric-samples/fabric-samples/test-network`

```bash
docker-compose -f addDLSU/compose/compose-ca-dlsu.yaml up -d
```

**What it does:** Deploys the DLSU Certificate Authority container.

**Rationale:** Essential for managing DLSU-specific identities.

Source: NODE CREATION

### 9.3 Register and Enroll DLSU Admin and Peer

**Directory:** `~/fabric-samples/fabric-samples/test-network`

**Step 1 — Fix Windows Line Endings:**

```bash
sed -i 's/\r//' addDLSU/fabric-ca/registerEnroll.sh
```

Removes Windows carriage return characters (`\r`) from the script. Files copied from Windows via `/mnt/c/` have `\r\n` line endings which bash cannot parse.

**Step 2 — Run Enrollment Script:**

```bash
cd addDLSU/fabric-ca
source registerEnroll.sh createDLSU
```

Registers and enrolls the DLSU admin and peer identities with the DLSU Certificate Authority. Generates the MSP artifacts required for DLSU to participate in the network.

> **IMPORTANT:** The script must be run from `addDLSU/fabric-ca/` because it uses `../../` relative paths to locate CA certificates and MSP directories. Running from `test-network/` will cause 'no such file or directory' errors.

Source: NODE CREATION

### 9.4 Copy configtx-WITHDLSU.yaml

**Directory:** `~/fabric-samples/fabric-samples/test-network`

```bash
cp "<PROJECT_ROOT>/backend/node_creation/dlsu/configtx-WITHDLSU.yaml" \
 ~/fabric-samples/fabric-samples/test-network/configtx/configtx.yaml
```

**What it does:** Replaces the active channel configuration file with the version that includes DLSU's organization definition. Phase 5 copies `configtx-DEFAULT.yaml` which only defines Org1 and Org2. The `configtxgen` command in the next step requires DLSU to be defined in the active `configtx.yaml` before it can generate `DLSUMSP.json`.

> **TIMING:** `configtx-DEFAULT.yaml` is used for the initial network startup (Phase 7) with only Org1 and Org2. `configtx-WITHDLSU.yaml` must be copied here because DLSU must be defined before `configtxgen -printOrg DLSUMSP` can succeed.

Source: NODE CREATION

### 9.5 Generate DLSU Organization Definition

**Directory:** `~/fabric-samples/fabric-samples/test-network`

```bash
cd configtx
export FABRIC_CFG_PATH=$PWD
configtxgen -printOrg DLSUMSP > ../addDLSU/DLSUMSP.json
```

**What it does:** Generates the DLSU organization definition file (`DLSUMSP.json`) which is used to add DLSU to the channel configuration.

Source: NODE CREATION

### 9.6 Fetch and Decode Current Channel Configuration

**Directory:** `~/fabric-samples/fabric-samples/test-network`

```bash
export FABRIC_CFG_PATH=$PWD/../config
export ORDERER_CA=${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051

peer channel fetch config config_block.pb -o localhost:7050 \
 --ordererTLSHostnameOverride orderer.example.com \
 -c chaincert-channel --tls --cafile $ORDERER_CA

configtxlator proto_decode --input config_block.pb --type common.Block --output config_block.json
jq .data.data[0].payload.data.config config_block.json > config.json
```

**What it does:** Sets the CLI context to Org1 admin, fetches the latest channel configuration block from the orderer, and decodes it into editable JSON format.

### 9.7 Merge DLSU into Channel Configuration

**Directory:** `~/fabric-samples/fabric-samples/test-network`

```bash
jq -s '.[0] * {"channel_group":{"groups":{"Application":{"groups":{"DLSUMSP":.[1]}}}}}' config.json addDLSU/DLSUMSP.json > modified_config.json

configtxlator proto_encode --input config.json --type common.Config --output original_config.pb
configtxlator proto_encode --input modified_config.json --type common.Config --output modified_config.pb
configtxlator compute_update --channel_id chaincert-channel --original original_config.pb --updated modified_config.pb --output config_update.pb
```

**What it does:** Inserts DLSU's organization definition into the channel config JSON, encodes both the original and modified configs to protobuf, and computes the delta (only the changes).

### 9.8 Prepare Channel Update Envelope

**Directory:** `~/fabric-samples/fabric-samples/test-network`

```bash
configtxlator proto_decode --input config_update.pb --type common.ConfigUpdate > config_update.json

jq -n '{payload: {header: {channel_header: {channel_id: "chaincert-channel", type: 2}}, data: {config_update: (input)}}}' config_update.json > config_update_in_envelope.json

configtxlator proto_encode --input config_update_in_envelope.json --type common.Envelope --output config_update_in_envelope.pb
```

**What it does:** Wraps the channel config delta in an envelope that can be signed and submitted to the orderer.

### 9.9 Sign and Submit Channel Update

**Directory:** `~/fabric-samples/fabric-samples/test-network`

```bash
# Sign as Org1
peer channel signconfigtx -f config_update_in_envelope.pb

# Switch to Org2 admin and sign
export CORE_PEER_LOCALMSPID="Org2MSP"
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt
export CORE_PEER_ADDRESS=localhost:9051

peer channel signconfigtx -f config_update_in_envelope.pb

# Switch back to Org1 and submit
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_ADDRESS=localhost:7051

peer channel update -f config_update_in_envelope.pb -c chaincert-channel -o localhost:7050 \
 --ordererTLSHostnameOverride orderer.example.com --tls --cafile $ORDERER_CA
```

**What it does:** Both Org1 and Org2 cryptographically sign the channel update (satisfying the channel's modification policy), then Org1 submits it to the orderer. After this, DLSU is officially recognized as a channel member.

### 9.10 Start DLSU Peer Container

**Directory:** `~/fabric-samples/fabric-samples/test-network`

```bash
# Switch to DLSU admin
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="DLSUMSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/dlsu.example.com/peers/peer0.dlsu.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/dlsu.example.com/users/Admin@dlsu.example.com/msp
export CORE_PEER_ADDRESS=localhost:12051

# Start DLSU peer
cd addDLSU/compose
docker-compose -f compose-dlsu.yaml up -d
cd ../..
```

**What it does:** Sets the CLI context to DLSU admin and starts the DLSU peer container.

### 9.11 Join DLSU Peer to Channel

**Directory:** `~/fabric-samples/fabric-samples/test-network`

```bash
peer channel fetch 0 channel-artifacts/chaincert-channel.block -o localhost:7050 \
 --ordererTLSHostnameOverride orderer.example.com \
 -c chaincert-channel --tls --cafile \
 "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem"

docker exec \
 -e CORE_PEER_TLS_ENABLED=true \
 -e CORE_PEER_LOCALMSPID="DLSUMSP" \
 -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/dlsu.example.com/peers/peer0.dlsu.example.com/tls/ca.crt \
 -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/dlsu.example.com/users/Admin@dlsu.example.com/msp \
 -e CORE_PEER_ADDRESS=localhost:12051 \
 peer0.dlsu.example.com \
 peer channel join -b channel-artifacts/chaincert-channel.block

# Verify the peer is part of chaincert-channel
docker exec peer0.dlsu.example.com peer channel list
```

**What it does:** Fetches the channel genesis block and runs the join command inside the DLSU peer container so it officially joins `chaincert-channel` and starts syncing the ledger. After, verify if successful.

### 9.12 Deploy and Approve Chaincode for DLSU

**Directory:** `~/fabric-samples/fabric-samples/test-network`

```bash
# Deploy chaincode to the network (Org1 and Org2)
./network.sh deployCC \
 -c chaincert-channel \
 -ccn chaincert \
 -ccl javascript \
 -ccp ~/chaincert-chaincode \
 -ccv 1.0

# As DLSU admin, install the chaincode
peer lifecycle chaincode install chaincert.tar.gz

# Get the package ID (copy the full ID from the output)
peer lifecycle chaincode queryinstalled

# Approve as DLSU (replace package-id with actual value from queryinstalled)
peer lifecycle chaincode approveformyorg -o localhost:7050 \
 --ordererTLSHostnameOverride orderer.example.com \
 --channelID chaincert-channel \
 --name chaincert \
 --version 1.0 \
 --package-id <PASTE_PACKAGE_ID_HERE> \
 --sequence 1 \
 --tls \
 --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem"

# Verify all 3 orgs approved
peer lifecycle chaincode querycommitted --channelID chaincert-channel --name chaincert
```

**What it does:** Deploys chaincode to the network (Org1 and Org2 automatically), installs it on DLSU's peer, and DLSU approves it. The final verify command should show `Approvals: [DLSUMSP: true, Org1MSP: true, Org2MSP: true]`.

> **Note:** The `--package-id` value is unique to each installation. Copy the exact value from the `queryinstalled` output — it looks like `chaincert_1.0:1933927ebeca046496a17254a40fb15b58a36e09238099b40c49138d83232a19`.

---

## Phase 10: Import DLSU Admin into Backend Wallet

### 10.1 Import DLSU Wallet Identity

**Directory:** `~/chaincert-api`

```bash
node setupWallet_DLSU.js
```

**What it does:** Reads the DLSU admin certificate and private key from the MSP directory and imports them into the backend wallet as `delasalleuniversity-admin` with mspId `DLSUMSP`.

**Expected Output:** A file appears inside: `wallet/delasalleuniversity-admin.id`

**Rationale:** The backend needs this wallet identity to submit blockchain transactions on behalf of DLSU (credential issuance, template creation, etc.).

Source: NODE CREATION

---

## Phase 11: Create Subordinate Issuer (ARCHERSNETWORK)

### 11.1 Set DLSU CA Context

**Directory:** `~/fabric-samples/fabric-samples/test-network`

```bash
export FABRIC_CA_CLIENT_HOME=${PWD}/organizations/peerOrganizations/dlsu.example.com/
```

**What it does:** Sets the CA client context to DLSU's organization so that subordinate identities are registered under DLSU's Certificate Authority.

Source: Manual subordinate workflow

### 11.2 Register Subordinate Identity

**Directory:** `~/fabric-samples/fabric-samples/test-network`

```bash
fabric-ca-client register \
 --caname ca-dlsu \
 --id.name delasalleuniversity-subordinate-archersnetwork \
 --id.secret archersnetworkpw \
 --id.type client \
 --tls.certfiles "${PWD}/organizations/fabric-ca/dlsu/ca-cert.pem"
```

**What it does:** Registers the ARCHERSNETWORK subordinate identity in DLSU's Certificate Authority. The identity type is 'client' because subordinates only need to submit transactions, not administer the peer or channel.

Source: Manual subordinate workflow

### 11.3 Enroll Subordinate Identity

**Directory:** `~/fabric-samples/fabric-samples/test-network`

```bash
fabric-ca-client enroll \
 -u https://delasalleuniversity-subordinate-archersnetwork:archersnetworkpw@localhost:12054 \
 --caname ca-dlsu \
 -M "${PWD}/organizations/peerOrganizations/dlsu.example.com/users/delasalleuniversity-subordinate-archersnetwork@dlsu.example.com/msp" \
 --tls.certfiles "${PWD}/organizations/fabric-ca/dlsu/ca-cert.pem"
```

**What it does:** Enrolls the registered identity, generating a certificate and private key pair. The MSP artifacts are stored in the DLSU organization's users directory.

Source: Manual subordinate workflow

### 11.4 Copy NodeOU Configuration

**Directory:** `~/fabric-samples/fabric-samples/test-network`

```bash
cp "${PWD}/organizations/peerOrganizations/dlsu.example.com/msp/config.yaml" \
 "${PWD}/organizations/peerOrganizations/dlsu.example.com/users/delasalleuniversity-subordinate-archersnetwork@dlsu.example.com/msp/config.yaml"
```

**What it does:** Copies the NodeOU configuration to the subordinate's MSP directory. This configuration file tells Fabric how to classify identities (admin, client, peer, orderer) based on their OU attributes.

Source: Manual subordinate workflow

### 11.5 Import Subordinate Wallet Identity

**Directory:** `~/chaincert-api`

```bash
node setup_Wallet_DLSU_Subordinate_ARCHERSNETWORK.js
```

**What it does:** Reads the ARCHERSNETWORK certificate and private key from the MSP directory and imports them into the backend wallet with mspId `DLSUMSP`.

**Expected Output:** A file appears inside: `wallet/delasalleuniversity-subordinate-archersnetwork.id`

**Rationale:** The backend needs this wallet identity to submit blockchain transactions on behalf of ARCHERSNETWORK.

Source: Manual subordinate workflow

### 11.6 Start Subordinate CouchDB Container

**Directory:** `~/fabric-samples/fabric-samples/test-network/addDLSU/compose`

```bash
docker-compose -f compose-couch-archersnetwork.yaml up -d
```

**What it does:** Starts the CouchDB container dedicated to the ARCHERSNETWORK subordinate issuer on port 9085.

**Rationale:** Each issuer has its own CouchDB container to isolate credential storage per organization.

Source: Manual subordinate workflow

### 11.7 Create Subordinate CouchDB Databases

```bash
curl -X PUT http://admin:adminpw@localhost:9085/wallet_issuer_credentials
curl -X PUT http://admin:adminpw@localhost:9085/issued_credentials
```

**What it does:** Creates the two required databases for the ARCHERSNETWORK issuer.

**Expected Output:** `{"ok":true}`

**Rationale:** `wallet_issuer_credentials` stores credential templates created by the issuer. `issued_credentials` stores issued credential instances.

Source: Manual subordinate workflow

### 11.8 Register couchdb_connections Entry

```bash
curl -X POST http://admin:adminpw@localhost:5985/couchdb_connections \
 -H "Content-Type: application/json" \
 -d '{
   "orgName": "archersnetwork",
   "couchDBUrl": "http://admin:adminpw@localhost:9085"
 }'
```

**What it does:** Registers the ARCHERSNETWORK CouchDB connection in the admin database so the backend can dynamically resolve the correct CouchDB instance during issuer approval and credential operations.

**Expected Output:** `{"ok":true, "id":"...", "rev":"..."}`

**Rationale:** The backend uses this mapping to dynamically connect to the correct issuer CouchDB when issuing credentials, running integrity checks, or loading issuer data.

Source: Manual subordinate workflow

> **IMPORTANT:** `orgName` must be lowercase. The backend normalizes `orgName` to lowercase before querying `couchdb_connections`. Using uppercase (e.g., `ARCHERSNETWORK`) will cause the approval process to fail with 'No CouchDB connection found.'

---

## Phase 12: Create Subordinate Issuer (La Salle Computer Society)

### 12.1 Set DLSU CA Context

**Directory:** `~/fabric-samples/fabric-samples/test-network`

```bash
export FABRIC_CA_CLIENT_HOME=${PWD}/organizations/peerOrganizations/dlsu.example.com/
```

**What it does:** Sets the CA client context to DLSU's organization for subordinate registration.

Source: Manual subordinate workflow

### 12.2 Register Subordinate Identity

**Directory:** `~/fabric-samples/fabric-samples/test-network`

```bash
fabric-ca-client register \
 --caname ca-dlsu \
 --id.name delasalleuniversity-subordinate-lasallecomputersociety \
 --id.secret lscspw \
 --id.type client \
 --tls.certfiles "${PWD}/organizations/fabric-ca/dlsu/ca-cert.pem"
```

**What it does:** Registers the La Salle Computer Society subordinate identity in DLSU's Certificate Authority.

Source: Manual subordinate workflow

### 12.3 Enroll Subordinate Identity

**Directory:** `~/fabric-samples/fabric-samples/test-network`

```bash
fabric-ca-client enroll \
 -u https://delasalleuniversity-subordinate-lasallecomputersociety:lscspw@localhost:12054 \
 --caname ca-dlsu \
 -M "${PWD}/organizations/peerOrganizations/dlsu.example.com/users/delasalleuniversity-subordinate-lasallecomputersociety@dlsu.example.com/msp" \
 --tls.certfiles "${PWD}/organizations/fabric-ca/dlsu/ca-cert.pem"
```

**What it does:** Enrolls the registered identity, generating certificate and private key pair.

Source: Manual subordinate workflow

### 12.4 Copy NodeOU Configuration

**Directory:** `~/fabric-samples/fabric-samples/test-network`

```bash
cp "${PWD}/organizations/peerOrganizations/dlsu.example.com/msp/config.yaml" \
 "${PWD}/organizations/peerOrganizations/dlsu.example.com/users/delasalleuniversity-subordinate-lasallecomputersociety@dlsu.example.com/msp/config.yaml"
```

**What it does:** Copies the NodeOU configuration to the subordinate's MSP directory.

Source: Manual subordinate workflow

### 12.5 Import Subordinate Wallet Identity

**Directory:** `~/chaincert-api`

```bash
node setup_Wallet_DLSU_Subordinate_LASALLECOMPUTERSOCIETY.js
```

**What it does:** Imports the La Salle Computer Society wallet identity into the backend.

**Expected Output:** A file appears inside: `wallet/delasalleuniversity-subordinate-lasallecomputersociety.id`

Source: Manual subordinate workflow

### 12.6 Start Subordinate CouchDB Container

**Directory:** `~/fabric-samples/fabric-samples/test-network/addDLSU/compose`

```bash
docker-compose -f compose-couch-lasallecomputersociety.yaml up -d
```

**What it does:** Starts the CouchDB container dedicated to the La Salle Computer Society subordinate issuer on port 9086.

**Rationale:** Each issuer has its own CouchDB container to isolate credential storage per organization.

Source: Manual subordinate workflow

### 12.7 Create Subordinate CouchDB Databases

```bash
curl -X PUT http://admin:adminpw@localhost:9086/wallet_issuer_credentials
curl -X PUT http://admin:adminpw@localhost:9086/issued_credentials
```

**What it does:** Creates the two required databases for the La Salle Computer Society issuer.

**Expected Output:** `{"ok":true}`

Source: Manual subordinate workflow

### 12.8 Register couchdb_connections Entry

```bash
curl -X POST http://admin:adminpw@localhost:5985/couchdb_connections \
 -H "Content-Type: application/json" \
 -d '{
   "orgName": "lasallecomputersociety",
   "couchDBUrl": "http://admin:adminpw@localhost:9086"
 }'
```

**What it does:** Registers the La Salle Computer Society CouchDB connection in the admin database.

**Expected Output:** `{"ok":true, "id":"...", "rev":"..."}`

Source: Manual subordinate workflow

---

## Phase 13: Start Issuer CouchDB Containers

### 13.1 Start DLSU CouchDB Container

**Directory:** `~/fabric-samples/fabric-samples/test-network/addDLSU/compose`

```bash
docker-compose -f compose-couch-dlsu.yaml up -d
```

**What it does:** Starts the CouchDB container dedicated to the DLSU root authority issuer on port 9084.

**Rationale:** The root authority issuer needs its own CouchDB container to store templates and issued credentials.

Source: NODE CREATION

### 13.2 Create DLSU Issuer Databases

```bash
curl -X PUT http://admin:adminpw@localhost:9084/wallet_issuer_credentials
curl -X PUT http://admin:adminpw@localhost:9084/issued_credentials
```

**What it does:** Creates the two required databases for the DLSU issuer CouchDB instance.

**Expected Output:** `{"ok":true}`

**Rationale:** `wallet_issuer_credentials` stores credential templates created by DLSU. `issued_credentials` stores issued credential instances.

Source: NODE CREATION

### 13.2A Register DLSU couchdb_connections Entry

```bash
curl -X POST http://admin:adminpw@localhost:5985/couchdb_connections \
 -H "Content-Type: application/json" \
 -d '{
   "orgName": "delasalleuniversity",
   "couchDBUrl": "http://admin:adminpw@localhost:9084"
 }'
```

**Expected Output:** `{"ok":true, "id":"...", "rev":"..."}`

**Rationale:** Maps the DLSU organization name to its CouchDB URL so the backend can dynamically resolve the correct database during issuer approval and credential operations.

Source: NODE CREATION

---

## Final System State

After completing all phases, the following components should be confirmed operational:

| Component | Port | Status |
|---|---|---|
| peer0.org1.example.com | 7051 | Running |
| peer0.org2.example.com | 9051 | Running |
| peer0.dlsu.example.com | 12051 | Running |
| orderer.example.com | 7050 | Running |
| ca_org1 / ca_org2 / ca_orderer / ca_dlsu | 7054 / 8054 / 9054 / 12054 | Running |
| couchdb-admin | 5985 | Running |
| couchdb_dlsu (issuer) | 9084 | Running |
| couchdb_archersnetwork (issuer) | 9085 | Running |
| couchdb_lasallecomputersociety (issuer) | 9086 | Running |
| Chaincode (chaincert v1.0) | — | Deployed (all 3 orgs approved) |
| chaincert-admin.id | — | In wallet |
| delasalleuniversity-admin.id | — | In wallet |
| delasalleuniversity-subordinate-archersnetwork.id | — | In wallet |
| delasalleuniversity-subordinate-lasallecomputersociety.id | — | In wallet |
| couchdb_connections (3 entries) | — | Registered |
| Backend API | 4000 | Running |
| Credential expiry cron job | — | Scheduled |

---

## Appendix A: Master Copy Commands Reference

All copy commands use the pattern: `cp "/mnt/c/Users/<USERNAME>/<PATH_TO_PROJECT>/..." ~/target/path`. Replace `<USERNAME>` and `<PATH_TO_PROJECT>` with your actual Windows username and project folder path.

### A.1 Chaincode Files

```bash
cp "<PROJECT_ROOT>/chaincode/index.js" ~/chaincert-chaincode/index.js
cp "<PROJECT_ROOT>/chaincode/package.json" ~/chaincert-chaincode/package.json
```

### A.2 Backend API Core Files

> **IMPORTANT:** Create the `config/` directory before copying `issuerRequirements.js`: `mkdir -p ~/chaincert-api/config`

```bash
mkdir -p ~/chaincert-api/config
cp "<PROJECT_ROOT>/backend/sdk-server-fixed.js" ~/chaincert-api/sdk-server-fixed.js
cp "<PROJECT_ROOT>/backend/couchDB_service.js" ~/chaincert-api/couchDB_service.js
cp "<PROJECT_ROOT>/backend/.env" ~/chaincert-api/.env
cp "<PROJECT_ROOT>/backend/enrollChaincertAdmin.js" ~/chaincert-api/enrollChaincertAdmin.js
cp "<PROJECT_ROOT>/backend/node_creation/dlsu/setupWallet_DLSU.js" ~/chaincert-api/setupWallet_DLSU.js
cp "<PROJECT_ROOT>/backend/setupWallet_ORG1.js" ~/chaincert-api/setupWallet_ORG1.js
cp "<PROJECT_ROOT>/backend/setupWallet_ORG2.js" ~/chaincert-api/setupWallet_ORG2.js
cp "<PROJECT_ROOT>/backend/node_creation/dlsu/setup_Wallet_DLSU_Subordinate_ARCHERSNETWORK.js" ~/chaincert-api/setup_Wallet_DLSU_Subordinate_ARCHERSNETWORK.js
cp "<PROJECT_ROOT>/backend/node_creation/dlsu/setup_Wallet_DLSU_Subordinate_LASALLECOMPUTERSOCIETY.js" ~/chaincert-api/setup_Wallet_DLSU_Subordinate_LASALLECOMPUTERSOCIETY.js
cp "<PROJECT_ROOT>/backend/issuerRequirements.js" ~/chaincert-api/config/issuerRequirements.js
```

### A.3 Controllers

> **IMPORTANT:** Create the `controllers/` directory before copying controller files: `mkdir -p ~/chaincert-api/controllers`

```bash
mkdir -p ~/chaincert-api/controllers
cp "<PROJECT_ROOT>/src/controllers/authController.js" ~/chaincert-api/controllers/
cp "<PROJECT_ROOT>/src/controllers/accountController.js" ~/chaincert-api/controllers/
cp "<PROJECT_ROOT>/src/controllers/issuerCredentialController.js" ~/chaincert-api/controllers/
cp "<PROJECT_ROOT>/src/controllers/issuerOnboardingController.js" ~/chaincert-api/controllers/
cp "<PROJECT_ROOT>/src/controllers/adminIssuerController.js" ~/chaincert-api/controllers/
cp "<PROJECT_ROOT>/src/controllers/adminAuditController.js" ~/chaincert-api/controllers/
cp "<PROJECT_ROOT>/src/controllers/adminDashboardController.js" ~/chaincert-api/controllers/
cp "<PROJECT_ROOT>/src/controllers/rootAuthorityController.js" ~/chaincert-api/controllers/
cp "<PROJECT_ROOT>/src/controllers/walletController.js" ~/chaincert-api/controllers/
cp "<PROJECT_ROOT>/src/controllers/verifierController.js" ~/chaincert-api/controllers/
```

### A.3b Shared utils

> **IMPORTANT:** `issuerCredentialController.js` requires this file. **The API will not start without
> it** — it exits immediately with `Error: Cannot find module '../utils/nameSimilarity'`.
>
> `nameSimilarity.js` is the **only** file under `src/utils/` that is backend code (it is CommonJS and
> dependency-free). Every other file in that directory is frontend ES-module code that uses
> `window`/`localStorage` — do **not** copy the directory wholesale.

```bash
mkdir -p ~/chaincert-api/utils
cp "<PROJECT_ROOT>/src/utils/nameSimilarity.js" ~/chaincert-api/utils/
```

### A.4 Routes

> **IMPORTANT:** Create the `routes/` directory before copying route files: `mkdir -p ~/chaincert-api/routes`

```bash
mkdir -p ~/chaincert-api/routes
cp "<PROJECT_ROOT>/src/routes/authRoutes.js" ~/chaincert-api/routes/
cp "<PROJECT_ROOT>/src/routes/adminRoutes.js" ~/chaincert-api/routes/
cp "<PROJECT_ROOT>/src/routes/issuerRoutes.js" ~/chaincert-api/routes/
cp "<PROJECT_ROOT>/src/routes/credentialRoutes.js" ~/chaincert-api/routes/
cp "<PROJECT_ROOT>/src/routes/walletRoutes.js" ~/chaincert-api/routes/
cp "<PROJECT_ROOT>/src/routes/verificationRoutes.js" ~/chaincert-api/routes/
cp "<PROJECT_ROOT>/src/routes/systemRoutes.js" ~/chaincert-api/routes/
```

### A.5 Fabric Network Configuration Files

```bash
mkdir -p ~/fabric-samples/fabric-samples/test-network/addDLSU/compose/docker/peercfg
mkdir -p ~/fabric-samples/fabric-samples/test-network/addDLSU/fabric-ca
mkdir -p ~/fabric-samples/fabric-samples/test-network/addDLSU/peercfg

cp "<PROJECT_ROOT>/backend/node_creation/dlsu/configtx-DEFAULT.yaml" ~/fabric-samples/fabric-samples/test-network/configtx/configtx.yaml
cp "<PROJECT_ROOT>/backend/node_creation/dlsu/configtx-WITHDLSU.yaml" ~/fabric-samples/fabric-samples/test-network/configtx/configtx-WITHDLSU.yaml
cp "<PROJECT_ROOT>/backend/node_creation/dlsu/compose/compose-dlsu.yaml" ~/fabric-samples/fabric-samples/test-network/addDLSU/compose/compose-dlsu.yaml
cp "<PROJECT_ROOT>/backend/node_creation/dlsu/compose/compose-ca-dlsu.yaml" ~/fabric-samples/fabric-samples/test-network/addDLSU/compose/compose-ca-dlsu.yaml
cp "<PROJECT_ROOT>/backend/node_creation/dlsu/compose/compose-couch-dlsu.yaml" ~/fabric-samples/fabric-samples/test-network/addDLSU/compose/compose-couch-dlsu.yaml
cp "<PROJECT_ROOT>/backend/node_creation/dlsu/compose/compose-couch-archersnetwork.yaml" ~/fabric-samples/fabric-samples/test-network/addDLSU/compose/compose-couch-archersnetwork.yaml
cp "<PROJECT_ROOT>/backend/node_creation/dlsu/compose/compose-couch-lasallecomputersociety.yaml" ~/fabric-samples/fabric-samples/test-network/addDLSU/compose/compose-couch-lasallecomputersociety.yaml
cp "<PROJECT_ROOT>/backend/node_creation/dlsu/fabric-ca/registerEnrollFORDLSU.sh" ~/fabric-samples/fabric-samples/test-network/addDLSU/fabric-ca/registerEnroll.sh
cp "<PROJECT_ROOT>/backend/node_creation/dlsu/compose/docker/peercfg/core.yaml" ~/fabric-samples/fabric-samples/test-network/addDLSU/core.yaml
cp "<PROJECT_ROOT>/backend/node_creation/dlsu/connection-delasalleuniversity.json" ~/chaincert-api/connection-delasalleuniversity.json
```

> **NOTE:** After copying `configtx-DEFAULT.yaml` to `configtx/configtx.yaml` in Phase 5, you will later need to copy `configtx-WITHDLSU.yaml` over it in Phase 9.4 before generating `DLSUMSP.json`. Keep both files available.

> **NOTE:** After copying shell scripts from Windows, fix line endings:
> ```bash
> sed -i 's/\r//' ~/fabric-samples/fabric-samples/test-network/addDLSU/fabric-ca/registerEnroll.sh
> ```

---

## Appendix B: Troubleshooting

Every entry below follows the same shape: **Symptom** (what you see) → **Cause** (why it
happens) → **Fix** (the commands to run) → **Expected result** (how you know it worked).
Work top-to-bottom within an entry; if the final step still fails, see *Escalation* at the
end of this appendix.

For issues specific to the **cloud VM deployment**, see Appendix A of
`CAP-2459-IT-VM-INSTALLATION-MANUAL.md` instead. This appendix covers the **local WSL2**
installation described in Phases 0-13 above.

---

### B.1 Environment & Prerequisites (Phases 1-2)

#### B.1.1 `wsl --install` reports "WSL is already installed"

**Symptom.** The Phase 1 install command exits with an error mentioning WSL is already present.

**Cause.** Expected on any machine where WSL was set up before. Not a failure.

**Fix.** Skip the install and confirm you are on WSL **2** with Ubuntu:
```powershell
wsl -l -v
```
If the VERSION column shows `1`, upgrade the distribution:
```powershell
wsl --set-version Ubuntu 2
```

**Expected result.** `wsl -l -v` lists `Ubuntu` with `STATE: Running` and `VERSION: 2`.

---

#### B.1.2 `node -v` shows the wrong version, or `node` is not found inside Ubuntu

**Symptom.** Node commands fail, or the version does not match the one installed in Phase 1.

**Cause.** Node was installed on Windows, not inside the Ubuntu distribution — they are
separate environments. A common mistake is running the install from PowerShell.

**Fix.** Open an Ubuntu shell first (`wsl` or the Ubuntu app), then verify and reinstall
there if needed:
```bash
which node && node -v && npm -v
```

**Expected result.** `which node` returns a path under `/usr/` (not `/mnt/c/...`), and the
version matches Phase 1.

---

#### B.1.3 Docker commands fail with "permission denied" on the Docker socket

**Symptom.** `docker ps` returns `permission denied while trying to connect to the Docker
daemon socket`.

**Cause.** Your Ubuntu user is not in the `docker` group, or the group membership has not
been applied to the current shell session.

**Fix.**
```bash
sudo usermod -aG docker $USER
```
Then close **all** Ubuntu terminals and open a new one (group membership is only applied to
new sessions). If it still fails, restart WSL from PowerShell:
```powershell
wsl --shutdown
```

**Expected result.** `docker ps` runs without `sudo` and prints a container table (possibly
empty).

---

#### B.1.4 Fabric binaries not found (`peer: command not found`)

**Symptom.** `peer version` or `./network.sh` fails with a command-not-found error.

**Cause.** `PATH` and `FABRIC_CFG_PATH` are shell-session variables. They must be exported
in **every new terminal** you use for Fabric work.

**Fix.** From the test-network directory:
```bash
export PATH=${PWD}/../bin:$PATH
export FABRIC_CFG_PATH=$PWD/../config/
peer version
```

**Expected result.** `peer version` prints `Version: 2.5.x`.

---

### B.2 Chaincode & Network (Phases 3, 7)

#### B.2.1 `deployCC` fails with a Docker socket path error

**Symptom.** Chaincode deployment fails with `dial unix /host/var/run/docker.sock: no such
file or directory`.

**Cause.** The peer container's socket mount and its `CORE_VM_ENDPOINT` setting disagree
about the socket path.

**Fix.**
```bash
sed -i 's|:/run/docker.sock|:/host/var/run/docker.sock|g' \
  ~/fabric-samples/fabric-samples/test-network/compose/docker/docker-compose-test-net.yaml
```
Then recreate the peer containers using the procedure in **B.2.2**.

**Expected result.** `./network.sh deployCC ...` completes and prints `Chaincode
definition committed on channel 'chaincert-channel'`.

---

#### B.2.2 Peers must be recreated (never use `--force-recreate`)

**Symptom.** You need to restart peer containers after a config change, or you see
`KeyError: 'ContainerConfig'` from docker-compose.

**Cause.** docker-compose v1 crashes on `--force-recreate` against newer Docker versions and
leaves zombie `<id>_peer...` containers behind.

**Fix.** Remove the containers explicitly, then bring them back up:
```bash
docker ps -a --format '{{.Names}}' | grep peer0.org1.example.com | xargs -r docker rm -f
docker ps -a --format '{{.Names}}' | grep peer0.org2.example.com | xargs -r docker rm -f

cd ~/fabric-samples/fabric-samples/test-network
docker-compose -f compose/compose-test-net.yaml \
  -f compose/compose-couch.yaml \
  -f compose/docker/docker-compose-test-net.yaml \
  up -d --no-deps peer0.org1.example.com peer0.org2.example.com
```

**Expected result.** `docker ps` shows both peers `Up`, with no `_peer` zombie names.

---

#### B.2.3 Chaincode deploy fails after editing `chaincode/index.js`

**Symptom.** The network runs, but your chaincode changes are not reflected, or `deployCC`
reports a version conflict.

**Cause.** Fabric will not overwrite a committed chaincode version. Every redeploy needs a
new `-ccv` value, and the DLSU org must be re-approved (see `Redeploy CC Instructions.md`).

**Fix.** Stop the API, re-copy the chaincode, and redeploy with a bumped version:
```bash
cp /mnt/c/Users/<you>/.../chaincode/index.js ~/chaincert-chaincode/index.js
cd ~/fabric-samples/fabric-samples/test-network
./network.sh deployCC -c chaincert-channel -ccn chaincert -ccl javascript \
  -ccp ~/chaincert-chaincode -ccv 2.1
```
Then run the DLSU install/approve/commit sequence from Phase 9.

**Expected result.** `peer lifecycle chaincode querycommitted -C chaincert-channel` shows
your new version number with all three orgs approved.

---

### B.3 CouchDB (Phases 6, 13)

#### B.3.1 Database creation fails with "Connection reset by peer"

**Symptom.** The `curl -X PUT` commands in Phase 6 fail immediately after starting a fresh
CouchDB container.

**Cause.** A startup race — CouchDB accepts TCP connections a moment before it is ready to
serve requests.

**Fix.** Wait about two seconds and re-run the same commands. They are idempotent, so
re-running is safe:
```bash
sleep 2
curl -X PUT http://admin:adminpw@localhost:5985/users
```

**Expected result.** `{"ok":true}` — or `{"error":"file_exists"}`, which also means the
database is present and you can continue.

---

#### B.3.2 Backend cannot reach CouchDB / "ECONNREFUSED 5985"

**Symptom.** The API fails on boot, or health checks report a database error.

**Cause.** The admin CouchDB container is not running, or it is on a different port. Note
ChainCert uses **5985**, not CouchDB's default 5984.

**Fix.**
```bash
docker ps | grep couchdb
curl http://admin:adminpw@localhost:5985/_up
```
If the container is missing, start it per Phase 6. If CouchDB lives elsewhere, point the API
at it instead of editing code — set `COUCHDB_URL` in `~/chaincert-api/.env`:
```bash
COUCHDB_URL=http://admin:adminpw@localhost:5985
```

**Expected result.** `curl .../_up` returns `{"status":"ok"}` and the API boots cleanly.

---

#### B.3.3 An issuer's credentials do not appear (subordinate CouchDB)

**Symptom.** A provisioned subordinate issuer logs in, but their credential list is empty or
errors with a message about a missing CouchDB URL.

**Cause.** Each subordinate has its own CouchDB instance, and the central
`couchdb_connections` database maps `orgName` to that instance's URL. A missing row means
the API does not know where to read or write.

**Fix.** Confirm the subordinate's container is up and its mapping row exists:
```bash
docker ps | grep couch
curl http://admin:adminpw@localhost:5985/couchdb_connections/_all_docs?include_docs=true
```
If the row is missing, add it per Phase 13.

**Expected result.** The mapping document lists the subordinate's `orgName` with the correct
port (`:9085` for ARCHERSNETWORK, `:9086` for LSCS), and the dashboard loads.

---

### B.4 Wallets & Identities (Phases 8, 10-12)

#### B.4.1 API throws `Identity <name> not found`

**Symptom.** An action fails with an error naming a Fabric identity that does not exist in
the wallet.

**Cause.** **This is not a code bug.** The wallet enrollment script for that identity has not
been run. A newly approved issuer is not automatically provisioned on the network — approval
flips their account status, while the Fabric identity is created by the manual workflow.

**Fix.** Run the enrollment script for the identity named in the error, then confirm it
landed in the wallet:
```bash
cd ~/chaincert-api
node enrollChaincertAdmin.js      # or the relevant setup_Wallet_*.js script
ls ~/chaincert-api/wallet/
```
For a brand-new subordinate issuer, follow the full 12-phase workflow in
`docs/reference/Final Design.md`.

**Expected result.** `ls ~/chaincert-api/wallet/` lists a `.id` file matching the identity
name from the error, and the action succeeds on retry.

---

#### B.4.2 Subordinate wallet import fails with "cert.pem not found"

**Symptom.** A `setup_Wallet_DLSU_Subordinate_*.js` script cannot find the certificate file.

**Cause.** The path the script reads from does not match the `-M` output path used during
`fabric-ca-client enroll`.

**Fix.** Both subordinates use the naming convention
`delasalleuniversity-subordinate-<org>@dlsu.example.com`. Re-run the enroll step writing to
the folder the script expects, then confirm the file exists before re-running the import:
```bash
ls ~/fabric-samples/fabric-samples/test-network/organizations/peerOrganizations/\
dlsu.example.com/users/delasalleuniversity-subordinate-<org>@dlsu.example.com/msp/signcerts/
```

**Expected result.** `cert.pem` is present at that path, and the wallet script completes
with a success message.

---

#### B.4.3 Shell scripts fail with `\r: command not found` or "bad interpreter"

**Symptom.** A script copied from Windows fails immediately with stray-character errors.

**Cause.** Windows CRLF line endings in a file executed by a Linux shell.

**Fix.**
```bash
sed -i 's/\r//' <path-to-script>.sh
```

**Expected result.** The script runs normally.

---

### B.5 Backend API (Phase 4)

#### B.5.1 API refuses to start, exits mentioning `JWT_SECRET`

**Symptom.** `node sdk-server-fixed.js` exits immediately on boot.

**Cause.** Intentional fail-closed behavior (security measure M3). The API will not run
without a signing secret — there is no insecure default.

**Fix.** Generate one and add it to `~/chaincert-api/.env`:
```bash
openssl rand -hex 48
```
```bash
JWT_SECRET=<paste the generated value>
```

**Expected result.** The API boots and `curl http://localhost:4000/api/health` responds.

---

#### B.5.1b API exits immediately with `Cannot find module '../utils/nameSimilarity'`

**Symptom.** The API dies the instant it starts. Under a process manager it restarts endlessly, so
the log appears to repeat the same block forever:
```
Error: Cannot find module '../utils/nameSimilarity'
code: 'MODULE_NOT_FOUND'
requireStack: [ …/controllers/issuerCredentialController.js, …/sdk-server-fixed.js ]
```

**Cause.** `~/chaincert-api/utils/nameSimilarity.js` is missing. `issuerCredentialController.js`
requires it for the duplicate and near-match credential-name rules. It is the only file under
`src/utils/` that is backend code, so a copy routine written before it existed will not carry it —
and older installs have no `utils/` directory at all.

**Fix.**
```bash
mkdir -p ~/chaincert-api/utils
cp "<PROJECT_ROOT>/src/utils/nameSimilarity.js" ~/chaincert-api/utils/
```
Then restart the API. Do **not** copy the rest of `src/utils/` — those are frontend ES modules that
use `window`/`localStorage` and will not load under Node.

**Expected result.** The API boots normally and `curl http://localhost:4000/api/health` responds. The
old error text remains in the log file; judge success by a fresh successful startup, not by the
absence of historical errors.

---

#### B.5.2 Frontend loads but every request fails with a CORS error

**Symptom.** The browser console shows CORS policy errors; the UI shows loading or error
states everywhere.

**Cause.** `CORS_ORIGIN` on the backend does not match the address the frontend is actually
served from.

**Fix.** Set it in `~/chaincert-api/.env` to the exact origin (scheme, host, and port, no
trailing slash), then restart the API:
```bash
CORS_ORIGIN=http://localhost:3000
```

**Expected result.** Requests succeed and the dashboard populates.

---

#### B.5.3 Login is rejected with "Too many attempts from this IP"

**Symptom.** Repeated login attempts start failing regardless of correct credentials.

**Cause.** **Not a bug** — the per-IP rate limiter (security measure M5) allows 10 attempts
per 15 minutes on login, forgot-password, and reset endpoints.

**Fix.** Wait 15 minutes, or for a group testing session only, add the testing toggle to
`~/chaincert-api/.env` and restart:
```bash
DISABLE_RATE_LIMIT=true
```

**Expected result.** Login succeeds. **Remove this toggle before any demo or production
run** — the API prints a loud startup warning while it is active.

---

#### B.5.4 Notification emails are not arriving

**Symptom.** In-app notifications appear, but no email is received.

**Cause.** Most often environmental rather than a code fault. Four common reasons, in order
of likelihood:
1. `SMTP_OVERRIDE_TO` is set — a demo catch-all that redirects all mail to one inbox.
2. The network blocks outbound SMTP (office and campus WiFi commonly do; a phone hotspot
   usually does not).
3. The recipient is a placeholder demo address that does not exist.
4. The message was delivered to a spam folder.

**Fix.** Work through them in order:
```bash
grep -E 'SMTP_' ~/chaincert-api/.env
```
Unset `SMTP_OVERRIDE_TO` to deliver to real recipients. Test outbound SMTP reachability:
```bash
curl -v telnet://smtp.gmail.com:587
```
If the connection hangs, the network is blocking it — retry on a different connection. Then
check the API log for the send attempt:
```bash
pm2 logs chaincert-api --lines 50 --nostream | grep -i mail
```

**Expected result.** The log records a successful send, and the message arrives at the real
recipient address.

> **Note on sender identity.** ChainCert sends all mail from one platform mailbox on behalf
> of issuers, rather than from each issuer's own domain. This is deliberate: sending as a
> domain you are not authorized for (without SPF and DKIM records) causes messages to be
> flagged as spam or spoofing. Per-issuer sending addresses are identified as future work.

---

### B.6 Verifying a Healthy Installation

Run these in order. All should pass before you consider the setup complete.

```bash
# 1. Containers up (expect orderer, 3 peers, CAs, CouchDB instances)
docker ps --format 'table {{.Names}}\t{{.Status}}'

# 2. Chaincode committed on the channel
cd ~/fabric-samples/fabric-samples/test-network
peer lifecycle chaincode querycommitted -C chaincert-channel

# 3. Admin CouchDB reachable
curl http://admin:adminpw@localhost:5985/_up

# 4. Wallet identities present
ls ~/chaincert-api/wallet/

# 5. API healthy
curl http://localhost:4000/api/health
```

**Expected result.** Step 2 lists `chaincert` with all three organizations approved; step 3
returns `{"status":"ok"}`; step 4 lists the admin, DLSU, and subordinate identity files; step
5 returns a success payload.

---

### Escalation

If an entry's fix does not resolve the problem:

1. **Capture the exact error.** `pm2 logs chaincert-api --lines 100 --nostream`, or the full
   terminal output of the failing command.
2. **Check the peer and chaincode logs**, which often contain the real cause when an API
   error is generic: `docker logs peer0.org1.example.com --tail 100`.
3. **Confirm this is not a known deployment gotcha** — see Appendix A of
   `CAP-2459-IT-VM-INSTALLATION-MANUAL.md`.
4. **Confirm the identity workflow was completed** for the account involved (see B.4.1); a
   large share of "broken feature" reports are unprovisioned identities.
5. If the issue is reproducible from a clean clone, record the phase number, the exact
   command, and the full error, and raise it with the project team.
