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

## Full Health Check

For a deeper check of all AI tools (run in order):

1. **Container status**: `distrobox list` — verify all expected containers exist
2. **OpenCode health**: `bash ~/PROJECTz/ai-container-configs/scripts/opencode-healthcheck.sh`
3. **LiteLLM health**: `bash ~/PROJECTz/ai-container-configs/scripts/litellm-healthcheck.sh`
4. **OpenClaw config**: `bash ~/.config/ai-tools-manager/openclaw/scripts/verify-config.sh openclaw-dev`
5. **LSP servers** (if dev-tools running):
   - `distrobox enter dev-tools -- bash -c 'source /etc/profile.d/dev-tools.sh && which typescript-language-server && which pyright && which gopls && which rust-analyzer'`

## Output Format

Present as a dashboard-style summary:

### Distrobox Containers
[table from distrobox list]

### LiteLLM Proxy
- Active backend: blue / green
- Router (4000): UP / DOWN
- Blue (4001): UP / DOWN
- Green (4002): UP / DOWN

### AI Tools Health

| Service | Status | Details |
|---|---|---|
| Containers | OK/WARN | X of Y running |
| OpenCode | OK/FAIL | Version, config dir |
| LiteLLM | OK/FAIL | Active backend (blue/green) |
| OpenClaw | OK/FAIL | Config valid/invalid |
| LSP Servers | OK/WARN | X of 4 available |

### Other Services
[any podman containers not managed by distrobox]

## When a Check Fails

Report the failure clearly and suggest the fix command.
