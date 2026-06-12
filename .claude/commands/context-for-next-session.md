---
description: Extract all relevant session context — what was done, what's pending, what's next — formatted as a self-contained handoff document for the next Claude session. Run at the end of every working session.
argument-hint: [optional: specific phase or focus area to emphasize]
---

## Task

Generate a complete session handoff document. Focus hint (if provided): $ARGUMENTS

### Step 1 — Gather state

Run these in parallel:
- `git log --oneline -15` — recent commit history
- `git status` — any uncommitted/unsynced changes
- `git diff --staged` — what's staged but not yet committed
- `git diff` — what's changed but not staged
Read the current plan file at `C:\Users\kaita\.claude\plans\` (glob for the most recently modified .md file)

### Step 2 — Produce the handoff document

Output a single fenced markdown block with this exact structure:

---

# ChainCert — Session Handoff

## Session date
[today's date]

## What was accomplished this session
[Bullet list. One bullet per logical change. Include: what was broken/missing, what was done, which files were touched. Be specific — file names, function names, the actual fix. This is what the next session needs to know without re-reading the whole conversation.]

## Files changed this session
[Table: File | What changed | Synced to Ubuntu? (yes/no/frontend-only)]

## Decisions made (architecture / product)
[Bullet list of any non-obvious decisions made this session that the next session should not re-litigate. Include the reasoning so future-Claude doesn't reverse a decision without knowing why it was made.]

## What is NOT done yet / pending
[Two sections:]
### Uncommitted / unsynced
[List any changes that exist in code but haven't been committed or synced to Ubuntu. Be explicit — file name + what's in it.]
### Deferred / blocked
[Items that were identified but intentionally not implemented this session, with the reason.]

## Current phase status
[One line per phase — DONE / IN PROGRESS / BLOCKED / NOT STARTED / DEFERRED]

## Next session — start here
[The exact task to begin with. Enough detail that the next session can start coding immediately without needing to re-read everything. Include: which file to open, which function to add/edit, what the expected behavior is, and the test to verify it works.]

## Key config / environment facts to remember
[Anything about the environment that a fresh session might forget: ports, paths, credentials locations, sync rules, etc. Only include things that are non-obvious or were discovered this session.]

## Reminder checklist before closing this session
- [ ] All backend files synced to Ubuntu via cp
- [ ] All commits pushed to git
- [ ] Plan file updated with any new phases or decisions
- [ ] Ubuntu API restarted to pick up latest synced files
- [ ] CLAUDE.md updated if any new project facts were discovered

---

### Step 3 — Rules

- Be specific. File paths and function names, not vague descriptions.
- If git diff shows uncommitted changes, flag them prominently under "Uncommitted / unsynced."
- The "Next session — start here" section should be detailed enough that a cold-start Claude session can begin executing immediately with zero clarifying questions.
- Keep the whole document under 600 words — dense and scannable, not a novel.
- After outputting the document, remind: "Save this — paste it as your first message in the next session."
