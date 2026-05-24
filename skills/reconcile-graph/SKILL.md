---
name: reconcile-graph
description: Merge extractor output into the causal graph, enforce deduplication via canonical ids, evaluate pattern promotion rules, and write the updated graph atomically.
license: MIT
allowed-tools:
  - tools/file-read.yaml
  - tools/file-write.yaml
  - tools/graph-query.yaml
invoked-by: agents/cartographer
---

## Instructions

1. Receive `incident_id`, `extraction_id`, `nodes[]`, and `edges[]` from skillflow input.
2. Read the current graph via `file-read.read_json` from `knowledge/incident-graph.json`.
3. For each incoming node: compute its canonical id using the format in `knowledge/schema/nodes.yaml`. If a node with that id already exists, merge (update `last_seen`; increment `recurrence_count` on RootCause nodes). If new, append. Do not slugify file paths — use the raw path as the CodePath id.
4. For each incoming edge: validate the source/target type pair against `knowledge/schema/edges.yaml`. Reject pairs not declared in the schema.
5. For each new `resolved` edge written: check via `graph-query.multi_hop` whether the linked RootCause has a `satisfies` edge from any Mitigation with `mitigation_type: permanent`. If no such edge exists, set `band_aid_candidate: true` on the Mitigation node metadata.
6. Evaluate all pattern promotion rules in `knowledge/patterns/`. Promote qualifying nodes to Pattern nodes; demote nodes that fall below their demotion threshold.
7. Write the updated graph via `file-write.write_json` to `knowledge/incident-graph.json`. Set `updated_at` to the current UTC timestamp on every write.
8. Append a decision entry to `memory/runtime/key-decisions.md` via `file-write.append` recording nodes added, edges added, and any pattern promotions or demotions.
