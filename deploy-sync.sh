#!/usr/bin/env bash
# deploy-sync.sh
#
# ChainCert CAP2 — VM "source -> runtime" sync (Plan 2: clean split).
# Reshapes the git clone (source) into the runtime layout the app expects,
# idempotently. Run it on the VM after every `git pull`.
#
#   SOURCE  : ~/chaincert-src        (the git clone — you pull here)
#   RUNTIME : ~/chaincert-api        (backend the app actually runs)
#             ~/chaincert-chaincode  (chaincode)
#   FABRIC  : ~/fabric-samples/fabric-samples  (double-nested, from the Fabric bootstrap)
#
# SAFETY: this script NEVER touches ~/chaincert-api/wallet/ or ~/chaincert-api/.env
#         (your 6 identities and your secrets survive every re-sync).
#
# Usage:  bash ~/chaincert-src/deploy-sync.sh
# Override layout if needed:  SRC=... API=... CC=... FAB=... bash deploy-sync.sh

set -euo pipefail

SRC="${SRC:-$HOME/chaincert-src}"
API="${API:-$HOME/chaincert-api}"
CC="${CC:-$HOME/chaincert-chaincode}"
FAB="${FAB:-$HOME/fabric-samples/fabric-samples}"

echo "== ChainCert deploy-sync =="
echo "   SRC = $SRC"
echo "   API = $API"
echo "   CC  = $CC"
echo "   FAB = $FAB"

# 1) Runtime dirs (wallet/ is created only if missing — never wiped)
mkdir -p "$API/controllers" "$API/routes" "$API/config" "$API/wallet" "$CC"

# 2) Backend core files (+ the documented renames). Copying backend/package.json is what
#    fixes the recurring "wrong package.json / Cannot find module" bug (npm now installs the
#    BACKEND deps in the backend dir, not the React ones).
cp "$SRC/backend/package.json"            "$API/"
cp "$SRC/backend/sdk-server-fixed.js"     "$API/"
cp "$SRC/backend/couchDB_service.js"      "$API/"
cp "$SRC/backend/enrollChaincertAdmin.js" "$API/"
cp "$SRC/backend/mailerService.js"        "$API/"
cp "$SRC/backend/securityHelpers.js"      "$API/"
cp "$SRC/backend/issuerRequirements.js"   "$API/config/issuerRequirements.js"
cp "$SRC/backend/setupWallet_ORG1.js"     "$API/enrollAdmin.js"      # rename
cp "$SRC/backend/setupWallet_ORG2.js"     "$API/enrollOrg2Admin.js"  # rename

# 3) Express controllers + routes (these live under src/ but are BACKEND code).
cp "$SRC/src/controllers/"*.js "$API/controllers/"
cp "$SRC/src/routes/"*.js      "$API/routes/"
# NOTE: src/services/authenticationService.js is a FRONTEND helper — do NOT copy it here (per CLAUDE.md).

# 4) DLSU wallet-setup scripts (rename setupWallet_DLSU.js -> setup_Wallet_DLSU.js).
cp "$SRC/backend/node_creation/dlsu/setupWallet_DLSU.js" "$API/setup_Wallet_DLSU.js"
cp "$SRC/backend/node_creation/dlsu/setup_Wallet_DLSU_Subordinate_"*.js "$API/"

# 5) Chaincode.
cp "$SRC/chaincode/index.js"     "$CC/"
cp "$SRC/chaincode/package.json" "$CC/"

# 6) Fabric-side files (only once fabric-samples is present).
if [ -d "$FAB/test-network" ]; then
  DLSU_DIR="$FAB/test-network/addDLSU"
  CCP_DST="$FAB/test-network/organizations/peerOrganizations/dlsu.example.com"
  mkdir -p "$DLSU_DIR/compose" "$DLSU_DIR/fabric-ca"
  cp -r "$SRC/backend/node_creation/dlsu/compose/." "$DLSU_DIR/compose/"
  # registerEnroll: repo name -> runbook name
  cp "$SRC/backend/node_creation/dlsu/fabric-ca/registerEnrollFORDLSU.sh" "$DLSU_DIR/fabric-ca/registerEnroll.sh"
  # Hand-made MULTI-ORG connection profile (encodes Org1 co-endorsement). Copy then patch its
  # frozen /home/kaitanz_/ TLS-cert paths to THIS machine's $HOME. (Only after the DLSU org exists.)
  if [ -d "$CCP_DST" ]; then
    cp "$SRC/backend/node_creation/dlsu/connection-delasalleuniversity.json" "$CCP_DST/"
    sed -i "s|/home/kaitanz_/fabric-samples|$HOME/fabric-samples|g" "$CCP_DST/connection-delasalleuniversity.json"
  else
    echo "   (skip connection profile — create the DLSU org first, then re-run this script)"
  fi
  # Docker-29 / Fabric-2.5.16 org2 docker.sock fix (idempotent — no-op if already applied).
  STOCK="$FAB/test-network/compose/docker/docker-compose-test-net.yaml"
  if [ -f "$STOCK" ]; then
    sed -i 's|${DOCKER_SOCK}:/host/var/run/docker.sock|/var/run/docker.sock:/run/docker.sock|g' "$STOCK"
  fi
else
  echo "   (skip Fabric files — $FAB/test-network not found yet; run after the Fabric bootstrap)"
fi

# 7) Normalize Windows line-endings on shell scripts.
find "$API" "$CC" -name '*.sh' -exec sed -i 's/\r$//' {} \; 2>/dev/null || true
[ -d "$FAB" ] && find "$FAB" -name '*.sh' -exec sed -i 's/\r$//' {} \; 2>/dev/null || true

# 8) Install runtime deps (idempotent).
( cd "$API" && npm install --no-audit --no-fund )
( cd "$CC"  && npm install --no-audit --no-fund )

echo "== done =="
echo "   Left untouched (on purpose): $API/wallet/  and  $API/.env"
