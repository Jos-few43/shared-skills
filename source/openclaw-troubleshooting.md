---
name: openclaw-troubleshooting
description: >-
  Use when OpenClaw has errors, failures, or unexpected behavior. Use when
  plugins are disabled, Telegram shows "no token" or "SETUP", bot returns
  empty responses, sessions are model-locked, gateway won't start,
  credentials are missing, state is split, or usage tracker shows wrong data.
  See openclaw-architecture for file paths and openclaw-operations for
  normal CLI commands.
---

## Known Failure Patterns & Fixes

**Note:** `$TELEGRAM_BOT_TOKEN` in fix scripts refers to the token managed via chezmoi. Retrieve with: `chezmoi data | jq -r .telegram_bot_token`

### FAILURE: Plugins disabled (auto-rotator / Telegram / Qwen broken)
**Symptom:** `openclaw plugins list` shows `google-gemini-cli-auth`, `qwen-portal-auth`, `telegram` as `disabled` despite `openclaw.json` having `enabled: true`

**Cause:** `openclaw doctor --fix` created `/opt/openclaw/config/.openclaw/openclaw.json` (shadow config) with a minimal plugin set. All CLI writes target this shadow config, overriding the main config.

**Verify:** `cat /opt/openclaw/config/.openclaw/openclaw.json | python3 -m json.tool | grep -A5 plugins`

**Fix:**
```bash
openclaw plugins enable google-gemini-cli-auth
openclaw plugins enable qwen-portal-auth
openclaw plugins enable telegram
openclaw config set channels.telegram.botToken "$TELEGRAM_BOT_TOKEN"
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
openclaw config set channels.telegram.botToken "$TELEGRAM_BOT_TOKEN"
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
            v['model'] = 'gemini-2.5-flash'  # UPDATE: set to your current default model
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

**Fix — patch the active store (sessions.json + session .jsonl):**

The main session (`agent:main:main`) is stored as a **key** in `sessions.json` — its session UUID is a *value* inside it, not the key itself. The fix must patch `agent:main:main` directly AND patch the session's `.jsonl` compaction file (which embeds the model in every entry).

```bash
python3 << 'EOF'
import json, shutil, time, os, subprocess

SHADOW  = '/opt/openclaw/config/.openclaw/agents/main/sessions/sessions.json'
LEGACY  = '${HOME}/.openclaw/agents/main/sessions/sessions.json'
SESSIONS = LEGACY if os.path.getmtime(LEGACY) > os.path.getmtime(SHADOW) else SHADOW
print(f'Patching sessions.json: {SESSIONS}')
shutil.copy2(SESSIONS, SESSIONS + '.bak-' + str(int(time.time())))

with open(SESSIONS) as f:
    data = json.load(f)

count = 0
for k, v in data.items():
    if not isinstance(v, dict):
        continue
    if v.get('modelProvider') in ('google-antigravity', None) or \
       v.get('model') in ('gemini-3-pro-preview', None, ''):
        v['modelProvider'] = 'google-gemini-cli'
        v['model'] = 'gemini-2.5-flash'  # UPDATE: set to your current default model
        # Also fix nested systemPromptReport.model if present
        if isinstance(v.get('systemPromptReport'), dict):
            v['systemPromptReport']['model'] = 'gemini-2.5-flash'  # UPDATE: set to your current default model
        count += 1

with open(SESSIONS, 'w') as f:
    json.dump(data, f, indent=2)
print(f'Patched {count} sessions -> google-gemini-cli/gemini-2.5-flash')
m = data.get('agent:main:main', {})
print(f"Main session now: provider={m.get('modelProvider')} model={m.get('model')}")

# Also patch the session .jsonl compaction file — it embeds the model in every entry
jsonl = m.get('sessionFile', '')
if jsonl and os.path.exists(jsonl):
    bad_count = int(subprocess.check_output(['grep', '-c', 'gemini-3-pro-preview', jsonl], stderr=subprocess.DEVNULL).strip() or 0)
    if bad_count > 0:
        shutil.copy2(jsonl, jsonl + '.bak-' + str(int(time.time())))
        subprocess.run(['sed', '-i', 's/gemini-3-pro-preview/gemini-2.5-flash/g', jsonl])
        print(f'Patched {bad_count} occurrences in {jsonl}')
    else:
        print(f'.jsonl already clean: {jsonl}')
else:
    print(f'No sessionFile found or does not exist: {jsonl!r}')
EOF

# Restart gateway to load new session state
pkill -f 'openclaw.*gateway' 2>/dev/null; sleep 4
openclaw config set gateway.mode local
openclaw gateway &
sleep 8 && openclaw status --deep | grep -A15 'Sessions'
```

**Prevention:** After any container rebuild, OPENCLAW_HOME change, `openclaw update`, or manual gateway restart, re-run the patch script — the gateway can write a fresh session entry inheriting the stale model. One stale entry per restart is the typical pattern; the patch is idempotent.

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
| `sessions.json` vs `.jsonl` — both need patching | `sessions.json` = metadata store (controls model selection per session). `.jsonl` files = conversation/compaction log; the gateway embeds the model in every compaction entry and may re-read it when resuming a long-running session. Patch BOTH when fixing a model-locked session (see fix script above). |
| Main session survives gateway restart | The `agent:main:main` session is long-running. It resumes with its cached `modelProvider`/`model` from `sessions.json` on every gateway restart — changing config defaults alone is not enough. |
| `agent:main:main` key ≠ session UUID | The main session's model is stored under the literal key `agent:main:main` in `sessions.json`. The session UUID (`132c30fb-...`) appears as a *value* (`sessionId` field) inside that entry, NOT as the key. Searching sessions.json by UUID key will miss this entry entirely. Always check `data['agent:main:main']['model']` directly. |
| Legacy store can be the active store | `~/.openclaw/agents/main/sessions/sessions.json` is labelled "legacy" but the gateway may write to it actively. Always compare `ls -la` timestamps of both stores to find out which one is newer — that is the one the gateway is using. The newer store is what must be patched when sessions are model-locked. |
| Model lock reoccurs after each gateway restart | After patching sessions and restarting the gateway (including after `openclaw update`), the gateway may write ONE new session entry with the stale model (`gemini-3-pro-preview`). Re-run the mtime-based patch and restart once more. Typically only one re-patch is needed. Log signature: `embedded run start: ... model=gemini-3-pro-preview → isError=true`. |
| `status --deep` sessions table reads the active-write store | `openclaw status --deep` shows the model from the sessions.json the gateway last wrote to. If the legacy store is newer, `status` shows legacy store models. This is the correct source for diagnosing model lock issues. |
