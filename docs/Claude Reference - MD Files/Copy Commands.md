<!-- Auto-generated Markdown reference from "Copy Commands.pdf". The PDF remains the human-readable source of truth. -->

# Backend Files That Run in Ubuntu | Copy Commands

> **VM deployment (CAP2):** do NOT run these by hand on the VM — use **`deploy-sync.sh`** (repo root). It performs this entire source→runtime copy idempotently for the **Plan 2 layout** (`~/chaincert-src` → `~/chaincert-api` + `~/chaincert-chaincode`), applies the connection-profile + `docker.sock` patches, and **never touches `wallet/` or `.env`**. The list below remains the canonical reference for **LOCAL** Windows→WSL single-file syncs during dev.

## Updated Outline — Backend Files and Locations

### 1. Chaincode file (Ubuntu)

- `~/chaincert-chaincode/index.js`

### 2. API server core files (Ubuntu `~/chaincert-api/`)

- `sdk-server-fixed.js`
- `enrollAdmin.js`
- `enrollOrg2Admin.js`
- `enrollChaincertAdmin.js`
- `authenticationService.js`
- `couchDB_service.js`
- `mailerService.js`
- `securityHelpers.js`
- `setup_Wallet_DLSU.js`
- `setup_Wallet_DLSU_Subordinate_ARCHERSNETWORK.js`
- `setup_Wallet_DLSU_Subordinate_LASALLECOMPUTERSOCIETY.js`

### 3. API config files (Ubuntu `~/chaincert-api/config/`)

- `issuerRequirements.js`

### 4. API controllers (Ubuntu `~/chaincert-api/controllers/`)

- `authController.js`
- `accountController.js`
- `adminAuditController.js`
- `adminIssuerController.js`
- `issuerOnboardingController.js`
- `rootAuthorityController.js`
- `walletController.js`
- `issuerCredentialController.js`
- `verifierController.js`
- `adminDashboardController.js`

### 5. API routes (Ubuntu `~/chaincert-api/routes/`)

- `authRoutes.js`
- `systemRoutes.js`
- `adminRoutes.js`
- `issuerRoutes.js`
- `credentialRoutes.js`
- `verificationRoutes.js`
- `walletRoutes.js`

### 6. Fabric peer configuration (Ubuntu `~/fabric-samples/fabric-samples/test-network/addDLSU/compose/docker/peercfg/`)

- `core.yaml`

### 7. Fabric channel configuration (Ubuntu `~/fabric-samples/fabric-samples/test-network/configtx/`)

- `configtx-DEFAULT.yaml` (copied as `configtx.yaml`)
- `configtx-WITHDLSU.yaml` (copied as `configtx.yaml`)

### 8. DLSU Docker Compose files (Ubuntu `~/fabric-samples/fabric-samples/test-network/addDLSU/compose/`)

- `compose-couch-dlsu.yaml`
- `compose-couch-archersnetwork.yaml`
- `compose-couch-lasallecomputersociety.yaml`
- `compose-dlsu.yaml`
- `compose-ca-dlsu.yaml`

### 9. DLSU Fabric-CA script (Ubuntu `~/fabric-samples/fabric-samples/test-network/addDLSU/fabric-ca/`)

- `registerEnrollFORDLSU.sh` (copied as `registerEnroll.sh`)

### 10. DLSU organization connection profile (Ubuntu `~/fabric-samples/fabric-samples/test-network/organizations/peerOrganizations/dlsu.example.com/`)

- `connection-delasalleuniversity.json`

## Where Are They Located? | Copy Commands From Windows to Ubuntu

### `[~/chaincert-chaincode/]`

```bash
# index.js
cp "/mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET/chaincode/index.js" ~/chaincert-chaincode/index.js

# package.json
cp "/mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET/chaincode/package.json" ~/chaincert-chaincode/package.json
```

### `[~/chaincert-api/]`

```bash
# sdk-server-fixed.js
cp "/mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET/backend/sdk-server-fixed.js" ~/chaincert-api/sdk-server-fixed.js

# enrollAdmin.js
cp "/mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET/backend/setupWallet_ORG1.js" ~/chaincert-api/enrollAdmin.js

# enrollOrg2Admin.js
cp "/mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET/backend/setupWallet_ORG2.js" ~/chaincert-api/enrollOrg2Admin.js

# enrollChaincertAdmin.js
cp "/mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET/backend/enrollChaincertAdmin.js" ~/chaincert-api/enrollChaincertAdmin.js

# authenticationService.js
cp "/mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET/src/services/authenticationService.js" ~/chaincert-api/authenticationService.js

# couchDB_service.js
cp "/mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET/backend/couchDB_service.js" ~/chaincert-api/couchDB_service.js

# mailerService.js
cp "/mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET/backend/mailerService.js" ~/chaincert-api/mailerService.js

# securityHelpers.js
cp "/mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET/backend/securityHelpers.js" ~/chaincert-api/securityHelpers.js

# setupWallet_DLSU.js
cp "/mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET/backend/node_creation/dlsu/setupWallet_DLSU.js" ~/chaincert-api/setup_Wallet_DLSU.js

# setup_Wallet_DLSU_Subordinate_ARCHERSNETWORK.js
cp "/mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET/backend/node_creation/dlsu/setup_Wallet_DLSU_Subordinate_ARCHERSNETWORK.js" ~/chaincert-api/setup_Wallet_DLSU_Subordinate_ARCHERSNETWORK.js

# setup_Wallet_DLSU_Subordinate_LASALLECOMPUTERSOCIETY.js
cp "/mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET/backend/node_creation/dlsu/setup_Wallet_DLSU_Subordinate_LASALLECOMPUTERSOCIETY.js" ~/chaincert-api/setup_Wallet_DLSU_Subordinate_LASALLECOMPUTERSOCIETY.js

# package.json   (NOTE: this copies FROM Ubuntu TO Windows)
cp ~/chaincert-api/package.json "/mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET/backend/package.json"

# package-lock.json   (NOTE: this copies FROM Ubuntu TO Windows)
cp ~/chaincert-api/package-lock.json "/mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET/backend/package-lock.json"
```

### `[~/chaincert-api/config]`

```bash
# issuerRequirements.js
cp "/mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET/backend/issuerRequirements.js" ~/chaincert-api/config/issuerRequirements.js
```

### `[~/chaincert-api/controllers/]`

```bash
# authController.js
cp "/mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET/src/controllers/authController.js" ~/chaincert-api/controllers/authController.js

# accountController.js
cp "/mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET/src/controllers/accountController.js" ~/chaincert-api/controllers/accountController.js

# adminAuditController.js
cp "/mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET/src/controllers/adminAuditController.js" ~/chaincert-api/controllers/adminAuditController.js

# adminIssuerController.js
cp "/mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET/src/controllers/adminIssuerController.js" ~/chaincert-api/controllers/adminIssuerController.js

# issuerOnboardingController.js
cp "/mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET/src/controllers/issuerOnboardingController.js" ~/chaincert-api/controllers/issuerOnboardingController.js

# rootAuthorityController.js
cp "/mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET/src/controllers/rootAuthorityController.js" ~/chaincert-api/controllers/rootAuthorityController.js

# walletController.js
cp "/mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET/src/controllers/walletController.js" ~/chaincert-api/controllers/walletController.js

# issuerCredentialController.js
cp "/mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET/src/controllers/issuerCredentialController.js" ~/chaincert-api/controllers/issuerCredentialController.js

# verifierController.js
cp "/mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET/src/controllers/verifierController.js" ~/chaincert-api/controllers/verifierController.js

# adminDashboardController.js
cp "/mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET/src/controllers/adminDashboardController.js" ~/chaincert-api/controllers/adminDashboardController.js
```

### `[~/chaincert-api/routes/]`

```bash
# authRoutes.js
cp "/mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET/src/routes/authRoutes.js" ~/chaincert-api/routes/authRoutes.js

# systemRoutes.js
cp "/mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET/src/routes/systemRoutes.js" ~/chaincert-api/routes/systemRoutes.js

# adminRoutes.js
cp "/mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET/src/routes/adminRoutes.js" ~/chaincert-api/routes/adminRoutes.js

# issuerRoutes.js
cp "/mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET/src/routes/issuerRoutes.js" ~/chaincert-api/routes/issuerRoutes.js

# credentialRoutes.js
cp "/mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET/src/routes/credentialRoutes.js" ~/chaincert-api/routes/credentialRoutes.js

# verificationRoutes.js
cp "/mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET/src/routes/verificationRoutes.js" ~/chaincert-api/routes/verificationRoutes.js

# walletRoutes.js
cp "/mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET/src/routes/walletRoutes.js" ~/chaincert-api/routes/walletRoutes.js
```

### `[~/fabric-samples/fabric-samples/test-network/addDLSU/compose/docker/peercfg/]`

```bash
# core.yaml
cp "/mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET/backend/node_creation/dlsu/compose/docker/peercfg/core.yaml" ~/fabric-samples/fabric-samples/test-network/addDLSU/compose/docker/peercfg/core.yaml
```

### `[~/fabric-samples/fabric-samples/test-network/configtx/]`

```bash
# configtx-DEFAULT.yaml
cp "/mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET/backend/node_creation/dlsu/configtx-DEFAULT.yaml" ~/fabric-samples/fabric-samples/test-network/configtx/configtx.yaml

# configtx-WITHDLSU.yaml
cp "/mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET/backend/node_creation/dlsu/configtx-WITHDLSU.yaml" ~/fabric-samples/fabric-samples/test-network/configtx/configtx.yaml
```

### `[~/fabric-samples/fabric-samples/test-network/addDLSU/compose/]`

```bash
# compose-couch-dlsu.yaml
cp "/mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET/backend/node_creation/dlsu/compose/compose-couch-dlsu.yaml" ~/fabric-samples/fabric-samples/test-network/addDLSU/compose/compose-couch-dlsu.yaml

# compose-couch-archersnetwork.yaml
cp "/mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET/backend/node_creation/dlsu/compose/compose-couch-archersnetwork.yaml" ~/fabric-samples/fabric-samples/test-network/addDLSU/compose/compose-couch-archersnetwork.yaml

# compose-couch-lasallecomputersociety.yaml
cp "/mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET/backend/node_creation/dlsu/compose/compose-couch-lasallecomputersociety.yaml" ~/fabric-samples/fabric-samples/test-network/addDLSU/compose/compose-couch-lasallecomputersociety.yaml

# compose-dlsu.yaml
cp "/mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET/backend/node_creation/dlsu/compose/compose-dlsu.yaml" ~/fabric-samples/fabric-samples/test-network/addDLSU/compose/compose-dlsu.yaml

# compose-ca-dlsu.yaml
cp "/mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET/backend/node_creation/dlsu/compose/compose-ca-dlsu.yaml" ~/fabric-samples/fabric-samples/test-network/addDLSU/compose/compose-ca-dlsu.yaml
```

### `[~/fabric-samples/fabric-samples/test-network/addDLSU/fabric-ca/]`

```bash
# registerEnrollFORDLSU.sh
cp "/mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET/backend/node_creation/dlsu/fabric-ca/registerEnrollFORDLSU.sh" ~/fabric-samples/fabric-samples/test-network/addDLSU/fabric-ca/registerEnroll.sh
```

### `[~/fabric-samples/fabric-samples/test-network/organizations/peerOrganizations/dlsu.example.com]`

```bash
# connection-delasalleuniversity.json
cp "/mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET/backend/node_creation/dlsu/connection-delasalleuniversity.json" ~/fabric-samples/fabric-samples/test-network/organizations/peerOrganizations/dlsu.example.com/connection-delasalleuniversity.json
```

### Claude Code config files (Ubuntu home — `~/.claude/`, `~/CLAUDE.md`, `~/docs/`)

> Sync these so the Ubuntu Claude session has the same slash commands, skills, and instructions as Windows.
> Run after any Windows-side change to a Claude config file. Auto-pulled when you run `/sync-backend-only` or
> `/sync-backend-with-chaincode`. The Ubuntu session launches from `/home/kaitanz_`, so `~/.claude/`, `~/CLAUDE.md`,
> and `~/docs/` are exactly where it looks.

```bash
# Make sure the target dirs exist
mkdir -p ~/.claude/commands ~/.claude/skills ~/docs

# settings.json (hooks — Stop hook that auto-tips sync commands on file changes)
cp "/mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET/.claude/settings.json" ~/.claude/settings.json

# Slash commands
cp "/mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET/.claude/commands/"*.md ~/.claude/commands/

# Skills (recursive — each skill is a folder)
cp -r "/mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET/.claude/skills/"* ~/.claude/skills/

# Project CLAUDE.md (resolves @CLAUDE.md referenced inside the commands)
cp "/mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET/CLAUDE.md" ~/CLAUDE.md

# Doc mirrors the commands @-reference (Redeploy, Copy Commands, Node Creation, CONTROLLER, ROUTE, etc.)
cp -r "/mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET/docs/Claude Reference - MD Files" ~/docs/
```

> ⚠️ REVERSE direction (Ubuntu → Windows): if you edited a Claude config file from inside an Ubuntu session,
> copy it BACK so the Windows repo stays source of truth. The `claude-config-sync` skill reminds you to do this.
> ```bash
> REPO="/mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET"
> cp ~/.claude/commands/<file>.md "$REPO/.claude/commands/<file>.md"   # a command
> cp -r ~/.claude/skills/<skill-folder> "$REPO/.claude/skills/"        # a skill
> cp ~/CLAUDE.md "$REPO/CLAUDE.md"                                     # project CLAUDE.md
> ```
