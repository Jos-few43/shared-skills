---
name: action-dashboard
description: Use when reviewing or acting on queued research actions — approve, reject, or list pending items from the action pipeline. Use when user mentions ACT-xxxx IDs or action queue.
argument-hint: "[approve|reject|list]"
disable-model-invocation: true
allowed-tools: Bash(*)
---

# Action Dashboard

## Overview

Human approval gate for the action pipeline. Shows pending actions extracted from research reports and provides controls to approve, reject, or implement them.

## Modes

### Default: `/action-dashboard`

Show the current action queue status:

```bash
bash ~/SCRiPTz/action-queue.sh list
```

Present results in a table:

| ID | Status | Urgency | Title | Component | Action |
|----|--------|---------|-------|-----------|--------|

Also show summary counts:

```bash
bash ~/SCRiPTz/action-queue.sh list --status pending --count
bash ~/SCRiPTz/action-queue.sh list --status approved --count
bash ~/SCRiPTz/action-queue.sh list --status implementing --count
```

### Approve: `/action-dashboard approve ACT-xxxx`

Review the action details, then approve it:

```bash
cat ~/shared-memory/core/action-queue.json | jq '.actions[] | select(.id == "ACT-xxxx")'
```

Confirm with the user before approving. If confirmed:

```bash
bash ~/SCRiPTz/action-queue.sh approve ACT-xxxx
bash ~/SCRiPTz/action-queue.sh dashboard
```

### Reject: `/action-dashboard reject ACT-xxxx`

Ask the user for a rejection reason, then:

```bash
bash ~/SCRiPTz/action-queue.sh reject ACT-xxxx "reason"
bash ~/SCRiPTz/action-queue.sh dashboard
```

### Implement: `/action-dashboard implement ACT-xxxx`

1. Fetch the action details from the queue using {{tool:file_read}}
2. Mark as implementing: `bash ~/SCRiPTz/action-queue.sh implement ACT-xxxx`
3. Based on `implementation_skill`, load the appropriate skill:
   - `model-swap` → use `/model-swap` skill
   - `plugin-lifecycle` → use `/plugin-lifecycle` skill
   - `dependency-audit` → use `/dependency-audit` skill
   - `feature-toggle` → use `/feature-toggle` skill
   - `null` → ask user which approach to take
4. After implementation, run validation: `bash ~/SCRiPTz/validate-action.sh ACT-xxxx`
5. If validation passes: `bash ~/SCRiPTz/action-queue.sh complete ACT-xxxx`
6. Update changelog: `bash ~/SCRiPTz/changelog-update.sh ACT-xxxx`

### Radar: `/action-dashboard radar`

Show the tech radar summary:

```bash
grep '  - name:' ~/shared-memory/core/tech-radar.md | head -30
```

Present component counts per category and recent changes.

### Refresh: `/action-dashboard refresh`

Regenerate the dashboard file:

```bash
bash ~/SCRiPTz/action-queue.sh dashboard
```

## Important

- Always confirm with the user before approving or implementing actions
- Never auto-approve critical or high urgency actions
- Show the source report link so the user can review the research context
- After any state change, regenerate the dashboard
