---
name: sample-skill
description: A sample skill for testing the transpiler end-to-end.
requires:
  - shell_exec
optional:
  - subagents
  - file_read
---

# Sample Skill

Run commands with {{tool:shell_exec}}.

Read files with {{tool:file_read}}.

{{#if supports:subagents}}
## Parallel Tasks

Use {{tool:subagent}} for parallel work.
{{/if}}

## Always Included

This section has no conditionals.
