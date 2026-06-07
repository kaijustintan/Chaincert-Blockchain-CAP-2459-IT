---
description: Generate a commit message with layman + technical description for the current staged/unstaged changes. Run before committing so every commit is self-documented.
argument-hint: [optional short label for what changed, e.g. "phase 3 fixes" or "smtp swap"]
---

## Task

Generate a complete commit message for the current changes. Context hint (if provided): $ARGUMENTS

### Step 1 — Read what changed

Run these in parallel:
- `git status` — what files are staged and unstaged
- `git diff --staged` — exact lines changed in staged files
- `git diff` — unstaged changes (if any worth noting)
- `git log --oneline -5` — recent commit history to match the style and conventional format used

### Step 2 — Produce the commit message

Output a single commit block in this exact format:

```
<type>(<scope>): <short imperative title, max 72 chars>

LAYMAN:
<2-4 sentences. Explain what changed and why in plain language — no code terms.
Imagine explaining to a groupmate who doesn't know the codebase.
What was broken or missing? What does it do now? What's the visible change?>

TECHNICAL:
<2-5 sentences. Precise explanation: which files, which functions, what was the
root cause, what was the fix, any important behavior preserved or intentionally unchanged.
Include key function names and file paths.>

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

### Step 3 — Rules to follow

- Type must be one of: `feat`, `fix`, `refactor`, `chore`, `docs`, `style`, `test`
- Scope = the feature area (e.g. `email`, `auth`, `issuer`, `wallet`, `profile`)
- Title is imperative ("add X", "fix Y", "remove Z") — NOT past tense ("added X")
- Layman section: no jargon, no file paths, no function names
- Technical section: precise — name the files and functions changed
- If multiple logical changes are in the diff, produce ONE message that covers all of them
  unless they are clearly separable — in that case produce 2-3 separate commit blocks and
  note "Consider splitting into N commits"
- Flag any staged file that looks like it should NOT be committed (e.g. .env, wallet/*.id,
  large binaries) with a ⚠️ warning before the commit message
- After the commit block, remind: "Run `git add <files> && git commit -m ...` — never runs git ops itself"
