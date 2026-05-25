---
name: extract-ontology
description: Run ontology extraction on raw incident text and return typed graph nodes and edges for the cartographer to merge.
license: MIT
allowed-tools: file-read ontology-extractor
---

## Instructions

1. Receive `incident_id` and `raw_text` from skillflow input. (`raw_text` is forwarded from `ingest-incident`; no backend read required.)
2. Call `ontology-extractor.extract` with `incident_id`, `raw_text`, and default `focus_types` (all types declared in `knowledge/schema/nodes.yaml`).
3. If returned `nodes[]` is empty, halt: `"Extraction produced no nodes for incident <incident_id>."`
4. Validate all returned node `type` values against `knowledge/schema/nodes.yaml`. Reject any node whose type is not declared in the schema.
5. Validate all returned edges: `source_id` and `target_id` must reference ids present in the returned `nodes[]`. Reject dangling edges.
6. Return `extraction_id`, `nodes[]`, and `edges[]` to the calling skillflow.
