---
name: skill-health
description: Show a dashboard of all skills with usage metrics, trigger frequency, and health status. Use to identify stale or underused skills.
disable-model-invocation: true
allowed-tools: Bash(*)
---

# Skill Health Dashboard

## Current Skill Status

```
!`bash ~/shared-skills/scripts/health.sh 2>/dev/null || echo "Run: chmod +x ~/shared-skills/scripts/health.sh"`
```

## Pending Proposals

```
!`ls ~/shared-skills/candidates/*.yaml 2>/dev/null | wc -l || echo "0"` proposals in queue
```

To review candidates:
```bash
ls ~/shared-skills/candidates/*.yaml 2>/dev/null
```

## Actions by Health Status

**new** (never triggered)
- No action needed for recently created skills
- If older than 30 days and never used, consider whether it surfaces correctly in skill suggestions
- Check that the description matches common user phrasing

**healthy** (3+ triggers in 30 days)
- No action needed
- Schedule capability review at 90 days, workflow review at 180 days (tracked in candidate YAML if applicable)

**low** (1-2 triggers in 30 days)
- Acceptable for niche skills
- If expected to be used more often, review the description for discoverability
- Consider whether the skill should be folded into a higher-traffic skill

**stale** (0 triggers in 30 days, but was used before)
- Review: has the underlying workflow changed? Is the skill still accurate?
- If the workflow is gone, retire it: move `source/<skill>/` to `source/_retired/`
- If it should still be used, update the description and keyword hints in the suggestion hook

## Recording Triggers

Skills do not auto-record triggers. To log a trigger manually or from a hook, append a line to `~/shared-skills/metrics/triggers.jsonl`:

```json
{"date": "2026-03-07", "skill": "skill-name", "session": "<session-id>", "tool": "claude-code"}
```

To wire automatic trigger recording, add a PostToolUse hook that appends to this file whenever a Skill tool call matches a known skill name.

> **Note:** `triggers.jsonl` is created automatically by the PostToolUse hook and may not exist until the hook is configured. The `2>/dev/null` guards in this and other skills handle a missing file safely.
