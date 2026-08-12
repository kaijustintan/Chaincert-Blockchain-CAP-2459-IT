# Security Policy

## Project status

ChainCert is an **academic capstone project** (CAP-2459-IT, De La Salle University). It is
published for reference and study. It is **not production software**, is not actively maintained
against a support commitment, and should not be deployed as-is to handle real credentials.

Known constraints that were accepted deliberately within capstone scope are documented in
[`LIMITATIONS.md`](../LIMITATIONS.md). Please read that file before reporting — several items there
are already-known design tradeoffs rather than undiscovered bugs.

## Reporting a vulnerability

If you find a security issue that is **not** already covered in `LIMITATIONS.md`, please report it
privately rather than opening a public issue.

- Preferred: open a [GitHub security advisory](../../security/advisories/new) on this repository.
- Otherwise: contact the repository owner through their GitHub profile.

Please include:

- What the issue is and which component it affects (frontend, Express API, or chaincode)
- Steps to reproduce, or the specific file and line
- What an attacker could achieve with it

## What to expect

This is a student project maintained on a best-effort basis. There is no guaranteed response
window. Reports that identify a concrete, reproducible flaw will be acknowledged and, where
practical, fixed or documented in `LIMITATIONS.md`.

## Scope

In scope:

- The React frontend (`src/`, excluding `src/controllers/` and `src/routes/`)
- The Express API (`backend/`, `src/controllers/`, `src/routes/`)
- The Hyperledger Fabric chaincode (`chaincode/`)
- Repository contents (accidentally committed secrets, exposed configuration)

Out of scope:

- Any deployed instance you do not own. Do not test against a live host.
- Items already documented in `LIMITATIONS.md`
- Findings that require an already-compromised host or an already-leaked Fabric wallet identity
- Upstream Hyperledger Fabric sample material reproduced under `backend/node_creation/`, including
  the well-known `fabric-samples` development credentials

## A note on the sample credentials in this repository

Values such as `admin:adminpw`, `peer0pw`, and `user1pw` under `backend/node_creation/` are the
**stock upstream Hyperledger `fabric-samples` development credentials**. They are published
upstream, are safe to read here, and are unsafe to deploy anywhere. Any real deployment must
override them. Reporting their presence is not a vulnerability report — but reporting a *live* host
still using them would be.
