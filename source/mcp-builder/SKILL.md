---
name: mcp-builder
description: Build, test, and deploy MCP servers for Claude Code and other AI tools. Use when creating new tool integrations, connecting external services, or building custom MCP servers.
argument-hint: "[server-name]"
context: fork
allowed-tools: Bash(*), Read, Glob, Grep, Write, Edit
---

# MCP Builder

Scaffold, implement, test, and register MCP (Model Context Protocol) servers. Works in distrobox containers — never installs Node.js on the Bazzite host.

## Usage

```
/mcp-builder <server-name>
```

Examples:
- `/mcp-builder secrets-reader` — exposes secrets CLI via MCP
- `/mcp-builder litellm-status` — LiteLLM health/metrics as MCP tools
- `/mcp-builder vault-search` — search the Obsidian vault via MCP

## Step 1: Choose Transport

| Transport | When to Use | Latency |
|---|---|---|
| **stdio** | Claude Code, local tools (subprocess) | Lowest |
| **SSE** | Web clients, multi-client servers | Low |
| **HTTP** | REST-style, stateless tools | Medium |

For Claude Code integrations: always use **stdio**.

## Step 2: Scaffold Project

All MCP development happens in `fedora-tools` or `ai-agents` distrobox container (Node.js already available). Never install on host.

```bash
# Enter development container:
distrobox enter fedora-tools -- bash

# Create project directory:
mkdir -p /var/home/yish/PROJECTz/mcp-servers/<server-name>
cd /var/home/yish/PROJECTz/mcp-servers/<server-name>
```

### package.json

```json
{
  "name": "@yish/<server-name>",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "<server-name>": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/index.ts",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "tsx": "^4.0.0",
    "@types/node": "^20.0.0"
  }
}
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```

### src/index.ts — stdio server skeleton

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  {
    name: "<server-name>",
    version: "1.0.0",
  },
  {
    capabilities: { tools: {} },
  }
);

// Define available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "example_tool",
      description: "Description of what this tool does",
      inputSchema: {
        type: "object",
        properties: {
          param1: {
            type: "string",
            description: "Description of param1",
          },
        },
        required: ["param1"],
      },
    },
  ],
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "example_tool") {
    const { param1 } = args as { param1: string };
    // Implement tool logic here
    return {
      content: [{ type: "text", text: `Result: ${param1}` }],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
```

## Step 3: Install and Build

```bash
# In container:
distrobox enter fedora-tools -- bash -c "
  cd /var/home/yish/PROJECTz/mcp-servers/<server-name>
  npm install
  npm run build
"
```

## Step 4: Test Locally

Use the MCP Inspector to test without Claude Code:

```bash
distrobox enter fedora-tools -- bash -c "
  cd /var/home/yish/PROJECTz/mcp-servers/<server-name>
  npx @anthropic-ai/mcp-inspector node dist/index.js
"
# Inspector UI opens at http://localhost:5173
# Test each tool with sample inputs before registering
```

## Step 5: Register with Claude Code

Add to `~/.claude/settings.json` under `mcpServers`:

```json
{
  "mcpServers": {
    "<server-name>": {
      "command": "distrobox",
      "args": [
        "enter", "fedora-tools", "--",
        "node", "/var/home/yish/PROJECTz/mcp-servers/<server-name>/dist/index.js"
      ]
    }
  }
}
```

Or use a project-scoped `.mcp.json` at the repo root:

```json
{
  "mcpServers": {
    "<server-name>": {
      "command": "node",
      "args": ["/var/home/yish/PROJECTz/mcp-servers/<server-name>/dist/index.js"]
    }
  }
}
```

Verify registration:
```
/mcp  (in Claude Code — lists connected servers)
```

## Step 6: Debugging

Enable MCP debug logging:

```bash
# Set in shell before running Claude Code:
export MCP_LOG_LEVEL=debug
export ANTHROPIC_LOG=debug
```

Common errors and fixes:

| Error | Cause | Fix |
|---|---|---|
| `spawn ENOENT` | Command not found | Check `command` path in settings.json |
| `Connection closed` | Server crashed on startup | Run server directly, check logs |
| `Tool not found` | Tool name mismatch | Match `ListTools` name to `CallTool` name exactly |
| `Invalid schema` | inputSchema not valid JSON Schema | Validate with `ajv` or jsonschema.net |
| `Timeout` | Tool taking too long | Add timeout handling, use streaming for long ops |

Check MCP logs:
```bash
# Run server directly in terminal to see stderr:
distrobox enter fedora-tools -- node /var/home/yish/PROJECTz/mcp-servers/<server-name>/dist/index.js
```

## Tool Design Patterns

### Shell command wrapper (safe — use execFile, not exec)

```typescript
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

// Pass arguments as an array — prevents shell injection
const { stdout } = await execFileAsync("your-command", ["--flag", safeArg]);
return { content: [{ type: "text", text: stdout }] };
```

### File reader tool

```typescript
import { readFile } from "fs/promises";
const content = await readFile(filePath, "utf-8");
return { content: [{ type: "text", text: content }] };
```

### HTTP API wrapper

```typescript
const response = await fetch(`http://localhost:4001/api/endpoint`);
const data = await response.json();
return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
```

## References

- MCP SDK: https://github.com/modelcontextprotocol/typescript-sdk
- MCP Specification: https://modelcontextprotocol.io/specification
- Claude Code MCP docs: https://docs.anthropic.com/en/docs/claude-code/mcp
