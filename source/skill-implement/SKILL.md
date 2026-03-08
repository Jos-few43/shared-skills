---
name: skill-implement
description: Generate a full Skills 2.0 skill from an approved candidate proposal. Reads candidate YAML, analyzes referenced sessions, creates complete skill directory.
disable-model-invocation: true
context: fork
argument-hint: "<candidate-filename>"
allowed-tools: Bash(*), Read, Glob, Grep, Write
---

# Skill Implementation

Generate a complete Skills 2.0 skill from an approved candidate in `~/shared-skills/candidates/`.

## Implementation Process

### Step 1: Read and validate the candidate

```bash
cat ~/shared-skills/candidates/$ARGUMENTS
```

Verify:
- `status` is `proposed` or `approved`
- `suggested_name` is present and is valid kebab-case
- `pattern` field is non-empty

If status is not `proposed` or `approved` (e.g., `implemented`, `rejected`), stop and report:
```
Candidate status is "<status>" — nothing to do.
```

### Step 2: Analyze referenced sessions (if listed)

If the candidate `source` field references session IDs, read those sessions to extract:
- Exact tool call sequences used
- The user prompts that triggered the pattern
- Any bash commands that are part of the workflow

This informs the concrete instructions written into the skill body.

### Step 3: Generate the skill directory and SKILL.md

Create directory: `~/shared-skills/source/<suggested_name>/`

Write `~/shared-skills/source/<suggested_name>/SKILL.md` with:

**Frontmatter** (Skills 2.0 format):
```yaml
---
name: <suggested_name>
description: <one-liner derived from candidate pattern>
disable-model-invocation: true
argument-hint: "<appropriate hint or omit>"
allowed-tools: <tools actually used in the pattern>
---
```

**Body**: Step-by-step instructions derived from the observed pattern. Be specific:
- Reference the actual commands or tool calls seen in sessions
- Include example outputs where helpful
- Add a "When to use" note at the top if the trigger is non-obvious

### Step 4: Update the candidate YAML

Edit `~/shared-skills/candidates/$ARGUMENTS` to update:

```yaml
status: implemented
implemented_date: "<today YYYY-MM-DD>"
skill_path: "~/shared-skills/source/<suggested_name>/SKILL.md"
review_date: "<today + 90 days YYYY-MM-DD>"    # capability review
workflow_review: "<today + 180 days YYYY-MM-DD>"  # workflow review
```

### Step 5: Propagate the skill

```bash
bash ~/shared-skills/scripts/symlink-all.sh --skip-transpile
```

### Step 6: Report

```
Skill created: ~/shared-skills/source/<name>/SKILL.md
Candidate updated: ~/shared-skills/candidates/<filename>
Status: implemented

Test invocation:
  /skill-<name>

Review schedule:
  Capability review: <review_date>
  Workflow review:   <workflow_review>
```
