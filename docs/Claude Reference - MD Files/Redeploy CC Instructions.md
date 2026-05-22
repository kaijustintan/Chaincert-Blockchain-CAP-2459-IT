<!-- Auto-generated Markdown reference from "Redeploy CC Instructions.pdf". The PDF remains the human-readable source of truth. -->

# Redeploy Chaincode Instructions

> **KAPAG MAY BINAGO KA SA:**

## 1) Chaincode

```bash
# Stop API first (Ctrl+C in API terminal)

# do copy commands on files you modified, better just do all copy commands para sure
```

### Prerequisites Before Deploying

In the `test-network` directory do these commands:

```bash
export PATH=${PWD}/../bin:$PATH
export FABRIC_CFG_PATH=${PWD}/../config/
```

Checklist before deploying:

- All containers are UP via Docker Desktop.
- Nasa `test-network` dir ka: `cd ~/fabric-samples/fabric-samples/test-network`
- You are logged in as DLSU peer — in the **NODE CREATION** tab, go to *"QUICK REFERENCE PARA MAKAPAGSWITCH NG ACCOUNTS/ORGS AGAD (in test-network directory)"* and copy those commands.
- Na-update mo na yung code sa `~/chaincert-chaincode/index.js` / nagcopy commands ka na.

Do this command:

```bash
cp "/mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET/backend/node_creation/dlsu/configtx-DEFAULT.yaml" \
  ~/fabric-samples/fabric-samples/test-network/configtx/configtx.yaml
```

Do this command:

```bash
peer lifecycle chaincode querycommitted --channelID chaincert-channel --name chaincert
```

> Ex Output: *(see PDF for screenshot)*

### Deploy New Chaincode

Deploy new CC sa network para magkaron ng `tar.gz` file:

```bash
./network.sh deployCC \
  -c chaincert-channel \
  -ccn chaincert \
  -ccl javascript \
  -ccp ~/chaincert-chaincode \
  -ccv 2.0
```

Do this command:

```bash
cp "/mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET/backend/node_creation/dlsu/configtx-WITHDLSU.yaml" \
  ~/fabric-samples/fabric-samples/test-network/configtx/configtx.yaml
```

### Verify Channel Membership and Install Chaincode

In the **NODE CREATION** tab, do all the commands in *"16. Verify Channel Membership and Install Chaincode"* **except** *"NEED DEPLOY CHAINCODE MUNA SA NETWORK PARA MAGKARON NG TAR.GZ FILE"* — kasi nagawa na ngani.

### Restart API

```bash
cd ~/chaincert-api
node sdk-server-fixed.js

# Test
curl http://localhost:4000/api/health
```

==========================================================================
