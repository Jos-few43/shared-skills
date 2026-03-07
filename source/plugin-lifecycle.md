---
name: plugin-lifecycle
description: Install, upgrade, disable, or remove plugins for Claude Code or OpenCode.
requires:
  - shell_exec
  - file_read
---

# Plugin Lifecycle

## Tool Config Paths

<!-- Multi-tool path reference: use the path matching your current tool -->
| Purpose | Claude Code | OpenCode |
|---|---|---|
| Plugin settings | `~/.claude/settings.json` → `enabledPlugins` | `~/opt-ai-agents/opencode/opencode.json` → `plugins` |
| Plugin directory | `~/.claude/plugins/` | `~/opt-ai-agents/opencode/plugins/` |

## Overview

Manages plugin installation, upgrades, and removal for Claude Code and OpenCode. Updates tech radar after changes.

## Modes

### Install: `/plugin-lifecycle install {plugin} [--tool claude|opencode]`

**Claude Code:**

1. Load current settings using {{tool:file_read}}:

```bash
cat ~/.claude/settings.json | jq '.enabledPlugins'
```

2. Add plugin to the `enabledPlugins` array:

```bash
jq '.enabledPlugins += ["{plugin}"]' ~/.claude/settings.json > /tmp/settings.json && mv /tmp/settings.json ~/.claude/settings.json
```

3. Verify plugin appears in settings
4. Update tech radar:

```bash
bash ~/SCRiPTz/tech-radar-update.sh --component "{plugin}" --field status --value adopt
```

**OpenCode:**

1. Load current config using {{tool:file_read}}:

```bash
cat ~/opt-ai-agents/opencode/opencode.json | jq '.plugins'
```

2. Add plugin to the `plugins` array
3. Verify by re-reading config
4. Update tech radar

### Upgrade: `/plugin-lifecycle upgrade {plugin}`

**Claude Code:** Plugins auto-update. Verify current version in plugin metadata.

**OpenCode:** Update version in `opencode.json`:

```bash
distrobox enter ai-agents -- bash -c "source /etc/profile.d/ai-agents.sh && opencode plugin update {plugin}"
```

### Disable: `/plugin-lifecycle disable {plugin}`

**Claude Code:** Remove from `enabledPlugins` array:

```bash
jq 'del(.enabledPlugins[] | select(. == "{plugin}"))' ~/.claude/settings.json > /tmp/settings.json && mv /tmp/settings.json ~/.claude/settings.json
```

**OpenCode:** Remove from `plugins` array in `opencode.json`.

Update tech radar: `--field status --value hold`

### Remove: `/plugin-lifecycle remove {plugin}`

Same as disable, but also update tech radar to `deprecate`.

### List: `/plugin-lifecycle list [--tool claude|opencode]`

Show all installed plugins with their status from the tech radar.

## Safety

- Always confirm with user before modifying settings files
- Back up settings before changes: `cp settings.json settings.json.bak`
- After changes, verify the JSON is valid: `jq . settings.json > /dev/null`
