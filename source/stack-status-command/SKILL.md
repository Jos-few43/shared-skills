---
name: stack-status-command
description: Use when user wants to see the status of all containers, LiteLLM proxy, and services in the development stack.
---

# Stack Status Command

Show comprehensive status of the entire development stack.

## Commands to Run

1. **All containers**: `distrobox list`
2. **LiteLLM router**: `bash ~/PROJECTz/ai-container-configs/scripts/litellm-healthcheck.sh`
3. **Podman containers**: `podman ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"`
4. **Port check**: `ss -tlnp | grep -E '4000|4001|4002|8080'`

## Output Format

Present as a dashboard-style summary:

### Distrobox Containers
[table from distrobox list]

### LiteLLM Proxy
- Active backend: blue / green
- Router (4000): UP / DOWN
- Blue (4001): UP / DOWN
- Green (4002): UP / DOWN

### Other Services
[any podman containers not managed by distrobox]
