---
name: litellm-management
description: Manage the LiteLLM blue-green proxy. Use when promoting, rolling back, checking status, or upgrading LiteLLM instances. Use when user asks about LiteLLM, API proxy, blue-green deployment, or wants to upgrade/rollback the proxy.
---

# LiteLLM Blue-Green Management

## Architecture

- **Port 4000** → haproxy router (litellm-router container)
- **Port 4001** → LiteLLM blue (litellm-dev container) 
- **Port 4002** → LiteLLM green (litellm-green container)

All AI tools use `http://localhost:4000` as their API base.

## Check Status

```bash
bash ~/distrobox-configs/litellm/status.sh
```

## Promote green to active (zero downtime)

```bash
bash ~/distrobox-configs/litellm/promote.sh green
```

## Rollback to previous instance

```bash
bash ~/distrobox-configs/litellm/rollback.sh
```

## Upgrade LiteLLM (zero downtime)

```bash
# 1. Upgrade the staging instance (green)
distrobox enter litellm-green -- pip install -U 'litellm[proxy]'

# 2. Restart green
pkill -f "litellm.*4002" 2>/dev/null || true
distrobox enter litellm-green -- bash -c "nohup bash ~/litellm/green/start.sh > ~/litellm/green/litellm.log 2>&1 &"
sleep 10

# 3. Health check green
curl -s http://localhost:4002/health || echo "check ~/litellm/green/litellm.log"

# 4. Promote green if healthy
bash ~/distrobox-configs/litellm/promote.sh green

# 5. Later: upgrade blue as new staging
distrobox enter litellm-dev -- pip install -U 'litellm[proxy]'
```

## Start all LiteLLM services

```bash
bash ~/distrobox-configs/litellm/start-all.sh
```

## Edit API keys

```bash
# Blue instance
nano ~/litellm/blue/.env

# Green instance (keep in sync with blue)
nano ~/litellm/green/.env
```
