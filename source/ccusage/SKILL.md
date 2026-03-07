---
name: ccusage
description: Use when you want to check Claude Code token usage and costs. Runs the ccusage CLI tool to show daily consumption breakdown.
argument-hint: "[options]"
disable-model-invocation: true
allowed-tools: Bash(*)
---

# ccusage — Token Usage Monitor

## Overview

Runs the `ccusage` CLI tool to display token consumption and cost breakdown for Claude Code sessions.

## Prerequisites

`ccusage` must be installed. If not found, install it:

```bash
# In fedora-tools container (host is immutable)
distrobox enter fedora-tools -- npm install -g ccusage
```

## When Invoked

Run ccusage and format the output:

```bash
# Try host first, fall back to container
if command -v ccusage &>/dev/null; then
  ccusage
elif distrobox enter fedora-tools -- command -v ccusage &>/dev/null 2>&1; then
  distrobox enter fedora-tools -- ccusage
else
  echo "ccusage not installed. Install with: distrobox enter fedora-tools -- npm install -g ccusage"
fi
```

Present the output in a formatted table showing:
- Daily token consumption (input/output)
- Estimated cost per day
- Which sessions consumed the most

## Tips

- Run weekly to track cost trends
- Compare before/after implementing context optimization
- High-cost sessions often indicate context bloat or excessive tool calls
