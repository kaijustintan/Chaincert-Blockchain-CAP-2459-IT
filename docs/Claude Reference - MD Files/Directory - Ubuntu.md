# Directory Structure — Ubuntu / WSL (`/home/kaitanz_`)

Generated: 2026-05-30

Tree of the Ubuntu/WSL home directory. Excludes `node_modules`, `.git`, build artifacts, the Fabric wallet (private keys), and system/runtime dotfiles (`.cache`, `.npm`, `.local`, `.pm2`, `.docker`, `.fabric-ca-client`, `.landscape`, `snap`, `.aws` and `.azure` symlinks, shell history/config).

Counts: **662 directories, 1453 files**.

```
/home/kaitanz_
├── backend
├── chaincert-api
│   ├── config
│   │   └── issuerRequirements.js
│   ├── controllers
│   │   ├── accountController.js
│   │   ├── adminAuditController.js
│   │   ├── adminDashboardController.js
│   │   ├── adminIssuerController.js
│   │   ├── authController.js
│   │   ├── issuerCredentialController.js
│   │   ├── issuerOnboardingController.js
│   │   ├── rootAuthorityController.js
│   │   ├── verifierController.js
│   │   └── walletController.js
│   ├── middleware
│   │   └── verifyToken.js
│   ├── routes
│   │   ├── adminRoutes.js
│   │   ├── authRoutes.js
│   │   ├── credentialRoutes.js
│   │   ├── issuerRoutes.js
│   │   ├── systemRoutes.js
│   │   ├── verificationRoutes.js
│   │   └── walletRoutes.js
│   ├── authenticationService.js
│   ├── couchDB_service.js
│   ├── enrollAdmin.js
│   ├── enrollChaincertAdmin.js
│   ├── enrollOrg2Admin.js
│   ├── package-lock.json
│   ├── package.json
│   ├── sdk-server-fixed.js
│   ├── setup_Wallet_DLSU.js
│   ├── setup_Wallet_DLSU_Subordinate_INNOCENCIO.js
│   └── setup_Wallet_DLSU_Subordinate_LASALLECOMPUTERSOCIETY.js
├── chaincert-chaincode
│   ├── index.js
│   └── package.json
├── docs
│   └── Claude Reference - MD Files
│       ├── CAP1 Documents to Submit
│       │   ├── CAP-2459-IT-INSTALLATION-MANUAL.md
│       │   ├── CAP-2459-IT-TECHNICAL-MANUAL.md
│       │   ├── CAP-2459-IT-USER-MANUAL.md
│       │   ├── CAP-2459-IT-WALKTHROUGH.md
│       │   └── Defense Knowledge - March 25.md
│       ├── CAP-2459-IT-PROPOSAL.md
│       ├── CAP-2459-IT-WALKTHROUGH-OUTDATED.md
│       ├── CAP2 - Deployment Gameplan.md
│       ├── CONTROLLER Files and its Responsibilities.md
│       ├── Chaincert Design Details #1.md
│       ├── Chaincert Design Details #2.md
│       ├── Chaincode - Query Commands.md
│       ├── Copy Commands.md
│       ├── Directory - Windows.md
│       ├── Final Design.md
│       ├── Installation Dependencies.md
│       ├── Issuer Required Docs per Category.md
│       ├── Node Creation for DLSU.md
│       ├── Predemo Setup.md
│       ├── ROUTE Files and its Responsibilities.md
│       └── Redeploy CC Instructions.md
├── fabric-samples
│   └── fabric-samples
│       ├── .github
│       │   ├── actions
│       │   │   ├── fsat-setup
│       │   │   │   └── action.yaml
│       │   │   └── test-network-setup
│       │   │       └── action.yaml
│       │   ├── workflows
│       │   │   ├── lint.yaml
│       │   │   ├── rest-sample.yaml
│       │   │   ├── test-fsat.yaml
│       │   │   ├── test-high-throughput.yaml
│       │   │   ├── test-network-basic.yaml
│       │   │   ├── test-network-bft-orderer.yaml
│       │   │   ├── test-network-events.yaml
│       │   │   ├── test-network-hsm.yaml
│       │   │   ├── test-network-k8s.yaml
│       │   │   ├── test-network-ledger.yaml
│       │   │   ├── test-network-off-chain.yaml
│       │   │   ├── test-network-private.yaml
│       │   │   ├── test-network-sbe.yaml
│       │   │   └── test-network-secured.yaml
│       │   ├── dependabot.yml
│       │   └── settings.yml
│       ├── asset-transfer-abac
│       │   ├── chaincode-go
│       │   │   ├── smart-contract
│       │   │   │   └── abac.go
│       │   │   ├── go.mod
│       │   │   ├── go.sum
│       │   │   └── smartContract.go
│       │   └── README.md
│       ├── asset-transfer-basic
│       │   ├── application-gateway-go
│       │   │   ├── assetTransfer.go
│       │   │   ├── go.mod
│       │   │   └── go.sum
│       │   ├── application-gateway-java
│       │   │   ├── gradle
│       │   │   │   └── wrapper
│       │   │   │       ├── gradle-wrapper.jar
│       │   │   │       └── gradle-wrapper.properties
│       │   │   ├── src
│       │   │   │   └── main
│       │   │   │       └── java
│       │   │   │           └── App.java
│       │   │   ├── build.gradle
│       │   │   ├── gradlew
│       │   │   ├── gradlew.bat
│       │   │   ├── pom.xml
│       │   │   └── settings.gradle
│       │   ├── application-gateway-javascript
│       │   │   ├── src
│       │   │   │   └── app.js
│       │   │   ├── .gitignore
│       │   │   ├── eslint.config.mjs
│       │   │   └── package.json
│       │   ├── application-gateway-typescript
│       │   │   ├── src
│       │   │   │   └── app.ts
│       │   │   ├── .gitignore
│       │   │   ├── eslint.config.mjs
│       │   │   ├── package.json
│       │   │   └── tsconfig.json
│       │   ├── chaincode-external
│       │   │   ├── crypto
│       │   │   │   └── .gitkeep
│       │   │   ├── sampleBuilder
│       │   │   │   └── bin
│       │   │   │       ├── detect
│       │   │   │       └── release
│       │   │   ├── .dockerignore
│       │   │   ├── .gitignore
│       │   │   ├── Dockerfile
│       │   │   ├── README.md
│       │   │   ├── assetTransfer.go
│       │   │   ├── chaincode.env
│       │   │   ├── chaincode1.env
│       │   │   ├── chaincode2.env
│       │   │   ├── connection.json
│       │   │   ├── docker-compose-chaincode.yaml
│       │   │   ├── go.mod
│       │   │   ├── go.sum
│       │   │   └── metadata.json
│       │   ├── chaincode-go
│       │   │   ├── chaincode
│       │   │   │   ├── mocks
│       │   │   │   │   ├── chaincodestub.go
│       │   │   │   │   ├── statequeryiterator.go
│       │   │   │   │   └── transaction.go
│       │   │   │   ├── smartcontract.go
│       │   │   │   └── smartcontract_test.go
│       │   │   ├── assetTransfer.go
│       │   │   ├── go.mod
│       │   │   └── go.sum
│       │   ├── chaincode-java
│       │   │   ├── config
│       │   │   │   └── checkstyle
│       │   │   │       ├── checkstyle.xml
│       │   │   │       └── suppressions.xml
│       │   │   ├── docker
│       │   │   │   └── docker-entrypoint.sh
│       │   │   ├── gradle
│       │   │   │   └── wrapper
│       │   │   │       ├── gradle-wrapper.jar
│       │   │   │       └── gradle-wrapper.properties
│       │   │   ├── src
│       │   │   │   ├── main
│       │   │   │   │   └── java
│       │   │   │   │       └── org
│       │   │   │   │           └── hyperledger
│       │   │   │   │               └── fabric
│       │   │   │   │                   └── samples
│       │   │   │   │                       └── assettransfer
│       │   │   │   │                           ├── Asset.java
│       │   │   │   │                           └── AssetTransfer.java
│       │   │   │   └── test
│       │   │   │       └── java
│       │   │   │           └── org
│       │   │   │               └── hyperledger
│       │   │   │                   └── fabric
│       │   │   │                       └── samples
│       │   │   │                           └── assettransfer
│       │   │   │                               ├── AssetTest.java
│       │   │   │                               └── AssetTransferTest.java
│       │   │   ├── .gitattributes
│       │   │   ├── .gitignore
│       │   │   ├── Dockerfile
│       │   │   ├── README.md
│       │   │   ├── build.gradle
│       │   │   ├── gradlew
│       │   │   ├── gradlew.bat
│       │   │   └── settings.gradle
│       │   ├── chaincode-javascript
│       │   │   ├── lib
│       │   │   │   └── assetTransfer.js
│       │   │   ├── test
│       │   │   │   └── assetTransfer.test.js
│       │   │   ├── .eslintignore
│       │   │   ├── .eslintrc.js
│       │   │   ├── .gitignore
│       │   │   ├── index.js
│       │   │   ├── npm-shrinkwrap.json
│       │   │   └── package.json
│       │   ├── chaincode-typescript
│       │   │   ├── docker
│       │   │   │   └── docker-entrypoint.sh
│       │   │   ├── src
│       │   │   │   ├── asset.ts
│       │   │   │   ├── assetTransfer.ts
│       │   │   │   └── index.ts
│       │   │   ├── .dockerignore
│       │   │   ├── .gitignore
│       │   │   ├── Dockerfile
│       │   │   ├── eslint.config.mjs
│       │   │   ├── npm-shrinkwrap.json
│       │   │   ├── package.json
│       │   │   └── tsconfig.json
│       │   ├── rest-api-go
│       │   │   ├── web
│       │   │   │   ├── app.go
│       │   │   │   ├── initialize.go
│       │   │   │   ├── invoke.go
│       │   │   │   └── query.go
│       │   │   ├── .gitignore
│       │   │   ├── README.md
│       │   │   ├── go.mod
│       │   │   ├── go.sum
│       │   │   └── main.go
│       │   ├── rest-api-typescript
│       │   │   ├── scripts
│       │   │   │   └── generateEnv.sh
│       │   │   ├── src
│       │   │   │   ├── __tests__
│       │   │   │   │   └── api.test.ts
│       │   │   │   ├── assets.router.ts
│       │   │   │   ├── auth.ts
│       │   │   │   ├── config.spec.ts
│       │   │   │   ├── config.ts
│       │   │   │   ├── errors.spec.ts
│       │   │   │   ├── errors.ts
│       │   │   │   ├── fabric.spec.ts
│       │   │   │   ├── fabric.ts
│       │   │   │   ├── health.router.ts
│       │   │   │   ├── index.ts
│       │   │   │   ├── jobs.router.ts
│       │   │   │   ├── jobs.spec.ts
│       │   │   │   ├── jobs.ts
│       │   │   │   ├── logger.ts
│       │   │   │   ├── redis.spec.ts
│       │   │   │   ├── redis.ts
│       │   │   │   ├── server.ts
│       │   │   │   └── transactions.router.ts
│       │   │   ├── .dockerignore
│       │   │   ├── .editorconfig
│       │   │   ├── .env.sample
│       │   │   ├── .eslintrc.json
│       │   │   ├── .gitignore
│       │   │   ├── Dockerfile
│       │   │   ├── README.md
│       │   │   ├── demo.http
│       │   │   ├── docker-compose.yaml
│       │   │   ├── jest.config.ts
│       │   │   ├── package-lock.json
│       │   │   ├── package.json
│       │   │   └── tsconfig.json
│       │   ├── .gitignore
│       │   └── README.md
│       ├── asset-transfer-events
│       │   ├── application-gateway-go
│       │   │   ├── app.go
│       │   │   ├── connect.go
│       │   │   ├── go.mod
│       │   │   └── go.sum
│       │   ├── application-gateway-java
│       │   │   ├── gradle
│       │   │   │   └── wrapper
│       │   │   │       ├── gradle-wrapper.jar
│       │   │   │       └── gradle-wrapper.properties
│       │   │   ├── src
│       │   │   │   └── main
│       │   │   │       └── java
│       │   │   │           ├── App.java
│       │   │   │           └── Connections.java
│       │   │   ├── build.gradle
│       │   │   ├── gradlew
│       │   │   ├── gradlew.bat
│       │   │   ├── pom.xml
│       │   │   └── settings.gradle
│       │   ├── application-gateway-typescript
│       │   │   ├── src
│       │   │   │   ├── app.ts
│       │   │   │   └── connect.ts
│       │   │   ├── .gitignore
│       │   │   ├── eslint.config.mjs
│       │   │   ├── package.json
│       │   │   └── tsconfig.json
│       │   ├── chaincode-go
│       │   │   ├── chaincode
│       │   │   │   └── smartcontract.go
│       │   │   ├── assetTransferEvents.go
│       │   │   ├── go.mod
│       │   │   └── go.sum
│       │   ├── chaincode-java
│       │   │   ├── config
│       │   │   │   └── checkstyle
│       │   │   │       ├── checkstyle.xml
│       │   │   │       └── suppressions.xml
│       │   │   ├── gradle
│       │   │   │   └── wrapper
│       │   │   │       ├── gradle-wrapper.jar
│       │   │   │       └── gradle-wrapper.properties
│       │   │   ├── src
│       │   │   │   └── main
│       │   │   │       └── java
│       │   │   │           └── org
│       │   │   │               └── hyperledger
│       │   │   │                   └── fabric
│       │   │   │                       └── samples
│       │   │   │                           └── events
│       │   │   │                               ├── Asset.java
│       │   │   │                               └── AssetTransfer.java
│       │   │   ├── build.gradle
│       │   │   ├── gradlew
│       │   │   ├── gradlew.bat
│       │   │   └── settings.gradle
│       │   ├── chaincode-javascript
│       │   │   ├── lib
│       │   │   │   └── assetTransferEvents.js
│       │   │   ├── test
│       │   │   │   └── assetTransferEvents.test.js
│       │   │   ├── .eslintignore
│       │   │   ├── .eslintrc.js
│       │   │   ├── .gitignore
│       │   │   ├── index.js
│       │   │   ├── npm-shrinkwrap.json
│       │   │   └── package.json
│       │   └── README.md
│       ├── asset-transfer-ledger-queries
│       │   ├── application-java
│       │   │   ├── gradle
│       │   │   │   └── wrapper
│       │   │   │       ├── gradle-wrapper.jar
│       │   │   │       └── gradle-wrapper.properties
│       │   │   ├── src
│       │   │   │   └── main
│       │   │   │       ├── java
│       │   │   │       │   └── application
│       │   │   │       │       └── java
│       │   │   │       │           ├── App.java
│       │   │   │       │           ├── EnrollAdmin.java
│       │   │   │       │           └── RegisterUser.java
│       │   │   │       └── resources
│       │   │   │           └── log4j.properties
│       │   │   ├── .gitattributes
│       │   │   ├── build.gradle
│       │   │   ├── gradlew
│       │   │   ├── gradlew.bat
│       │   │   └── settings.gradle
│       │   ├── application-javascript
│       │   │   ├── .eslintignore
│       │   │   ├── .eslintrc.js
│       │   │   ├── .gitignore
│       │   │   ├── app.js
│       │   │   └── package.json
│       │   ├── chaincode-go
│       │   │   ├── META-INF
│       │   │   │   └── statedb
│       │   │   │       └── couchdb
│       │   │   │           └── indexes
│       │   │   │               └── indexOwner.json
│       │   │   ├── asset_transfer_ledger_chaincode.go
│       │   │   ├── go.mod
│       │   │   └── go.sum
│       │   ├── chaincode-javascript
│       │   │   ├── META-INF
│       │   │   │   └── statedb
│       │   │   │       └── couchdb
│       │   │   │           └── indexes
│       │   │   │               └── indexOwner.json
│       │   │   ├── lib
│       │   │   │   └── asset_transfer_ledger_chaincode.js
│       │   │   ├── .eslintignore
│       │   │   ├── .eslintrc.js
│       │   │   ├── index.js
│       │   │   ├── npm-shrinkwrap.json
│       │   │   └── package.json
│       │   └── chaincode-typescript
│       │       ├── META-INF
│       │       │   └── statedb
│       │       │       └── couchdb
│       │       │           └── indexes
│       │       │               └── indexOwner.json
│       │       ├── src
│       │       │   ├── asset.ts
│       │       │   ├── assetTransferLedger.ts
│       │       │   └── index.ts
│       │       ├── .gitignore
│       │       ├── eslint.config.mjs
│       │       ├── npm-shrinkwrap.json
│       │       ├── package.json
│       │       └── tsconfig.json
│       ├── asset-transfer-private-data
│       │   ├── application-gateway-go
│       │   │   ├── app.go
│       │   │   ├── connect.go
│       │   │   ├── go.mod
│       │   │   └── go.sum
│       │   ├── application-gateway-typescript
│       │   │   ├── src
│       │   │   │   ├── app.ts
│       │   │   │   └── connect.ts
│       │   │   ├── .gitignore
│       │   │   ├── README.md
│       │   │   ├── eslint.config.mjs
│       │   │   ├── package.json
│       │   │   └── tsconfig.json
│       │   ├── chaincode-go
│       │   │   ├── META-INF
│       │   │   │   └── statedb
│       │   │   │       └── couchdb
│       │   │   │           └── collections
│       │   │   │               └── assetCollection
│       │   │   │                   └── indexes
│       │   │   │                       └── indexOwner.json
│       │   │   ├── chaincode
│       │   │   │   ├── mocks
│       │   │   │   │   ├── chaincodestub.go
│       │   │   │   │   ├── clientIdentity.go
│       │   │   │   │   ├── statequeryiterator.go
│       │   │   │   │   └── transaction.go
│       │   │   │   ├── asset_queries.go
│       │   │   │   ├── asset_queries_test.go
│       │   │   │   ├── asset_transfer.go
│       │   │   │   └── asset_transfer_test.go
│       │   │   ├── README.md
│       │   │   ├── collections_config.json
│       │   │   ├── go.mod
│       │   │   ├── go.sum
│       │   │   └── main.go
│       │   ├── chaincode-java
│       │   │   ├── META-INF
│       │   │   │   └── statedb
│       │   │   │       └── couchdb
│       │   │   │           └── collections
│       │   │   │               └── assetCollection
│       │   │   │                   └── indexes
│       │   │   │                       └── indexOwner.json
│       │   │   ├── config
│       │   │   │   └── checkstyle
│       │   │   │       ├── checkstyle.xml
│       │   │   │       └── suppressions.xml
│       │   │   ├── gradle
│       │   │   │   └── wrapper
│       │   │   │       ├── gradle-wrapper.jar
│       │   │   │       └── gradle-wrapper.properties
│       │   │   ├── src
│       │   │   │   ├── main
│       │   │   │   │   └── java
│       │   │   │   │       └── org
│       │   │   │   │           └── hyperledger
│       │   │   │   │               └── fabric
│       │   │   │   │                   └── samples
│       │   │   │   │                       └── privatedata
│       │   │   │   │                           ├── Asset.java
│       │   │   │   │                           ├── AssetPrivateDetails.java
│       │   │   │   │                           ├── AssetTransfer.java
│       │   │   │   │                           └── TransferAgreement.java
│       │   │   │   └── test
│       │   │   │       ├── java
│       │   │   │       │   └── org
│       │   │   │       │       └── hyperledger
│       │   │   │       │           └── fabric
│       │   │   │       │               └── samples
│       │   │   │       │                   └── privatedata
│       │   │   │       │                       └── AssetTransferTest.java
│       │   │   │       └── resources
│       │   │   │           └── mockito-extensions
│       │   │   │               └── org.mockito.plugins.MockMaker
│       │   │   ├── .gitattributes
│       │   │   ├── build.gradle
│       │   │   ├── collections_config.json
│       │   │   ├── gradlew
│       │   │   ├── gradlew.bat
│       │   │   └── settings.gradle
│       │   ├── chaincode-typescript
│       │   │   ├── docker
│       │   │   │   └── docker-entrypoint.sh
│       │   │   ├── src
│       │   │   │   ├── asset.ts
│       │   │   │   ├── assetTransfer.ts
│       │   │   │   ├── assetTransferDetails.ts
│       │   │   │   ├── assetTransferTransientInput.ts
│       │   │   │   ├── index.ts
│       │   │   │   ├── transferAgreement.ts
│       │   │   │   └── utils.ts
│       │   │   ├── .dockerignore
│       │   │   ├── .gitignore
│       │   │   ├── Dockerfile
│       │   │   ├── Readme.md
│       │   │   ├── collections_config.json
│       │   │   ├── eslint.config.mjs
│       │   │   ├── npm-shrinkwrap.json
│       │   │   ├── package.json
│       │   │   └── tsconfig.json
│       │   └── README.md
│       ├── asset-transfer-sbe
│       │   ├── application-javascript
│       │   │   ├── .eslintignore
│       │   │   ├── .eslintrc.js
│       │   │   ├── .gitignore
│       │   │   ├── app.js
│       │   │   └── package.json
│       │   ├── chaincode-java
│       │   │   ├── config
│       │   │   │   └── checkstyle
│       │   │   │       ├── checkstyle.xml
│       │   │   │       └── suppressions.xml
│       │   │   ├── gradle
│       │   │   │   └── wrapper
│       │   │   │       ├── gradle-wrapper.jar
│       │   │   │       └── gradle-wrapper.properties
│       │   │   ├── src
│       │   │   │   └── main
│       │   │   │       └── java
│       │   │   │           └── org
│       │   │   │               └── hyperledger
│       │   │   │                   └── fabric
│       │   │   │                       └── samples
│       │   │   │                           └── sbe
│       │   │   │                               ├── Asset.java
│       │   │   │                               └── AssetContract.java
│       │   │   ├── .gitattributes
│       │   │   ├── .gitignore
│       │   │   ├── build.gradle
│       │   │   ├── gradlew
│       │   │   ├── gradlew.bat
│       │   │   └── settings.gradle
│       │   ├── chaincode-typescript
│       │   │   ├── src
│       │   │   │   ├── asset.ts
│       │   │   │   ├── assetContract.ts
│       │   │   │   └── index.ts
│       │   │   ├── .gitignore
│       │   │   ├── eslint.config.mjs
│       │   │   ├── npm-shrinkwrap.json
│       │   │   ├── package.json
│       │   │   └── tsconfig.json
│       │   └── README.md
│       ├── asset-transfer-secured-agreement
│       │   ├── application-gateway-typescript
│       │   │   ├── src
│       │   │   │   ├── app.ts
│       │   │   │   ├── connect.ts
│       │   │   │   ├── contractWrapper.ts
│       │   │   │   └── utils.ts
│       │   │   ├── .gitignore
│       │   │   ├── eslint.config.mjs
│       │   │   ├── package.json
│       │   │   └── tsconfig.json
│       │   ├── chaincode-go
│       │   │   ├── README.md
│       │   │   ├── asset_transfer.go
│       │   │   ├── asset_transfer_queries.go
│       │   │   ├── go.mod
│       │   │   └── go.sum
│       │   └── README.md
│       ├── auction-dutch
│       │   ├── application-javascript
│       │   │   ├── .eslintignore
│       │   │   ├── .eslintrc.js
│       │   │   ├── bid.js
│       │   │   ├── closeAuction.js
│       │   │   ├── createAuction.js
│       │   │   ├── endAuction.js
│       │   │   ├── endAuctionwithAuditor.js
│       │   │   ├── enrollAdmin.js
│       │   │   ├── package.json
│       │   │   ├── queryAuction.js
│       │   │   ├── queryBid.js
│       │   │   ├── registerEnrollUser.js
│       │   │   ├── revealBid.js
│       │   │   └── submitBid.js
│       │   ├── chaincode-go
│       │   │   ├── smart-contract
│       │   │   │   ├── auction.go
│       │   │   │   ├── auctionQueries.go
│       │   │   │   └── utils.go
│       │   │   ├── go.mod
│       │   │   ├── go.sum
│       │   │   └── smartContract.go
│       │   ├── chaincode-go-auditor
│       │   │   ├── smart-contract
│       │   │   │   ├── auction.go
│       │   │   │   ├── auctionQueries.go
│       │   │   │   └── utils.go
│       │   │   ├── go.mod
│       │   │   ├── go.sum
│       │   │   └── smartContract.go
│       │   └── README.md
│       ├── auction-simple
│       │   ├── application-javascript
│       │   │   ├── .eslintignore
│       │   │   ├── .eslintrc.js
│       │   │   ├── bid.js
│       │   │   ├── closeAuction.js
│       │   │   ├── createAuction.js
│       │   │   ├── endAuction.js
│       │   │   ├── enrollAdmin.js
│       │   │   ├── package.json
│       │   │   ├── queryAuction.js
│       │   │   ├── queryBid.js
│       │   │   ├── registerEnrollUser.js
│       │   │   ├── revealBid.js
│       │   │   └── submitBid.js
│       │   ├── chaincode-go
│       │   │   ├── smart-contract
│       │   │   │   ├── auction.go
│       │   │   │   ├── auctionQueries.go
│       │   │   │   └── utils.go
│       │   │   ├── go.mod
│       │   │   ├── go.sum
│       │   │   └── smartContract.go
│       │   └── README.md
│       ├── bin
│       │   ├── configtxgen
│       │   ├── configtxlator
│       │   ├── cryptogen
│       │   ├── discover
│       │   ├── fabric-ca-client
│       │   ├── fabric-ca-server
│       │   ├── ledgerutil
│       │   ├── orderer
│       │   ├── osnadmin
│       │   └── peer
│       ├── builders
│       │   └── ccaas
│       │       └── bin
│       │           ├── detect
│       │           └── release
│       ├── ci
│       │   └── scripts
│       │       ├── lint-go.sh
│       │       ├── lint-java.sh
│       │       ├── lint-javascript.sh
│       │       ├── lint-shell.sh
│       │       ├── lint-typescript.sh
│       │       ├── lint.sh
│       │       ├── run-k8s-test-network-basic.sh
│       │       ├── run-test-network-basic.sh
│       │       ├── run-test-network-events.sh
│       │       ├── run-test-network-hsm.sh
│       │       ├── run-test-network-ledger.sh
│       │       ├── run-test-network-off-chain.sh
│       │       ├── run-test-network-private.sh
│       │       ├── run-test-network-sbe.sh
│       │       └── run-test-network-secured.sh
│       ├── config
│       │   ├── configtx.yaml
│       │   ├── core.yaml
│       │   └── orderer.yaml
│       ├── full-stack-asset-transfer-guide
│       │   ├── applications
│       │   │   ├── conga-cards
│       │   │   │   ├── assets
│       │   │   │   │   ├── appleplectic.png
│       │   │   │   │   ├── bananomatopoeia.png
│       │   │   │   │   ├── block-norris.png
│       │   │   │   │   ├── blockbert.png
│       │   │   │   │   ├── count-blockula.png
│       │   │   │   │   ├── darth-conga.png
│       │   │   │   │   ├── no-pun-intended.png
│       │   │   │   │   └── template.png
│       │   │   │   ├── hooks
│       │   │   │   │   └── captain-hook.json
│       │   │   │   ├── images
│       │   │   │   │   └── interaction.png
│       │   │   │   ├── src
│       │   │   │   │   ├── commands
│       │   │   │   │   │   ├── create.ts
│       │   │   │   │   │   ├── delete.ts
│       │   │   │   │   │   ├── discord.ts
│       │   │   │   │   │   ├── getAllAssets.ts
│       │   │   │   │   │   ├── index.ts
│       │   │   │   │   │   ├── read.ts
│       │   │   │   │   │   └── transfer.ts
│       │   │   │   │   ├── app.ts
│       │   │   │   │   ├── config.ts
│       │   │   │   │   ├── connect.ts
│       │   │   │   │   ├── contract.ts
│       │   │   │   │   ├── expectedError.ts
│       │   │   │   │   └── utils.ts
│       │   │   │   ├── .eslintrc.js
│       │   │   │   ├── .gitignore
│       │   │   │   ├── README.md
│       │   │   │   ├── package.json
│       │   │   │   └── tsconfig.json
│       │   │   ├── frontend
│       │   │   │   ├── screenshots
│       │   │   │   │   ├── Create.png
│       │   │   │   │   └── list.png
│       │   │   │   ├── src
│       │   │   │   │   ├── app
│       │   │   │   │   │   ├── asset-dialog
│       │   │   │   │   │   │   ├── asset-dialog.component.html
│       │   │   │   │   │   │   ├── asset-dialog.component.scss
│       │   │   │   │   │   │   ├── asset-dialog.component.spec.ts
│       │   │   │   │   │   │   └── asset-dialog.component.ts
│       │   │   │   │   │   ├── app-routing.module.ts
│       │   │   │   │   │   ├── app.component.html
│       │   │   │   │   │   ├── app.component.scss
│       │   │   │   │   │   ├── app.component.spec.ts
│       │   │   │   │   │   ├── app.component.ts
│       │   │   │   │   │   ├── app.module.ts
│       │   │   │   │   │   └── urls.ts
│       │   │   │   │   ├── assets
│       │   │   │   │   │   └── .gitkeep
│       │   │   │   │   ├── environments
│       │   │   │   │   │   ├── environment.prod.ts
│       │   │   │   │   │   └── environment.ts
│       │   │   │   │   ├── favicon.ico
│       │   │   │   │   ├── index.html
│       │   │   │   │   ├── main.ts
│       │   │   │   │   ├── polyfills.ts
│       │   │   │   │   ├── styles.scss
│       │   │   │   │   └── test.ts
│       │   │   │   ├── .browserslistrc
│       │   │   │   ├── .editorconfig
│       │   │   │   ├── .gitignore
│       │   │   │   ├── Dockerfile
│       │   │   │   ├── README.md
│       │   │   │   ├── angular.json
│       │   │   │   ├── karma.conf.js
│       │   │   │   ├── package.json
│       │   │   │   ├── tsconfig.app.json
│       │   │   │   ├── tsconfig.json
│       │   │   │   └── tsconfig.spec.json
│       │   │   ├── ping-chaincode
│       │   │   │   ├── src
│       │   │   │   │   ├── app.ts
│       │   │   │   │   ├── fabric-connection-profile.ts
│       │   │   │   │   └── jsonid-adapter.ts
│       │   │   │   ├── .gitignore
│       │   │   │   ├── app.env
│       │   │   │   ├── package.json
│       │   │   │   └── tsconfig.json
│       │   │   ├── rest-api
│       │   │   │   ├── src
│       │   │   │   │   ├── app.ts
│       │   │   │   │   ├── assets.router.ts
│       │   │   │   │   ├── connection.ts
│       │   │   │   │   └── server.ts
│       │   │   │   ├── .gitignore
│       │   │   │   ├── Dockerfile
│       │   │   │   ├── LICENSE
│       │   │   │   ├── README.md
│       │   │   │   ├── asset-transfer.postman_collection.json
│       │   │   │   ├── deployment.yaml
│       │   │   │   ├── package.json
│       │   │   │   ├── renovate.json
│       │   │   │   └── tsconfig.json
│       │   │   └── trader-typescript
│       │   │       ├── src
│       │   │       │   ├── commands
│       │   │       │   │   ├── create.ts
│       │   │       │   │   ├── delete.ts
│       │   │       │   │   ├── getAllAssets.ts
│       │   │       │   │   ├── index.ts
│       │   │       │   │   ├── listen.ts
│       │   │       │   │   ├── read.ts
│       │   │       │   │   ├── transact.ts
│       │   │       │   │   └── transfer.ts
│       │   │       │   ├── app.ts
│       │   │       │   ├── config.ts
│       │   │       │   ├── connect.ts
│       │   │       │   ├── contract.ts
│       │   │       │   ├── expectedError.ts
│       │   │       │   └── utils.ts
│       │   │       ├── .gitignore
│       │   │       ├── README.md
│       │   │       ├── eslint.config.mjs
│       │   │       ├── package.json
│       │   │       └── tsconfig.json
│       │   ├── checks
│       │   │   ├── check-chaincode.sh
│       │   │   ├── check-kube.sh
│       │   │   ├── check-network.sh
│       │   │   └── utils.sh
│       │   ├── contracts
│       │   │   └── asset-transfer-typescript
│       │   │       ├── docker
│       │   │       │   └── docker-entrypoint.sh
│       │   │       ├── src
│       │   │       │   ├── asset.ts
│       │   │       │   ├── assetTransfer.ts
│       │   │       │   ├── index.ts
│       │   │       │   └── untyped.d.ts
│       │   │       ├── .gitignore
│       │   │       ├── Dockerfile
│       │   │       ├── asset-transfer-chaincode-vars.yml
│       │   │       ├── eslint.config.mjs
│       │   │       ├── npm-shrinkwrap.json
│       │   │       ├── package.json
│       │   │       └── tsconfig.json
│       │   ├── docs
│       │   │   ├── ApplicationDev
│       │   │   │   ├── 01-FabricGateway-ES.md
│       │   │   │   ├── 01-FabricGateway.md
│       │   │   │   ├── 02-Exercise-RunApplication-ES.md
│       │   │   │   ├── 02-Exercise-RunApplication.md
│       │   │   │   ├── 03-ApplicationOverview-ES.md
│       │   │   │   ├── 03-ApplicationOverview.md
│       │   │   │   ├── 04-Exercise-AssetTransfer-ES.md
│       │   │   │   ├── 04-Exercise-AssetTransfer.md
│       │   │   │   ├── 05-ChaincodeEvents-ES.md
│       │   │   │   ├── 05-ChaincodeEvents.md
│       │   │   │   ├── 06-Exercise-ChaincodeEvents-ES.md
│       │   │   │   ├── 06-Exercise-ChaincodeEvents.md
│       │   │   │   └── README.md
│       │   │   ├── CloudReady
│       │   │   │   ├── 00-setup-zh.md
│       │   │   │   ├── 00-setup.md
│       │   │   │   ├── 10-kube-zh.md
│       │   │   │   ├── 10-kube.md
│       │   │   │   ├── 11-kube-multipass.md
│       │   │   │   ├── 12-kube-ec2-vm.md
│       │   │   │   ├── 13-kube-public-cloud.md
│       │   │   │   ├── 20-fabric-zh.md
│       │   │   │   ├── 20-fabric.md
│       │   │   │   ├── 21-fabric-operations-console.md
│       │   │   │   ├── 22-fabric-ansible-collection.md
│       │   │   │   ├── 30-chaincode-zh.md
│       │   │   │   ├── 30-chaincode.md
│       │   │   │   ├── 31-fabric-ansible-chaincode.md
│       │   │   │   ├── 40-bananas-zh.md
│       │   │   │   ├── 40-bananas.md
│       │   │   │   ├── 50-OpenShift-Deployment.md
│       │   │   │   ├── 90-teardown.md
│       │   │   │   └── README.md
│       │   │   ├── SmartContractDev
│       │   │   │   ├── 00-Introduction-ES.md
│       │   │   │   ├── 00-Introduction.md
│       │   │   │   ├── 01-Exercise-Getting-Started-ES.md
│       │   │   │   ├── 01-Exercise-Getting-Started.md
│       │   │   │   ├── 02-Exercise-Adding-tx-function-ES.md
│       │   │   │   ├── 02-Exercise-Adding-tx-function.md
│       │   │   │   ├── 03-Test-And-Debug-Reference-ES.md
│       │   │   │   └── 03-Test-And-Debug-Reference.md
│       │   │   ├── images
│       │   │   │   ├── ApplicationDev
│       │   │   │   │   ├── fabric-gateway-deployment.png
│       │   │   │   │   ├── fabric-gateway-model.png
│       │   │   │   │   ├── legacy-sdk-model.png
│       │   │   │   │   └── transaction-submit-flow.png
│       │   │   │   ├── CloudReady
│       │   │   │   │   ├── 00-cloud-ready-2.png
│       │   │   │   │   ├── 10-kube.png
│       │   │   │   │   ├── 12-kube-ec2-vm.png
│       │   │   │   │   ├── 20-fabric.png
│       │   │   │   │   ├── 30-chaincode.png
│       │   │   │   │   ├── 40-gateway-client-app.png
│       │   │   │   │   └── kube-ec2-vm.png
│       │   │   │   ├── ApplicationDev.pptx
│       │   │   │   ├── CloudReady.pptx
│       │   │   │   ├── cloud-vm-with-operator-network.png
│       │   │   │   ├── multipass-operator-network.png
│       │   │   │   ├── multipass-test-network.png
│       │   │   │   └── readme_diagram.png
│       │   │   └── tips-for-windows-dev.md
│       │   ├── infrastructure
│       │   │   ├── configuration
│       │   │   │   ├── fabric-common-vars.yml
│       │   │   │   ├── fabric-ordering-org-vars.yml
│       │   │   │   ├── fabric-org1-vars.yml
│       │   │   │   ├── fabric-org2-vars.yml
│       │   │   │   ├── fabric-sail.yaml
│       │   │   │   └── operator-console-vars.yml
│       │   │   ├── fabric_network_playbooks
│       │   │   │   ├── 00-complete.yml
│       │   │   │   ├── 01-create-ordering-organization-components.yml
│       │   │   │   ├── 02-create-endorsing-organization-components.yml
│       │   │   │   ├── 05-enable-capabilities.yml
│       │   │   │   ├── 06-add-organization-to-consortium.yml
│       │   │   │   ├── 09-admins-policy.json.j2
│       │   │   │   ├── 09-create-channel.yml
│       │   │   │   ├── 09-endorsement-policy.json.j2
│       │   │   │   ├── 09-lifecycle-endorsement-policy.json.j2
│       │   │   │   ├── 09-readers-policy.json.j2
│       │   │   │   ├── 09-writers-policy.json.j2
│       │   │   │   ├── 10-join-peer-to-channel.yml
│       │   │   │   ├── 11-add-anchor-peer-to-channel.yml
│       │   │   │   ├── 12-create-endorsing-organization-components.yml
│       │   │   │   ├── 15-add-organization-to-channel.yml
│       │   │   │   ├── 15-admins-policy.json.j2
│       │   │   │   ├── 15-endorsement-policy.json.j2
│       │   │   │   ├── 15-lifecycle-endorsement-policy.json.j2
│       │   │   │   ├── 15-readers-policy.json.j2
│       │   │   │   ├── 15-writers-policy.json.j2
│       │   │   │   ├── 16-import-ordering-service.yml
│       │   │   │   ├── 17-join-peer-to-channel.yml
│       │   │   │   └── 18-add-anchor-peer-to-channel.yml
│       │   │   ├── kind_console_ingress
│       │   │   │   ├── templates
│       │   │   │   │   ├── coredns
│       │   │   │   │   │   └── coredns.yaml.j2
│       │   │   │   │   └── ingress
│       │   │   │   │       ├── ingress-nginx-controller.yaml
│       │   │   │   │       └── kustomization.yaml
│       │   │   │   └── 90-KIND-ingress.yml
│       │   │   ├── operator_console_playbooks
│       │   │   │   ├── 01-operator-install.yml
│       │   │   │   └── 02-console-install.yml
│       │   │   ├── production_chaincode_playbooks
│       │   │   │   ├── 19-install-and-approve-chaincode.yml
│       │   │   │   ├── 20-install-and-approve-chaincode.yml
│       │   │   │   ├── 21-commit-chaincode.yml
│       │   │   │   ├── 22-register-application.yml
│       │   │   │   └── asset-transfer_appid.json
│       │   │   ├── sample-network
│       │   │   │   ├── config
│       │   │   │   │   ├── cas
│       │   │   │   │   │   ├── kustomization.yaml
│       │   │   │   │   │   ├── org0-ca.yaml
│       │   │   │   │   │   ├── org1-ca.yaml
│       │   │   │   │   │   └── org2-ca.yaml
│       │   │   │   │   ├── console
│       │   │   │   │   │   ├── hlf-operations-console.yaml
│       │   │   │   │   │   └── kustomization.yaml
│       │   │   │   │   ├── gateway
│       │   │   │   │   │   ├── kustomization.yaml
│       │   │   │   │   │   ├── org1-peer-gateway.yaml
│       │   │   │   │   │   └── org2-peer-gateway.yaml
│       │   │   │   │   ├── manager
│       │   │   │   │   │   ├── fabric-operator-manager.yaml
│       │   │   │   │   │   └── kustomization.yaml
│       │   │   │   │   ├── orderers
│       │   │   │   │   │   ├── kustomization.yaml
│       │   │   │   │   │   └── org0-orderers.yaml
│       │   │   │   │   ├── peers
│       │   │   │   │   │   ├── kustomization.yaml
│       │   │   │   │   │   ├── org1-peer1.yaml
│       │   │   │   │   │   ├── org1-peer2.yaml
│       │   │   │   │   │   ├── org2-peer1.yaml
│       │   │   │   │   │   └── org2-peer2.yaml
│       │   │   │   │   ├── rbac
│       │   │   │   │   │   ├── fabric-operator-clusterrole.yaml
│       │   │   │   │   │   ├── fabric-operator-clusterrolebinding.yaml
│       │   │   │   │   │   ├── fabric-operator-serviceaccount.yaml
│       │   │   │   │   │   └── kustomization.yaml
│       │   │   │   │   ├── configtx-template.yaml
│       │   │   │   │   └── core.yaml
│       │   │   │   ├── scripts
│       │   │   │   │   ├── channel.sh
│       │   │   │   │   ├── console.sh
│       │   │   │   │   ├── frontend_build.sh
│       │   │   │   │   ├── frontend_deployment.yaml
│       │   │   │   │   ├── prereqs.sh
│       │   │   │   │   ├── rest_deployment.yaml
│       │   │   │   │   ├── rest_sample.sh
│       │   │   │   │   ├── sample_network.sh
│       │   │   │   │   └── utils.sh
│       │   │   │   ├── .gitignore
│       │   │   │   └── network
│       │   │   ├── ec2-cloud-config.yaml
│       │   │   ├── kind_with_nginx.sh
│       │   │   ├── multipass-cloud-config.yaml
│       │   │   ├── pkgcc.sh
│       │   │   └── setup_storage_classes.sh
│       │   ├── tests
│       │   │   ├── 00-chaincode-e2e.sh
│       │   │   ├── 10-appdev-e2e.sh
│       │   │   ├── 20-cloud-e2e.sh
│       │   │   ├── 30-ansible-e2e.sh
│       │   │   └── 40-console.sh
│       │   ├── .gitignore
│       │   ├── LICENSE
│       │   ├── README.md
│       │   ├── SETUP.md
│       │   ├── check.sh
│       │   └── justfile
│       ├── hardware-security-module
│       │   ├── application-go
│       │   │   ├── go.mod
│       │   │   ├── go.sum
│       │   │   └── hsm-sample.go
│       │   ├── application-typescript
│       │   │   ├── src
│       │   │   │   └── hsm-sample.ts
│       │   │   ├── .gitignore
│       │   │   ├── eslint.config.mjs
│       │   │   ├── package.json
│       │   │   └── tsconfig.json
│       │   ├── ca-client-config
│       │   │   ├── .gitignore
│       │   │   └── fabric-ca-client-config-template.yaml
│       │   ├── scripts
│       │   │   └── generate-hsm-user.sh
│       │   ├── .gitignore
│       │   └── README.md
│       ├── high-throughput
│       │   ├── application-go
│       │   │   ├── .gitignore
│       │   │   ├── app.go
│       │   │   ├── connect.go
│       │   │   ├── go.mod
│       │   │   └── go.sum
│       │   ├── chaincode-go
│       │   │   ├── go.mod
│       │   │   ├── go.sum
│       │   │   └── high-throughput.go
│       │   ├── README.md
│       │   ├── networkDown.sh
│       │   └── startFabric.sh
│       ├── off_chain_data
│       │   ├── application-go
│       │   │   ├── contract
│       │   │   │   ├── contract.go
│       │   │   │   └── model.go
│       │   │   ├── parser
│       │   │   │   ├── block.go
│       │   │   │   ├── block_test.go
│       │   │   │   ├── endorserTransaction.go
│       │   │   │   ├── namespaceReadWriteSet.go
│       │   │   │   ├── payload.go
│       │   │   │   ├── readWriteSet.go
│       │   │   │   └── transaction.go
│       │   │   ├── app.go
│       │   │   ├── connect.go
│       │   │   ├── getAllAssets.go
│       │   │   ├── go.mod
│       │   │   ├── go.sum
│       │   │   ├── listen.go
│       │   │   ├── store.go
│       │   │   ├── transact.go
│       │   │   └── utils.go
│       │   ├── application-java
│       │   │   ├── app
│       │   │   │   ├── src
│       │   │   │   │   └── main
│       │   │   │   │       └── java
│       │   │   │   │           ├── parser
│       │   │   │   │           │   ├── Block.java
│       │   │   │   │           │   ├── BlockParser.java
│       │   │   │   │           │   ├── NamespaceReadWriteSet.java
│       │   │   │   │           │   ├── ParsedBlock.java
│       │   │   │   │           │   ├── ParsedPayload.java
│       │   │   │   │           │   ├── ParsedReadWriteSet.java
│       │   │   │   │           │   ├── ParsedTransaction.java
│       │   │   │   │           │   ├── ParsedTransactionAction.java
│       │   │   │   │           │   ├── Transaction.java
│       │   │   │   │           │   └── Utils.java
│       │   │   │   │           ├── App.java
│       │   │   │   │           ├── Asset.java
│       │   │   │   │           ├── AssetTransferBasic.java
│       │   │   │   │           ├── BlockProcessor.java
│       │   │   │   │           ├── Command.java
│       │   │   │   │           ├── Connections.java
│       │   │   │   │           ├── ExpectedException.java
│       │   │   │   │           ├── GetAllAssets.java
│       │   │   │   │           ├── Listen.java
│       │   │   │   │           ├── Store.java
│       │   │   │   │           ├── Transact.java
│       │   │   │   │           ├── TransactApp.java
│       │   │   │   │           ├── TransactionProcessor.java
│       │   │   │   │           ├── Utils.java
│       │   │   │   │           └── Write.java
│       │   │   │   ├── build.gradle
│       │   │   │   └── pom.xml
│       │   │   ├── config
│       │   │   │   └── checkstyle
│       │   │   │       ├── checkstyle.xml
│       │   │   │       └── java-copyright-header.txt
│       │   │   ├── gradle
│       │   │   │   └── wrapper
│       │   │   │       ├── gradle-wrapper.jar
│       │   │   │       └── gradle-wrapper.properties
│       │   │   ├── .gitignore
│       │   │   ├── gradlew
│       │   │   ├── gradlew.bat
│       │   │   └── settings.gradle
│       │   ├── application-typescript
│       │   │   ├── src
│       │   │   │   ├── app.ts
│       │   │   │   ├── blockParser.ts
│       │   │   │   ├── connect.ts
│       │   │   │   ├── contract.ts
│       │   │   │   ├── expectedError.ts
│       │   │   │   ├── getAllAssets.ts
│       │   │   │   ├── listen.ts
│       │   │   │   ├── transact.ts
│       │   │   │   └── utils.ts
│       │   │   ├── .gitignore
│       │   │   ├── eslint.config.mjs
│       │   │   ├── package.json
│       │   │   └── tsconfig.json
│       │   └── README.md
│       ├── test-application
│       │   └── javascript
│       │       ├── AppUtil.js
│       │       └── CAUtil.js
│       ├── test-network
│       │   ├── addDLSU
│       │   │   ├── compose
│       │   │   │   ├── docker
│       │   │   │   │   └── peercfg
│       │   │   │   │       └── core.yaml
│       │   │   │   ├── peercfg
│       │   │   │   ├── compose-ca-dlsu.yaml
│       │   │   │   ├── compose-couch-dlsu.yaml
│       │   │   │   ├── compose-couch-innocencio.yaml
│       │   │   │   ├── compose-couch-lasallecomputersociety.yaml
│       │   │   │   └── compose-dlsu.yaml
│       │   │   ├── docker
│       │   │   │   └── peercfg
│       │   │   ├── fabric-ca
│       │   │   │   └── registerEnroll.sh
│       │   │   ├── DLSUMSP.json
│       │   │   ├── ccp-generate.sh
│       │   │   ├── ccp-template.json
│       │   │   ├── ccp-template.yaml
│       │   │   └── dlsu-crypto.yaml
│       │   ├── addOrg3
│       │   │   ├── compose
│       │   │   │   ├── docker
│       │   │   │   │   ├── peercfg
│       │   │   │   │   │   └── core.yaml
│       │   │   │   │   ├── docker-compose-ca-org3.yaml
│       │   │   │   │   ├── docker-compose-couch-org3.yaml
│       │   │   │   │   └── docker-compose-org3.yaml
│       │   │   │   ├── podman
│       │   │   │   │   ├── peercfg
│       │   │   │   │   │   └── core.yaml
│       │   │   │   │   ├── podman-compose-ca-org3.yaml
│       │   │   │   │   ├── podman-compose-couch-org3.yaml
│       │   │   │   │   └── podman-compose-org3.yaml
│       │   │   │   ├── compose-ca-org3.yaml
│       │   │   │   ├── compose-couch-org3.yaml
│       │   │   │   └── compose-org3.yaml
│       │   │   ├── fabric-ca
│       │   │   │   ├── org3
│       │   │   │   │   └── fabric-ca-server-config.yaml
│       │   │   │   └── registerEnroll.sh
│       │   │   ├── README.md
│       │   │   ├── addOrg3.sh
│       │   │   ├── ccp-generate.sh
│       │   │   ├── ccp-template.json
│       │   │   ├── ccp-template.yaml
│       │   │   ├── configtx.yaml
│       │   │   └── org3-crypto.yaml
│       │   ├── bft-config
│       │   │   └── configtx.yaml
│       │   ├── channel-artifacts
│       │   │   ├── Org1MSPanchors.tx
│       │   │   ├── Org1MSPconfig.json
│       │   │   ├── Org1MSPmodified_config.json
│       │   │   ├── Org2MSPanchors.tx
│       │   │   ├── Org2MSPconfig.json
│       │   │   ├── Org2MSPmodified_config.json
│       │   │   ├── chaincert-channel.block
│       │   │   ├── config_block.json
│       │   │   ├── config_block.pb
│       │   │   ├── config_update.json
│       │   │   ├── config_update.pb
│       │   │   ├── config_update_in_envelope.json
│       │   │   ├── modified_config.pb
│       │   │   └── original_config.pb
│       │   ├── compose
│       │   │   ├── docker
│       │   │   │   ├── peercfg
│       │   │   │   │   └── core.yaml
│       │   │   │   ├── docker-compose-bft-test-net.yaml
│       │   │   │   ├── docker-compose-ca.yaml
│       │   │   │   ├── docker-compose-couch.yaml
│       │   │   │   └── docker-compose-test-net.yaml
│       │   │   ├── podman
│       │   │   │   ├── peercfg
│       │   │   │   │   └── core.yaml
│       │   │   │   ├── podman-compose-ca.yaml
│       │   │   │   ├── podman-compose-couch.yaml
│       │   │   │   └── podman-compose-test-net.yaml
│       │   │   ├── compose-bft-test-net.yaml
│       │   │   ├── compose-ca.yaml
│       │   │   ├── compose-couch.yaml
│       │   │   └── compose-test-net.yaml
│       │   ├── configtx
│       │   │   ├── configtx.yaml
│       │   │   ├── rebuilt.json
│       │   │   └── rootcert.txt
│       │   ├── organizations
│       │   │   ├── cfssl
│       │   │   │   ├── admin-csr-template.json
│       │   │   │   ├── ca-orderer.json
│       │   │   │   ├── ca-peer.json
│       │   │   │   ├── cert-signing-config.json
│       │   │   │   ├── client-csr-template.json
│       │   │   │   ├── orderer-csr-template.json
│       │   │   │   ├── peer-csr-template.json
│       │   │   │   └── registerEnroll.sh
│       │   │   ├── cryptogen
│       │   │   │   ├── crypto-config-dlsu.yaml
│       │   │   │   ├── crypto-config-orderer.yaml
│       │   │   │   ├── crypto-config-org1.yaml
│       │   │   │   └── crypto-config-org2.yaml
│       │   │   ├── fabric-ca
│       │   │   │   ├── dlsu
│       │   │   │   │   ├── msp
│       │   │   │   │   │   ├── cacerts
│       │   │   │   │   │   ├── keystore
│       │   │   │   │   │   │   ├── IssuerRevocationPrivateKey
│       │   │   │   │   │   │   ├── IssuerSecretKey
│       │   │   │   │   │   │   ├── d9125dfb54b78b023d0189a710a54ea9322b7e71127f3df350038aa318bfc60c_sk
│       │   │   │   │   │   │   └── ff6c1fb604615bca8fa5b4e91548d6a2f1d8ebe750ced67e88700fb4b32cff5f_sk
│       │   │   │   │   │   ├── signcerts
│       │   │   │   │   │   └── user
│       │   │   │   │   ├── IssuerPublicKey
│       │   │   │   │   ├── IssuerRevocationPublicKey
│       │   │   │   │   ├── ca-cert.pem
│       │   │   │   │   ├── fabric-ca-server-config.yaml
│       │   │   │   │   ├── fabric-ca-server.db
│       │   │   │   │   └── tls-cert.pem
│       │   │   │   ├── ordererOrg
│       │   │   │   │   ├── msp
│       │   │   │   │   │   ├── cacerts
│       │   │   │   │   │   ├── keystore
│       │   │   │   │   │   │   ├── 6d4a4d72ef092b2ff3c9420832061467b82123ef8a9ba8cf63ee2f89f95aab80_sk
│       │   │   │   │   │   │   ├── 7c9130d0f7f68a97784757f7c38b73ec33b7bdf2e86eee83042eae970d04b998_sk
│       │   │   │   │   │   │   ├── IssuerRevocationPrivateKey
│       │   │   │   │   │   │   └── IssuerSecretKey
│       │   │   │   │   │   ├── signcerts
│       │   │   │   │   │   └── user
│       │   │   │   │   ├── IssuerPublicKey
│       │   │   │   │   ├── IssuerRevocationPublicKey
│       │   │   │   │   ├── ca-cert.pem
│       │   │   │   │   ├── fabric-ca-server-config.yaml
│       │   │   │   │   ├── fabric-ca-server.db
│       │   │   │   │   └── tls-cert.pem
│       │   │   │   ├── org1
│       │   │   │   │   ├── msp
│       │   │   │   │   │   ├── cacerts
│       │   │   │   │   │   ├── keystore
│       │   │   │   │   │   │   ├── 2b9560df6f09bc50a6c79261ffa332fef1ffb9b3f77abeefd214255938650755_sk
│       │   │   │   │   │   │   ├── 6d544939938fce3b2a78b0cc7e0fb7dbc4e0de7e0a6268d4e91edc34180a1439_sk
│       │   │   │   │   │   │   ├── IssuerRevocationPrivateKey
│       │   │   │   │   │   │   └── IssuerSecretKey
│       │   │   │   │   │   ├── signcerts
│       │   │   │   │   │   └── user
│       │   │   │   │   ├── IssuerPublicKey
│       │   │   │   │   ├── IssuerRevocationPublicKey
│       │   │   │   │   ├── ca-cert.pem
│       │   │   │   │   ├── fabric-ca-server-config.yaml
│       │   │   │   │   ├── fabric-ca-server.db
│       │   │   │   │   └── tls-cert.pem
│       │   │   │   ├── org2
│       │   │   │   │   ├── msp
│       │   │   │   │   │   ├── cacerts
│       │   │   │   │   │   ├── keystore
│       │   │   │   │   │   │   ├── 4d25b07c9c39458bb2960b608cc40531cb572f14d05e980878be3c7491913f1a_sk
│       │   │   │   │   │   │   ├── 65395fce8c614b200d0facda626fccfe5713ece18bc768957233c466fd369be4_sk
│       │   │   │   │   │   │   ├── IssuerRevocationPrivateKey
│       │   │   │   │   │   │   └── IssuerSecretKey
│       │   │   │   │   │   ├── signcerts
│       │   │   │   │   │   └── user
│       │   │   │   │   ├── IssuerPublicKey
│       │   │   │   │   ├── IssuerRevocationPublicKey
│       │   │   │   │   ├── ca-cert.pem
│       │   │   │   │   ├── fabric-ca-server-config.yaml
│       │   │   │   │   ├── fabric-ca-server.db
│       │   │   │   │   └── tls-cert.pem
│       │   │   │   └── registerEnroll.sh
│       │   │   ├── ordererOrganizations
│       │   │   │   └── example.com
│       │   │   │       ├── msp
│       │   │   │       │   ├── cacerts
│       │   │   │       │   │   └── localhost-9054-ca-orderer.pem
│       │   │   │       │   ├── keystore
│       │   │   │       │   │   └── 9ff08f53cdb78b121300c50dc5253744194ac527ba2742874587e15e8811250f_sk
│       │   │   │       │   ├── signcerts
│       │   │   │       │   │   └── cert.pem
│       │   │   │       │   ├── tlscacerts
│       │   │   │       │   │   └── tlsca.example.com-cert.pem
│       │   │   │       │   ├── user
│       │   │   │       │   ├── IssuerPublicKey
│       │   │   │       │   ├── IssuerRevocationPublicKey
│       │   │   │       │   └── config.yaml
│       │   │   │       ├── orderers
│       │   │   │       │   ├── orderer.example.com
│       │   │   │       │   │   ├── msp
│       │   │   │       │   │   │   ├── cacerts
│       │   │   │       │   │   │   │   └── localhost-9054-ca-orderer.pem
│       │   │   │       │   │   │   ├── keystore
│       │   │   │       │   │   │   │   └── a018488df273f3d0b58f6a5536c4e0ee386295efc658536e830778ab19a87b66_sk
│       │   │   │       │   │   │   ├── signcerts
│       │   │   │       │   │   │   │   └── orderer.example.com-cert.pem
│       │   │   │       │   │   │   ├── tlscacerts
│       │   │   │       │   │   │   │   └── tlsca.example.com-cert.pem
│       │   │   │       │   │   │   ├── user
│       │   │   │       │   │   │   ├── IssuerPublicKey
│       │   │   │       │   │   │   ├── IssuerRevocationPublicKey
│       │   │   │       │   │   │   └── config.yaml
│       │   │   │       │   │   └── tls
│       │   │   │       │   │       ├── cacerts
│       │   │   │       │   │       ├── keystore
│       │   │   │       │   │       │   └── 67376021e207b33f0367f0a718689f5c7b36c0b9637dc84209d07d02d99afbe8_sk
│       │   │   │       │   │       ├── signcerts
│       │   │   │       │   │       │   └── cert.pem
│       │   │   │       │   │       ├── tlscacerts
│       │   │   │       │   │       │   └── tls-localhost-9054-ca-orderer.pem
│       │   │   │       │   │       ├── user
│       │   │   │       │   │       ├── IssuerPublicKey
│       │   │   │       │   │       ├── IssuerRevocationPublicKey
│       │   │   │       │   │       ├── ca.crt
│       │   │   │       │   │       ├── server.crt
│       │   │   │       │   │       └── server.key
│       │   │   │       │   ├── orderer2.example.com
│       │   │   │       │   │   ├── msp
│       │   │   │       │   │   │   ├── cacerts
│       │   │   │       │   │   │   │   └── localhost-9054-ca-orderer.pem
│       │   │   │       │   │   │   ├── keystore
│       │   │   │       │   │   │   │   └── 5b654f001fbae5a3675ed05a552a175766598b8adf5588589d756b61131eec3e_sk
│       │   │   │       │   │   │   ├── signcerts
│       │   │   │       │   │   │   │   └── orderer2.example.com-cert.pem
│       │   │   │       │   │   │   ├── tlscacerts
│       │   │   │       │   │   │   │   └── tlsca.example.com-cert.pem
│       │   │   │       │   │   │   ├── user
│       │   │   │       │   │   │   ├── IssuerPublicKey
│       │   │   │       │   │   │   ├── IssuerRevocationPublicKey
│       │   │   │       │   │   │   └── config.yaml
│       │   │   │       │   │   └── tls
│       │   │   │       │   │       ├── cacerts
│       │   │   │       │   │       ├── keystore
│       │   │   │       │   │       │   └── bdcfea8634d593efb45fd4d5f504bc61c3f5c32e4fe9fa7f1d16b1f39444facc_sk
│       │   │   │       │   │       ├── signcerts
│       │   │   │       │   │       │   └── cert.pem
│       │   │   │       │   │       ├── tlscacerts
│       │   │   │       │   │       │   └── tls-localhost-9054-ca-orderer.pem
│       │   │   │       │   │       ├── user
│       │   │   │       │   │       ├── IssuerPublicKey
│       │   │   │       │   │       ├── IssuerRevocationPublicKey
│       │   │   │       │   │       ├── ca.crt
│       │   │   │       │   │       ├── server.crt
│       │   │   │       │   │       └── server.key
│       │   │   │       │   ├── orderer3.example.com
│       │   │   │       │   │   ├── msp
│       │   │   │       │   │   │   ├── cacerts
│       │   │   │       │   │   │   │   └── localhost-9054-ca-orderer.pem
│       │   │   │       │   │   │   ├── keystore
│       │   │   │       │   │   │   │   └── 76f9254fbe2346c0b418171a0129a14795150e13cfffaef6eb29e5b6524d5673_sk
│       │   │   │       │   │   │   ├── signcerts
│       │   │   │       │   │   │   │   └── orderer3.example.com-cert.pem
│       │   │   │       │   │   │   ├── tlscacerts
│       │   │   │       │   │   │   │   └── tlsca.example.com-cert.pem
│       │   │   │       │   │   │   ├── user
│       │   │   │       │   │   │   ├── IssuerPublicKey
│       │   │   │       │   │   │   ├── IssuerRevocationPublicKey
│       │   │   │       │   │   │   └── config.yaml
│       │   │   │       │   │   └── tls
│       │   │   │       │   │       ├── cacerts
│       │   │   │       │   │       ├── keystore
│       │   │   │       │   │       │   └── e3982d2d4e69e966749f459b294c87aa18aff7642ebbcf69f66a58f7fc0c0a4e_sk
│       │   │   │       │   │       ├── signcerts
│       │   │   │       │   │       │   └── cert.pem
│       │   │   │       │   │       ├── tlscacerts
│       │   │   │       │   │       │   └── tls-localhost-9054-ca-orderer.pem
│       │   │   │       │   │       ├── user
│       │   │   │       │   │       ├── IssuerPublicKey
│       │   │   │       │   │       ├── IssuerRevocationPublicKey
│       │   │   │       │   │       ├── ca.crt
│       │   │   │       │   │       ├── server.crt
│       │   │   │       │   │       └── server.key
│       │   │   │       │   └── orderer4.example.com
│       │   │   │       │       ├── msp
│       │   │   │       │       │   ├── cacerts
│       │   │   │       │       │   │   └── localhost-9054-ca-orderer.pem
│       │   │   │       │       │   ├── keystore
│       │   │   │       │       │   │   └── 4d7f3e5000d0859572b532a350f0c3e76e8605301f794d494256517a2b272773_sk
│       │   │   │       │       │   ├── signcerts
│       │   │   │       │       │   │   └── orderer4.example.com-cert.pem
│       │   │   │       │       │   ├── tlscacerts
│       │   │   │       │       │   │   └── tlsca.example.com-cert.pem
│       │   │   │       │       │   ├── user
│       │   │   │       │       │   ├── IssuerPublicKey
│       │   │   │       │       │   ├── IssuerRevocationPublicKey
│       │   │   │       │       │   └── config.yaml
│       │   │   │       │       └── tls
│       │   │   │       │           ├── cacerts
│       │   │   │       │           ├── keystore
│       │   │   │       │           │   └── 563e5d8e255bc372a22afb2d0381f655f70a2c57d034e14deb9c508691208fcd_sk
│       │   │   │       │           ├── signcerts
│       │   │   │       │           │   └── cert.pem
│       │   │   │       │           ├── tlscacerts
│       │   │   │       │           │   └── tls-localhost-9054-ca-orderer.pem
│       │   │   │       │           ├── user
│       │   │   │       │           ├── IssuerPublicKey
│       │   │   │       │           ├── IssuerRevocationPublicKey
│       │   │   │       │           ├── ca.crt
│       │   │   │       │           ├── server.crt
│       │   │   │       │           └── server.key
│       │   │   │       ├── tlsca
│       │   │   │       │   └── tlsca.example.com-cert.pem
│       │   │   │       ├── users
│       │   │   │       │   └── Admin@example.com
│       │   │   │       │       └── msp
│       │   │   │       │           ├── cacerts
│       │   │   │       │           │   └── localhost-9054-ca-orderer.pem
│       │   │   │       │           ├── keystore
│       │   │   │       │           │   └── 2d53b523492a0fe71e9af7d28efbde8b32508d69dae302d36e4af7c436a0e421_sk
│       │   │   │       │           ├── signcerts
│       │   │   │       │           │   └── cert.pem
│       │   │   │       │           ├── user
│       │   │   │       │           ├── IssuerPublicKey
│       │   │   │       │           ├── IssuerRevocationPublicKey
│       │   │   │       │           └── config.yaml
│       │   │   │       └── fabric-ca-client-config.yaml
│       │   │   ├── peerOrganizations
│       │   │   │   ├── dlsu.example.com
│       │   │   │   │   ├── ca
│       │   │   │   │   │   └── ca.dlsu.example.com-cert.pem
│       │   │   │   │   ├── msp
│       │   │   │   │   │   ├── cacerts
│       │   │   │   │   │   │   └── localhost-12054-ca-dlsu.pem
│       │   │   │   │   │   ├── keystore
│       │   │   │   │   │   │   ├── 632868767a5fcb911f1c26fe4ac4f010fe286ad276bd17f715377cbc2b138f45_sk
│       │   │   │   │   │   │   └── a9e12bef3835502af26f52632902e9983f2203b26f8b042e143929ae9a754b67_sk
│       │   │   │   │   │   ├── signcerts
│       │   │   │   │   │   │   └── cert.pem
│       │   │   │   │   │   ├── tlscacerts
│       │   │   │   │   │   │   └── ca.crt
│       │   │   │   │   │   ├── user
│       │   │   │   │   │   ├── IssuerPublicKey
│       │   │   │   │   │   ├── IssuerRevocationPublicKey
│       │   │   │   │   │   └── config.yaml
│       │   │   │   │   ├── peers
│       │   │   │   │   │   └── peer0.dlsu.example.com
│       │   │   │   │   │       ├── msp
│       │   │   │   │   │       │   ├── cacerts
│       │   │   │   │   │       │   │   └── localhost-12054-ca-dlsu.pem
│       │   │   │   │   │       │   ├── keystore
│       │   │   │   │   │       │   │   └── 4a8f3804d9f6b47847d34927bfa4014a0c082956a9532e036bf9f9d15f366889_sk
│       │   │   │   │   │       │   ├── signcerts
│       │   │   │   │   │       │   │   └── cert.pem
│       │   │   │   │   │       │   ├── user
│       │   │   │   │   │       │   ├── IssuerPublicKey
│       │   │   │   │   │       │   ├── IssuerRevocationPublicKey
│       │   │   │   │   │       │   └── config.yaml
│       │   │   │   │   │       └── tls
│       │   │   │   │   │           ├── cacerts
│       │   │   │   │   │           ├── keystore
│       │   │   │   │   │           │   └── 13d6a05a915bf4c5e6ea632d6fbc9f123215a89e40347a30df511d7a50c3fdc1_sk
│       │   │   │   │   │           ├── signcerts
│       │   │   │   │   │           │   └── cert.pem
│       │   │   │   │   │           ├── tlscacerts
│       │   │   │   │   │           │   └── tls-localhost-12054-ca-dlsu.pem
│       │   │   │   │   │           ├── user
│       │   │   │   │   │           ├── IssuerPublicKey
│       │   │   │   │   │           ├── IssuerRevocationPublicKey
│       │   │   │   │   │           ├── ca.crt
│       │   │   │   │   │           ├── server.crt
│       │   │   │   │   │           └── server.key
│       │   │   │   │   ├── tlsca
│       │   │   │   │   │   └── tlsca.dlsu.example.com-cert.pem
│       │   │   │   │   ├── users
│       │   │   │   │   │   ├── Admin@dlsu.example.com
│       │   │   │   │   │   │   └── msp
│       │   │   │   │   │   │       ├── cacerts
│       │   │   │   │   │   │       │   └── localhost-12054-ca-dlsu.pem
│       │   │   │   │   │   │       ├── keystore
│       │   │   │   │   │   │       │   └── e176b6fa90785ba86d7bc59ccf0f287dc8c15573c7f9d16b5247dead48f7e510_sk
│       │   │   │   │   │   │       ├── signcerts
│       │   │   │   │   │   │       │   └── cert.pem
│       │   │   │   │   │   │       ├── user
│       │   │   │   │   │   │       ├── IssuerPublicKey
│       │   │   │   │   │   │       ├── IssuerRevocationPublicKey
│       │   │   │   │   │   │       └── config.yaml
│       │   │   │   │   │   ├── SubordinateINNOCENCIO@dlsu.example.com
│       │   │   │   │   │   │   └── msp
│       │   │   │   │   │   │       ├── cacerts
│       │   │   │   │   │   │       │   └── localhost-12054-ca-dlsu.pem
│       │   │   │   │   │   │       ├── keystore
│       │   │   │   │   │   │       │   └── 050272a71a3c80f77e4e63f3d8ed9da3c4803d3e11abc1ff58e9da3760171de0_sk
│       │   │   │   │   │   │       ├── signcerts
│       │   │   │   │   │   │       │   └── cert.pem
│       │   │   │   │   │   │       ├── user
│       │   │   │   │   │   │       ├── IssuerPublicKey
│       │   │   │   │   │   │       ├── IssuerRevocationPublicKey
│       │   │   │   │   │   │       └── config.yaml
│       │   │   │   │   │   ├── SubordinateLASALLECOMPUTERSOCIETY@dlsu.example.com
│       │   │   │   │   │   │   └── msp
│       │   │   │   │   │   │       ├── cacerts
│       │   │   │   │   │   │       │   └── localhost-12054-ca-dlsu.pem
│       │   │   │   │   │   │       ├── keystore
│       │   │   │   │   │   │       │   └── 10fed436ce10e4b08ee635d7c39a22fd7dd296b97340cac368e7b395f7ccea32_sk
│       │   │   │   │   │   │       ├── signcerts
│       │   │   │   │   │   │       │   └── cert.pem
│       │   │   │   │   │   │       ├── user
│       │   │   │   │   │   │       ├── IssuerPublicKey
│       │   │   │   │   │   │       ├── IssuerRevocationPublicKey
│       │   │   │   │   │   │       └── config.yaml
│       │   │   │   │   │   ├── User1@dlsu.example.com
│       │   │   │   │   │   │   └── msp
│       │   │   │   │   │   │       ├── cacerts
│       │   │   │   │   │   │       │   └── localhost-12054-ca-dlsu.pem
│       │   │   │   │   │   │       ├── keystore
│       │   │   │   │   │   │       │   └── 654e1aa7284089c4f998e8f507500ff929e258be27dc64669277be8e232153c2_sk
│       │   │   │   │   │   │       ├── signcerts
│       │   │   │   │   │   │       │   └── cert.pem
│       │   │   │   │   │   │       ├── user
│       │   │   │   │   │   │       ├── IssuerPublicKey
│       │   │   │   │   │   │       ├── IssuerRevocationPublicKey
│       │   │   │   │   │   │       └── config.yaml
│       │   │   │   │   │   └── User@dlsu.example.com
│       │   │   │   │   │       └── msp
│       │   │   │   │   │           ├── cacerts
│       │   │   │   │   │           ├── keystore
│       │   │   │   │   │           ├── signcerts
│       │   │   │   │   │           └── user
│       │   │   │   │   ├── connection-delasalleuniversity.json
│       │   │   │   │   └── fabric-ca-client-config.yaml
│       │   │   │   ├── org1.example.com
│       │   │   │   │   ├── ca
│       │   │   │   │   │   └── ca.org1.example.com-cert.pem
│       │   │   │   │   ├── msp
│       │   │   │   │   │   ├── cacerts
│       │   │   │   │   │   │   └── localhost-7054-ca-org1.pem
│       │   │   │   │   │   ├── keystore
│       │   │   │   │   │   │   └── 41c6dce5e8d6c930f25fbada723495c650044230cb5dffd098b1caaa557f32e0_sk
│       │   │   │   │   │   ├── signcerts
│       │   │   │   │   │   │   └── cert.pem
│       │   │   │   │   │   ├── tlscacerts
│       │   │   │   │   │   │   └── ca.crt
│       │   │   │   │   │   ├── user
│       │   │   │   │   │   ├── IssuerPublicKey
│       │   │   │   │   │   ├── IssuerRevocationPublicKey
│       │   │   │   │   │   └── config.yaml
│       │   │   │   │   ├── peers
│       │   │   │   │   │   └── peer0.org1.example.com
│       │   │   │   │   │       ├── msp
│       │   │   │   │   │       │   ├── cacerts
│       │   │   │   │   │       │   │   └── localhost-7054-ca-org1.pem
│       │   │   │   │   │       │   ├── keystore
│       │   │   │   │   │       │   │   └── c3629aebd001f93e0eb97f69838ecd112b34ba7c405f9951fc1949d6f2380da9_sk
│       │   │   │   │   │       │   ├── signcerts
│       │   │   │   │   │       │   │   └── cert.pem
│       │   │   │   │   │       │   ├── user
│       │   │   │   │   │       │   ├── IssuerPublicKey
│       │   │   │   │   │       │   ├── IssuerRevocationPublicKey
│       │   │   │   │   │       │   └── config.yaml
│       │   │   │   │   │       └── tls
│       │   │   │   │   │           ├── cacerts
│       │   │   │   │   │           ├── keystore
│       │   │   │   │   │           │   └── 2ca9187492132bcf3980b4f326576f38a39de9531b5854a3ae704f120284d064_sk
│       │   │   │   │   │           ├── signcerts
│       │   │   │   │   │           │   └── cert.pem
│       │   │   │   │   │           ├── tlscacerts
│       │   │   │   │   │           │   └── tls-localhost-7054-ca-org1.pem
│       │   │   │   │   │           ├── user
│       │   │   │   │   │           ├── IssuerPublicKey
│       │   │   │   │   │           ├── IssuerRevocationPublicKey
│       │   │   │   │   │           ├── ca.crt
│       │   │   │   │   │           ├── server.crt
│       │   │   │   │   │           └── server.key
│       │   │   │   │   ├── tlsca
│       │   │   │   │   │   └── tlsca.org1.example.com-cert.pem
│       │   │   │   │   ├── users
│       │   │   │   │   │   ├── Admin@org1.example.com
│       │   │   │   │   │   │   └── msp
│       │   │   │   │   │   │       ├── cacerts
│       │   │   │   │   │   │       │   └── localhost-7054-ca-org1.pem
│       │   │   │   │   │   │       ├── keystore
│       │   │   │   │   │   │       │   └── 042a4ba9fe003738d1c6b5966b627f8ac2699832c37640e19c679726865a731b_sk
│       │   │   │   │   │   │       ├── signcerts
│       │   │   │   │   │   │       │   └── cert.pem
│       │   │   │   │   │   │       ├── user
│       │   │   │   │   │   │       ├── IssuerPublicKey
│       │   │   │   │   │   │       ├── IssuerRevocationPublicKey
│       │   │   │   │   │   │       └── config.yaml
│       │   │   │   │   │   └── User1@org1.example.com
│       │   │   │   │   │       └── msp
│       │   │   │   │   │           ├── cacerts
│       │   │   │   │   │           │   └── localhost-7054-ca-org1.pem
│       │   │   │   │   │           ├── keystore
│       │   │   │   │   │           │   └── e0e5fa5ac0d4b7c2d539cde75b72258a8c71f434a492ed7a642883cb935335ee_sk
│       │   │   │   │   │           ├── signcerts
│       │   │   │   │   │           │   └── cert.pem
│       │   │   │   │   │           ├── user
│       │   │   │   │   │           ├── IssuerPublicKey
│       │   │   │   │   │           ├── IssuerRevocationPublicKey
│       │   │   │   │   │           └── config.yaml
│       │   │   │   │   ├── connection-org1.json
│       │   │   │   │   ├── connection-org1.yaml
│       │   │   │   │   └── fabric-ca-client-config.yaml
│       │   │   │   └── org2.example.com
│       │   │   │       ├── ca
│       │   │   │       │   └── ca.org2.example.com-cert.pem
│       │   │   │       ├── msp
│       │   │   │       │   ├── cacerts
│       │   │   │       │   │   └── localhost-8054-ca-org2.pem
│       │   │   │       │   ├── keystore
│       │   │   │       │   │   └── a136eba9af337411db314403b984955ebecf5ca9f24efb7433c0200379a55d7c_sk
│       │   │   │       │   ├── signcerts
│       │   │   │       │   │   └── cert.pem
│       │   │   │       │   ├── tlscacerts
│       │   │   │       │   │   └── ca.crt
│       │   │   │       │   ├── user
│       │   │   │       │   ├── IssuerPublicKey
│       │   │   │       │   ├── IssuerRevocationPublicKey
│       │   │   │       │   └── config.yaml
│       │   │   │       ├── peers
│       │   │   │       │   └── peer0.org2.example.com
│       │   │   │       │       ├── msp
│       │   │   │       │       │   ├── cacerts
│       │   │   │       │       │   │   └── localhost-8054-ca-org2.pem
│       │   │   │       │       │   ├── keystore
│       │   │   │       │       │   │   └── b3f29af8a4907693473b2ebdcb1fb7ac15e2e7b405c704af8698d92e704784a4_sk
│       │   │   │       │       │   ├── signcerts
│       │   │   │       │       │   │   └── cert.pem
│       │   │   │       │       │   ├── user
│       │   │   │       │       │   ├── IssuerPublicKey
│       │   │   │       │       │   ├── IssuerRevocationPublicKey
│       │   │   │       │       │   └── config.yaml
│       │   │   │       │       └── tls
│       │   │   │       │           ├── cacerts
│       │   │   │       │           ├── keystore
│       │   │   │       │           │   └── bb5698753da276b2d959d30ee24cfdd1907bb372ac95d1580d202053844e5673_sk
│       │   │   │       │           ├── signcerts
│       │   │   │       │           │   └── cert.pem
│       │   │   │       │           ├── tlscacerts
│       │   │   │       │           │   └── tls-localhost-8054-ca-org2.pem
│       │   │   │       │           ├── user
│       │   │   │       │           ├── IssuerPublicKey
│       │   │   │       │           ├── IssuerRevocationPublicKey
│       │   │   │       │           ├── ca.crt
│       │   │   │       │           ├── server.crt
│       │   │   │       │           └── server.key
│       │   │   │       ├── tlsca
│       │   │   │       │   └── tlsca.org2.example.com-cert.pem
│       │   │   │       ├── users
│       │   │   │       │   ├── Admin@org2.example.com
│       │   │   │       │   │   └── msp
│       │   │   │       │   │       ├── cacerts
│       │   │   │       │   │       │   └── localhost-8054-ca-org2.pem
│       │   │   │       │   │       ├── keystore
│       │   │   │       │   │       │   └── 8eb9205a7128fdd5699ccd92edb74038d898627c12bf0dce939ed6c609a8a1d6_sk
│       │   │   │       │   │       ├── signcerts
│       │   │   │       │   │       │   └── cert.pem
│       │   │   │       │   │       ├── user
│       │   │   │       │   │       ├── IssuerPublicKey
│       │   │   │       │   │       ├── IssuerRevocationPublicKey
│       │   │   │       │   │       └── config.yaml
│       │   │   │       │   └── User1@org2.example.com
│       │   │   │       │       └── msp
│       │   │   │       │           ├── cacerts
│       │   │   │       │           │   └── localhost-8054-ca-org2.pem
│       │   │   │       │           ├── keystore
│       │   │   │       │           │   └── 4e4e530dc7f76cdf75ef1b01c990f11ef409506270c23331e5079292203573ce_sk
│       │   │   │       │           ├── signcerts
│       │   │   │       │           │   └── cert.pem
│       │   │   │       │           ├── user
│       │   │   │       │           ├── IssuerPublicKey
│       │   │   │       │           ├── IssuerRevocationPublicKey
│       │   │   │       │           └── config.yaml
│       │   │   │       ├── connection-org2.json
│       │   │   │       ├── connection-org2.yaml
│       │   │   │       └── fabric-ca-client-config.yaml
│       │   │   ├── ccp-generate.sh
│       │   │   ├── ccp-template.json
│       │   │   └── ccp-template.yaml
│       │   ├── prometheus-grafana
│       │   │   ├── grafana
│       │   │   │   ├── provisioning
│       │   │   │   │   ├── dashboards
│       │   │   │   │   │   ├── dashboard.yml
│       │   │   │   │   │   └── hlf-performances.json
│       │   │   │   │   └── datasources
│       │   │   │   │       └── datasource.yml
│       │   │   │   └── config.monitoring
│       │   │   ├── grafana_db
│       │   │   │   └── grafana.db
│       │   │   ├── prometheus
│       │   │   │   └── prometheus.yml
│       │   │   ├── README.md
│       │   │   └── docker-compose.yaml
│       │   ├── scripts
│       │   │   ├── dlsu-scripts
│       │   │   │   ├── joinChannel.sh
│       │   │   │   └── updateChannelConfig.sh
│       │   │   ├── org3-scripts
│       │   │   │   ├── joinChannel.sh
│       │   │   │   └── updateChannelConfig.sh
│       │   │   ├── add_new_orderer_to_config.py
│       │   │   ├── ccutils.sh
│       │   │   ├── configUpdate.sh
│       │   │   ├── createChannel.sh
│       │   │   ├── deployCC.sh
│       │   │   ├── deployCCAAS.sh
│       │   │   ├── envVar.sh
│       │   │   ├── orderer.sh
│       │   │   ├── orderer2.sh
│       │   │   ├── orderer3.sh
│       │   │   ├── orderer4.sh
│       │   │   ├── packageCC.sh
│       │   │   ├── pkgcc.sh
│       │   │   ├── setAnchorPeer.sh
│       │   │   └── utils.sh
│       │   ├── system-genesis-block
│       │   │   └── .gitkeep
│       │   ├── .gitignore
│       │   ├── CHAINCODE_AS_A_SERVICE_TUTORIAL.md
│       │   ├── DLSUMSP.json
│       │   ├── README.md
│       │   ├── all_cacerts.pem
│       │   ├── app_groups.json
│       │   ├── app_policies.json
│       │   ├── chaincert.tar.gz
│       │   ├── config.json
│       │   ├── config_block.json
│       │   ├── config_block.pb
│       │   ├── config_update.json
│       │   ├── config_update.pb
│       │   ├── config_update_in_envelope.json
│       │   ├── config_update_in_envelope.pb
│       │   ├── log.txt
│       │   ├── modified_config.json
│       │   ├── modified_config.pb
│       │   ├── monitordocker.sh
│       │   ├── network.config
│       │   ├── network.sh
│       │   ├── org_update.pb
│       │   ├── original_config.pb
│       │   ├── package-lock.json
│       │   ├── package.json
│       │   ├── rebuilt.json
│       │   ├── rootcert.txt
│       │   └── setOrgEnv.sh
│       ├── test-network-k8s
│       │   ├── config
│       │   │   ├── org0
│       │   │   │   ├── bft
│       │   │   │   │   └── configtx-template.yaml
│       │   │   │   ├── configtx-template.yaml
│       │   │   │   └── fabric-ca-server-config.yaml
│       │   │   ├── org1
│       │   │   │   ├── core.yaml
│       │   │   │   └── fabric-ca-server-config.yaml
│       │   │   └── org2
│       │   │       ├── core.yaml
│       │   │       └── fabric-ca-server-config.yaml
│       │   ├── docs
│       │   │   ├── images
│       │   │   │   └── test-network.png
│       │   │   ├── APPLICATIONS.md
│       │   │   ├── BFT_ORDERERS.md
│       │   │   ├── CA.md
│       │   │   ├── CALIPER.md
│       │   │   ├── CHAINCODE.md
│       │   │   ├── CHAINCODE_AS_A_SERVICE.md
│       │   │   ├── CHANNELS.md
│       │   │   ├── HIGH_AVAILABILITY.md
│       │   │   ├── KUBERNETES.md
│       │   │   ├── README.md
│       │   │   └── TEST_NETWORK.md
│       │   ├── kube
│       │   │   ├── org0
│       │   │   │   ├── org0-ca.yaml
│       │   │   │   ├── org0-job-scrub-fabric-volumes.yaml
│       │   │   │   ├── org0-orderer1.yaml
│       │   │   │   ├── org0-orderer2.yaml
│       │   │   │   ├── org0-orderer3.yaml
│       │   │   │   ├── org0-orderer4.yaml
│       │   │   │   └── org0-tls-cert-issuer.yaml
│       │   │   ├── org1
│       │   │   │   ├── org1-ca.yaml
│       │   │   │   ├── org1-cc-template.yaml
│       │   │   │   ├── org1-install-k8s-builder.yaml
│       │   │   │   ├── org1-job-scrub-fabric-volumes.yaml
│       │   │   │   ├── org1-peer1.yaml
│       │   │   │   ├── org1-peer2.yaml
│       │   │   │   └── org1-tls-cert-issuer.yaml
│       │   │   ├── org2
│       │   │   │   ├── org2-ca.yaml
│       │   │   │   ├── org2-cc-template.yaml
│       │   │   │   ├── org2-install-k8s-builder.yaml
│       │   │   │   ├── org2-job-scrub-fabric-volumes.yaml
│       │   │   │   ├── org2-peer1.yaml
│       │   │   │   ├── org2-peer2.yaml
│       │   │   │   └── org2-tls-cert-issuer.yaml
│       │   │   ├── application-deployment.yaml
│       │   │   ├── fabric-builder-role.yaml
│       │   │   ├── fabric-builder-rolebinding.yaml
│       │   │   ├── fabric-rest-sample.yaml
│       │   │   ├── ingress-nginx-k3s.yaml
│       │   │   ├── ingress-nginx-kind.yaml
│       │   │   ├── ns-test-network.yaml
│       │   │   ├── pvc-fabric-org0.yaml
│       │   │   ├── pvc-fabric-org1.yaml
│       │   │   ├── pvc-fabric-org2.yaml
│       │   │   └── root-tls-cert-issuer.yaml
│       │   ├── scripts
│       │   │   ├── application_connection.sh
│       │   │   ├── appuser.id.template
│       │   │   ├── ccp-template.json
│       │   │   ├── chaincode.sh
│       │   │   ├── channel.sh
│       │   │   ├── cluster.sh
│       │   │   ├── fabric_CAs.sh
│       │   │   ├── fabric_config.sh
│       │   │   ├── kind.sh
│       │   │   ├── prereqs.sh
│       │   │   ├── rest_sample.sh
│       │   │   ├── set_anchor_peer.sh
│       │   │   ├── test_network.sh
│       │   │   └── utils.sh
│       │   ├── .gitignore
│       │   ├── README.md
│       │   └── network
│       ├── test-network-nano-bash
│       │   ├── bft-config
│       │   │   └── configtx.yaml
│       │   ├── ca
│       │   │   ├── ca_config
│       │   │   │   ├── ca
│       │   │   │   │   └── fabric-ca-server-config.yaml
│       │   │   │   └── tlsca
│       │   │   │       └── fabric-ca-server-config.yaml
│       │   │   ├── ca_utils.sh
│       │   │   ├── ccp-generate.sh
│       │   │   ├── ccp-template.json
│       │   │   ├── ccp-template.yaml
│       │   │   ├── config.yaml
│       │   │   └── createEnrollments.sh
│       │   ├── chaincode-external
│       │   │   ├── connection.json
│       │   │   └── metadata.json
│       │   ├── external_builders
│       │   │   ├── golang
│       │   │   │   └── bin
│       │   │   │       ├── detect
│       │   │   │       ├── release
│       │   │   │       └── run
│       │   │   ├── node
│       │   │   │   └── bin
│       │   │   │       ├── detect
│       │   │   │       ├── release
│       │   │   │       └── run
│       │   │   └── core_yaml_change.yaml
│       │   ├── .gitignore
│       │   ├── README.md
│       │   ├── ca_terminal_setup.png
│       │   ├── chaincode_interaction.sh
│       │   ├── configtx.yaml
│       │   ├── configureExternalBuilders.sh
│       │   ├── crypto-config.yaml
│       │   ├── generate_artifacts.sh
│       │   ├── install&approve&commit_chaincode_peer1.sh
│       │   ├── join_channel.sh
│       │   ├── join_orderers.sh
│       │   ├── network.sh
│       │   ├── orderer1.sh
│       │   ├── orderer2.sh
│       │   ├── orderer3.sh
│       │   ├── orderer4.sh
│       │   ├── ordererca.sh
│       │   ├── org1ca.sh
│       │   ├── org2ca.sh
│       │   ├── peer1.sh
│       │   ├── peer1admin.sh
│       │   ├── peer2.sh
│       │   ├── peer2admin.sh
│       │   ├── peer3.sh
│       │   ├── peer3admin.sh
│       │   ├── peer4.sh
│       │   ├── peer4admin.sh
│       │   └── terminal_setup.png
│       ├── token-erc-1155
│       │   ├── chaincode-go
│       │   │   ├── chaincode
│       │   │   │   └── contract.go
│       │   │   ├── erc1155.go
│       │   │   ├── go.mod
│       │   │   └── go.sum
│       │   └── README.md
│       ├── token-erc-20
│       │   ├── chaincode-go
│       │   │   ├── chaincode
│       │   │   │   └── token_contract.go
│       │   │   ├── go.mod
│       │   │   ├── go.sum
│       │   │   └── token_erc_20.go
│       │   ├── chaincode-java
│       │   │   ├── config
│       │   │   │   └── checkstyle
│       │   │   │       ├── checkstyle.xml
│       │   │   │       └── suppressions.xml
│       │   │   ├── docker
│       │   │   │   └── docker-entrypoint.sh
│       │   │   ├── gradle
│       │   │   │   └── wrapper
│       │   │   │       ├── gradle-wrapper.jar
│       │   │   │       └── gradle-wrapper.properties
│       │   │   ├── src
│       │   │   │   ├── main
│       │   │   │   │   └── java
│       │   │   │   │       └── org
│       │   │   │   │           └── hyperledger
│       │   │   │   │               └── fabric
│       │   │   │   │                   └── samples
│       │   │   │   │                       └── erc20
│       │   │   │   │                           ├── model
│       │   │   │   │                           │   ├── Approval.java
│       │   │   │   │                           │   └── Transfer.java
│       │   │   │   │                           ├── utils
│       │   │   │   │                           │   └── ContractUtility.java
│       │   │   │   │                           ├── ContractConstants.java
│       │   │   │   │                           ├── ContractErrors.java
│       │   │   │   │                           └── ERC20TokenContract.java
│       │   │   │   └── test
│       │   │   │       ├── java
│       │   │   │       │   └── org
│       │   │   │       │       └── hyperledger
│       │   │   │       │           └── fabric
│       │   │   │       │               └── samples
│       │   │   │       │                   └── erc20
│       │   │   │       │                       └── TokenERC20ContractTest.java
│       │   │   │       └── resources
│       │   │   │           └── mockito-extensions
│       │   │   │               └── org.mockito.plugins.MockMaker
│       │   │   ├── Dockerfile
│       │   │   ├── build.gradle
│       │   │   ├── gradlew
│       │   │   ├── gradlew.bat
│       │   │   └── settings.gradle
│       │   ├── chaincode-javascript
│       │   │   ├── lib
│       │   │   │   └── tokenERC20.js
│       │   │   ├── test
│       │   │   │   └── tokenERC20.test.js
│       │   │   ├── .editorconfig
│       │   │   ├── .eslintignore
│       │   │   ├── .eslintrc.js
│       │   │   ├── .gitignore
│       │   │   ├── index.js
│       │   │   ├── npm-shrinkwrap.json
│       │   │   └── package.json
│       │   └── README.md
│       ├── token-erc-721
│       │   ├── chaincode-go
│       │   │   ├── chaincode
│       │   │   │   ├── erc721-contract.go
│       │   │   │   ├── erc721-contract_test.go
│       │   │   │   └── erc721.go
│       │   │   ├── go.mod
│       │   │   ├── go.sum
│       │   │   └── main.go
│       │   ├── chaincode-java
│       │   │   ├── config
│       │   │   │   └── checkstyle
│       │   │   │       ├── checkstyle.xml
│       │   │   │       └── suppressions.xml
│       │   │   ├── docker
│       │   │   │   └── docker-entrypoint.sh
│       │   │   ├── gradle
│       │   │   │   └── wrapper
│       │   │   │       ├── gradle-wrapper.jar
│       │   │   │       └── gradle-wrapper.properties
│       │   │   ├── src
│       │   │   │   ├── main
│       │   │   │   │   └── java
│       │   │   │   │       └── org
│       │   │   │   │           └── hyperledger
│       │   │   │   │               └── fabric
│       │   │   │   │                   └── samples
│       │   │   │   │                       └── erc721
│       │   │   │   │                           ├── models
│       │   │   │   │                           │   ├── Approval.java
│       │   │   │   │                           │   ├── NFT.java
│       │   │   │   │                           │   └── Transfer.java
│       │   │   │   │                           ├── utils
│       │   │   │   │                           │   └── ContractUtility.java
│       │   │   │   │                           ├── ContractConstants.java
│       │   │   │   │                           ├── ContractErrors.java
│       │   │   │   │                           └── ERC721TokenContract.java
│       │   │   │   └── test
│       │   │   │       ├── java
│       │   │   │       │   └── org
│       │   │   │       │       └── hyperledger
│       │   │   │       │           └── fabric
│       │   │   │       │               └── samples
│       │   │   │       │                   └── erc721
│       │   │   │       │                       └── ERC721TokenContractTest.java
│       │   │   │       └── resources
│       │   │   │           └── mockito-extensions
│       │   │   │               └── org.mockito.plugins.MockMaker
│       │   │   ├── Dockerfile
│       │   │   ├── build.gradle
│       │   │   ├── gradlew
│       │   │   ├── gradlew.bat
│       │   │   └── settings.gradle
│       │   ├── chaincode-javascript
│       │   │   ├── lib
│       │   │   │   └── tokenERC721.js
│       │   │   ├── test
│       │   │   │   └── tokenERC721.test.js
│       │   │   ├── .editorconfig
│       │   │   ├── .eslintignore
│       │   │   ├── .eslintrc.js
│       │   │   ├── .gitignore
│       │   │   ├── index.js
│       │   │   ├── npm-shrinkwrap.json
│       │   │   └── package.json
│       │   └── README.md
│       ├── token-sdk
│       │   ├── auditor
│       │   │   ├── conf
│       │   │   │   └── core.yaml
│       │   │   ├── routes
│       │   │   │   ├── operations.go
│       │   │   │   ├── routes.gen.go
│       │   │   │   ├── routes.go
│       │   │   │   └── server.go
│       │   │   ├── service
│       │   │   │   ├── audit.go
│       │   │   │   ├── balance.go
│       │   │   │   └── history.go
│       │   │   ├── go.mod
│       │   │   ├── go.sum
│       │   │   ├── main.go
│       │   │   └── oapi-server.yaml
│       │   ├── e2e
│       │   │   ├── client.gen.go
│       │   │   ├── e2e_test.go
│       │   │   ├── go.mod
│       │   │   ├── go.sum
│       │   │   └── oapi-client.yaml
│       │   ├── explorer
│       │   │   ├── connection-profile
│       │   │   │   └── test-network.json
│       │   │   ├── .env
│       │   │   ├── config.json
│       │   │   └── docker-compose.yaml
│       │   ├── issuer
│       │   │   ├── conf
│       │   │   │   └── core.yaml
│       │   │   ├── routes
│       │   │   │   ├── operations.go
│       │   │   │   ├── routes.gen.go
│       │   │   │   ├── routes.go
│       │   │   │   └── server.go
│       │   │   ├── service
│       │   │   │   └── issue.go
│       │   │   ├── go.mod
│       │   │   ├── go.sum
│       │   │   ├── main.go
│       │   │   └── oapi-server.yaml
│       │   ├── owner
│       │   │   ├── conf
│       │   │   │   ├── owner1
│       │   │   │   │   └── core.yaml
│       │   │   │   └── owner2
│       │   │   │       └── core.yaml
│       │   │   ├── routes
│       │   │   │   ├── operations.go
│       │   │   │   ├── routes.gen.go
│       │   │   │   ├── routes.go
│       │   │   │   └── server.go
│       │   │   ├── service
│       │   │   │   ├── accept.go
│       │   │   │   ├── balance.go
│       │   │   │   ├── history.go
│       │   │   │   ├── redeem.go
│       │   │   │   └── transfer.go
│       │   │   ├── go.mod
│       │   │   ├── go.sum
│       │   │   ├── main.go
│       │   │   └── oapi-server.yaml
│       │   ├── scripts
│       │   │   ├── down.sh
│       │   │   ├── enroll-users.sh
│       │   │   └── up.sh
│       │   ├── tokenchaincode
│       │   │   └── Dockerfile
│       │   ├── .dockerignore
│       │   ├── .gitignore
│       │   ├── Dockerfile
│       │   ├── README.md
│       │   ├── components.png
│       │   ├── compose-ca.yaml
│       │   ├── dependencies.png
│       │   ├── docker-compose.yaml
│       │   ├── go.work
│       │   ├── go.work.sum
│       │   ├── swagger.yaml
│       │   └── transfer.png
│       ├── token-utxo
│       │   ├── chaincode-go
│       │   │   ├── chaincode
│       │   │   │   └── token_contract.go
│       │   │   ├── go.mod
│       │   │   ├── go.sum
│       │   │   └── token_utxo.go
│       │   └── README.md
│       ├── .editorconfig
│       ├── .gitignore
│       ├── CHANGELOG.md
│       ├── CODEOWNERS
│       ├── CODE_OF_CONDUCT.md
│       ├── CONTRIBUTING.md
│       ├── LICENSE
│       ├── MAINTAINERS.md
│       ├── README.md
│       └── SECURITY.md
└── CLAUDE.md
```
