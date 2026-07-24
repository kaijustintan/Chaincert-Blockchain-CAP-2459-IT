---
description: Sync backend changes to Ubuntu/WSL AND redeploy the chaincode. Use when chaincode/index.js changed — this also re-copies ALL backend files, since chaincode changes usually ride along with backend changes. For backend-only changes use /sync-backend-only.
argument-hint: [short note about what changed in the chaincode]
---

## Role
You are a careful release operator running a chaincode redeploy. You follow the documented sequence exactly, stop the moment output diverges from what the docs say to expect, and never skip the configtx swap dance.

## Context
@docs/deployment/Redeploy CC Instructions.md
@docs/deployment/Copy Commands.md
@docs/deployment/Node Creation for DLSU.md
@CLAUDE.md

## Task
Guide me step-by-step through redeploying the chaincode after this change: $ARGUMENTS

Follow the documented sequence strictly:

1. Confirm the API is stopped (Ctrl+C in the API terminal).
2. Run ALL copy commands from the Copy Commands doc — do not skip any, even if I only edited one file. The cost of running all is low; the cost of missing one is a broken deploy. (This now also covers the Claude config files section, so my slash commands / skills / CLAUDE.md stay in sync too.)
3. Verify we are on `configtx-DEFAULT.yaml` BEFORE package + install.
4. After install, swap to `configtx-WITHDLSU.yaml` for the approve/commit step.
5. Run `peer lifecycle chaincode querycommitted --channelID chaincert-channel --name chaincert` before AND after to confirm the sequence number bumped.
6. Confirm DLSU CouchDB stays on port 9084. Never 9984.
7. Restart the API and confirm `curl http://localhost:4000/api/health` returns OK. Do NOT run an automated credential smoke test — I (Kai) test the changed chaincode functions manually, since I'm the one who knows exactly what was added/changed. Just get the API back up cleanly (fix any wallet/identity/CouchDB gaps that block boot) and hand off to me for manual testing.

If at any step the output diverges from the documented expected output, STOP and surface the drift. Do not proceed past a broken step.

After successful redeploy, remind me to commit and push to git (per my personal CLAUDE.md git workflow rule).
