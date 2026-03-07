# Research Report Template

## Frontmatter

Include YAML frontmatter at the top of every report:

```yaml
---
title: "{Title}"
version: "1.0"
date: "{YYYY-MM-DD}"
type: research
status: draft
priority: P1 | P2 | P3
theme: AI-Safety | Token-Efficiency | Infrastructure | Local-Models | Multi-Agent | General
tags: []
stack_relevance: []
gap_type: ""
generated_by: claude-code
sources: []
related: []
---
```

## 8-Section Report Format

### 1. Executive Summary

3-8 sentences, no filler. State what was researched, the key finding, and the most important implication for the stack. No vague qualifiers.

### 2. Background & Context

What problem does this solve? What is the prior art? Why does it matter now? Include version numbers, release dates, and ecosystem context where relevant.

### 3. Technical Details

In-depth explanation with code examples, citations, and architecture diagrams where applicable. All code must be syntax-highlighted with language tags.

### 4. Implementation Guide

Bazzite/containers/GPU-specific instructions. Include:
- Prerequisites
- Step-by-step commands (copy-pasteable)
- Expected output
- How to verify it worked

### 5. Stack Implications

Impact table format:

| Component | Impact | Notes |
|-----------|--------|-------|
| {component} | High / Medium / Low / None | {detail} |

### 6. Production Caveats & Anti-Patterns

At least 3 failure modes. Format each as:

**Anti-pattern**: {description}
**Why it fails**: {explanation}
**Mitigation**: {fix}

### 7. Follow-up Research Topics

2-5 items. Each should be a concrete, researchable question — not a vague theme.

### 8. Sources

Numbered bibliography. Include author, title, URL, and access date for all web sources.

## Quality Gates

| Priority | Min Lines | Min Sources | Code Required | Follow-ups |
|----------|-----------|-------------|---------------|------------|
| P1 | 800 | 5 | Yes (runnable) | 3+ |
| P2 | 500 | 3 | Yes (runnable) | 2+ |
| P3 | 300 | 3 | Recommended | 2+ |
