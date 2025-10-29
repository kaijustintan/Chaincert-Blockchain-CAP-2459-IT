const express = require('express');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const app = express();
app.use(express.json());

const FABRIC_PATH = '/home/kaitanz_/fabric-samples/fabric-samples/test-network';

async function runPeerCommand(args) {
    const env = {
        ...process.env,
        FABRIC_CFG_PATH: `${FABRIC_PATH}/../config/`,
        CORE_PEER_TLS_ENABLED: 'true',
        CORE_PEER_LOCALMSPID: 'Org1MSP',
        CORE_PEER_TLS_ROOTCERT_FILE: `${FABRIC_PATH}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt`,
        CORE_PEER_MSPCONFIGPATH: `${FABRIC_PATH}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp`,
        CORE_PEER_ADDRESS: 'localhost:7051'
    };

    const cmd = `peer chaincode ${args}`;
    const { stdout, stderr } = await execPromise(cmd, { env, cwd: FABRIC_PATH });
    
    if (stderr && !stderr.includes('INFO')) {
        console.error('Stderr:', stderr);
    }
    
    return stdout.trim();
}

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'ChainCert Simple API is running' });
});

app.get('/api/credentials/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const output = await runPeerCommand(
            `query -C chaincert-channel -n chaincert -c '{"function":"GetCredential","Args":["${id}"]}'`
        );
        const credential = JSON.parse(output);
        res.json(credential);
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/credentials/:id/verify', async (req, res) => {
    try {
        const { id } = req.params;
        const output = await runPeerCommand(
            `query -C chaincert-channel -n chaincert -c '{"function":"VerifyCredential","Args":["${id}"]}'`
        );
        const verification = JSON.parse(output);
        res.json(verification);
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.listen(3000, () => {
    console.log('ChainCert Simple API running on http://localhost:3000');
    console.log('Endpoints:');
    console.log('  GET /api/health');
    console.log('  GET /api/credentials/:id');
    console.log('  GET /api/credentials/:id/verify');
});
