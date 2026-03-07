---
name: research-config
description: View and modify research pipeline configuration — max topics, schedule, model, quality gates, notifications.
requires:
  - shell_exec
---

# Research Pipeline Configuration

Config file: `~/SCRiPTz/research-config.json`

## View: `/research-config`

{{tool:file_read}} and display the current configuration:

```bash
cat ~/SCRiPTz/research-config.json | jq '.'
```

Present as a readable table:

| Setting | Value |
|---------|-------|
| Max topics per run | {n} |
| Schedule | {cron expression} |
| Model | {model name} |
| Desktop notifications | {on/off} |
| Telegram notifications | {on/off} |
| Vault path | {path} |

Plus quality gates:

| Priority | Min Lines | Min Sources |
|----------|-----------|-------------|
| P1 | {n} | {n} |
| P2 | {n} | {n} |
| P3 | {n} | {n} |

## Modify: `/research-config set {key} {value}`

Update a specific setting. Valid keys:
- `max_topics` -> updates `.max_topics_per_run`
- `model` -> updates `.model` (valid: "sonnet", "haiku", "opus")
- `notifications.desktop` -> updates `.notifications.desktop` (true/false)
- `notifications.telegram` -> updates `.notifications.telegram` (true/false)

Use jq to update:

```bash
# Example: set max topics to 5
jq '.max_topics_per_run = 5' ~/SCRiPTz/research-config.json > /tmp/rc.json && mv /tmp/rc.json ~/SCRiPTz/research-config.json

# Example: disable telegram notifications
jq '.notifications.telegram = false' ~/SCRiPTz/research-config.json > /tmp/rc.json && mv /tmp/rc.json ~/SCRiPTz/research-config.json
```

Confirm the change and show the updated value.

## Reset: `/research-config reset`

Show the user the current config and ask if they want to reset to defaults. The defaults are:
- max_topics_per_run: 3
- schedule: "0 3 * * *"
- model: "sonnet"
- scanner_timeout: 30
- notifications: both enabled
