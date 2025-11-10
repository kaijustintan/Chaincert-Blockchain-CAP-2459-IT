const Docker = require('dockerode');
const docker = new Docker();

class IssuerDeploymentService {
  constructor() {
    this.docker = docker;
  }

  async ensureNetwork() {
    try {
      const networks = await this.docker.listNetworks();
      const chaincertNet = networks.find(n => n.Name === 'chaincert-network');
      
      if (!chaincertNet) {
        await this.docker.createNetwork({
          Name: 'chaincert-network',
          Driver: 'bridge'
        });
        console.log('✅ chaincert-network created');
      }
    } catch (error) {
      console.error('❌ Network error:', error.message);
    }
  }

  async createCAContainer(domain, orgName, email, caPort) {
    try {
      console.log(`[DEPLOY] STEP 1: Creating CA...`);
      await this.ensureNetwork();
      
      const containerName = `ca_${domain}`;
      
      try {
        const oldContainer = this.docker.getContainer(containerName);
        await oldContainer.remove({ force: true });
      } catch (e) {}

      const container = await this.docker.createContainer({
        Image: 'hyperledger/fabric-ca:latest',
        name: containerName,
        Hostname: `ca.${domain}`,
        Env: [
          'FABRIC_CA_HOME=/etc/hyperledger/fabric-ca-server',
          `FABRIC_CA_SERVER_CA_NAME=${orgName}-CA`,
          'FABRIC_CA_SERVER_PORT=7054'
        ],
        ExposedPorts: { '7054/tcp': {} },
        HostConfig: {
          PortBindings: { '7054/tcp': [{ HostIp: '0.0.0.0', HostPort: caPort.toString() }] },
          NetworkMode: 'chaincert-network'
        }
      });

      await container.start();
      console.log(`✅ CA container ${containerName} started on port ${caPort}`);
      await new Promise(resolve => setTimeout(resolve, 3000));
      console.log(`✅ CA ready!\n`);

      return { containerName, port: caPort, status: 'running' };
    } catch (error) {
      throw new Error(`CA creation failed: ${error.message}`);
    }
  }

  async createCouchDBContainer(domain, couchdbPort) {
    try {
      console.log(`[DEPLOY] STEP 2: Creating CouchDB...`);
      
      const containerName = `couchdb-${domain}`;
      
      try {
        const oldContainer = this.docker.getContainer(containerName);
        await oldContainer.remove({ force: true });
      } catch (e) {}

      const container = await this.docker.createContainer({
        Image: 'couchdb:3.3.2',
        name: containerName,
        Hostname: `couchdb.${domain}`,
        Env: [
          'COUCHDB_USER=admin',
          'COUCHDB_PASSWORD=admin123'
        ],
        ExposedPorts: { '5984/tcp': {} },
        HostConfig: {
          PortBindings: { '5984/tcp': [{ HostIp: '0.0.0.0', HostPort: couchdbPort.toString() }] },
          NetworkMode: 'chaincert-network'
        }
      });

      await container.start();
      console.log(`✅ CouchDB container ${containerName} started on port ${couchdbPort}`);
      await new Promise(resolve => setTimeout(resolve, 3000));
      console.log(`✅ CouchDB ready!\n`);

      return { containerName, port: couchdbPort, status: 'running' };
    } catch (error) {
      throw new Error(`CouchDB creation failed: ${error.message}`);
    }
  }

  async createPeerContainer(domain, orgName, peerPort) {
    try {
      console.log(`[DEPLOY] STEP 3: Creating Peer...`);
      
      const containerName = `peer_${domain}`;
      const volumeName = `fabric_${domain}`;
      
      try {
        const oldContainer = this.docker.getContainer(containerName);
        await oldContainer.remove({ force: true });
      } catch (e) {}

      // Create or reuse Docker volume
      try {
        await this.docker.getVolume(volumeName).inspect();
      } catch (e) {
        await this.docker.createVolume({ Name: volumeName });
        console.log(`📦 Docker volume ${volumeName} created`);
      }

      const container = await this.docker.createContainer({
        Image: 'hyperledger/fabric-peer:latest',
        name: containerName,
        Hostname: `peer.${domain}`,
        Env: [
          'CORE_PEER_ID=peer0',
          `CORE_PEER_ADDRESS=0.0.0.0:7051`,
          'CORE_PEER_CHAINCODEADDRESS=0.0.0.0:7052',
          'CORE_VM_ENDPOINT=unix:///var/run/docker.sock',
          'CORE_VM_DOCKER_HOSTCONFIG_NETWORKMODE=chaincert-network',
          'FABRIC_CFG_PATH=/etc/hyperledger/fabric'
        ],
        Volumes: {
          '/etc/hyperledger/fabric/msp': {},
          '/var/hyperledger/production': {},
          '/var/run/docker.sock': {}
        },
        ExposedPorts: { 
          '7051/tcp': {},
          '7052/tcp': {}
        },
        HostConfig: {
          PortBindings: {
            '7051/tcp': [{ HostIp: '0.0.0.0', HostPort: peerPort.toString() }],
            '7052/tcp': [{ HostIp: '0.0.0.0', HostPort: (peerPort + 1).toString() }]
          },
          NetworkMode: 'chaincert-network',
          Binds: [
            `${volumeName}:/etc/hyperledger/fabric`,
            `${volumeName}:/var/hyperledger/production`,
            '/var/run/docker.sock:/var/run/docker.sock'
          ]
        }
      });

      await container.start();
      console.log(`✅ Peer container ${containerName} started on port ${peerPort}`);
      
      // Initialize MSP structure INSIDE the container
      try {
        const initCmd = [
          'sh', '-c',
          'mkdir -p /etc/hyperledger/fabric/msp/{cacerts,signcerts,keystore} && echo "✅ MSP initialized"'
        ];
        const exec = await container.exec({ Cmd: initCmd, AttachStdout: true });
        await exec.start({});
        console.log(`✅ MSP initialized in peer container`);
      } catch (e) {
        console.warn(`⚠️ MSP initialization warning: ${e.message}`);
      }

      await new Promise(resolve => setTimeout(resolve, 3000));
      console.log(`✅ Peer ready!\n`);

      return { containerName, port: peerPort, status: 'running' };
    } catch (error) {
      throw new Error(`Peer creation failed: ${error.message}`);
    }
  }

  async deployCompleteIssuer(email) {
    const domain = email.replace(/[@.]/g, '-').toLowerCase();
    const orgName = email.split('@')[0].toUpperCase();
    
    const caPort = 9100 + Math.floor(Math.random() * 900);
    const peerPort = 7000 + Math.floor(Math.random() * 900);
    const couchdbPort = 5000 + Math.floor(Math.random() * 900);

    console.log(`\n🚀 [DEPLOY] Starting deployment for [${email}]`);
    console.log(`   CA Port: ${caPort} | CouchDB Port: ${couchdbPort} | Peer Port: ${peerPort}\n`);

    try {
      const caInfo = await this.createCAContainer(domain, orgName, email, caPort);
      const couchdbInfo = await this.createCouchDBContainer(domain, couchdbPort);
      const peerInfo = await this.createPeerContainer(domain, orgName, peerPort);

      return {
        email,
        domain,
        orgName,
        ca: caInfo,
        couchdb: couchdbInfo,
        peer: peerInfo,
        deployedAt: new Date().toISOString(),
        status: 'active'
      };
    } catch (error) {
      console.error(`❌ [DEPLOY] ${error.message}`);
      throw error;
    }
  }
}

module.exports = IssuerDeploymentService;
