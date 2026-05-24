# afterburn Risk Assessment — v0.1.0

**Assessed:** 2026-05-24
**Scope:** afterburn v0.1.0 as described in BUILD_BRIEF.md and the built artifact

---

## Risk Register

### R1 — False positive warnings (HIGH likelihood, LOW severity)

afterburn may post warnings on PRs that are not actually risky. Confidence weights
mitigate this over time, but the system starts with no calibration data.

**Mitigation:** Engineers always have final authority — afterburn never blocks.
Initial confidence is 0.7, not 1.0, so the system signals uncertainty. The
self-reviewer audits weekly false-positive rates and decays confidence on stale
lessons.

**Residual risk:** Accepted. False positives reduce trust if unaddressed. The
self-review loop is the primary control.

---

### R2 — False negative — missed pattern (MEDIUM likelihood, HIGH severity)

The system may fail to warn on a PR touching a file involved in a past incident,
either because the incident was never ingested or the causal graph is incomplete.

**Mitigation:** The self-reviewer surfaces blind spots nightly. The
bootstrap-from-cognis flow rebuilds the full graph from all ingested incidents.

**Residual risk:** Accepted. Coverage improves as more incidents are ingested.
v0.1 makes no guarantee of exhaustive coverage.

---

### R3 — Memory backend data exposure (LOW likelihood, HIGH severity)

Incident post-mortems stored in the memory backend may contain sensitive
operational data: internal service names, IP addresses, or customer data
references embedded in raw post-mortem text.

**Mitigation:** Cognis is team-scoped by default (metadata.shared controls
visibility). Filesystem and SQLite adapters use local storage. S3 inherits bucket
ACL.

**Residual risk:** Operators must configure backend access controls. afterburn
does not enforce encryption at rest — that is a backend-level control.

---

### R4 — GitHub token scope (LOW likelihood, HIGH severity)

The GITHUB_TOKEN used for PR diff fetching and comment posting could be misused
if issued with broader scope than required.

**Mitigation:** DUTIES.md and github-client.yaml restrict operations to
get_pr_diff, post_comment, and get_file_history. afterburn cannot approve, merge,
or close PRs.

**Residual risk:** Token scope is operator-controlled. Use a fine-grained PAT
scoped to read:pull_requests and write:discussion only.
