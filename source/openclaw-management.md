---
name: openclaw-management
description: Use when managing, monitoring, controlling, or troubleshooting OpenClaw. Use when user mentions OpenClaw, auto-rotator, usage tracker, Telegram bot, plugins, gateway, session history, rate limits, auth rotation, or any symptom such as plugins disabled, no token, state split, credentials missing, or usage tracker showing wrong data.
---

# OpenClaw Management

## Environment

- **Container**: `openclaw-dev` (distrobox)
- **Config dir** (`OPENCLAW_CONFIG_DIR`): `/opt/openclaw/config/`
- **Active state dir** (`OPENCLAW_HOME/.openclaw`): `/opt/openclaw/config/.openclaw/`
- **Shadow config** (ACTIVE — all CLI writes go here): `/opt/openclaw/config/.openclaw/openclaw.json`
- **Main config** (reference, full providers/channels): `/opt/openclaw/config/openclaw.json`
- **Legacy state dir** (historical sessions, do not delete): `~/.openclaw/`
- **Auth profiles**: `/opt/openclaw/config/agents/main/agent/auth-profiles.json`
- **Cron jobs**: `/opt/openclaw/config/cron/jobs.json`
- **Usage stats**: `/opt/openclaw/config/usage-stats.json`
- **Active session store**: `/opt/openclaw/config/.openclaw/agents/main/sessions/sessions.json` (metadata: model, provider)
- **Session conversation logs**: `/opt/openclaw/config/.openclaw/agents/main/sessions/<uuid>.jsonl` (history — does NOT control model selection)
- **Config audit log**: `/opt/openclaw/config/.openclaw/logs/config-audit.jsonl`
- **Telegram bot token**: `8187629510:AAH6WtuEkC485yFEIIuwn-6RA9ANZ3L4yCY`
- **Gateway port**: `18789`

---

## Complete File Reference

```
CONFIG DIR: /opt/openclaw/config/
├── openclaw.json                          # Main config (providers, plugins, channels) — reference only
├── openclaw.json.bak-rotation-*           # Timestamped rotation backups
├── openclaw.json.backup-before-symlink    # Pre-symlink safety backup
│
├── agents/
│   ├── main/agent/auth-profiles.json      # OAuth tokens + usageStats + lastGood per provider
│   ├── main/agent/models.json             # Per-agent model overrides
│   └── discord-bot/agent/auth-profiles.json
│
├── credentials/                           # Symlinked from .openclaw/credentials
│   ├── telegram-allowFrom.json            # Telegram allowlist
│   └── telegram-pairing.json             # Telegram pairing codes
│
├── cron/
│   ├── jobs.json                          # Scheduled job definitions
│   └── runs/<job-id>.jsonl               # Per-job run history
│
├── devices/paired.json                    # Paired device tokens
├── devices/pending.json                   # Pending pairing requests
├── exec-approvals.json                    # Approved exec commands
├── identity/device.json                   # Gateway device identity
├── identity/device-auth.json             # Device auth token
├── memory/main.sqlite                     # Memory vector DB (top-level, legacy)
├── subagents/runs.json                    # Subagent run history
├── telegram/update-offset-default.json   # Telegram poll offset
├── update-check.json                      # Last update check timestamp
├── usage-stats.json                       # Per-call token usage log (read by token_alert_daemon.py)
│
├── workspace/                             # Agent workspace (main)
│   ├── AGENTS.md / IDENTITY.md / SOUL.md / TOOLS.md / USER.md / HEARTBEAT.md / MEMORY.md
│   ├── memory/<date>.md                   # Daily memory files
│   ├── memory/token_alert_state.json      # Token alert threshold state
│   ├── scripts/token_alert_daemon.py      # Cron: daily token budget alerts (reads usage-stats.json)
│   ├── scripts/token_monitor.py           # Token monitoring util
│   ├── scripts/github_sync.py             # Cron: GitHub repo sync
│   ├── scripts/arxiv_search.py            # arXiv search utility
│   ├── scripts/library_add.py             # Library management
│   ├── scripts/yt_transcript.sh           # YouTube transcript fetcher
│   ├── tools/rotate-model.sh             # Rotate primary model alias
│   ├── tools/track-usage.cjs             # Usage summary from session history
│   ├── tools/visualize-usage.cjs         # Canvas chart of token usage
│   ├── tools/usage-tracker.js            # Usage tracker (gateway API version)
│   ├── tools/cli-triggers.js             # CLI trigger automation
│   └── tools/trigger.sh                  # Shell trigger wrapper
│
└── workspace-discord-bot/                 # Discord bot agent workspace
    └── AGENTS.md / IDENTITY.md / SOUL.md / TOOLS.md / USER.md / HEARTBEAT.md / BOOTSTRAP.md

STATE SUBDIR: /opt/openclaw/config/.openclaw/   ← ACTIVE (all CLI writes go here)
├── openclaw.json                          # ACTIVE shadow config (plugins, channels, model defaults)
├── openclaw.json.bak                      # Rolling backup of shadow config
├── logs/config-audit.jsonl               # Every config write: PID, command, before/after hash
├── memory/main.sqlite                     # Active memory vector DB
├── identity/device.json / device-auth.json
├── credentials → symlink → ../credentials # OAuth dir (symlinked)
├── agents/main/sessions/sessions.json    # ACTIVE session store
└── workspace/                             # State-dir workspace (AGENTS.md, IDENTITY.md, etc.)

LEGACY STATE: ~/.openclaw/                 # Pre-split state — historical reference only
├── agents/main/agent/auth-profiles.json  # Old auth profiles (may be stale)
├── agents/main/sessions/sessions.json    # Historical sessions (merged into active store)
└── workspace/                             # Legacy workspace files
```

---

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

### Channels & Auth
```bash
openclaw channels                      # Channel management
openclaw channels list                 # Auth providers + usage quotas
```

### Cron
```bash
openclaw cron                          # Cron scheduler management
```

### Security
```bash
openclaw security audit                # Security audit
openclaw security audit --deep         # Full audit with probes
```

### Messaging
```bash
openclaw message send --channel telegram --target @chat --message "..."
openclaw message broadcast             # Multi-target broadcast
openclaw message delete / edit / pin   # Message management
openclaw message react / reactions     # Emoji reactions
openclaw message member / ban / kick   # Member management
```

### Memory
```bash
openclaw memory search <query>         # Search memory index
openclaw memory index                  # Reindex memory files
openclaw memory status                 # Vector DB + FTS status
```

### Skills
```bash
openclaw skills                        # Skills management
```

### Other
```bash
openclaw update                        # Check/apply CLI updates
openclaw reset                         # Reset config/state (keeps CLI)
openclaw dashboard                     # Open Control UI in browser
openclaw tui                           # Terminal UI
openclaw devices                       # Device pairing + token management
openclaw pairing                       # Pairing helpers
openclaw sandbox                       # Sandbox tools
openclaw system                        # System events, heartbeat, presence
openclaw webhooks                      # Webhook helpers
openclaw hooks                         # Hooks tooling
openclaw acp                           # Agent Control Protocol tools
openclaw nodes / node                  # Node commands
openclaw dns                           # DNS helpers
openclaw docs                          # Docs helpers
openclaw approvals                     # Exec approvals
openclaw directory                     # Directory commands
```

---

## Common Operations

### Quick Health Check (run first for any issue)
```bash
openclaw status --deep          # Gateway + channels + health table
openclaw plugins list           # Verify 8/36 loaded (see expected state below)
openclaw doctor                 # State integrity + credentials + plugin count
```

### Expected Healthy State
- **Plugins loaded**: 8/36
- **Required plugins**: `google-antigravity-auth`, `google-gemini-cli-auth`, `qwen-portal-auth`, `telegram`, `device-pair`, `memory-core`, `phone-control`, `talk-voice`
- **Telegram channel**: `ON / OK` (not `SETUP` or `no token`)
- **Gateway**: reachable < 100ms
- **Credentials symlink**: `/opt/openclaw/config/.openclaw/credentials → ../credentials`
- **doctor**: 0 CRITICAL items

### Auto-Rotator Health Check
```bash
python3 -c "
import json, datetime
with open('/opt/openclaw/config/agents/main/agent/auth-profiles.json') as f:
    d = json.load(f)
now = datetime.datetime.now().timestamp() * 1000
print('--- Token Expiry ---')
for k, v in d.get('profiles', {}).items():
    exp = v.get('expires', 0)
    diff = (exp - now) / 1000
    print(k, 'VALID' if diff > 0 else f'EXPIRED {abs(diff)/3600:.1f}h ago')
print('--- Cooldowns ---')
for k, v in d.get('usageStats', {}).items():
    cu = v.get('cooldownUntil', 0)
    diff = (cu - now) / 1000
    errs = v.get('errorCount', 0)
    print(k, 'COOLING' if diff > 0 else 'ready', f'errors={errs}')
"
```

### Usage Tracker
```bash
node /opt/openclaw/config/workspace/tools/track-usage.cjs             # Session token summary
python3 /opt/openclaw/config/workspace/scripts/token_alert_daemon.py  # Manual alert check
```

### Session Count Check
```bash
openclaw sessions --json | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['count'],'sessions')"
```

### Rotate to Direct API Key (OAuth exhausted / expired)
When all OAuth tokens are expired or exhausted, bypass OAuth by injecting an API key directly into the shadow config. Works for any provider that supports `openai-completions` API format.

**Step 1: Check token state**
```bash
python3 -c "
import json, datetime
with open('/opt/openclaw/config/agents/main/agent/auth-profiles.json') as f:
    d = json.load(f)
now = datetime.datetime.now().timestamp() * 1000
for k, v in d.get('profiles', {}).items():
    exp = v.get('expires', 0)
    diff = (exp - now) / 1000
    errs = d.get('usageStats', {}).get(k, {}).get('errorCount', 0)
    print(k, 'VALID' if diff > 0 else f'EXPIRED {abs(diff)/3600:.1f}h ago', f'errors={errs}')
"
```

**Step 2: Inject API key into shadow config**

⚠️ `openclaw config set` cannot set nested provider objects piecemeal — write directly:
```bash
python3 << 'EOF'
import json, os, shutil, time

SHADOW = '/opt/openclaw/config/.openclaw/openclaw.json'
shutil.copy2(SHADOW, SHADOW + '.bak-apikey-' + str(int(time.time())))

d = json.load(open(SHADOW))
d.setdefault('models', {}).setdefault('providers', {})['google-gemini-cli'] = {
    "baseUrl": "https://generativelanguage.googleapis.com/v1beta/openai",
    "apiKey": "{{ .gemini_api_key }}",   // chezmoi: ~/.config/chezmoi/chezmoi.toml → [data].gemini_api_key
    "api": "openai-completions",
    "models": [
        {"id": "gemini-2.5-flash", "name": "Gemini 2.5 Flash", "contextWindow": 1048576},
        {"id": "gemini-2.5-pro", "name": "Gemini 2.5 Pro", "contextWindow": 1048576},
        {"id": "gemini-3-flash", "name": "Gemini 3 Flash", "contextWindow": 1048576},
        {"id": "gemini-3-pro-preview", "name": "Gemini 3 Pro Preview", "contextWindow": 1048576}
    ]
}
d['agents']['defaults']['model']['primary'] = 'google-gemini-cli/gemini-2.5-flash'

tmp = SHADOW + '.tmp'
json.dump(d, open(tmp, 'w'), indent=2)
os.replace(tmp, SHADOW)
print("Done. Default:", d['agents']['defaults']['model']['primary'])
EOF
```

**Step 3: Restart gateway**
```bash
kill $(ps aux | grep openclaw-gateway | grep -v grep | awk '{print $2}')
sleep 3 && openclaw gateway &
sleep 8 && openclaw config get agents.defaults.model.primary
```

**Note:** `openclaw config set` validation requires the full provider object (baseUrl + api + models array) — partial key writes fail. Direct JSON edit is the correct approach for provider-level changes. Always backup the shadow config first (script above does this automatically).

---

## Known Failure Patterns & Fixes

### FAILURE: Plugins disabled (auto-rotator / Telegram / Qwen broken)
**Symptom:** `openclaw plugins list` shows `google-gemini-cli-auth`, `qwen-portal-auth`, `telegram` as `disabled` despite `openclaw.json` having `enabled: true`

**Cause:** `openclaw doctor --fix` created `/opt/openclaw/config/.openclaw/openclaw.json` (shadow config) with a minimal plugin set. All CLI writes target this shadow config, overriding the main config.

**Verify:** `cat /opt/openclaw/config/.openclaw/openclaw.json | python3 -m json.tool | grep -A5 plugins`

**Fix:**
```bash
openclaw plugins enable google-gemini-cli-auth
openclaw plugins enable qwen-portal-auth
openclaw plugins enable telegram
openclaw config set channels.telegram.botToken "8187629510:AAH6WtuEkC485yFEIIuwn-6RA9ANZ3L4yCY"
openclaw config set channels.telegram.enabled true
openclaw config set channels.telegram.dmPolicy pairing
openclaw config set channels.telegram.groupPolicy allowlist
openclaw config set channels.telegram.streamMode block
openclaw config set gateway.mode local   # ← REQUIRED or --force restart will fail
kill $(ps aux | grep openclaw-gateway | grep -v grep | awk '{print $2}') 2>/dev/null
sleep 3 && openclaw gateway &
# Wait 8s then verify:
openclaw plugins list | grep -E "loaded|telegram|gemini-cli|qwen-portal"
```

**Why `gateway.mode` is required:** Main config has `gateway.mode=local` but `doctor --fix` creates a minimal shadow config that omits it. Without it, `openclaw gateway --force` exits with `Gateway start blocked: set gateway.mode=local`. The value is permanent in the main config — it just needs to be written to the shadow config once after each `doctor --fix`.

**Full shadow config restore script (run after any `doctor --fix`):**
```bash
openclaw plugins enable google-antigravity-auth
openclaw plugins enable google-gemini-cli-auth
openclaw plugins enable qwen-portal-auth
openclaw plugins enable telegram
openclaw plugins enable device-pair
openclaw plugins enable memory-core
openclaw plugins enable phone-control
openclaw plugins enable talk-voice
openclaw config set channels.telegram.botToken "8187629510:AAH6WtuEkC485yFEIIuwn-6RA9ANZ3L4yCY"
openclaw config set channels.telegram.enabled true
openclaw config set channels.telegram.dmPolicy pairing
openclaw config set channels.telegram.groupPolicy allowlist
openclaw config set channels.telegram.streamMode block
openclaw config set gateway.mode local
# Verify credentials symlink exists
[ -L /opt/openclaw/config/.openclaw/credentials ] || \
  ln -s /opt/openclaw/config/credentials /opt/openclaw/config/.openclaw/credentials
kill $(ps aux | grep openclaw-gateway | grep -v grep | awk '{print $2}') 2>/dev/null
sleep 3 && openclaw gateway &
sleep 8 && openclaw plugins list | grep -E "loaded|disabled"
```

---

### FAILURE: CRITICAL OAuth dir missing
**Symptom:** `openclaw doctor` reports `CRITICAL: OAuth dir missing ($OPENCLAW_HOME/.openclaw/credentials)`

**Cause:** State subdir `.openclaw/` exists but `credentials/` is only at the top-level config dir.

**Fix:**
```bash
ln -s /opt/openclaw/config/credentials /opt/openclaw/config/.openclaw/credentials
```

---

### FAILURE: Usage tracker shows 1 session / wrong history
**Symptom:** `track-usage.cjs` shows 1 session; `openclaw sessions` returns 1 entry

**Cause:** State dir split — gateway state migrated from `~/.openclaw/` to `/opt/openclaw/config/.openclaw/` but session store was not merged.

**Verify:** Compare session counts:
```bash
python3 -c "
import json
old = json.load(open('${HOME}/.openclaw/agents/main/sessions/sessions.json'))
new = json.load(open('/opt/openclaw/config/.openclaw/agents/main/sessions/sessions.json'))
print(f'Old: {len(old)} sessions, New: {len(new)} sessions')
"
```

**Fix (merge old → new, new wins on conflict):**
```bash
python3 -c "
import json, shutil, time, os
OLD = '${HOME}/.openclaw/agents/main/sessions/sessions.json'
NEW = '/opt/openclaw/config/.openclaw/agents/main/sessions/sessions.json'
shutil.copy2(NEW, NEW + '.bak-premerge-' + str(int(time.time())))
old = json.load(open(OLD))
new = json.load(open(NEW))
merged = {**old, **new}
tmp = NEW + '.tmp'
json.dump(merged, open(tmp, 'w'), indent=2)
os.replace(tmp, NEW)
print(f'Merged {len(old)} old + {len(new)} new = {len(merged)} total')
"
```

---

### FAILURE: Telegram channel SETUP / no token
**Symptom:** `openclaw status` shows `Telegram: ON / SETUP / no token`

**Cause:** Shadow config missing `channels.telegram` section after `doctor --fix`.

**Fix:** Apply the `channels.telegram.*` config set commands from the plugin fix above, then `openclaw gateway --force`.

---

### FAILURE: Telegram polling dead (bot sends but doesn't receive)
**Symptom:** Bot can send messages but never responds to inbound Telegram messages. `openclaw logs` shows last `messageChannel=telegram` run was minutes/hours ago. No new telegram runs after a "Connection error" log entry.

**Cause:** Telegram's getUpdates long-polling loop crashed (network error, timeout) and the gateway did not restart it.

**Verify:**
```bash
openclaw logs 2>&1 | grep -i "telegram\|Connection error" | tail -20
# Look for: last messageChannel=telegram run followed by "Connection error"
# and no new telegram runs after that
```

**Fix:**
```bash
# 1. Get gateway PID and kill it
ps aux | grep openclaw-gateway | grep -v grep
kill <PID>
sleep 4
# 2. Ensure gateway.mode is set (required for restart)
openclaw config set gateway.mode local
# 3. Restart gateway
openclaw gateway &
# 4. Verify Telegram polling resumed
openclaw health  # Should show: Telegram: ok (@ypenclawbot)
openclaw logs 2>&1 | grep "starting provider" | tail -3
```

**Note:** The Telegram update offset is stored in `/opt/openclaw/config/telegram/update-offset-default.json`. Pending messages (up to 24h old) will be replayed on next `getUpdates` poll after gateway restarts.

---

### FAILURE: `openclaw gateway --force` blocked (gateway.mode unset)
**Symptom:** `openclaw gateway --force` outputs `Gateway start blocked: set gateway.mode=local (current: unset) or pass --allow-unconfigured.`

**Cause:** `gateway.mode` was never written to the shadow config. The gateway can start initially without it, but `--force` restart requires it.

**Fix:**
```bash
openclaw config set gateway.mode local
kill $(ps aux | grep openclaw-gateway | grep -v grep | awk '{print $2}')
sleep 3
openclaw gateway &
```

---

### FAILURE: Session model locked to old provider (bot returns errors / empty responses)
**Symptom:** Bot receives Telegram messages and runs, but every response is empty `[]` or returns an error message ("400 status code", "connection error", "quota exceeded"). Logs show the old model provider (`google-antigravity/gemini-3-flash`) even after changing the config default.

**Cause — Two-layer session state:**
- `sessions.json` stores session METADATA including `modelProvider` + `model` per session
- `.jsonl` files store conversation HISTORY (do NOT control model selection)
- When a session is restored after gateway restart, it reads model from `sessions.json`, not the conversation history
- The main persistent agent session (`agent:main:main`) runs continuously and is NOT replaced by restarting the gateway — it resumes with its stored model
- Empty content `[]` in assistant messages = API call failed silently. OpenClaw does not crash; it returns empty responses. The bot then forwards the error text ("400 status code") as the chat reply.
- Changing `agents.defaults.model.primary` in the config affects NEW sessions only — NOT the already-running main session

**Diagnose:**
```bash
# Check what model the main session is using
python3 -c "
import json
s = json.load(open('/opt/openclaw/config/.openclaw/agents/main/sessions/sessions.json'))
for k, v in s.items():
    if isinstance(v, dict) and v.get('modelProvider'):
        print(k[:8], v.get('modelProvider'), v.get('model'))
" | head -20

# Confirm silent failures: empty content in recent session log
tail -c 5000 /opt/openclaw/config/.openclaw/agents/main/sessions/<uuid>.jsonl | \
  python3 -c "import sys,json; [print(json.loads(l).get('message',{}).get('content','')) for l in sys.stdin if l.strip()]" | tail -10
# If all outputs are [] → API calls are silently failing
```

**Fix — Patch ALL sessions in sessions.json:**
```bash
python3 << 'EOF'
import json, shutil, time

SESSIONS = '/opt/openclaw/config/.openclaw/agents/main/sessions/sessions.json'
shutil.copy2(SESSIONS, SESSIONS + '.bak-' + str(int(time.time())))

with open(SESSIONS) as f:
    data = json.load(f)

count = 0
for k, v in data.items():
    if isinstance(v, dict):
        # Patch ANY session using the old provider OR with null/empty model
        if v.get('modelProvider') in ('google-antigravity', None) or \
           v.get('model') in ('gemini-3-flash', None, ''):
            v['modelProvider'] = 'google-gemini-cli'
            v['model'] = 'gemini-2.5-flash'
            count += 1

with open(SESSIONS, 'w') as f:
    json.dump(data, f, indent=2)
print(f'Patched {count} sessions → google-gemini-cli/gemini-2.5-flash')
EOF

# Then restart gateway to load new session state
pkill -f 'openclaw.*gateway' 2>/dev/null; sleep 3
openclaw gateway &
sleep 6 && openclaw status
```

**Critical gotchas:**
- Patch must cover sessions with `modelProvider=null` / `model=''` too — these default to the previously active provider, not the config default
- After patching, the gateway MUST be restarted — the running session is cached in memory
- If the main `.jsonl` file is very large (>1MB), the session is long-running and may re-read old model from conversation context on next compaction. Verify with a test message after restart.

---

### FAILURE: Git `cannot lock ref` / `Permission denied` on push
**Symptom:** `git push` (or `git fetch`) fails with:
```
error: update_ref failed for ref 'refs/remotes/origin/main': cannot lock ref
Unable to create '.git/refs/remotes/origin/main.lock': Permission denied
```
Or: `unable to append to '.git/logs/refs/remotes/origin/main': Permission denied`

**Cause:** `.git/refs/` and `.git/logs/` directories are owned by `root` due to git running under a different UID mapping inside the distrobox container (e.g. after a `sudo git` or a mount remapping).

**Fix (single repo):**
```bash
sudo chown -R yish:yish <repo>/.git
```

**Fix (all repos at once):**
```bash
find ~/PROJECTz ~/NSTRUCTiONz ~/distrobox-configs ~/litellm-stack \
     ~/shared-skills ~/.local/share/chezmoi \
     -path "*/.git*" ! -user yish 2>/dev/null \
  | xargs -r sudo chown yish:yish
```

---

### FAILURE: State directory split (multiple state dirs warning)
**Symptom:** `openclaw doctor` reports `Multiple state directories detected: ${HOME}/.openclaw` and `Active: $OPENCLAW_HOME/.openclaw`

**Cause:** `OPENCLAW_HOME=OPENCLAW_CONFIG_DIR=/opt/openclaw/config` causes a state subdir at `/opt/openclaw/config/.openclaw/` alongside the legacy `~/.openclaw/`.

**Note:** This is now expected. Active state is `.openclaw/` subdir. `~/.openclaw/` is the legacy dir — **do not delete** (session history reference).

**Critical:** Even though `~/.openclaw/` is labelled "legacy", the gateway can and does write to it — particularly `~/.openclaw/agents/main/sessions/sessions.json`. Check the modification timestamp of both stores before assuming which one the gateway is using (see FAILURE below).

---

### FAILURE: Legacy store shadow-active (two-store model lock)
**Symptom:** Bot responds with errors or empty content. `openclaw status --deep` shows the main session using a model that seems correct (e.g. `google-gemini-cli/gemini-3-pro-preview`), but that model is NOT in the API key provider's `models[]` list, and all OAuth tokens are expired.

**Root cause — Two-store write race:**
- The gateway writes session state to whichever store is "active" at runtime
- After container rebuilds / OPENCLAW_HOME changes, the gateway may resume writing to `~/.openclaw/agents/main/sessions/sessions.json` (legacy) instead of `/opt/openclaw/config/.openclaw/agents/main/sessions/sessions.json` (shadow)
- `openclaw status` merges both stores for display; whichever has the higher-priority key wins — which is often the legacy store since it was written last
- A session locked to an old model (`gemini-3-pro-preview`) that is NOT in the API key provider's models list causes silent API failures (`[]` content)
- The shadow config (`/opt/openclaw/config/.openclaw/openclaw.json`) may already have the API key provider and correct default model — but the RUNNING session ignores config defaults and reads its model from `sessions.json` directly

**Diagnose — which store is active?**
```bash
# Compare modification times: whichever is newer is what the gateway is using
ls -la /opt/openclaw/config/.openclaw/agents/main/sessions/sessions.json
ls -la ${HOME}/.openclaw/agents/main/sessions/sessions.json

# Check what model the main session has in EACH store
python3 -c "
import json
for path in [
    '/opt/openclaw/config/.openclaw/agents/main/sessions/sessions.json',
    '${HOME}/.openclaw/agents/main/sessions/sessions.json',
]:
    try:
        d = json.load(open(path))
        m = d.get('agent:main:main', {})
        print(path.split('/')[-3], '->', m.get('modelProvider'), m.get('model'))
    except Exception as e:
        print(path, 'ERROR:', e)
"
```

**Fix — patch the active (most recently modified) store:**
```bash
python3 << 'EOF'
import json, shutil, time

# Use whichever was modified more recently
import os
SHADOW  = '/opt/openclaw/config/.openclaw/agents/main/sessions/sessions.json'
LEGACY  = '${HOME}/.openclaw/agents/main/sessions/sessions.json'
SESSIONS = LEGACY if os.path.getmtime(LEGACY) > os.path.getmtime(SHADOW) else SHADOW
print(f'Patching: {SESSIONS}')
shutil.copy2(SESSIONS, SESSIONS + '.bak-' + str(int(time.time())))

with open(SESSIONS) as f:
    data = json.load(f)

count = 0
for k, v in data.items():
    if isinstance(v, dict):
        if v.get('modelProvider') in ('google-antigravity', None) or \
           v.get('model') in ('gemini-3-pro-preview', None, ''):
            v['modelProvider'] = 'google-gemini-cli'
            v['model'] = 'gemini-2.5-flash'
            count += 1

with open(SESSIONS, 'w') as f:
    json.dump(data, f, indent=2)
print(f'Patched {count} sessions -> google-gemini-cli/gemini-2.5-flash')
m = data.get('agent:main:main', {})
print(f"Main session now: provider={m.get('modelProvider')} model={m.get('model')}")
EOF

# Then restart gateway to load new session state
pkill -f 'openclaw.*gateway' 2>/dev/null; sleep 4
openclaw config set gateway.mode local
openclaw gateway &
sleep 8 && openclaw status --deep | grep -A15 'Sessions'
```

**Prevention:** After any container rebuild, OPENCLAW_HOME change, `openclaw update`, or manual gateway restart, re-run the patch script — the gateway can write a fresh session entry inheriting the stale model from a provider default or existing session template in the legacy store, even if the main session was previously patched. One stale entry per restart is the typical pattern; the patch is idempotent and safe to repeat.

**Reoccurrence after gateway restart / `openclaw update`:** Even after a successful patch, a single new session may appear with `gemini-3-pro-preview` after the next restart. The gateway creates new sessions (e.g. web chat, cron runs) that can inherit the old model. Log signature to watch for:
```
embedded run start: ... provider=google-gemini-cli model=gemini-3-pro-preview → isError=true
```
If seen, re-run the patch above (it auto-selects the active store by mtime), then restart the gateway again. Typically only one iteration is needed.

---

## Gotchas

| Gotcha | Detail |
|---|---|
| `doctor --fix` resets shadow config | Creates `.openclaw/openclaw.json` from scratch with minimal plugins. Always run `openclaw plugins list` after `doctor --fix`. |
| `openclaw logs` hangs in Claude Code | Uses follow mode. Use `openclaw logs 2>&1 \| head -50` instead. |
| `openclaw config set` targets shadow config | All config writes go to `.openclaw/openclaw.json`, not the main config. Main config is reference only. |
| Gateway restart drops active session | `openclaw gateway --force` kills the current session context. Warn user before running. |
| Two `openclaw.json` files | Main config at `/opt/openclaw/config/openclaw.json` (full, providers). Shadow config at `.openclaw/openclaw.json` (active, minimal). CLI reads shadow. |
| Credentials symlink required | `doctor --fix` creates `.openclaw/` without `credentials/`. Must symlink manually if CRITICAL warning appears. |
| `gateway.mode` must be set | `openclaw gateway --force` fails with "blocked" unless `gateway.mode=local` is in shadow config. Present in main config but omitted by `doctor --fix`. Always run the full restore script after `doctor --fix`. |
| `config set` can't write provider objects | Setting `models.providers.<name>.*` fails validation unless the full object (baseUrl + api + models[]) exists. Write provider blocks directly to the shadow config JSON via Python script. |
| Telegram polling can die silently | A "Connection error" in logs kills the getUpdates loop. Bot can still send but won't receive. Fix: kill gateway PID and restart. |
| Git `.lock` / `Permission denied` in container | `.git/refs` and `.git/logs` dirs get owned by `root` when git runs under a different UID mapping. `git push` fails with `cannot lock ref ... Permission denied`. Fix: `sudo chown -R yish:yish <repo>/.git` |
| Session model ≠ config default | Changing `agents.defaults.model.primary` only affects NEW sessions. The running main session reads `modelProvider`+`model` from `sessions.json`, not the config default. Must patch sessions.json and restart gateway. |
| Empty `[]` assistant content = silent API failure | OpenClaw does not crash on API errors — it logs empty `[]` content and the bot forwards the error text as a chat reply ("400 status code", etc.). Always check session `.jsonl` for `[]` pattern to confirm API-level failure. |
| `sessions.json` vs `.jsonl` — two separate things | `sessions.json` = metadata store (controls model selection). `.jsonl` files = conversation history (read-only reference). Patching `.jsonl` does nothing to change the model used. |
| Main session survives gateway restart | The `agent:main:main` session is long-running. It resumes with its cached `modelProvider`/`model` from `sessions.json` on every gateway restart — changing config defaults alone is not enough. |
| Legacy store can be the active store | `~/.openclaw/agents/main/sessions/sessions.json` is labelled "legacy" but the gateway may write to it actively. Always compare `ls -la` timestamps of both stores to find out which one is newer — that is the one the gateway is using. The newer store is what must be patched when sessions are model-locked. |
| Model lock reoccurs after each gateway restart | After patching sessions and restarting the gateway (including after `openclaw update`), the gateway may write ONE new session entry with the stale model (`gemini-3-pro-preview`). Re-run the mtime-based patch and restart once more. Typically only one re-patch is needed. Log signature: `embedded run start: ... model=gemini-3-pro-preview → isError=true`. |
| `status --deep` sessions table reads the active-write store | `openclaw status --deep` shows the model from the sessions.json the gateway last wrote to. If the legacy store is newer, `status` shows legacy store models. This is the correct source for diagnosing model lock issues. |

---

## Autonomy Rules

**Do freely (read-only / non-destructive):**
- `openclaw status` / `status --deep` / `status --usage` / `status --json`
- `openclaw health`
- `openclaw plugins list`
- `openclaw sessions` / `sessions --json`
- `openclaw channels` (read operations)
- `openclaw agents list`
- `openclaw memory status` / `memory search`
- `openclaw doctor` (without `--fix`)
- Read any file in `/opt/openclaw/config/`
- Token expiry/cooldown check script
- `node track-usage.cjs` / `python3 token_alert_daemon.py`

**Confirm with user first:**
- `openclaw plugins enable/disable <id>` — changes loaded functionality
- `openclaw config set <path> <value>` — modifies active shadow config
- `openclaw gateway --force` — **drops active session + context window**
- `openclaw doctor --fix` — may reset shadow config (see Gotchas)
- Session merge script — writes to active sessions.json
- `ln -s` credentials symlink — filesystem change
- `openclaw reset` — resets all config/state

**Never without explicit instruction:**
- Delete or overwrite `/opt/openclaw/config/openclaw.json` (main config)
- Delete `~/.openclaw/` (legacy session history)
- `openclaw uninstall`
- Remove backup files (`*.bak-*`)
