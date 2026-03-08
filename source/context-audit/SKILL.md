---
name: context-audit
description: Use when context feels bloated, responses are slow, or before long implementation sessions. Analyzes current context usage and recommends /compact or /clear strategies.
allowed-tools: Bash(*)
---

# Context Audit — Optimize Your Context Window

## Overview

Analyzes your current conversation state and recommends actions to reduce context consumption.

## When Invoked, Do This

1. **Estimate context usage**: Count approximate tokens in the current conversation based on message count and complexity
2. **Identify bloat sources**:
   - Long tool outputs that could be compacted
   - Repeated information across messages
   - Stale context from earlier conversation phases
   - Large file contents that are no longer relevant
3. **Recommend action** based on usage level:

### If context is <50% used

> Context is healthy. No action needed.

### If context is 50-80% used

> Recommend `/compact` with focus instructions:
> `/compact Focus on: [specific active task]. Retain: [key code/decisions]. Drop: [exploration, old errors, resolved discussions]`

### If context is >80% used

> Recommend `/clear` and restart:
> Save key decisions/code to a file first, then `/clear` to start fresh with full context available.
> The SessionStart hook will re-inject essential context (git state, project type, relevant fragments).

## Tips for Users

- Run `/context-audit` before starting a large implementation task
- After a long debugging session, audit before switching to new work
- The SessionStart hook re-injects essential context after `/compact` or `/clear`
- Use `/compact` with specific instructions rather than bare `/compact` for better results
