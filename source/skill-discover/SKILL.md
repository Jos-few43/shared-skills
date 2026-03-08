---
name: skill-discover
description: Scan recent Claude Code sessions for repeated patterns that could become new skills. Use to find candidate skills from actual usage. For analyzing the existing library for duplication or merges, use pattern-promotion instead.
disable-model-invocation: true
argument-hint: "[--from-session <id>]"
allowed-tools: Bash(*), Read, Glob, Grep, Write
---

# Skill Discovery

Scan recent Claude Code sessions for patterns worth extracting as reusable skills.

## Discovery Process

### Step 1: Locate session transcripts

```bash
ls ~/.claude/projects/*/sessions/ 2>/dev/null | head -50
```

If `--from-session <id>` is provided, scope to that session only. Otherwise scan all sessions modified in the last 14 days:

```bash
find ~/.claude/projects/*/sessions/ -name "*.jsonl" -newer $(date -d '14 days ago' +%Y-%m-%d) 2>/dev/null
```

### Step 2: Extract signals from sessions

For each session file, look for:

**Signal A — Repeated tool call sequences (3+ calls in same order, 2+ sessions)**
- Parse tool call blocks: `{"type":"tool_use","name":"..."}`
- Identify runs of 3+ consecutive tool calls with the same names in the same order
- Flag if the same sequence appears in 2 or more separate sessions

**Signal B — Repeated long prompts (>200 chars appearing 2+ times)**
- Extract user turn content
- Hash or compare for near-duplicates
- High similarity (>80%) across sessions = candidate

**Signal C — Repeated bash patterns**
- Extract bash command strings from `Bash` tool calls
- Normalize variable parts (paths, dates, IDs)
- Flag patterns seen 3+ times across sessions

### Step 3: Check against existing skills

Read all existing skill descriptions to avoid proposing duplicates:

```bash
grep -h "^description:" ~/shared-skills/source/*/SKILL.md ~/shared-skills/source/*.md 2>/dev/null
```

Discard any candidate whose pattern is already covered by an existing skill description.

### Step 4: Write candidate proposals

For each novel pattern found, write a YAML file to `~/shared-skills/candidates/`:

Filename: `YYYY-MM-DD-<slug>.yaml` where slug is a short kebab-case label.

```yaml
discovered: "2026-03-07"
source: "session:<session-id> (+ N others)"
pattern: |
  <describe the repeated pattern in plain language>
frequency: <number of times seen across sessions>
suggested_name: "<kebab-case-name>"
suggested_category: "<research|ops|code|workflow|meta>"
status: proposed
notes: ""
```

Do not overwrite existing candidates — check if a file with the same slug already exists.

### Step 5: Report findings

After scanning, output a summary:

```
Scanned: <N> sessions
Signals found: <N>
New candidates written: <N>
Skipped (already covered): <N>

New candidates:
  ~/shared-skills/candidates/2026-03-07-<slug>.yaml
  ...

Next step: review candidates, set status: approved, then run /skill-implement <filename>
```

If no patterns are found after scanning at least 5 sessions, say so clearly and suggest running again after more sessions accumulate.
