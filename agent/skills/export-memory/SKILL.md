---
name: export-memory
description: >
  Migrate the full incident and lesson corpus from one memory backend
  adapter to another using only the memory-backend interface. No
  adapter-specific code paths. Works identically regardless of which
  two adapters are source and target.
license: MIT
allowed-tools: memory-backend
---

## Instructions

1. Read `from` and `to` backend names from skill inputs. If `from == to`, halt immediately: `"Export refused: source and target are the same backend (<from>). Migration to yourself is not a valid operation."`

2. Verify both backends are reachable: call `memory-backend.get` with probe id `probe:export-preflight` on each. A `null record` response confirms reachability. An error response means the backend is unreachable — halt with: `"Export failed: <backend> is not reachable. Check credentials and env vars."`

2.5. Snapshot target state before the export begins: page `memory-backend.list` on the **target** for scope `incidents` until `next_cursor` is null, counting records as `target_incident_count_before`. Repeat for scope `lessons` as `target_lesson_count_before`. This allows a correct delta comparison even if the target already contains records.

3. Export incidents — page source with `memory-backend.list` (scope: `incidents`, cursor: null, limit: 100). For each record id returned, call `memory-backend.get(id)` on source to fetch full text and metadata. Call `memory-backend.save_incident` on target with the same `id`, `raw_text`, and `metadata`. Advance via `next_cursor` until `next_cursor` is null. Track total incidents exported as `source_incident_count`.

4. Export lessons — repeat step 3 for scope: `lessons`, using `memory-backend.save_lesson` on target. Track total as `source_lesson_count`.

5. Verify incident count parity: page target with `memory-backend.list` (scope: `incidents`) until `next_cursor` is null, counting all records as `target_incident_count_after`. If `(target_incident_count_after - target_incident_count_before) != source_incident_count`, halt: `"Count parity failed: exported <N> incidents but only <M> new records found on target. Investigate before trusting the target backend."`

6. Verify lesson count parity: repeat step 5 for scope: `lessons` using `target_lesson_count_before` and `source_lesson_count`.

7. Return export summary to the caller: `{from, to, incident_count, lesson_count, status: ok}`. *(Logging to dailylog.md is the caller's responsibility — file-write is outside this skill's allowed-tools budget.)*

---

> **Note:** This skill exports incidents and lessons only. The causal graph in `knowledge/incident-graph.json` is rebuilt from those records by re-running the `reconcile-graph` flow against the new backend. Operators must run the `bootstrap-from-cognis` skillflow after export to reconstruct the graph. The graph is derived state — exporting it alongside the records would create two sources of truth that could drift.
