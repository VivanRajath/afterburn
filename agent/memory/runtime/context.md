# Context

<!-- Runtime context file. Written once by the bootstrap hook at startup;
     read by agents that need the current run id or backend name.
     Overwritten (not appended) at the start of each new run.

     Fields written by bootstrap:
       run_id:       unique identifier for this execution (uuid or timestamp-based)
       started_at:   ISO 8601 UTC timestamp
       memory_backend: active adapter name (cognis | filesystem | sqlite | s3)
       knowledge_graph: path to incident-graph.json, confirmed valid at startup

     Example (do not pre-populate):
       run_id: run-2024-11-15-0201
       started_at: 2024-11-15T02:01:00Z
       memory_backend: cognis
       knowledge_graph: knowledge/incident-graph.json (valid, 142 nodes, 89 edges)
-->

## v0.1 Demo State

demo_mode: true
graph_seeded_at: 2026-05-24T11:00:00Z
graph_source: examples/sample-incident/expected-graph.json
graph_note: >
  knowledge/incident-graph.json is pre-seeded from the sample incident
  (PAY-2024-031501). band_aid_candidate is set to true on the incident
  node — the cartographer would have set this after finding no satisfies
  edge on root-cause:missing-db-index-webhook-events.
  Real ingestion via `gitclaw run skill ingest-incident` is functional
  but not used for the demo. Run bootstrap-from-cognis to rebuild from
  a live memory backend.
