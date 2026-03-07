---
name: container-logs
description: Use when user wants to view container logs, debug container issues, or search for errors in service output.
requires:
  - shell_exec
---

# Container Logs

Quick access to container logs with smart defaults.

## Usage Patterns

### View recent logs
```bash
podman logs --tail 100 <container-name>
```

### Follow logs in real-time
```bash
podman logs --follow --tail 50 <container-name>
```

### Filter for errors
```bash
podman logs --tail 500 <container-name> 2>&1 | grep -iE "error|exception|fatal|panic|critical"
```

### Logs since time
```bash
podman logs --since "30m" <container-name>
```

## Container Name Mapping

Distrobox containers use names directly. For podman-managed containers:
```bash
podman ps --format "{{.Names}}" --all
```

## Cross-Reference with Sentry

When you find an error in logs:
1. Extract the error message and stack trace
2. Use the Sentry MCP to search for matching events
3. Check if it's a known issue or new occurrence
4. If new, suggest creating a Linear issue

## Common Debug Patterns

| Symptom | Command |
|---|---|
| Container won't start | `podman logs <name> 2>&1 \| tail -50` |
| Service returning errors | `podman logs --since 10m <name> 2>&1 \| grep -i error` |
| Memory issues | `podman stats --no-stream <name>` |
| Network issues | `podman inspect <name> --format '{{.NetworkSettings}}'` |
