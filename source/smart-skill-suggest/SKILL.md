---
name: smart-skill-suggest
description: Reference skill documenting how the automatic skill suggestion system works via hookify rules. Not for performing tasks — provides context on proactive skill recommendations.
user-invocable: false
---

# Smart Skill Suggestion System

This system automatically suggests relevant skills based on conversation context. You may see system messages from this system — here's how to respond to them.

## How It Works

### Layer 1: Keyword Matching (UserPromptSubmit)
Hookify rules match keywords in user prompts to skill categories. When a match is found, you'll see a system message like "Consider using [skill-name]".

### Layer 2: LLM Fallback (UserPromptSubmit)
When keyword rules don't match, a haiku model analyzes the prompt against all available skills for semantic matching.

### Layer 3: Implementation Detection (Stop Hook)
After each turn, the system counts file writes. If 3+ files were written, it suggests using `skill-creator:skill-creator` to capture the work as a reusable skill.

## Responding to Suggestions

When you see a skill suggestion:
1. **Evaluate relevance** — Is the suggested skill actually useful for the current task?
2. **If relevant** — Invoke it with the Skill tool before proceeding
3. **If not relevant** — Ignore the suggestion and proceed normally
4. **Don't mention the system** — Don't tell the user "I received a skill suggestion". Just use the skill naturally or ignore it.

## Skill-Writer Prompt

When you see the post-implementation prompt about `skill-creator:skill-creator`:
1. Consider whether the work done would be valuable as a reusable skill
2. If the implementation involved a repeatable pattern (e.g., "set up a new container", "configure a new *arr service"), suggest to the user: "This implementation could be captured as a reusable skill. Want me to create one?"
3. If the implementation was one-off, ignore the suggestion

## Plan Archival

When you see "Implementation plan detected" messages, this means the session's tasks (TaskCreate entries) will be automatically archived to Obsidian in `12-LOGS/claude-plans/` when the session ends. No action needed from you.
