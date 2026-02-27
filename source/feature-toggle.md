---
name: feature-toggle
description: Enable or disable features via config changes with recorded rollback instructions.
requires:
  - shell_exec
  - file_read
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

| Feature | Config | Setting |
|---------|--------|---------|
| Claude Code auto-updates | `~/.claude/settings.json` | `DISABLE_AUTOUPDATER` |
| OpenCode experimental features | `~/opt-ai-agents/opencode/opencode.json` | `experimental.*` |
| LiteLLM drop_params | `~/litellm-stack/*/config.yaml` | `litellm_settings.drop_params` |

## Safety

- Always record current state before changes
- Always confirm with user before applying
- Keep rollback files for at least 24 hours
- For service-affecting changes, verify the service is healthy after toggle
