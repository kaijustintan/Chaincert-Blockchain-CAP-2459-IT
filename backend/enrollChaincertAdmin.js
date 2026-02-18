const FabricCAServices = require('fabric-ca-client');
const { Wallets } = require('fabric-network');
const path = require('path');

async function enrollChaincertAdmin() {
  try {
    // 1) Konektado ka sa Org1 CA (HR office)
    const ca = new FabricCAServices(
      'https://localhost:7054',           // CA address
      { trustedRoots: [], verify: false },
      'ca-org1'                           // CA name
    );

    // 2) Ito yung cabinet mo ng ID cards (wallet folder)
    const wallet = await Wallets.newFileSystemWallet(
      path.join(__dirname, 'wallet')
    );

    // 3) Check kung meron nang ganitong ID card sa cabinet
    const exists = await wallet.get('chaincert-admin');
    if (exists) {
      console.log('✅ chaincert-admin already enrolled');
      return;
    }

    console.log('📝 Enrolling chaincert-admin with CA...');

    // 4) Lumalapit ka sa HR, dala yung username/password
    const enrollment = await ca.enroll({
      enrollmentID: 'chaincertadmin',      // from register step
      enrollmentSecret: 'chaincertadminpw' // from register step
    });

    // 5) HR binigyan ka ng ID card (certificate + privateKey)
    const x509Identity = {
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes(),
      },
      mspId: 'Org1MSP',
      type: 'X.509',
    };

    // 6) Ilagay mo sa cabinet (wallet) with label "chaincert-admin"
    await wallet.put('chaincert-admin', x509Identity);
    console.log('✅ Successfully enrolled chaincert-admin user!');
  } catch (error) {
    console.error(`❌ Failed to enroll chaincert-admin: ${error.message}`);
    process.exit(1);
  }
}

enrollChaincertAdmin();
