---
name: healthcheck-command
description: Use when user wants to check the health of all AI tools, containers, and services at once.
---

# Healthcheck Command

Run all health checks for the AI development environment.

## Checks to Run (in order)

1. **Container status**: `distrobox list` — verify all expected containers exist
2. **OpenCode health**: `bash ~/PROJECTz/ai-container-configs/scripts/opencode-healthcheck.sh`
3. **LiteLLM health**: `bash ~/PROJECTz/ai-container-configs/scripts/litellm-healthcheck.sh`
4. **OpenClaw config**: `bash ~/.config/ai-tools-manager/openclaw/scripts/verify-config.sh openclaw-dev`
5. **LSP servers** (if dev-tools running):
   - `distrobox enter dev-tools -- bash -c 'source /etc/profile.d/dev-tools.sh && which typescript-language-server && which pyright && which gopls && which rust-analyzer'`

## Output Format

Present results as a status table:

| Service | Status | Details |
|---|---|---|
| Containers | OK/WARN | X of Y running |
| OpenCode | OK/FAIL | Version, config dir |
| LiteLLM | OK/FAIL | Active backend (blue/green) |
| OpenClaw | OK/FAIL | Config valid/invalid |
| LSP Servers | OK/WARN | X of 4 available |

## When a Check Fails

Report the failure clearly and suggest the fix command.
