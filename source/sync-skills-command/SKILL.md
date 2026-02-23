---
name: sync-skills-command
description: Use when user wants to synchronize shared skills across all AI tools (Claude Code, OpenCode, OpenClaw).
---

# Sync Skills Command

Re-run the shared skills synchronization to propagate skill changes to all AI tools.

## Command

```bash
bash ~/shared-skills/scripts/symlink-all.sh
```

## What It Does

1. Symlinks all skills from `~/shared-skills/source/` to `~/.claude/skills/` (Claude Code)
2. Symlinks all skills to `~/opt-ai-agents/opencode/skills/` (OpenCode)
3. Live-copies skills into `openclaw-dev` container if running, or stages to `~/opt-openclaw-skills/` if stopped

## After Running

Report which skills were synced and to which tools. List any errors.
