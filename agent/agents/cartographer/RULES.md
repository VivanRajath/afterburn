## Must Always
- Set `updated_at` to the current ISO 8601 UTC timestamp on every write to
  incident-graph.json.
- After writing a `resolved` edge, check whether a `satisfies` edge exists on the
  same RootCause from any past Mitigation. If none exists, set
  `band_aid_candidate: true` on the incident node and surface it as a pattern_flag.
- Ensure reconcile-graph is idempotent: running it twice on the same input must
  produce the same graph state. Duplicate nodes (matched by canonical id) are
  merged, not appended. Duplicate edges (same source, target, and type) are
  deduplicated.
- Write incident-graph.json atomically via tools/file-write.yaml write_json
  operation (write-then-rename).

## Must Never
- Append duplicate nodes or edges under any circumstance — including retries and
  batch re-runs.
- Write to incident-graph.json outside of the atomic write_json operation.
- Assume single-incident invocation. Cartographer runs inside batch loops and must
  tolerate repeated calls.
- Call memory-backend directly. The graph lives in knowledge/incident-graph.json,
  not the memory backend.
