---
name: feature-toggle
description: Use when enabling or disabling a named feature flag or configuration-controlled feature. Use when you need a recorded, reversible config change with rollback instructions — not for permanent config edits or LiteLLM model changes.
allowed-tools: Bash(*), Read, Glob, Grep
---

# Feature Toggle

## Overview

Applies configuration changes to enable/disable features. Records current state for rollback and validates the change took effect.

## Modes

### Enable: `/feature-toggle enable {feature} [--config {path}]`

1. Identify the config file and the specific setting to change
2. Record current state:

```bash
# Store rollback info
ROLLBACK_FILE="/tmp/feature-toggle-rollback-$(date +%s).json"
echo '{"feature": "{feature}", "config": "{path}", "original_value": "...", "timestamp": "..."}' > "$ROLLBACK_FILE"
```

3. Confirm the change with the user, showing:
   - Current value
   - New value
   - Config file path

4. Apply the change (edit the config file)

5. Validate:
   - Re-read the config file to confirm the value changed
   - If a service needs restart, restart it and health check

6. If part of an action queue item, store rollback instructions in action notes:

```bash
bash ~/SCRiPTz/action-queue.sh add-note ACT-xxxx "Rollback: set {setting} back to {original_value} in {path}"
```

### Disable: `/feature-toggle disable {feature} [--config {path}]`

Same as enable but reverses the value.

### Rollback: `/feature-toggle rollback {feature}`

1. Find the rollback file or action queue notes
2. Show what will be reverted
3. Confirm with user
4. Apply the original value
5. Validate the rollback

### Status: `/feature-toggle status`

List recently toggled features from `/tmp/feature-toggle-rollback-*.json`.

## Common Toggles

<!-- Multi-tool path reference: config locations per tool -->
| Feature | Tool | Config | Setting |
|---|---|---|---|
| Auto-updates | Claude Code | `~/.claude/settings.json` | `DISABLE_AUTOUPDATER` |
| Experimental features | OpenCode | `~/opt-ai-agents/opencode/opencode.json` | `experimental.*` |
| LiteLLM drop_params | LiteLLM | `~/litellm-stack/*/config.yaml` | `litellm_settings.drop_params` |
| Gateway hot-reload | OpenClaw | `~/.openclaw/openclaw.json` | `gateway.reload.mode` |

## Safety

- Always record current state before changes
- Always confirm with user before applying
- Keep rollback files for at least 24 hours
- For service-affecting changes, verify the service is healthy after toggle
