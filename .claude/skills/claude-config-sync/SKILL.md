---
name: claude-config-sync
description: Use whenever creating, editing, or suggesting a change to Claude config files — anything under .claude/ (slash commands, skills, settings.json) or CLAUDE.md, on EITHER the Windows repo or the Ubuntu/WSL home. Reminds to confirm the change first and to sync it between the two filesystems so they don't drift. Triggers on edits to .claude/commands/*, .claude/skills/**, settings.json, or CLAUDE.md.
---

# Claude config sync (Windows <-> Ubuntu)

## Why this exists
ChainCert is worked on from two separate filesystems, each with its own copy of the Claude config:

- **Windows repo (source of truth):** `C:\Users\kaita\OneDrive\Desktop\CAP-2459-IT-AFTER-RESET`
  — seen from WSL as `/mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET`.
- **Ubuntu/WSL home:** `/home/kaitanz_` — the Ubuntu Claude session launches here, so its config lives at
  `~/.claude/commands/`, `~/.claude/skills/`, `~/CLAUDE.md`, and `~/docs/`.

The two copies of the slash commands, skills, CLAUDE.md, and doc mirrors can silently drift. This skill fires
whenever a Claude config file is touched and reminds Kai to keep both sides in sync.

## When this skill applies
Any time I create, edit, or PROPOSE a change to:
- `.claude/commands/*.md` (slash commands)
- `.claude/skills/**` (skills)
- `.claude/settings.json` / `settings.local.json`
- `CLAUDE.md` (project instructions)

## The workflow — every time a Claude config file changes

1. **Confirm before adding.** If the change is something I suggested (a new command, a new skill entry, a CLAUDE.md
   line), do NOT silently write it. Surface the suggestion and ask Kai whether to add it.
2. **Make the change** once Kai agrees.
3. **Remind to sync**, naming the direction (see below).
4. **When Kai says "proceed," I EXECUTE the sync myself** — I don't just hand him commands. From a Windows session I
   drive Ubuntu via `wsl`; from an Ubuntu session I run cp directly. Verify with `wsl ls` (or `ls`) afterward.

## Sync direction + how I execute it

### Change made on WINDOWS (this repo) → push to Ubuntu
The repo is the source of truth. From the Windows session I run these (they execute inside Ubuntu, copying from the
mounted `/mnt/c` path into the Ubuntu home where a home-launched session looks):
```powershell
# a slash command
wsl cp "/mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET/.claude/commands/<file>.md" /home/kaitanz_/.claude/commands/<file>.md

# a skill (folder)
wsl cp -r "/mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET/.claude/skills/<skill-folder>" /home/kaitanz_/.claude/skills/

# project CLAUDE.md
wsl cp "/mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET/CLAUDE.md" /home/kaitanz_/CLAUDE.md

# a doc the commands @-reference
wsl cp "/mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET/docs/reference/<doc>.md" "/home/kaitanz_/docs/reference/<doc>.md"
```
(Alternative from Windows: `Copy-Item "<repo>\<file>" "\\wsl$\Ubuntu\home\kaitanz_\..."` — `\\wsl$\Ubuntu\` is the Windows→Ubuntu mirror of `/mnt/c`.)

### Change made on UBUNTU (inside a WSL session) → copy BACK to Windows
So the repo stays source of truth:
```bash
REPO="/mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET"
cp ~/.claude/commands/<file>.md "$REPO/.claude/commands/<file>.md"   # a command
cp -r ~/.claude/skills/<skill-folder> "$REPO/.claude/skills/"        # a skill
cp ~/CLAUDE.md "$REPO/CLAUDE.md"                                     # CLAUDE.md
```

## Environment facts (so I can execute without re-discovering)
- WSL distro name: `Ubuntu`. Ubuntu home: `/home/kaitanz_`. Ubuntu session launches from home.
- Windows repo (source of truth): `C:\Users\kaita\OneDrive\Desktop\CAP-2459-IT-AFTER-RESET`
  — from WSL: `/mnt/c/Users/kaita/OneDrive/Desktop/CAP-2459-IT-AFTER-RESET`
  — reverse (Windows → Ubuntu home): `\\wsl$\Ubuntu\home\kaitanz_\`
- From a Windows session, `wsl <cmd>` runs `<cmd>` inside Ubuntu — this is how I execute Ubuntu-side syncs.

## Honest limitations
- This is a SOFT, model-side reminder. It only fires in a session where this skill is installed. It is now synced to
  `~/.claude/skills/` on Ubuntu too, so it fires in both environments.
- It does not auto-sync. It reminds, then executes on your go-ahead. For a hard, deterministic guarantee on every
  edit, promote this to a settings.json PostToolUse hook (see the update-config skill).
