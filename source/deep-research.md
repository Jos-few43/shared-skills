---
name: deep-research
description: Use when you want to deeply research a topic and store the report in the Obsidian vault with proper backlinks, tagging, and folder structure. Also use with /deep-research --discover to scan for vault knowledge gaps.
---

# Deep Research — Vault-Integrated Research Reports

## Overview

Researches a topic using web search, documentation, and academic sources, then writes a structured report to the Obsidian vault with proper backlinks and knowledge graph integration.

## Modes

### Mode 1: Research a specific topic

Usage: `/deep-research {topic}`

1. Determine the theme (AI-Safety, Token-Efficiency, Infrastructure, Local-Models, Multi-Agent, General)
2. Check existing vault research at `~/Documents/OpenClaw-Vault/01-RESEARCH/` for prior work
3. Research using web search, Firecrawl, Context7, HuggingFace, PubMed as appropriate
4. Write report in 8-section format to `~/Documents/OpenClaw-Vault/01-RESEARCH/{theme}/{slug}.md`
5. Run post-processor: `bash ~/SCRiPTz/vault-research-postprocess.sh "{report_path}" "{theme}" "{title}" "{date}"`
6. Commit: `cd ~/Documents/OpenClaw-Vault && git add -A && git commit -m "research: add {topic} report"`
7. Report back with summary and vault location

### Mode 2: Discover vault gaps

Usage: `/deep-research --discover`

1. Run: `bash ~/SCRiPTz/vault-gap-scanner.sh`
2. Present the top 5 gaps with their types and priorities
3. Ask which one(s) to research
4. For each selected, follow Mode 1

## Report Format

Use the 8-section format from `~/SCRiPTz/templates/research-system-prompt.md`:

1. Executive Summary (3-8 sentences, no filler)
2. Background & Context
3. Technical Details (code, citations)
4. Implementation Guide (Bazzite/containers/GPU specific)
5. Stack Implications (impact table)
6. Production Caveats & Anti-Patterns (≥3 failure modes)
7. Follow-up Research Topics (2-5 items)
8. Sources (numbered bibliography)

Include YAML frontmatter with: title, version, date, type, status, priority, theme, tags, stack_relevance, gap_type, generated_by, sources, related wikilinks.

## Quality Gates

| Priority | Min Lines | Min Sources | Code Required | Follow-ups |
|---|---|---|---|---|
| P1 | 800 | 5 | Yes (runnable) | 3+ |
| P2 | 500 | 3 | Yes (runnable) | 2+ |
| P3 | 300 | 3 | Recommended | 2+ |

## After Writing

Always run the post-processor to update the knowledge graph:

```bash
bash ~/SCRiPTz/vault-research-postprocess.sh "{report_path}" "{theme}" "{title}" "{date}"
```

This updates Theme MOCs, Research-Index, seeds follow-up topics into TOPICS.md, and creates stubs for dead wikilinks.
