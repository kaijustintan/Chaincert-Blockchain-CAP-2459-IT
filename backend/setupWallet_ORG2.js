// OUTDATED

'use strict';

const FabricCAServices = require('fabric-ca-client');
const { Wallets } = require('fabric-network');
const path = require('path');

async function enrollOrg2Admin() {
  try {
    // ✅ FIXED: Direct URL instead of config file
    const ca = new FabricCAServices(
        'https://localhost:8054',  // ← Org2 CA port (check docker ps!)
        { trustedRoots: [], verify: false },
        'ca-org2'
    );

    const walletPath = path.join(__dirname, 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    // Check if admin-org2 already exists
    const adminExists = await wallet.get('admin-org2');
    if (adminExists) {
      console.log('✅ admin-org2 already exists in wallet');
      return;
    }

    // ✅ Enroll with default Org2 admin credentials
    const enrollment = await ca.enroll({ 
      enrollmentID: 'admin', 
      enrollmentSecret: 'adminpw' 
    });

    const x509Identity = {
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes(),
      },
      mspId: 'Org2MSP',
      type: 'X.509',
    };

    await wallet.put('admin-org2', x509Identity);
    console.log('✅ Successfully enrolled admin-org2 and added to wallet!');
  } catch (error) {
    console.error(`❌ Failed to enroll admin-org2: ${error.message}`);
    process.exitCode = 1;
  }
}

enrollOrg2Admin();
