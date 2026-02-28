---
name: model-routing
description: Use when selecting which AI model to use for a task, optimizing for cost vs capability, spawning subagents, or when deciding whether to escalate from a cheaper model to a more capable one.
version: "1.0.0"
requires: []
---

# Model Routing — Cost-Optimized Task Dispatch

## Overview

Route tasks to the cheapest model that can handle them well. Target: 60–80% of calls on cheaper models. Default to escalating only when quality is insufficient after 3 attempts.

## Decision Tree

Work top-down — use the first rule that matches:

1. Can this be done with pattern matching, search, file reads, or simple tool dispatch? → **Haiku**
2. Is this writing or editing code with clear requirements? → **Sonnet**
3. Does this require multi-step reasoning, architectural decisions, or nuanced synthesis? → **Opus**
4. Unsure? Start with **Sonnet**, escalate to **Opus** if quality is insufficient after 3 attempts.

## Routing Table

| Task Type | Model | Rationale |
|---|---|---|
| File exploration (grep, glob, read) | Haiku | Simple tool dispatch, minimal reasoning |
| Simple edits (typos, renames, config tweaks) | Haiku | Templated changes, no complex reasoning |
| Code generation, implementation | Sonnet | Good code quality, ~5× cheaper than Opus |
| Commit messages, PR descriptions | Sonnet | Structured output, formulaic |
| Bug fixing, debugging | Sonnet → Opus | Start cheap, escalate if stuck after 3 attempts |
| Architecture planning, design decisions | Opus | Complex multi-step reasoning needed |
| Code review, security analysis | Sonnet or Opus | Depends on complexity and scope |
| Research, deep analysis | Opus | Requires nuanced synthesis |

## Subagent Model Selection

When spawning subagents, set the model explicitly — don't inherit the parent model by default:

| Subagent Role | Model |
|---|---|
| Explore/search (file discovery, grep, reading) | Haiku |
| Implementation (code edits, file writes) | Sonnet |
| Planning/reasoning (architecture, complex debugging) | Opus |

## Escalation Rules

- Attempt a task with the routed model.
- If the output is insufficient after **3 attempts**, upgrade one tier (Haiku → Sonnet → Opus).
- Once a fix or solution is found, implement it immediately — do not keep exploring alternatives.
- If escalated to Opus and still stuck, stop and ask the user rather than retrying indefinitely.

## Execution Budgets

Cap tool usage to prevent unbounded exploration:

| Task Type | Max Tool Calls | Max Subagents | Max Retries |
|---|---|---|---|
| Simple edit | 5 | 0 | 1 |
| Bug fix | 15 | 1 | 3 |
| Small feature | 25 | 2 | 3 |
| Medium feature | 50 | 4 | 5 |
| Research task | 30 | 3 | 2 |

Early exit rules:
- If a fix is found, implement it immediately — don't keep exploring alternatives.
- If 3 search queries return no results, ask the user for guidance.
- After implementing a change, run verification once. Don't iterate without user input.
- If a subagent fails, dispatch a new one with specific fix instructions rather than retrying the same prompt.

## Token Budget Guidelines

- Prefer concise responses. Do not restate information visible in context.
- Complete tasks in the minimum number of tool calls necessary.
- For subagents: include only the context they need, not the full conversation.
- Stop exploring when you have enough information to act.

## Model Switching

- Claude Code: `/model sonnet`, `/model haiku`, `/model opus`
- OpenCode: model selector in settings or `--model` flag
- Via LiteLLM: use model aliases (`claude-sonnet-4-5`, `claude-haiku-4-5`) on port 4002
