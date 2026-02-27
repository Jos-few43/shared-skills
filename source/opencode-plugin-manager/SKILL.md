---
name: opencode-plugin-manager
description: Use when managing OpenCode plugins in containers - installing, configuring, listing plugins, or setting up plugin directories in distrobox/docker environments.
requires:
  - shell_exec
---

# OpenCode Plugin Manager

Manage OpenCode plugins in containerized environments (distrobox, docker) with proper configuration handling.

## When to Use

- Installing or removing OpenCode plugins
- Configuring plugin directories in containers
- Listing installed plugins
- Troubleshooting plugin loading issues
- Setting up container-specific plugin configurations

## Core Operations

### 1. List Installed Plugins

View all plugins in the current configuration:

```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/list-plugins.sh
```

This shows:
- Plugin names from opencode.json
- Plugin directories in node_modules/
- Plugin source directories
- Installation status

### 2. Install Plugin to Container

Install a plugin into container's plugin directory:

```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/install-plugin.sh <plugin-name> [container-name]
```

**Examples:**
```bash
# Install to default container location
bash ${CLAUDE_PLUGIN_ROOT}/scripts/install-plugin.sh opencode-antigravity-multi-auth

# Install to specific container
bash ${CLAUDE_PLUGIN_ROOT}/scripts/install-plugin.sh my-plugin opencode-dev

# Install from local directory
bash ${CLAUDE_PLUGIN_ROOT}/scripts/install-plugin.sh ~/my-custom-plugin opencode-dev
```

### 3. Configure Plugin Directory

Set up OpenCode to use container-specific plugin directory:

```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/configure-container.sh <container-name> <plugin-path>
```

**Example:**
```bash
# Configure opencode-dev container to use /opt/opencode/plugins
bash ${CLAUDE_PLUGIN_ROOT}/scripts/configure-container.sh opencode-dev /opt/opencode/plugins
```

This automatically:
- Creates the plugin directory
- Sets environment variables (OPENCODE_CONFIG_DIR, OPENCODE_DATA_DIR)
- Adds configuration to /etc/profile.d/ and ~/.bashrc
- Copies existing plugins from ~/.config/opencode/

### 4. Verify Configuration

Check that plugin configuration is active:

```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/verify-config.sh [container-name]
```

Shows:
- Environment variables
- Config file location
- Installed plugins
- Plugin status

### 5. Remove Plugin

Uninstall a plugin from container:

```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/remove-plugin.sh <plugin-name> [container-name]
```

## Configuration Patterns

### Container Plugin Setup

For distrobox containers, the recommended structure is:

```
/opt/opencode/
├── bin/              # OpenCode binary
├── plugins/          # Plugin configuration directory
│   ├── opencode.json
│   ├── auth.json
│   ├── node_modules/
│   ├── <plugin-name>/
│   └── package.json
└── README-CONTAINER-SETUP.md
```

### Environment Variables

Required for container isolation:
```bash
export OPENCODE_CONFIG_DIR=/opt/opencode/plugins
export OPENCODE_DATA_DIR=/opt/opencode/plugins
```

These should be set in:
1. `/etc/profile.d/opencode.sh` (system-wide)
2. `~/.bashrc` or `~/.zshrc` (user-specific)

### Plugin Configuration File

`/opt/opencode/plugins/opencode.json`:
```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["plugin-name@latest"],
  "provider": {
    "provider-name": {
      "models": {
        "model-id": {
          "name": "Display Name",
          "limit": {
            "context": 200000,
            "output": 64000
          }
        }
      }
    }
  }
}
```

## Troubleshooting

### Plugin Not Loading

1. Verify environment variables:
   ```bash
   bash ${CLAUDE_PLUGIN_ROOT}/scripts/verify-config.sh opencode-dev
   ```

2. Check plugin directory permissions:
   ```bash
   distrobox enter opencode-dev -- ls -la /opt/opencode/plugins/
   ```

3. Ensure plugin dependencies installed:
   ```bash
   distrobox enter opencode-dev -- bash -c "cd /opt/opencode/plugins/<plugin-name> && npm install"
   ```

### Configuration Not Persisting

If environment variables aren't loading:

1. Check `/etc/profile.d/opencode.sh` exists
2. Ensure it has proper permissions (readable)
3. Source it manually: `source /etc/profile.d/opencode.sh`
4. Restart container: `distrobox stop <container>; distrobox enter <container>`

### Broken Symlinks

If plugin has broken symlinks to host directories:

```bash
# Remove symlink
distrobox enter opencode-dev -- rm /opt/opencode/plugins/<plugin-link>

# Copy actual plugin
distrobox enter opencode-dev -- sudo cp -r /path/to/plugin /opt/opencode/plugins/

# Fix ownership
distrobox enter opencode-dev -- sudo chown -R $USER:$USER /opt/opencode/plugins/
```

## Advanced Usage

### Multiple Containers

Manage plugins across different containers:

```bash
# Setup plugin dir in each container
bash ${CLAUDE_PLUGIN_ROOT}/scripts/configure-container.sh container-1 /opt/opencode/plugins
bash ${CLAUDE_PLUGIN_ROOT}/scripts/configure-container.sh container-2 /opt/opencode/plugins

# Install different plugins per container
bash ${CLAUDE_PLUGIN_ROOT}/scripts/install-plugin.sh plugin-a container-1
bash ${CLAUDE_PLUGIN_ROOT}/scripts/install-plugin.sh plugin-b container-2
```

### Plugin Development

For developing custom plugins in containers:

1. Create plugin directory in container:
   ```bash
   distrobox enter opencode-dev -- mkdir -p /opt/opencode/plugins/my-plugin
   ```

2. Add to opencode.json:
   ```json
   {
     "plugin": ["my-plugin@latest"]
   }
   ```

3. Implement plugin entry point at `my-plugin/index.ts` or `my-plugin/dist/index.js`

See `references/plugin-development.md` for complete guide.

## Reference Documentation

- **Plugin Types**: `references/plugin-types.md`
- **Configuration Guide**: `references/configuration-guide.md`
- **Container Setup**: `references/container-setup.md`
- **Plugin Development**: `references/plugin-development.md`
- **Troubleshooting**: `references/troubleshooting.md`

## Examples

- **Basic Container Setup**: `examples/basic-container-setup.md`
- **Multi-Container Config**: `examples/multi-container.md`
- **Custom Plugin Install**: `examples/custom-plugin.md`
- **Migration from Host**: `examples/migrate-from-host.md`
