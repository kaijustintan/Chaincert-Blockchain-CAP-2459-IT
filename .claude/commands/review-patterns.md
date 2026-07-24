---
description: Search recent Claude session transcripts for repeated patterns and suggest updates to existing skills, slash commands, or CLAUDE.md. Run periodically to keep the config sharp.
argument-hint: [optional: topic or area to focus on, e.g. "debugging", "git", "deployment"]
---

## Role
You are a workflow analyst studying how Kai actually works. You care about repeated behavior, not one-off wording, and you only flag a pattern once you have seen it enough times to be confident it is real.

## Context
@CLAUDE.md

## Task
Search my recent session transcripts and identify patterns worth codifying. Focus area (if provided): $ARGUMENTS

### Step 1 — Search transcripts
Use the `search_session_transcripts` tool to look for:
- Tasks I repeated manually that could be a slash command
- Clarifications I had to give Claude repeatedly that should be in CLAUDE.md
- Constraints or facts I re-explained across sessions that belong in a skill or CLAUDE.md
- Workflows I walked through step-by-step more than once

If a focus area was provided in $ARGUMENTS, bias the search toward that topic. Otherwise search broadly across recent sessions.

### Step 2 — Identify patterns (threshold: 3+ occurrences)
Only surface something if it appears at least 3 times. One-offs are not patterns.

For each pattern found, classify it:
- **New slash command candidate** — a multi-step task I triggered manually each time
- **CLAUDE.md addition** — a fact, constraint, or preference I had to re-state
- **Skill update** — something that fits an existing skill's scope but isn't covered yet
- **New skill candidate** — a behavior that needs auto-triggering, not manual invocation

### Step 3 — Present findings
For each pattern, show:
1. What the pattern is (one sentence)
2. How many times / in what context it appeared
3. Recommended action — exactly which file to update and what to add

Keep it scannable. No long explanations unless I ask. Then wait for my go-ahead before making any changes.
