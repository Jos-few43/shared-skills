---
name: research-status
description: Show the research pipeline dashboard — health, vault metrics, queue state, recent activity, quality summary. Also view and modify research pipeline configuration.
targets_only: [claude_code]
requires:
  - shell_exec
---

# Research Pipeline Status Dashboard

When invoked, gather and display these sections:

## 1. Pipeline Health

Run these checks:

```bash
# n8n container status
podman ps --filter name=n8n-dev --format "{{.Names}} {{.Status}}" 2>/dev/null || echo "n8n-dev: not found"

# Last research run
ls -t ~/Documents/OpenClaw-Vault/12-LOGS/claude-code/research/claude-output-*.log 2>/dev/null | head -1 | xargs stat -c '%y' 2>/dev/null || echo "No runs found"

# Error count (last 7 days)
find ~/Documents/OpenClaw-Vault/12-LOGS/claude-code/research/ -name 'errors-*.log' -mtime -7 -exec cat {} + 2>/dev/null | wc -l
```

## 2. Vault Metrics

```bash
# Total reports (exclude MOCs, indexes, templates)
find ~/Documents/OpenClaw-Vault/01-RESEARCH -name '*.md' ! -name 'TOPICS.md' ! -name '*MOC*' ! -name '*Start*' ! -name '*Index*' | wc -l

# Reports by theme (count per subfolder)
for d in ~/Documents/OpenClaw-Vault/01-RESEARCH/*/; do
  count=$(find "$d" -name '*.md' | wc -l)
  echo "  $(basename "$d"): $count"
done

# Gap count from scanner
bash ~/SCRiPTz/vault-gap-scanner.sh 2>/dev/null | jq 'length'
```

## 3. Queue State

```bash
# Ingestion queue
find ~/Documents/OpenClaw-Vault/00-INBOX/link-queue/ -name '*.json' 2>/dev/null | wc -l

# Pending topics in vault TOPICS.md
grep -ci 'pending\|PENDING' ~/Documents/OpenClaw-Vault/01-RESEARCH/TOPICS.md 2>/dev/null || echo "0"
```

## 4. Recent Activity

```bash
# Last 5 reports by modification time
find ~/Documents/OpenClaw-Vault/01-RESEARCH -name '*.md' ! -name 'TOPICS.md' ! -name '*MOC*' ! -name '*Index*' -printf '%T@ %Tc %p\n' 2>/dev/null | sort -rn | head -5
```

## 5. Quality Summary

```bash
# Reports under 100 lines (likely stubs or incomplete)
find ~/Documents/OpenClaw-Vault/01-RESEARCH -name '*.md' ! -name 'TOPICS.md' ! -name '*MOC*' -exec sh -c 'lines=$(wc -l < "$1"); [ "$lines" -lt 100 ] && echo "  SHORT ($lines lines): $(basename "$1")"' _ {} \;

# Stale reports (>90 days old)
find ~/Documents/OpenClaw-Vault/01-RESEARCH -name '*.md' -mtime +90 ! -name 'TOPICS.md' ! -name '*MOC*' 2>/dev/null | wc -l
```

## Output Format

Present results as a formatted dashboard:

```
## Research Pipeline Dashboard

### Health
| Component | Status |
|-----------|--------|
| n8n scheduler | {status} |
| Last run | {date} ({hours}h ago) |
| Errors (7d) | {count} |

### Vault Metrics
| Theme | Reports |
|-------|---------|
| AI-Safety | {n} |
| ... | ... |
| **Total** | **{n}** |

Gaps detected: {n}

### Queue
Ingestion queue: {n} pending
Research topics: {n} pending in TOPICS.md

### Recent Reports
1. {date} -- {title}
...

### Quality Alerts
- {n} reports under 100 lines
- {n} reports stale (>90 days)
```

## Pipeline Configuration

Config file: `~/SCRiPTz/research-config.json`

### View: `/research-status config`

Read and display the current configuration:

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

### Modify: `/research-status config set {key} {value}`

Valid keys:
- `max_topics` → updates `.max_topics_per_run`
- `model` → updates `.model` (valid: "sonnet", "haiku", "opus")
- `notifications.desktop` → updates `.notifications.desktop` (true/false)
- `notifications.telegram` → updates `.notifications.telegram` (true/false)

```bash
# Example: set max topics to 5
jq '.max_topics_per_run = 5' ~/SCRiPTz/research-config.json > /tmp/rc.json && mv /tmp/rc.json ~/SCRiPTz/research-config.json
```

### Reset: `/research-status config reset`

Show the current config and ask if the user wants to reset to defaults:
- max_topics_per_run: 3
- schedule: "0 3 * * *"
- model: "sonnet"
- scanner_timeout: 30
- notifications: both enabled
