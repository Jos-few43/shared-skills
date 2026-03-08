---
name: pattern-promotion
description: Analyze the existing skill library for duplication, over-specificity, or merge opportunities. Use after the library has grown to identify skills that should be merged, generalized, or split. For discovering new skills from sessions, use skill-discover instead.
context: fork
allowed-tools: Bash(*), Read, Glob, Grep, Write
---

# Pattern Promotion

Analyze the skill library and session data to surface patterns worth formalizing. This skill works alongside `/skill-discover` — discover finds raw candidates from sessions, pattern-promotion operates on the skill library itself to find duplication, composition opportunities, and over-specific skills that should be generalized.

## Step 1: Scan skills for duplicated instruction blocks

Read every `SKILL.md` in the library:

```bash
ls ~/shared-skills/source/*/SKILL.md 2>/dev/null
```

For each file, extract contiguous instruction blocks of 5 or more lines (excluding frontmatter, headings, and fenced code block markers). Compare blocks across files using normalized text (strip leading whitespace, lowercase). Flag any block that appears verbatim or near-verbatim (>85% line overlap) in 2 or more distinct skills.

**Extract candidate**: duplicated block → new shared skill that both originals can reference.

## Step 2: Co-occurrence analysis via trigger log

```bash
cat ~/shared-skills/metrics/triggers.jsonl 2>/dev/null | tail -500
```

> **Note:** `triggers.jsonl` is created automatically by the PostToolUse hook whenever a Skill tool call matches a known skill name. It may not exist until the hook is configured — the `2>/dev/null` guard above handles this safely.

Parse each `{"date":..., "skill":..., "session":...}` line. Group triggers by session ID. For each session, collect the ordered list of skills triggered. Identify skill pairs that appear in the same session in 3 or more sessions. Identify skill triples that appear together in 2 or more sessions.

**Compose candidate**: frequently co-triggered skills → new composite skill that orchestrates them in sequence.

## Step 3: Scan for unmatched tool call sequences

```bash
find ~/.claude/projects/*/sessions/ -name "*.jsonl" -newer $(date -d '30 days ago' +%Y-%m-%d) 2>/dev/null | head -20
```

For each session file, extract consecutive tool call sequences of length 4 or more:
- Parse `{"type":"tool_use","name":"..."}` blocks
- Normalize tool names
- Check whether any existing skill description or body mentions this sequence
- Flag sequences appearing in 3+ sessions with no matching skill

**Generalize candidate**: unmatched sequence found in unexpected contexts → broaden description of the closest existing skill, or extract as new.

## Step 4: Cross-reference with skill-health

Before writing any proposal, check skill health to avoid promoting stale patterns:

```bash
bash ~/shared-skills/scripts/health.sh 2>/dev/null | grep -E "stale|retired"
```

Discard any promotion candidate that involves a skill marked stale or retired.

Also read existing descriptions to avoid duplicates:

```bash
grep -h "^description:" ~/shared-skills/source/*/SKILL.md 2>/dev/null
```

## Step 5: Write promotion proposals

For each candidate, write a YAML file to `~/shared-skills/candidates/`. Do not overwrite an existing file with the same slug — check first:

```bash
ls ~/shared-skills/candidates/ 2>/dev/null
```

Filename: `YYYY-MM-DD-<slug>.yaml`

### Extract promotion (duplicated block)

```yaml
discovered: "<date>"
source: "pattern-promotion"
promotion_type: extract
pattern: |
  <describe the duplicated instruction block>
appears_in:
  - source/<skill-a>/SKILL.md
  - source/<skill-b>/SKILL.md
suggested_name: "<kebab-case>"
suggested_category: "<research|ops|code|workflow|meta>"
status: proposed
notes: "Duplicated block should be extracted into a shared skill and referenced from originals."
```

### Compose promotion (co-occurring skills)

```yaml
discovered: "<date>"
source: "pattern-promotion"
promotion_type: compose
pattern: |
  <describe the workflow these skills implement together>
component_skills:
  - <skill-a>
  - <skill-b>
co_occurrence_count: <N>
suggested_name: "<kebab-case>"
suggested_category: "<research|ops|code|workflow|meta>"
status: proposed
notes: "These skills are always run together — a composite skill would reduce friction."
```

### Generalize promotion (context mismatch)

```yaml
discovered: "<date>"
source: "pattern-promotion"
promotion_type: generalize
pattern: |
  <describe the unexpected usage context>
existing_skill: source/<skill>/SKILL.md
sessions_seen: <N>
suggested_change: |
  Broaden description to include: <new context>
status: proposed
notes: ""
```

## Step 6: Report

After all analysis, output a summary:

```
Skills scanned: <N>
Trigger log entries analyzed: <N>
Session files scanned: <N>

Extract candidates: <N>
Compose candidates: <N>
Generalize candidates: <N>
Skipped (stale/duplicate): <N>

Written to ~/shared-skills/candidates/:
  <filename> — <type>: <one-line description>
  ...

Next step: review candidates, set status: approved, then run /skill-implement <filename>
```

If no promotable patterns are found, say so clearly and note the minimum thresholds required (5-line block in 2+ skills, 3+ co-occurrences, 3+ unmatched sessions).
