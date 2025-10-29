const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function main() {
    try {
        // Read the admin certificate and private key
        const credPath = path.join(__dirname, '..', 'fabric-samples', 'fabric-samples', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'users', 'Admin@org1.example.com', 'msp');
        
        const certificate = fs.readFileSync(path.join(credPath, 'signcerts', 'Admin@org1.example.com-cert.pem')).toString();
        const privateKey = fs.readFileSync(path.join(credPath, 'keystore', fs.readdirSync(path.join(credPath, 'keystore'))[0])).toString();

        // Create wallet
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        // Create identity
        const identity = {
            credentials: {
                certificate: certificate,
                privateKey: privateKey,
            },
            mspId: 'Org1MSP',
            type: 'X.509',
        };

        await wallet.put('admin', identity);
        console.log('Successfully imported admin identity into wallet');

    } catch (error) {
        console.error(`Failed to import admin identity: ${error}`);
        process.exit(1);
    }
}

main();
