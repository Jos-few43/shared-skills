---
name: openclaw-token-refresh
description: >-
  Use when user asks to refresh, sync, or update the OpenClaw Anthropic OAuth
  token. Use when OpenClaw returns "oauth expired", 401/403 errors, or empty
  responses after token rotation. Use when tokens are mismatched between Claude
  Code and OpenClaw.
allowed-tools: Bash(*), Read, Glob, Grep, Write, Edit
---

# OpenClaw Anthropic Token Refresh

## Tool Config Paths

<!-- Multi-tool path reference: credential sources vary by tool -->
| Purpose | Claude Code | OpenCode | OpenClaw |
|---|---|---|---|
| OAuth credentials | `~/.claude/.credentials.json` | `~/.config/opencode/antigravity-accounts.json` | `~/.openclaw/openclaw.json` |
| Agent model config | N/A | N/A | `~/.openclaw/agents/main/agent/models.json` |

## Overview

OpenClaw uses an Anthropic OAuth token copied from Claude Code's credentials. Claude Code manages token refresh automatically, but the token must be synced into OpenClaw's config and the gateway must pick up the change.

## Architecture

```
Claude Code (.claude/.credentials.json)  -- source of truth, auto-refreshed
        │
        ▼  sync script (or manual)
OpenClaw (~/.openclaw/openclaw.json)     -- models.providers.anthropic.apiKey
OpenClaw (~/.openclaw/agents/main/agent/models.json) -- providers.anthropic.apiKey
        │
        ▼  config file change detected (chokidar)
Gateway process                           -- restarts on unrecognized config path change
```

## Manual Refresh

```bash
# 1. Sync token
bash ~/.openclaw/sync-anthropic-token.sh

# 2. Verify match (both files)
python3 -c "
import json
with open('$HOME/.openclaw/openclaw.json') as f:
    t1 = json.load(f)['models']['providers']['anthropic']['apiKey']
with open('$HOME/.openclaw/agents/main/agent/models.json') as f:
    t2 = json.load(f)['providers']['anthropic']['apiKey']
with open('$HOME/.claude/.credentials.json') as f:
    t3 = json.load(f)['claudeAiOauth']['accessToken']
print(f'openclaw.json match: {t1 == t3} | models.json match: {t2 == t3} | Token: ...{t3[-20:]}')
"

# 3. Restart gateway (required — token cached in memory)
# Kill ALL gateway processes (there may be multiple)
ps aux | grep 'openclaw-gateway' | grep -v grep | awk '{print $2}' | xargs -r kill 2>/dev/null
# Gateway auto-restarts via supervisor; wait 3s then verify:
sleep 3 && ps aux | grep 'openclaw-gateway' | grep -v grep | awk '{print $2, $9}'
```

## Automated Refresh

A systemd user timer runs the sync every 5 minutes:

| Component | Path |
|---|---|
| Sync script | `~/.openclaw/sync-anthropic-token.sh` |
| Timer unit | `~/.config/systemd/user/openclaw-token-sync.timer` |
| Service unit | `~/.config/systemd/user/openclaw-token-sync.service` |

```bash
# Check timer status
systemctl --user status openclaw-token-sync.timer

# Force immediate sync
systemctl --user start openclaw-token-sync.service

# Enable/disable
systemctl --user enable --now openclaw-token-sync.timer
systemctl --user disable --now openclaw-token-sync.timer
```

The sync script only writes when tokens differ. OpenClaw's `chokidar` file watcher detects config changes and triggers gateway restart automatically when `gateway.reload.mode` is not `"off"`.

## Key Files

| File | Role |
|---|---|
| `~/.claude/.credentials.json` | Source — Claude Code OAuth token (auto-refreshed) |
| `~/.openclaw/openclaw.json` | Target — `models.providers.anthropic.apiKey` |
| `~/.openclaw/agents/main/agent/models.json` | Target — `providers.anthropic.apiKey` (gateway agent reads from here) |
| `~/.openclaw/sync-anthropic-token.sh` | Sync script (one-shot or `--watch` mode) |

## Gotchas

| Issue | Detail |
|---|---|
| Gateway caches token in memory | Config file update alone is NOT enough if hot-reload is off. Must restart gateway. |
| `pkill -f openclaw-gateway` kills shell | The grep pattern matches the bash process running the command. Use `ps aux \| grep` + `xargs kill`. |
| Multiple gateway processes | There may be several `openclaw-gateway` PIDs. Kill ALL of them or the old one keeps serving stale tokens. |
| Gateway auto-restarts | A supervisor keeps the gateway alive. After `kill`, wait 2-3s — a new process appears automatically. |
| Token prefix matters | Must start with `sk-ant-oat` for OpenClaw to use Bearer auth with Claude Code identity headers. |
| Hot-reload scope | Changes to `models.providers.*` are NOT in the base reload rules, so they trigger `restartGateway = true` (full restart, not just reload). This is correct behavior. |
| Two target files | The gateway agent reads the Anthropic key from `models.json`, not `openclaw.json`. The sync script must update both files or the gateway will use a stale token. |
