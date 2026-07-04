const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function main() {
  try {
    console.log('🔧 Setting up DLSU subordinate wallet identity...');

    const credPath = path.join(
      process.env.HOME,
      'fabric-samples/fabric-samples/test-network/organizations/peerOrganizations/dlsu.example.com/users/delasalleuniversity-subordinate-lasallecomputersociety@dlsu.example.com/msp'
    );

    const certificate = fs.readFileSync(
      path.join(credPath, 'signcerts', 'cert.pem')
    ).toString();

    const keystorePath = path.join(credPath, 'keystore');
    const keyFiles = fs.readdirSync(keystorePath);

    if (!keyFiles.length) {
      throw new Error('No private key found in subordinate keystore');
    }

    const privateKey = fs.readFileSync(
      path.join(keystorePath, keyFiles[0])
    ).toString();

    const walletPath = path.join(process.cwd(), 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    const identityLabel = 'delasalleuniversity-subordinate-lasallecomputersociety';

    const identity = {
      credentials: {
        certificate,
        privateKey
      },
      mspId: 'DLSUMSP',
      type: 'X.509',
    };

    await wallet.put(identityLabel, identity);

    console.log(`✅ Successfully imported ${identityLabel} into wallet!`);
    console.log('📂 Wallet location:', walletPath);

    const checkIdentity = await wallet.get(identityLabel);
    if (checkIdentity) {
      console.log(`✅ Verified: ${identityLabel} exists in wallet`);
      console.log('   MSP ID:', checkIdentity.mspId);
    }

  } catch (error) {
    console.error(`❌ Failed to import subordinate identity: ${error.message}`);
    process.exit(1);
  }
}

main();