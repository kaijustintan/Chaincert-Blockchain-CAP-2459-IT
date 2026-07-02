---
name: chaincert-doc-format
description: Use whenever working on ChainCert documentation, knowledge base entries, defense materials, or technical manuals. Triggers on words like "manual", "knowledge base", "KB entry", "defense", "tropang explanation", "redeploy instructions", or any task that creates or edits files under docs/. Enforces the documentation format and ChainCert factual constraints automatically.
---

# ChainCert documentation format

## When this skill applies
Any task where the deliverable is a ChainCert doc — `.docx`, `.md`, or in-chat explanation that will end up in defense materials. Triggers:
- Words: manual, knowledge base, KB, KB entry, defense, panelist, tropang, redeploy steps, installation steps, technical manual
- File paths: anything touching `docs/`, `docs/Claude Reference - MD Files/`, or `docs/Claude Reference - MD Files/CAP1 Documents to Submit/`
- Format requests: "explain X like in the KB", "write the defense answer for Y"

## Format rules

### For Q&A knowledge base entries
**Summary** — 1-2 sentences, direct answer.
**Technical Detail** — what's actually happening, precise, cite file/function/port/Fabric method.
**Tropang Explanation** — same idea casual mixed English/Tagalog, like explaining to a friend.
**Defense Answer** — how to say it to a panelist in ~30 seconds. Confident, no overclaiming.

### For procedure / how-to docs
1. Function Name (or step name)
2. Technical — what it does
3. Tropang Explanation — casual EN/TL
4. Numbered Steps

### Doc source preference
ALWAYS prefer reading the `.md` mirrors over the original PDFs. Cheaper on tokens. Paths:
- `docs/Claude Reference - MD Files/`
- `docs/Claude Reference - MD Files/CAP1 Documents to Submit/`

## Hard factual constraints — these are not opinions

### Things ChainCert actually IS
- Hyperledger Fabric 2.5.14
- JavaScript chaincode (in `chaincode/index.js`)
- Multi-org Fabric network: Org1, Org2, DLSU (with subordinates ARCHERSNETWORK and LASALLECOMPUTERSOCIETY), plus Orderer
- Single channel: `chaincert-channel`
- Contract name: `chaincert`
- DLSU CouchDB port: **9084** (NEVER 9984 — common typo trap)
- 1 orderer, 3 peers, 4 CAs, 3 peer state CouchDBs
- Centrally hosted prototype, logically multi-org
- Verifier enters credential ID manually to verify

### Things ChainCert is NOT — never claim these
- ❌ W3C Verifiable Credentials Data Model
- ❌ IPFS
- ❌ Base64-encoded PDF documents stored on-chain
- ❌ ABAC (attribute-based access control)
- ❌ Go chaincode (it's JavaScript)
- ❌ QR scanning for verification
- ❌ Production-ready (it's a capstone prototype with acknowledged limitations)

### Numbers to memorize
- 5-10 day manual verification baseline (from real interviews with Avesco Marketing Corporation and Sunlife Philippines HR — defensible, citable)
- Fabric version: 2.5.14

## Tone guidance
- **Tropang Explanation sections:** casual mixed EN/TL, "yung", "kasi", "naman" natural, use analogies.
- **Defense Answer sections:** confident professional English, no Tagalog, no filler, ~30 seconds spoken.
- **Technical Detail sections:** precise English, cite real files and functions, no marketing language.

## When in doubt
- Don't claim features that don't exist. Be honest about prototype limitations.
- If asked about something the user didn't personally build, say so explicitly.
- The acknowledged limitations section at the top of the Defense KB is intentional — surface limitations, don't hide them.
