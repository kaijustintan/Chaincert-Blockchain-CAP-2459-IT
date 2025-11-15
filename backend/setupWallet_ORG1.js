// OUTDATED

// enrollAdmin.js - DIRECT VERSION (no config needed)
const FabricCAServices = require('fabric-ca-client');
const { Wallets } = require('fabric-network');
const path = require('path');

async function enrollAdmin() {
    try {
        // Direct CA connection - no config file needed!
        const ca = new FabricCAServices(
            'https://localhost:7054',
            { trustedRoots: [], verify: false },
            'ca-org1'
        );

        const wallet = await Wallets.newFileSystemWallet(
            path.join(__dirname, 'wallet')
        );

        // Check if admin already exists
        const adminExists = await wallet.get('admin');
        if (adminExists) {
            console.log('✅ admin already enrolled');
            return;
        }

        // Enroll with CA's DEFAULT admin credentials
        console.log('📝 Enrolling admin with CA...');
        const enrollment = await ca.enroll({
            enrollmentID: 'admin',
            enrollmentSecret: 'adminpw'
        });

        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: 'Org1MSP',
            type: 'X.509',
        };

        await wallet.put('admin', x509Identity);
        console.log('✅ Successfully enrolled admin user!');

    } catch (error) {
        console.error(`❌ Failed to enroll admin: ${error.message}`);
        console.error(error);
        process.exit(1);
    }
}

enrollAdmin();
