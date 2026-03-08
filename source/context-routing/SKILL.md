---
name: context-routing
description: "Use when dispatching subagents via the {{tool:subagent}} tool to ensure minimal context is passed. Applies to any skill or workflow that spawns {{tool:subagent}} subagents."
user-invocable: false
allowed-tools: Write, Edit
---

# Context Routing — Minimal Context for Subagents

## Overview

When dispatching subagents (via the {{tool:subagent}} tool or any multi-agent workflow), avoid broadcasting the full conversation history. Research shows **60% token savings** and **35% latency reduction** from routing only relevant context to each agent role.

The default behavior — replaying the entire conversation into each subagent — creates a 1,150:1 cache-read-to-output ratio where context replay dominates cost.

## Context Scoping Rules

Before dispatching any subagent, determine its type and apply the corresponding scoping rule:

| Subagent Type | Context to Include | Context to Exclude |
|---|---|---|
| **Explore/search** | Search query + target file paths only | Conversation history, prior tool results |
| **Implementation** | Prompt spec + relevant file contents + error messages | Exploration logs, planning discussion |
| **Code reviewer** | Git diff + coding standards | Full conversation, exploration history |
| **Plan/architecture** | Goal description + key architectural files + constraints | Raw tool outputs, debug logs |
| **Debugging** | Error message + stack trace + relevant code | Unrelated conversation, prior successful steps |
| **General-purpose** | Targeted 3-5 sentence summary of relevant context | Full conversation replay |

## Practical Rules

1. **Summarize context in 3-5 sentences** before including it in a subagent prompt. Never paste the full conversation.
2. **Never paste raw tool output** into a subagent prompt — extract only the relevant information (file paths, error lines, key values).
3. **For implementation subagents**, include the full task spec but only the files they will actually modify. Do not include exploration results or planning notes.
4. **For Explore agents**, the search query alone is usually sufficient context. Add target directory paths if needed, nothing more.
5. **For debugging subagents**, include the exact error message, the relevant stack trace, and the code that produced it. Exclude prior successful steps and unrelated conversation.
6. **For code review subagents**, pass the git diff and any relevant coding standards or linting rules. Do not include how the code was developed.

## Anti-Patterns

- **Full replay**: Copying the entire conversation into a subagent prompt. This wastes tokens on context the subagent will never use.
- **Tool output dumping**: Pasting raw `grep` or `find` output into a subagent prompt instead of extracting the 2-3 relevant lines.
- **Speculative context**: Including files or information "just in case" the subagent might need them. If unsure, let the subagent request what it needs.
- **Nested context inflation**: A subagent dispatching another subagent with its own full context, compounding waste at each level.

## Example: Good vs Bad Dispatch

### Bad (full context replay)

```
Task: Here's everything from our conversation so far...
[500 lines of exploration, planning, debugging, and discussion]
...now implement the caching layer.
```

### Good (scoped context)

```
Task: Implement a Redis caching layer for the /api/models endpoint.

Spec:
- Cache TTL: 300 seconds
- Cache key pattern: `models:{provider}:{hash}`
- Invalidate on POST /api/models/refresh

Files to modify:
- src/routes/models.ts (add cache check before DB query)
- src/lib/cache.ts (create this file with get/set/invalidate)

Error to fix: The current endpoint takes 2.3s due to repeated DB calls.
```

## When to Apply

Apply these rules whenever you:
- Use the {{tool:subagent}} tool to spawn a subagent
- Author a prompt that will be passed to another agent or context window
- Prepare context for a `/compact` handoff
- Structure a multi-step workflow where each step runs in a separate context
