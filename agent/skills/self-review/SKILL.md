---
name: self-review
description: Audit past PR warnings against engineer outcomes, update lesson confidence weights, flag blind spots, and optionally replay past checks in sandbox.
license: MIT
allowed-tools: graph-query memory-backend sandbox-runner file-read file-write
---

## Instructions

1. Receive `mode` from input (`daily` by default; `weekly-summary` when set by the scheduler).
2. Call `memory-backend.search` (scope: lessons, query: `"reviewed:false"`, limit: 50) to retrieve lessons pending audit.
3. For each lesson, call `memory-backend.search` (scope: lessons, query: the lesson id) to find associated outcome records tagged `dismiss`, `addressed`, or `escalate`.
4. Compute confidence delta per outcome: `addressed` → +0.1 (ceiling 1.0); `dismissed` → −0.05 (floor 0.1); no outcome → no change.
5. For any lesson where the warning was `dismissed` but the same file paths later appeared in a new incident, flag as `blind_spot` and apply an additional −0.2 delta.
6. Call `memory-backend.save_lesson` for each audited lesson with updated `confidence`, `updated_at`, and (if applicable) `blind_spot: true` tag.
7. If `mode` is `weekly-summary`: use `sandbox-runner.run` to replay the check-pr routing logic against a sample of past PR diffs. Compare dispatched tier to actual outcomes. Calculate detection rate and false-positive rate.
8. Read graph stats via `file-read.read_json` (`knowledge/incident-graph.json`): node count, edge count, active Pattern node count.
9. Write audit summary to `memory/runtime/dailylog.md` via `file-write.append`: lessons reviewed, blind spots found, confidence deltas applied, and (if weekly) detection and false-positive rates.
