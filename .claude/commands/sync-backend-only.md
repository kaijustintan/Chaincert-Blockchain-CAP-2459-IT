---
description: Sync backend changes (NON-chaincode) from the Windows repo to Ubuntu/WSL via cp. Also propagates Claude config files (.claude commands/skills, CLAUDE.md, doc mirrors). Use ONLY when chaincode was NOT changed — for chaincode changes use /sync-backend-with-chaincode.
argument-hint: [optional list of files or feature that changed]
---

## Context
@docs/Claude Reference - MD Files/Copy Commands.md
@CLAUDE.md

## Task
Guide me through syncing backend changes to Ubuntu/WSL for this change: $ARGUMENTS

Use this command ONLY when backend files OTHER THAN chaincode have changed. If chaincode/index.js was also modified, STOP immediately and tell me to use `/sync-backend-with-chaincode` instead — that command handles cp + redeploy together.

Steps:

1. Identify which backend files changed (controllers, routes, services, connection profiles, etc.).
2. Walk me through the corresponding cp commands from the Copy Commands doc. If uncertain which subset applies, default to running ALL of them — the cost of running all is low, the cost of missing one is silent staleness.
3. The Copy Commands doc now also includes the **Claude config files** (`.claude/commands/*`, `.claude/skills/*`, `CLAUDE.md`, and the `docs/Claude Reference - MD Files/` mirrors). If any of those changed on the Windows side, run those cp commands too so the Ubuntu Claude session picks up the latest slash commands, skills, and instructions automatically.
4. Confirm the API in Ubuntu is restarted after sync so the new code is actually loaded.
5. Run a quick smoke test on one affected endpoint to confirm the sync took effect.

Direction note: these cp commands only flow Windows → Ubuntu. If you edited a Claude config file from INSIDE an Ubuntu session, the `claude-config-sync` skill will remind you to copy it BACK to Windows (reverse cp) so the repo stays the source of truth.

After successful sync, remind me to commit and push to git (per my personal CLAUDE.md git workflow rule).
