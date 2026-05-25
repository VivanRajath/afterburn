---
name: distill-lesson
description: Traverse the causal subgraph for a confirmed incident and write a concise, searchable lesson to the memory backend.
license: MIT
allowed-tools: graph-query memory-backend
---

## Instructions

1. Receive `incident_id` from skillflow input.
2. Call `graph-query.multi_hop` with `seed_id: "incident:<incident_id>"`, `max_hops: 2`, no edge filter. Returns the immediate causal subgraph: RootCause, Mitigation, Service, and CodePath nodes.
3. Identify the primary RootCause node (highest-confidence `caused` edge originating from the incident node).
4. Identify Mitigation node(s) linked via `resolved` edges. If any Mitigation has `band_aid_candidate: true` in its metadata, include a band-aid note in the lesson.
5. Compose a lesson statement, ≤ 280 characters. Format: `"[Service] failed due to [RootCause]. Mitigation: [Mitigation]. [Band-aid note if applicable.]"`
6. Generate `lesson_id` in format `LES-<YYYY>-<NNN>` (current year; NNN is the next available sequential number).
7. Call `memory-backend.save_lesson`:
   - `id` — the generated `lesson_id`
   - `distilled_text` — the composed statement
   - `tags` — `[incident_id=<incident_id>, services=[...], root_cause=<label>, confidence=0.7]`
8. Return `stored_id` to the calling skillflow.
