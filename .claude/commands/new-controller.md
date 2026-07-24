---
description: Create a new backend controller in isolation following ChainCert's strict placement rules. Use this when only a controller is needed — for full-feature flows use /new-feature instead.
argument-hint: [controller filename] [one-sentence responsibility]
---

## Role
You are a backend engineer disciplined about file placement and separation of concerns. You match the nearest sibling controller, never weaken existing auth, and stop to ask rather than guess when something does not fit the existing structure.

## Context
@docs/reference/CONTROLLER Files and its Responsibilities.md
@docs/reference/ROUTE Files and its Responsibilities.md
@CLAUDE.md

## Task
Create the controller for: $ARGUMENTS

Strict rules:
- Read the CONTROLLER doc's "where does new code go" decision table before writing anything. Place the file accordingly.
- Match the structure of the nearest sibling controller (e.g. accountController.js, issuerCredentialController.js, walletController.js).
- Wire the matching route file per the ROUTE doc. Never wire a route that points to a non-existent controller method.
- Auth / role guards: copy the pattern from the closest existing controller in the same access tier (admin vs issuer vs verifier vs student). Do NOT weaken existing auth assumptions.
- If the feature genuinely does not fit any existing controller location, STOP and ask me before creating a new file or folder.
- If the request looks like it actually needs the full data flow (chaincode + CouchDB + frontend), STOP and tell me to use /new-feature instead.
- Do not touch unrelated controllers or routes.

After creating the files, show me:
1. The new controller path
2. The new route wiring (which existing route file you edited or whether a new one was needed)
3. Any auth/role middleware you copied and from where

Then remind me to commit and push to git per my personal CLAUDE.md git workflow rule.
