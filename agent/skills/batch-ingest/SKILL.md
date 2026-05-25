---
name: batch-ingest
description: >
  Page through all records in the currently-configured memory backend
  and run the extract → reconcile → distill pipeline for each. Used
  by bootstrap-from-cognis to seed a fresh graph from an existing
  backend.
license: MIT
allowed-tools: memory-backend
---

## Instructions

1. Call `memory-backend.list` (scope: `incidents`, cursor: null, limit: 100). Track `records_processed`, `nodes_total`, `edges_total`, `lessons_total` — all start at zero.

2. For each record in the returned page:
   a. Call `memory-backend.get(id)` to fetch `raw_text` and metadata.
   b. Invoke `extract-ontology` with `incident_id = record.id` and `raw_text`. Accumulate node/edge counts from output.
   c. Invoke `reconcile-graph` with the extracted `nodes[]` and `edges[]`. Add `nodes_added` and `edges_added` to running totals.
   d. If `reconcile-graph` output includes any `pattern_flags`, invoke `distill-lesson` with `incident_id` and `pattern_flags`. Increment `lessons_total`.

3. If `next_cursor` is not null, call `memory-backend.list` with `cursor: next_cursor` and repeat step 2.

4. Return `{records_processed, nodes_total, edges_total, lessons_total}`.
