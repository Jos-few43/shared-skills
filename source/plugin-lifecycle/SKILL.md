---
name: plugin-lifecycle
description: Install, upgrade, disable, or remove plugins for Claude Code or OpenCode.
argument-hint: "[install|remove|list] [plugin-name]"
allowed-tools: Bash(*), Read, Glob, Grep
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

## Container Plugin Setup (OpenCode in distrobox)

For OpenCode running inside distrobox containers, plugins must be isolated to a container-specific directory — not `~/.config/opencode/` (which is shared with the host).

### Recommended Directory Structure

```
/opt/opencode/
├── bin/              # OpenCode binary
├── plugins/          # Plugin configuration directory
│   ├── opencode.json
│   ├── auth.json
│   ├── node_modules/
│   ├── <plugin-name>/
│   └── package.json
└── README-CONTAINER-SETUP.md
```

### Required Environment Variables

```bash
export OPENCODE_CONFIG_DIR=/opt/opencode/plugins
export OPENCODE_DATA_DIR=/opt/opencode/plugins
```

Set these in `/etc/profile.d/opencode.sh` (system-wide) and `~/.bashrc` (user-specific) inside the container.

### Plugin Configuration File

`/opt/opencode/plugins/opencode.json`:
```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["plugin-name@latest"],
  "provider": {
    "provider-name": {
      "models": {
        "model-id": {
          "name": "Display Name",
          "limit": { "context": 200000, "output": 64000 }
        }
      }
    }
  }
}
```

### Container Plugin Troubleshooting

**Plugin not loading:**
1. Check env vars: `distrobox enter <container> -- env | grep OPENCODE`
2. Check plugin dir permissions: `distrobox enter <container> -- ls -la /opt/opencode/plugins/`
3. Install plugin deps: `distrobox enter <container> -- bash -c "cd /opt/opencode/plugins/<plugin> && npm install"`

**Config not persisting:**
1. Verify `/etc/profile.d/opencode.sh` exists and is readable
2. Source manually: `source /etc/profile.d/opencode.sh`
3. Restart container: `distrobox stop <container>; distrobox enter <container>`

**Broken symlinks:**
```bash
distrobox enter <container> -- rm /opt/opencode/plugins/<plugin-link>
distrobox enter <container> -- sudo cp -r /path/to/plugin /opt/opencode/plugins/
distrobox enter <container> -- sudo chown -R $USER:$USER /opt/opencode/plugins/
```
