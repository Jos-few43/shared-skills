---
name: sync-skills-command
description: Use when user wants to synchronize shared skills across all AI tools (Claude Code, OpenCode, OpenClaw). Propagates skill changes from the shared source to each tool's skill directory.
requires:
  - shell_exec
---

# Sync Skills Command

Re-run the shared skills synchronization to propagate skill changes to all AI tools.

## Command

```bash
bash ~/shared-skills/scripts/symlink-all.sh
```

## Skill Directories

<!-- Multi-tool path reference: where skills land per tool -->
| Tool | Skill Directory | Method |
|---|---|---|
| Source (shared) | `~/shared-skills/source/` | Canonical source |
| Claude Code | `~/.claude/plugins/skills/` | Symlink |
| OpenCode | `~/opt-ai-agents/opencode/skills/` | Symlink |
| OpenClaw | Container `/opt/openclaw/skills/` or staging `~/opt-openclaw-skills/` | Copy |

## After Running

Report which skills were synced and to which tools. List any errors.
