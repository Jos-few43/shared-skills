---
name: openclaw-troubleshooting
description: >-
  Use when OpenClaw has errors, failures, or unexpected behavior. Use when
  plugins are disabled, Telegram shows "no token" or "SETUP", bot returns
  empty responses, sessions are model-locked, gateway won't start,
  credentials are missing, state is split, or usage tracker shows wrong data.
  See openclaw-architecture for file paths and openclaw-operations for
  normal CLI commands.
allowed-tools: Bash(*), Write, Edit
---

## Known Failure Patterns & Fixes

**Note:** Get `$TELEGRAM_BOT_TOKEN` via: `chezmoi data | jq -r .telegram_bot_token`

### FAILURE: Plugins disabled after `doctor --fix`
**Symptom:** Plugins show `disabled` despite `openclaw.json` having `enabled: true`
**Cause:** `doctor --fix` creates minimal shadow config overriding main config.
**Verify:** `cat /opt/openclaw/config/.openclaw/openclaw.json | python3 -m json.tool | grep -A5 plugins`

**Full shadow config restore (run after any `doctor --fix`):**
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
[ -L /opt/openclaw/config/.openclaw/credentials ] || \
  ln -s /opt/openclaw/config/credentials /opt/openclaw/config/.openclaw/credentials
kill $(ps aux | grep openclaw-gateway | grep -v grep | awk '{print $2}') 2>/dev/null
sleep 3 && openclaw gateway &
sleep 8 && openclaw plugins list | grep -E "loaded|disabled"
```
Note: `gateway.mode=local` is required in shadow config or `--force` restart fails.

---

### FAILURE: OAuth dir missing
**Symptom:** `openclaw doctor` → `CRITICAL: OAuth dir missing`
**Fix:** `ln -s /opt/openclaw/config/credentials /opt/openclaw/config/.openclaw/credentials`

---

### FAILURE: Usage tracker shows 1 session / wrong history
**Symptom:** `track-usage.cjs` shows 1 session only
**Cause:** Session store not merged after state dir migration.

**Fix (merge old → new, new wins on conflict):**
```bash
python3 -c "
import json, shutil, time, os
OLD = os.path.expanduser('~/.openclaw/agents/main/sessions/sessions.json')
NEW = '/opt/openclaw/config/.openclaw/agents/main/sessions/sessions.json'
shutil.copy2(NEW, NEW + '.bak-premerge-' + str(int(time.time())))
old, new = json.load(open(OLD)), json.load(open(NEW))
merged = {**old, **new}
json.dump(merged, open(NEW + '.tmp', 'w'), indent=2)
os.replace(NEW + '.tmp', NEW)
print(f'Merged {len(old)} old + {len(new)} new = {len(merged)} total')
"
```

---

### FAILURE: Telegram channel SETUP / no token
**Symptom:** `Telegram: ON / SETUP / no token`
**Fix:** Run the telegram config set commands from the shadow restore script above, then restart gateway.

---

### FAILURE: Telegram polling dead (sends but doesn't receive)
**Symptom:** Bot sends but ignores inbound messages. Logs show "Connection error" with no subsequent telegram runs.
**Cause:** getUpdates long-poll crashed; gateway didn't restart it.
**Verify:** `openclaw logs 2>&1 | grep -i "telegram\|Connection error" | tail -20`

**Fix:**
```bash
pkill -f 'openclaw.*gateway'; sleep 4
openclaw config set gateway.mode local
openclaw gateway &
sleep 6 && openclaw health
```
Pending messages (up to 24h) replay automatically on restart via stored offset in `telegram/update-offset-default.json`.

---

### FAILURE: `gateway --force` blocked (gateway.mode unset)
**Symptom:** `Gateway start blocked: set gateway.mode=local`
**Fix:** `openclaw config set gateway.mode local` then restart gateway.

---

### FAILURE: Session model locked to old provider (empty responses / errors)
**Symptom:** Bot returns empty `[]` or error messages. Logs show old model provider despite config change.

**Key facts:**
- `sessions.json` metadata controls model selection per session (not config defaults, not `.jsonl` history)
- Config default changes only affect NEW sessions, not the running `agent:main:main` session
- Empty `[]` content = silent API failure

**Diagnose:**
```bash
python3 -c "
import json
s = json.load(open('/opt/openclaw/config/.openclaw/agents/main/sessions/sessions.json'))
for k, v in s.items():
    if isinstance(v, dict) and v.get('modelProvider'):
        print(k[:8], v.get('modelProvider'), v.get('model'))
" | head -20
```

**Fix — Patch all sessions:**
```bash
python3 << 'EOF'
import json, shutil, time
SESSIONS = '/opt/openclaw/config/.openclaw/agents/main/sessions/sessions.json'
shutil.copy2(SESSIONS, SESSIONS + '.bak-' + str(int(time.time())))
data = json.load(open(SESSIONS))
count = 0
for k, v in data.items():
    if isinstance(v, dict):
        if v.get('modelProvider') in ('google-antigravity', None) or \
           v.get('model') in ('gemini-3-flash', None, ''):
            v['modelProvider'] = 'google-gemini-cli'
            v['model'] = 'gemini-2.5-flash'  # UPDATE to current default
            count += 1
json.dump(data, open(SESSIONS, 'w'), indent=2)
print(f'Patched {count} sessions')
EOF
pkill -f 'openclaw.*gateway' 2>/dev/null; sleep 3
openclaw gateway &
sleep 6 && openclaw status
```
**Note:** Also patch `modelProvider=null` / `model=''` entries. Gateway must restart after patching (session cached in memory).

---

### FAILURE: Git `cannot lock ref` / `Permission denied`
**Symptom:** `git push/fetch` fails with `cannot lock ref` or `Permission denied` on `.git/refs/`
**Cause:** `.git/` dirs owned by root after UID mapping in distrobox.
**Fix:** `sudo chown -R $USER:$USER <repo>/.git`
**Fix (all repos):**
```bash
find ~/PROJECTz ~/NSTRUCTiONz ~/distrobox-configs ~/litellm-stack \
     ~/shared-skills ~/.local/share/chezmoi \
     -path "*/.git*" ! -user $USER 2>/dev/null | xargs -r sudo chown $USER:$USER
```

---

### FAILURE: State directory split (multiple state dirs warning)
**Symptom:** `openclaw doctor` reports `Multiple state directories detected`
**Status:** Expected. Active state: `/opt/openclaw/config/.openclaw/`. Legacy: `~/.openclaw/` (do not delete).
**Warning:** Gateway may still write to legacy store. Always compare mtime of both `sessions.json` files to determine which is active.

---

### FAILURE: Legacy store shadow-active (two-store model lock)
**Symptom:** Empty responses / errors despite `status --deep` showing seemingly correct model. Model not in provider's `models[]` list.
**Cause:** Gateway writes to whichever session store is "active" at runtime. After container rebuilds, it may switch to legacy store. Session model overrides config defaults.

**Diagnose — which store is active?**
```bash
ls -la /opt/openclaw/config/.openclaw/agents/main/sessions/sessions.json
ls -la ~/.openclaw/agents/main/sessions/sessions.json
# Newer file = active store

python3 -c "
import json, os
for path in ['/opt/openclaw/config/.openclaw/agents/main/sessions/sessions.json',
             os.path.expanduser('~/.openclaw/agents/main/sessions/sessions.json')]:
    try:
        m = json.load(open(path)).get('agent:main:main', {})
        print(path.split('/')[-3], '->', m.get('modelProvider'), m.get('model'))
    except Exception as e: print(path, 'ERROR:', e)
"
```

**Fix — patch active store (auto-detects by mtime) + .jsonl:**
```bash
python3 << 'EOF'
import json, shutil, time, os, subprocess
SHADOW = '/opt/openclaw/config/.openclaw/agents/main/sessions/sessions.json'
LEGACY = os.path.expanduser('~/.openclaw/agents/main/sessions/sessions.json')
SESSIONS = LEGACY if os.path.getmtime(LEGACY) > os.path.getmtime(SHADOW) else SHADOW
print(f'Patching: {SESSIONS}')
shutil.copy2(SESSIONS, SESSIONS + '.bak-' + str(int(time.time())))
data = json.load(open(SESSIONS))
count = 0
for k, v in data.items():
    if not isinstance(v, dict): continue
    if v.get('modelProvider') in ('google-antigravity', None) or \
       v.get('model') in ('gemini-3-pro-preview', None, ''):
        v['modelProvider'] = 'google-gemini-cli'
        v['model'] = 'gemini-2.5-flash'  # UPDATE to current default
        if isinstance(v.get('systemPromptReport'), dict):
            v['systemPromptReport']['model'] = 'gemini-2.5-flash'
        count += 1
json.dump(data, open(SESSIONS, 'w'), indent=2)
print(f'Patched {count} sessions')
m = data.get('agent:main:main', {})
jsonl = m.get('sessionFile', '')
if jsonl and os.path.exists(jsonl):
    shutil.copy2(jsonl, jsonl + '.bak-' + str(int(time.time())))
    subprocess.run(['sed', '-i', 's/gemini-3-pro-preview/gemini-2.5-flash/g', jsonl])
EOF
pkill -f 'openclaw.*gateway' 2>/dev/null; sleep 4
openclaw config set gateway.mode local
openclaw gateway &
sleep 8 && openclaw status --deep | grep -A15 'Sessions'
```
**Note:** Re-run after each gateway restart / `openclaw update` — one stale session entry per restart is typical. Script is idempotent. Log signature: `model=gemini-3-pro-preview → isError=true`.

---

## Gotchas

| Gotcha | Detail |
|---|---|
| `doctor --fix` resets shadow config | Run full restore script after. Always verify with `openclaw plugins list`. |
| `openclaw logs` hangs | Uses follow mode. Pipe: `openclaw logs 2>&1 \| head -50` |
| `config set` targets shadow only | Main config is reference only. CLI reads/writes `.openclaw/openclaw.json`. |
| `config set` can't write provider objects | {{tool:file_write}} provider blocks directly to shadow JSON via Python script. |
| Gateway restart drops session context | Warn user before `openclaw gateway --force`. |
| Two `openclaw.json` files | Main (full, reference) vs Shadow (active, minimal). CLI reads shadow. |
| Credentials symlink required | `doctor --fix` omits it. Symlink manually if CRITICAL warning. |
| `gateway.mode` required in shadow | `--force` fails without it. Set after every `doctor --fix`. |
| Telegram polling dies silently | "Connection error" kills getUpdates loop. Fix: restart gateway. |
| Git `.lock` / `Permission denied` | `.git/` owned by root in container. Fix: `sudo chown -R yish:yish <repo>/.git` |
| Session model != config default | Config defaults only affect NEW sessions. Patch `sessions.json` + restart. |
| Empty `[]` = silent API failure | Check `.jsonl` for `[]` pattern to confirm. |
| Patch both `sessions.json` and `.jsonl` | Metadata store controls model; `.jsonl` embeds model in compaction entries. |
| `agent:main:main` key != session UUID | Main session model is at `data['agent:main:main']['model']`, not under UUID key. |
| Legacy store can be active | Compare mtime of both `sessions.json` files. Newer = active. |
| Model lock reoccurs after restart | One stale entry per restart typical. Re-run patch, restart once more. |
