---
name: check-pr
description: >
  The demo skill. Inspect a PR diff, query the causal graph, select the
  appropriate oracle tier, post a warning if warranted, and log the outcome.
  The dispatch logic is the architectural centrepiece of this skill.
license: MIT
allowed-tools: graph-query github-client memory-backend
---

## Instructions

1. Fetch the PR diff via `github-client.get_pr_diff` (inputs: `repo`, `pr_number`). Extract the list of changed file paths.

2. Call `graph-query.incidents_touching_files` for each changed file path. Collect per-file incident counts and attached pattern flags.

3. **Tier: jnr** — if the total incident count across all changed files is zero, dispatch to `jnr-oracle` and stop. No PR comment is posted.

4. **Tier: snr** — if any file has 1–2 past incidents, or if `graph-query.pattern_match` returns a `hot-zone` hit on any changed file, mark `snr` as the active tier.

5. **Tier: architect** — call `graph-query.multi_hop` (max_hops: 3) on each matched CodePath node. If any path reaches a Trigger or RootCause node flagged as a `recurring` or `band-aid` pattern, upgrade the active tier to `architect`. Architect takes precedence over snr.

6. Dispatched snr or architect tier: call `memory-backend.search` (scope: lessons, query: changed file paths joined as a string, limit: 3). Post a PR comment via `github-client.post_comment` with body citing the top-ranked lesson id in `[LES-XXXX]` format.

7. Log dispatch tier and outcome to `memory/runtime/dailylog.md`. *(Performed by the dispatched tier agent via `file-write.append`. Oracle is read-only per DUTIES.md.)*
