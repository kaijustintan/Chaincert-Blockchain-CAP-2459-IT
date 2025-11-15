#!/usr/bin/env bash

function createDLSU {
    # Relative: ../../organizations/peerOrganizations/dlsu.example.com/
    # Absolute: /home/kaitanz_/fabric-samples/fabric-samples/test-network/organizations/peerOrganizations/dlsu.example.com/
    mkdir -p ../../organizations/peerOrganizations/dlsu.example.com/

    # Set Fabric CA Client home to org's directory
    export FABRIC_CA_CLIENT_HOME="${PWD}/../../organizations/peerOrganizations/dlsu.example.com/"

    infoln "Enrolling the CA admin"
    set -x
    # Use canonical CA cert path
    fabric-ca-client enroll \
        -u https://admin:adminpw@localhost:12054 \
        --caname ca-dlsu \
        --tls.certfiles "${PWD}/../../organizations/fabric-ca/dlsu/ca-cert.pem"
    { set +x; } 2>/dev/null

    # Create NodeOUs YAML config
    echo 'NodeOUs:
  Enable: true
  ClientOUIdentifier:
    Certificate: cacerts/localhost-12054-ca-dlsu.pem
    OrganizationalUnitIdentifier: client
  PeerOUIdentifier:
    Certificate: cacerts/localhost-12054-ca-dlsu.pem
    OrganizationalUnitIdentifier: peer
  AdminOUIdentifier:
    Certificate: cacerts/localhost-12054-ca-dlsu.pem
    OrganizationalUnitIdentifier: admin
  OrdererOUIdentifier:
    Certificate: cacerts/localhost-12054-ca-dlsu.pem
    OrganizationalUnitIdentifier: orderer' > "${PWD}/../../organizations/peerOrganizations/dlsu.example.com/msp/config.yaml"

    infoln "Registering peer0"
    set -x
    fabric-ca-client register \
        --caname ca-dlsu \
        --id.name peer0 \
        --id.secret peer0pw \
        --id.type peer \
        --tls.certfiles "${PWD}/../../organizations/fabric-ca/dlsu/tls-cert.pem"
    { set +x; } 2>/dev/null

    infoln "Registering user"
    set -x
    fabric-ca-client register \
        --caname ca-dlsu \
        --id.name user1 \
        --id.secret user1pw \
        --id.type client \
        --tls.certfiles "${PWD}/../../organizations/fabric-ca/dlsu/tls-cert.pem"
    { set +x; } 2>/dev/null

    infoln "Registering the org admin"
    set -x
    fabric-ca-client register \
        --caname ca-dlsu \
        --id.name dlsuadmin \
        --id.secret dlsuadminpw \
        --id.type admin \
        --tls.certfiles "${PWD}/../../organizations/fabric-ca/dlsu/tls-cert.pem"
    { set +x; } 2>/dev/null

    infoln "Generating the peer0 msp"
    set -x
    fabric-ca-client enroll -u https://peer0:peer0pw@localhost:12054 --caname ca-dlsu -M "${PWD}/../../organizations/peerOrganizations/dlsu.example.com/peers/peer0.dlsu.example.com/msp" --tls.certfiles "${PWD}/../../organizations/fabric-ca/dlsu/tls-cert.pem"
    { set +x; } 2>/dev/null

    cp "${PWD}/../../organizations/peerOrganizations/dlsu.example.com/msp/config.yaml" "${PWD}/../../organizations/peerOrganizations/dlsu.example.com/peers/peer0.dlsu.example.com/msp/config.yaml"

    infoln "Generating the peer0-tls certificates, use --csr.hosts to specify Subject Alternative Names"
    set -x
    fabric-ca-client enroll -u https://peer0:peer0pw@localhost:12054 --caname ca-dlsu -M "${PWD}/../../organizations/peerOrganizations/dlsu.example.com/peers/peer0.dlsu.example.com/tls" --enrollment.profile tls --csr.hosts peer0.dlsu.example.com --csr.hosts localhost --tls.certfiles "${PWD}/../../organizations/fabric-ca/dlsu/tls-cert.pem"
    { set +x; } 2>/dev/null

    cp "${PWD}/../../organizations/peerOrganizations/dlsu.example.com/peers/peer0.dlsu.example.com/tls/tlscacerts/"* "${PWD}/../../organizations/peerOrganizations/dlsu.example.com/peers/peer0.dlsu.example.com/tls/ca.crt"
    cp "${PWD}/../../organizations/peerOrganizations/dlsu.example.com/peers/peer0.dlsu.example.com/tls/signcerts/"* "${PWD}/../../organizations/peerOrganizations/dlsu.example.com/peers/peer0.dlsu.example.com/tls/server.crt"
    cp "${PWD}/../../organizations/peerOrganizations/dlsu.example.com/peers/peer0.dlsu.example.com/tls/keystore/"* "${PWD}/../../organizations/peerOrganizations/dlsu.example.com/peers/peer0.dlsu.example.com/tls/server.key"

    mkdir -p "${PWD}/../../organizations/peerOrganizations/dlsu.example.com/msp/tlscacerts"
    cp "${PWD}/../../organizations/peerOrganizations/dlsu.example.com/peers/peer0.dlsu.example.com/tls/tlscacerts/"* "${PWD}/../../organizations/peerOrganizations/dlsu.example.com/msp/tlscacerts/ca.crt"

    mkdir -p "${PWD}/../../organizations/peerOrganizations/dlsu.example.com/tlsca"
    cp "${PWD}/../../organizations/peerOrganizations/dlsu.example.com/peers/peer0.dlsu.example.com/tls/tlscacerts/"* "${PWD}/../../organizations/peerOrganizations/dlsu.example.com/tlsca/tlsca.dlsu.example.com-cert.pem"

    mkdir -p "${PWD}/../../organizations/peerOrganizations/dlsu.example.com/ca"
    cp "${PWD}/../../organizations/peerOrganizations/dlsu.example.com/peers/peer0.dlsu.example.com/msp/cacerts/"* "${PWD}/../../organizations/peerOrganizations/dlsu.example.com/ca/ca.dlsu.example.com-cert.pem"

    infoln "Generating the user msp"
    set -x
    fabric-ca-client enroll -u https://user1:user1pw@localhost:12054 --caname ca-dlsu -M "${PWD}/../../organizations/peerOrganizations/dlsu.example.com/users/User1@dlsu.example.com/msp" --tls.certfiles "${PWD}/../../organizations/fabric-ca/dlsu/tls-cert.pem"
    { set +x; } 2>/dev/null
    cp "${PWD}/../../organizations/peerOrganizations/dlsu.example.com/msp/config.yaml" "${PWD}/../../organizations/peerOrganizations/dlsu.example.com/users/User1@dlsu.example.com/msp/config.yaml"

    infoln "Generating the org admin msp"
    set -x
    fabric-ca-client enroll -u https://dlsuadmin:dlsuadminpw@localhost:12054 --caname ca-dlsu -M "${PWD}/../../organizations/peerOrganizations/dlsu.example.com/users/Admin@dlsu.example.com/msp" --tls.certfiles "${PWD}/../../organizations/fabric-ca/dlsu/tls-cert.pem"
    { set +x; } 2>/dev/null
    cp "${PWD}/../../organizations/peerOrganizations/dlsu.example.com/msp/config.yaml" "${PWD}/../../organizations/peerOrganizations/dlsu.example.com/users/Admin@dlsu.example.com/msp/config.yaml"
}
