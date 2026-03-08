---
name: sync-skills-command
description: Use when propagating skill changes from shared-skills/source/ to all AI tools (Claude Code, OpenCode, OpenClaw, Gemini, Qwen). Use after editing or adding a skill to make it available everywhere.
disable-model-invocation: true
allowed-tools: Bash(*)
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
