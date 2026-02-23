---
name: research-run
description: Manually trigger the research pipeline — run full pipeline, research a specific topic, scan only, or reprocess an existing report.
---

# Research Pipeline Runner

## Modes

### Default: `/research-run`

Run the standard pipeline (scan -> top 3 -> research):

```bash
bash ~/SCRiPTz/run-deep-research.sh 3
```

Monitor output and report results when complete.

### Specific topic: `/research-run {topic}`

Research a specific topic. Delegate to the `/deep-research` skill:

1. Determine the theme (AI-Safety, Token-Efficiency, Infrastructure, Local-Models, Multi-Agent, General)
2. Follow the `/deep-research` skill workflow for Mode 1

### Scan only: `/research-run --scan-only`

Run the vault gap scanner and display results:

```bash
bash ~/SCRiPTz/vault-gap-scanner.sh | jq '.'
```

Present the top 10 gaps in a table:

| # | Topic | Type | Priority | Subfolder |
|---|-------|------|----------|-----------|

Ask if the user wants to research any of them.

### Reprocess: `/research-run --reprocess {path}`

Re-run the post-processor on an existing report:

```bash
THEME=$(grep '^theme:' "{path}" | awk '{print $2}')
TITLE=$(grep '^title:' "{path}" | sed 's/^title: *//' | tr -d '"')
DATE=$(date +%Y-%m-%d)

bash ~/SCRiPTz/vault-research-postprocess.sh "{path}" "$THEME" "$TITLE" "$DATE"
```

Report what was updated (MOCs, Research-Index, TOPICS.md, stubs).

### Batch: `/research-run --batch {n}`

Run the pipeline with a custom topic count:

```bash
bash ~/SCRiPTz/run-deep-research.sh {n}
```

## Config

Read settings from `~/SCRiPTz/research-config.json` for defaults (max topics, model, quality gates).
