<!-- Auto-generated Markdown reference from "Predemo Setup.pdf". The PDF remains the human-readable source of truth. -->

# Defense | Predemo Setup Guide

*As of Mar 9, 2026*

## Tasks Done Even Before Doing Predemo Setup

- Already made user accounts
- Did node deployment for DLSU
- Issued fabric identities for subordinates
  - Kasi ang process is: issuer registers, admin checks, if valid, admin creates these.
  - Node deployment or generation of fabric identities for subordinates is done **MANUALLY**, which can eat up time during the demonstration kaya ginawa nalang na (premade). Para when approving, matic magsysync nalang na yung premade fabric identities / node deployment configurations as account ni issuer.

---

## Setup

### 1. Download the zip folder from Drive

Download from Drive yung zip folder, tas export dapat exactly sa desktop directory.

### 2. Rename the folder

Rename said folder as exactly **`CAP-2459-IT-AFTER-RESET`** as certain paths are hardcoded.

### 3. Navigate to test-network and export environment variables

```bash
cd ~/fabric-samples/fabric-samples/test-network

export PATH=${PWD}/../bin:$PATH
export FABRIC_CFG_PATH=${PWD}/../config/
```

### 4. Run all the copy commands

Do all of the `cp` commands sa docs tab ko **"COPY COMMANDS"** to show proof na we are making use of the files in GitHub / what was submitted.

### 5. Log in as DLSU MSP / PEER

```bash
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="DLSUMSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/dlsu.example.com/peers/peer0.dlsu.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/dlsu.example.com/users/Admin@dlsu.example.com/msp
export CORE_PEER_ADDRESS=localhost:12051
```

### 6. Copy in `configtx-DEFAULT.yaml`

```bash
cp "/mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET/backend/node_creation/dlsu/configtx-DEFAULT.yaml" \
  ~/fabric-samples/fabric-samples/test-network/configtx/configtx.yaml
```

### 7. Deploy chaincode

Deploy chaincode to show proof na yung chaincode sa inupload yung gagamitin.

```bash
./network.sh deployCC \
  -c chaincert-channel \
  -ccn chaincert \
  -ccl javascript \
  -ccp ~/chaincert-chaincode \
  -ccv 2.0
```

### 8. Copy in `configtx-WITHDLSU.yaml`

```bash
cp "/mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET/backend/node_creation/dlsu/configtx-WITHDLSU.yaml" \
  ~/fabric-samples/fabric-samples/test-network/configtx/configtx.yaml
```

### 9. Verify Channel Membership and Install Chaincode

Listed down below — all the commands in the **NODE CREATION** tab do | "16. Verify Channel Membership and Install Chaincode".

```bash
peer lifecycle chaincode install chaincert.tar.gz

# Verify
peer lifecycle chaincode queryinstalled

# Verify
peer lifecycle chaincode querycommitted --channelID chaincert-channel --name chaincert

# As DLSU Admin, approve the chaincode na isasalpak sayo
peer lifecycle chaincode approveformyorg -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --channelID chaincert-channel \
  --name chaincert \
  --version 1.0 \
  --package-id chaincert_1.0:1933927ebeca046496a17254a40fb15b58a36e09238099b40c49138d83232a19 \
  --sequence 1 \
  --tls \
  --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem"

# Verify
peer lifecycle chaincode querycommitted --channelID chaincert-channel --name chaincert
```
