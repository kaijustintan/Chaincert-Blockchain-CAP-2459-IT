const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function main() {
    try {
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        const identity = await wallet.get('admin');
        if (identity) {
            console.log('✅ Admin user already exists in wallet');
            return;
        }

        const certPath = '/home/kaitanz_/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/signcerts/Admin@org1.example.com-cert.pem';
        const keyDir = '/home/kaitanz_/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/keystore';

        const cert = fs.readFileSync(certPath, 'utf8');
        const keyFile = fs.readdirSync(keyDir)[0];
        const key = fs.readFileSync(path.join(keyDir, keyFile), 'utf8');

        const x509Identity = {
            credentials: {
                certificate: cert,
                privateKey: key,
            },
            mspId: 'Org1MSP',
            type: 'X.509',
        };

        await wallet.put('admin', x509Identity);
        console.log('✅ Successfully loaded admin user from network certificates and imported into wallet');

    } catch (error) {
        console.error(`❌ Failed to enroll admin user: ${error}`);
        process.exit(1);
    }
}

main();
