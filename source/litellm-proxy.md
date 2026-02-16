---
name: litellm-proxy
description: >-
  Manage the LiteLLM blue-green proxy stack. Use when promoting, rolling back,
  checking status, or upgrading LiteLLM instances. Use when user asks about
  LiteLLM, API proxy, blue-green deployment, or wants to upgrade/rollback the proxy.
---

# LiteLLM Blue-Green Proxy

## Architecture

- **Port 4000** → haproxy router (`litellm-router` container)
- **Port 4001** → LiteLLM blue (`litellm-dev` container)
- **Port 4002** → LiteLLM green (`litellm-green` container)

All AI tools use `http://localhost:4000` as their API base.

**Config repo:** `~/litellm-stack/`

```
~/litellm-stack/
├── router/haproxy.cfg    # haproxy routing config
├── blue/
│   ├── start.sh          # Start blue instance (port 4001)
│   └── run.sh            # Run script
└── green/
    └── start.sh          # Start green instance (port 4002)
```

## Check Status

```bash
bash ~/PROJECTz/ai-container-configs/scripts/litellm-healthcheck.sh
```

Or check individual instances:
```bash
curl -s http://localhost:4000/health   # Router (active backend)
curl -s http://localhost:4001/health   # Blue
curl -s http://localhost:4002/health   # Green
```

## Start Instances

```bash
# Start blue (primary)
bash ~/litellm-stack/blue/start.sh

# Start green (staging)
bash ~/litellm-stack/green/start.sh
```

## Promote Green to Active (zero downtime)

Edit `~/litellm-stack/router/haproxy.cfg` to point the active backend from blue (4001) to green (4002), then reload haproxy.

## Rollback to Blue

Edit `~/litellm-stack/router/haproxy.cfg` to point the active backend back to blue (4001), then reload haproxy.

## Upgrade LiteLLM (zero downtime)

```bash
# 1. Upgrade the staging instance (green)
distrobox enter litellm-green -- pip install -U 'litellm[proxy]'

# 2. Restart green
pkill -f "litellm.*4002" 2>/dev/null || true
bash ~/litellm-stack/green/start.sh
sleep 10

# 3. Health check green
curl -s http://localhost:4002/health || echo "Green unhealthy — check logs"

# 4. Promote green if healthy (edit haproxy.cfg, reload)

# 5. Later: upgrade blue as new staging
distrobox enter litellm-dev -- pip install -U 'litellm[proxy]'
```

## Edit API Keys

Use the Edit tool on these files (do not use nano/vim):

- Blue: `~/litellm-stack/blue/.env`
- Green: `~/litellm-stack/green/.env`

Keep both instances in sync.

## Autonomy Rules

**Do freely:**
- Health checks (`curl`, healthcheck script)
- Read config files

**Confirm with user first:**
- Starting/stopping instances
- Editing haproxy.cfg (changes routing)
- Editing .env files (changes API keys)
- Upgrading LiteLLM versions
