---
name: opusplan
description: Use when starting a planning or architecture phase. Guides structured planning with Opus model, then advises switching to Sonnet for implementation to reduce cost ~5x.
---

# OpusPlan — Cost-Optimized Planning Workflow

## Overview

This skill structures planning phases to maximize Opus's strengths, then creates a clear handoff point where you should switch to Sonnet for implementation.

## When You're Invoked

You are in (or about to enter) a **planning phase**. This means architecture decisions, design exploration, or implementation planning — work where Opus's advanced reasoning is worth the cost.

## Planning Phase Checklist

1. **Confirm model**: If not already on Opus, suggest: `Use /model opus for this planning phase`
2. **Define the goal**: State the objective in one sentence
3. **Explore constraints**: What are the technical limitations, dependencies, or requirements?
4. **Propose approaches**: Present 2-3 options with trade-offs
5. **Select approach**: Get user approval on direction
6. **Write the plan**: Detailed implementation steps with file paths and code

## Handoff Protocol

When planning is complete, always output this block:

```
---
PLANNING COMPLETE. Implementation phase begins.

Recommended: Switch to Sonnet for ~5x cost reduction.
Run: /model sonnet

The plan above is designed to survive /compact — key details are self-contained.
---
```

## Key Principles

- Opus excels at: multi-step reasoning, architectural trade-offs, novel problem decomposition
- Sonnet excels at: code generation, file editing, test writing, routine implementation
- The switch point is when "what to build" is decided and "building it" begins
- Plans should include exact file paths and code snippets so Sonnet can execute without needing Opus-level reasoning
