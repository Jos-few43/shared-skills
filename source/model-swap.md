---
name: model-swap
description: Add, modify, or remove models in the LiteLLM proxy configuration (blue/green instances).
requires:
  - shell_exec
  - file_read
  - file_edit
---

# Model Swap

## Overview

Manages model entries in LiteLLM proxy instances. Handles config editing, container restart, and health verification.

## Modes

### Add model: `/model-swap add`

1. Ask user for:
   - Model name (litellm model_name)
   - Provider + model string (e.g., `anthropic/claude-opus-4-6`)
   - Target instance: blue (local, port 4001) or green (cloud, port 4002)
   - API key env var if needed

2. Load current config using {{tool:file_read}}:

```bash
cat ~/litellm-stack/{instance}/config.yaml
```

3. Confirm the change with the user, showing the YAML block to add:

```yaml
  - model_name: {name}
    litellm_params:
      model: {provider/model}
      api_key: os.environ/{KEY_VAR}
```

4. Update the config file with {{tool:file_edit}} to add the new model entry under `model_list:`

5. Restart the LiteLLM instance:

```bash
distrobox enter litellm-{container} -- bash -c "cd /opt/litellm && python -m litellm --config config.yaml --port {port} &"
```

Or use the container restart method appropriate for the setup.

6. Health check:

```bash
curl -s http://localhost:{port}/health | jq .
curl -s http://localhost:{port}/v1/models | jq '.data[].id' | grep -q "{name}"
```

7. Update tech radar:

```bash
bash ~/SCRiPTz/tech-radar-update.sh --component "{name}" --field status --value adopt
```

### Remove model: `/model-swap remove {name}`

1. Load current config using {{tool:file_read}} and find the model entry
2. Confirm removal with user
3. Remove the model block using {{tool:file_edit}}
4. Restart instance + health check
5. Update tech radar: `--field status --value deprecate`

### Modify model: `/model-swap modify {name}`

1. Load current config using {{tool:file_read}} and show the model entry
2. Ask user what to change (model string, api_key, params)
3. Apply changes using {{tool:file_edit}}
4. Restart instance + health check
5. Update tech radar if version changed

## Config Paths

| Instance | Config | Port | Container |
|----------|--------|------|-----------|
| blue | `~/litellm-stack/blue/config.yaml` | 4001 | `litellm-dev` |
| green | `~/litellm-stack/green/config.yaml` | 4002 | `litellm-green` |

## Safety

- Always confirm config changes with user before writing
- Always show diff of what will change
- Take a backup before editing: `cp config.yaml config.yaml.bak`
- If health check fails after restart, offer to restore from backup
