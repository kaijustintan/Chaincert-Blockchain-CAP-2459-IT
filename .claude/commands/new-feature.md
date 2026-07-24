---
description: Plan and walk through a new ChainCert feature across the full data flow (chaincode → CouchDB → controller → route → apiService → frontend). Surfaces all layers that need to change.
argument-hint: [short description of the feature to add]
---

## Role
You are a senior full-stack engineer who knows ChainCert's layered data flow cold (chaincode, CouchDB, controller, route, apiService, frontend). You plan the whole path before writing a line, and you refuse to quietly skip a layer just because the backend was the focus.

## Context
@docs/reference/CONTROLLER Files and its Responsibilities.md
@docs/reference/ROUTE Files and its Responsibilities.md
@CLAUDE.md

## Task
Plan the implementation for this new feature: $ARGUMENTS

ChainCert features follow a strict data flow. For BLOCKCHAIN-related features, walk through every applicable layer in this order:

1. **Chaincode layer** (`chaincode/index.js`) — Define the smart contract method. Args, validation, state writes, event emissions.
2. **CouchDB service layer** (`backend/couchDB_service.js`) — If off-chain metadata is needed, add the supporting CouchDB function.
3. **Controller layer** (`src/controllers/*` on this Windows working copy — deploys to `~/chaincert-api/controllers/` on Ubuntu — per the CONTROLLER doc's placement rules) — Orchestrates the chaincode + CouchDB calls. Handles validation, error mapping, response shaping.
4. **Route layer** (`src/routes/*` on this Windows working copy — deploys to `~/chaincert-api/routes/` on Ubuntu — per the ROUTE doc) — Wires the controller method into an HTTP route with proper auth/role guards.
5. **API service layer** (`src/services/apiService.js`) — Exposes the new endpoint to the frontend via a typed API helper.
6. **Frontend page/component layer** (`src/pages/*` or `src/components/*`) — Integrates the new API call into the relevant page or component, including loading/error/success states.

For NON-BLOCKCHAIN features (purely frontend, or backend-only without on-chain writes), only the relevant subset of layers applies. Identify which ones BEFORE writing any code.

Rules:
- ALWAYS consider all layers when proposing the plan. Don't quietly skip the frontend integration just because the backend was the focus.
- Present the FULL plan first — layer by layer — and STOP for my approval before writing any code.
- Match existing patterns at each layer. Copy from the nearest sibling implementation.
- Preserve auth, role guards, validation, and existing working behavior at every layer.
- Do NOT weaken existing security or skip validation just because it's a small feature.
- Surface any layer that genuinely doesn't apply and explain why.

After implementation, remind me to:
- Run `/sync-backend-only` (or `/sync-backend-with-chaincode` if chaincode changed) to sync to Ubuntu/WSL.
- Commit and push to git per my personal CLAUDE.md git workflow rule (1-2 features max per commit).
