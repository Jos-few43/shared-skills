---
name: ingest
description: Ingest a URL into the Obsidian vault — classify it, create an inbox stub, and queue for deep processing. Supports arXiv, GitHub, HuggingFace, YouTube, npm, PyPI, docs, news, social media, PDFs, and more.
requires:
  - shell_exec
---

# Link Ingestion

## Usage

### Single URL: `/ingest {url}`

1. Run the classifier:
   ```bash
   bash ~/SCRiPTz/link-ingest.sh "{url}" "cli"
   ```
2. Display the classification result (type, action, tags, vault path)
3. Confirm: "Queued for deep processing. Run `/ingest --process` to process now."

### Multiple URLs: `/ingest {url1} {url2} {url3}`

1. Run the classifier for each URL sequentially:
   ```bash
   for url in {url1} {url2} {url3}; do
     bash ~/SCRiPTz/link-ingest.sh "$url" "cli"
   done
   ```
2. Display a summary table:
   | URL | Type | Action | Status |
   |-----|------|--------|--------|
3. All queued for batch processing

### View queue: `/ingest --queue`

Show current ingestion queue:

```bash
echo "=== Ingestion Queue ==="
for f in ~/Documents/OpenClaw-Vault/00-INBOX/link-queue/*.json; do
  [ -f "$f" ] || { echo "  (empty)"; break; }
  url=$(jq -r '.url' "$f")
  type=$(jq -r '.type' "$f")
  received=$(jq -r '.received' "$f")
  echo "  $type | $url | $received"
done
echo "Total: $(find ~/Documents/OpenClaw-Vault/00-INBOX/link-queue/ -name '*.json' 2>/dev/null | wc -l) items"
```

### Process now: `/ingest --process`

Trigger batch processing immediately:

```bash
bash ~/SCRiPTz/link-batch-processor.sh
```

Monitor output and report results.

### Process specific count: `/ingest --process {n}`

Process up to N items from the queue:

```bash
bash ~/SCRiPTz/link-batch-processor.sh {n}
```

## Notes

- Classification is instant (~1s for pattern matching, ~5s if AI needed for unknown URLs)
- Deep processing happens in batch (Sonnet, ~30s-2min per item)
- Stubs are immediately visible in Obsidian while waiting for deep processing
- Research-worthy links (arXiv papers) automatically get TOPICS.md entries
- Processed links are added to `11-LINKS/Link-Database.md`
