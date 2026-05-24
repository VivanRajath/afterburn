---
name: ingest-incident
description: Fetch raw post-mortem text from a local file or GitHub source and persist it to the memory backend as a raw incident record.
license: MIT
allowed-tools:
  - tools/file-read.yaml
  - tools/github-client.yaml
  - tools/memory-backend.yaml
invoked-by: agents/ingestor
---

## Instructions

1. Receive `incident_id` (string) and `source` (local file path or GitHub-hosted URL) from skillflow input.
2. If `source` is a local file path, read raw text via `file-read.read`. If `source` is a GitHub URL, fetch raw content via `github-client`.
3. If fetched text is empty, halt: `"Ingest failed: source returned no content at <source>."`
4. Call `memory-backend.save_incident`:
   - `id` — the provided `incident_id`
   - `raw_text` — full fetched text, unmodified
   - `metadata.source` — original source value
   - `metadata.ingested_at` — current UTC timestamp (ISO 8601)
   - `metadata.agent` — `ingestor`
5. Return `stored_id`, `backend`, and `raw_text` to the calling skillflow. Passing `raw_text` forward avoids a redundant backend read by the next stage.
