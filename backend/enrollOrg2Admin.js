'use strict';

const FabricCAServices = require('fabric-ca-client');
const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function enrollOrg2Admin() {
  try {
    const ccpPath = path.resolve(__dirname, '../fabric-samples/test-network/organizations/peerOrganizations/org2.example.com/connection-org2.json');
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

    const caInfo = ccp.certificateAuthorities['ca.org2.example.com'];
    const ca = new FabricCAServices(caInfo.url, { trustedRoots: [], verify: false }, caInfo.caName);

    const walletPath = path.join(__dirname, 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    const adminExists = await wallet.get('admin-org2');
    if (adminExists) {
      console.log('✅ admin-org2 already exists in wallet');
      return;
    }

    const enrollment = await ca.enroll({ enrollmentID: 'admin', enrollmentSecret: 'adminpw' });
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