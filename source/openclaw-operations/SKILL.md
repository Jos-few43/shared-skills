---
name: openclaw-operations
description: >-
  Use when running OpenClaw CLI commands, checking health/status, managing
  plugins, sessions, agents, channels, gateway, or cron. Use when asked
  about expected healthy state, autonomy rules, usage tracking, or
  auto-rotator status. See openclaw-architecture for file paths and
  openclaw-troubleshooting for failure fixes.
allowed-tools: Bash(*), Read, Glob, Grep
---

# OpenClaw Operations

## Commands Reference
### Health & Monitoring
```bash
openclaw status                        # Quick overview: gateway, agents, channels
openclaw status --deep                 # + channel probes (Telegram ping), health table
openclaw status --usage                # Model provider quota snapshots
openclaw status --all                  # Full diagnosis (pasteable)
openclaw status --json                 # Machine-readable
openclaw health                        # Raw gateway reachability check
openclaw doctor                        # State integrity, plugins, credentials, channels
openclaw doctor --non-interactive      # Safe migrations only, no prompts
openclaw logs                          # Gateway log stream (no -f in Claude Code — use | head -N)
```
### Plugins
```bash
openclaw plugins list                  # All 36 plugins: loaded/disabled/error
openclaw plugins enable <id>           # Enable → writes to shadow config (restart required)
openclaw plugins disable <id>          # Disable plugin
openclaw plugins doctor                # Plugin-specific diagnostics
openclaw plugins info <id>             # Plugin details
openclaw plugins install <spec>        # Install from npm or path
openclaw plugins update                # Update npm-installed plugins
openclaw plugins uninstall <id>        # Remove plugin
```
### Gateway
```bash
openclaw gateway                       # Start gateway (foreground)
openclaw gateway --force               # Kill existing + restart
openclaw gateway --port <n>            # Custom port
```
### Config (writes to shadow config at .openclaw/openclaw.json)
```bash
openclaw config get <dot.path>         # Read a value
openclaw config set <dot.path> <val>   # Write a value
openclaw config unset <dot.path>       # Remove a value
```
### Agents
```bash
openclaw agents list                   # List agents (main, discord-bot)
openclaw agents list --json            # Machine-readable
openclaw agents list --bindings        # Include routing bindings
openclaw agents add                    # Add isolated agent
openclaw agents delete <id>            # Delete agent + prune workspace
openclaw agents set-identity <id>      # Update agent name/theme/emoji/avatar
openclaw agent --message "..." --deliver  # Run agent turn via gateway
```
### Sessions
```bash
openclaw sessions                      # List sessions from active store
openclaw sessions --active 120         # Only last 2 hours
openclaw sessions --json               # Machine-readable
openclaw sessions --store <path>       # Use specific sessions.json
openclaw sessions --verbose            # Verbose output
```
### Channels, Cron, Security, Memory, Skills
```bash
openclaw channels                      # Channel management
openclaw channels list                 # Auth providers + usage quotas
openclaw cron                          # Cron scheduler management
openclaw security audit                # Security audit (add --deep for full probes)
openclaw memory search <query>         # Search memory index
openclaw memory index                  # Reindex memory files
openclaw memory status                 # Vector DB + FTS status
openclaw skills                        # Skills management
```
### Messaging
```bash
openclaw message send --channel telegram --target @chat --message "..."
openclaw message broadcast             # Multi-target broadcast
openclaw message delete / edit / pin   # Message management
openclaw message react / reactions     # Emoji reactions
openclaw message member / ban / kick   # Member management
```
### Other
```bash
openclaw update / reset                # Check/apply updates; reset config/state
openclaw dashboard / tui               # Control UI (browser) / Terminal UI
openclaw devices / pairing / sandbox   # Device pairing, sandbox tools
openclaw system / webhooks / hooks     # System events, webhooks, hooks
openclaw acp / nodes / node            # Agent Control Protocol, node commands
openclaw dns / docs / approvals / directory  # Misc helpers
```
---

## Common Operations

### Quick Health Check
```bash
openclaw status --deep && openclaw plugins list && openclaw doctor
```

### Expected Healthy State

| Check | Expected |
|---|---|
| Plugins | 8/36 loaded: `google-antigravity-auth`, `google-gemini-cli-auth`, `qwen-portal-auth`, `telegram`, `device-pair`, `memory-core`, `phone-control`, `talk-voice` |
| Telegram | `ON / OK` |
| Gateway | reachable < 100ms |
| Credentials | `.openclaw/credentials -> ../credentials` |
| Doctor | 0 CRITICAL |

### Auto-Rotator Health Check
```bash
python3 -c "
import json, datetime; now = datetime.datetime.now().timestamp() * 1000
d = json.load(open('/opt/openclaw/config/agents/main/agent/auth-profiles.json'))
for k, v in d.get('profiles', {}).items():
    diff = (v.get('expires', 0) - now) / 1000
    print(k, 'VALID' if diff > 0 else f'EXPIRED {abs(diff)/3600:.1f}h ago')
for k, v in d.get('usageStats', {}).items():
    diff = (v.get('cooldownUntil', 0) - now) / 1000
    print(k, 'COOLING' if diff > 0 else 'ready', f'errors={v.get(\"errorCount\", 0)}')
"
```

### Usage Tracker
```bash
node /opt/openclaw/config/workspace/tools/track-usage.cjs
python3 /opt/openclaw/config/workspace/scripts/token_alert_daemon.py
```

---

## Autonomy Rules

| Level | Commands |
|---|---|
| **Do freely** | `status`, `health`, `plugins list`, `sessions`, `channels` (read), `agents list`, `memory status/search`, `doctor` (no --fix), read config files, usage scripts |
| **Confirm first** | `plugins enable/disable`, `config set`, `gateway --force` (drops session), `doctor --fix`, session merge, credentials symlink, `reset` |
| **Never** | Delete main config, delete `~/.openclaw/`, `uninstall`, remove `*.bak-*` files |
