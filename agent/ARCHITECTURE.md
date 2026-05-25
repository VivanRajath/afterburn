# afterburn — Architecture

## System Overview

afterburn is a [gitagent v0.1.0](https://www.gitagent.sh/) native agent with nine
sub-agents, nine skills, four skillflows, and a flat JSON causal knowledge graph.
It ingests post-mortems, extracts a structured graph, detects failure patterns, and
surfaces warnings at PR time.

```
post-mortem text
      │
      ▼
 [ingestor] ──raw_text──► [extractor] ──nodes/edges──► [cartographer]
                                                              │
                                             incident-graph.json
                                                              │
                                              pattern_flags ──┤
                                                              ▼
                                                         [scribe] ──lessons──► memory backend
                                                                                     │
                                                                        [self-reviewer] audits nightly

PR opened
      │
      ▼
  [oracle] ──graph-query──► incident-graph.json
      │
      ├── 0 matches ───────────► [jnr-oracle] → log skip
      ├── 1-2 matches / hot ───► [snr-oracle] → cite lesson → post comment
      └── multi-hop pattern ───► [architect-oracle] → trace chain → post comment
```

---

## Agent Pipeline

### Ingestion

| Agent | Model | Tools | Identity |
|---|---|---|---|
| **ingestor** | claude-haiku-4-5-20251001 | file-read, github-client, memory-backend | Fetches raw text; passes it forward verbatim |
| **extractor** | claude-sonnet-4-6 | file-read, ontology-extractor | Extracts nodes and edges per schema; never writes the graph |
| **cartographer** | claude-sonnet-4-6 | file-read, file-write, graph-query | Single writer of incident-graph.json; owns band-aid detection |

**Cartographer invariants:**

- **Idempotent** — running twice on the same input leaves the graph unchanged;
  duplicate nodes (matched by canonical id) are merged, not appended; duplicate
  edges (same source, target, type) are deduplicated.
- **Atomic writes** — every graph write uses `file-write.write_json` (write-then-rename).
  No partial writes.
- **updated_at stamped on every write** — ISO 8601 UTC; never left null after the
  first incident.
- **Band-aid check** — after recording every `resolved` edge, cartographer checks
  whether a `satisfies` edge exists on the same RootCause. If none, sets
  `band_aid_candidate: true` on the Incident node and emits a `pattern_flag`.

### PR Check

| Agent | Model | Tools | Identity |
|---|---|---|---|
| **oracle** | claude-haiku-4-5-20251001 | graph-query, github-client, memory-backend | Routes; never writes |
| **jnr-oracle** | claude-haiku-4-5-20251001 | file-write | Zero matches → log skip, no comment |
| **snr-oracle** | claude-sonnet-4-6 | github-client, memory-backend, file-write | 1-2 matches or hot zone → cited warning |
| **architect-oracle** | claude-opus-4-7 | github-client, memory-backend, graph-query, file-write | Multi-hop pattern → full chain warning |

**Tier routing — precedence: architect > snr > jnr**

| Tier | Condition |
|---|---|
| jnr | 0 past incidents touch any file in the diff |
| snr | 1–2 past incidents, OR any file is a hot zone (≥3 incidents) |
| architect | any file participates in a multi-hop causal pattern |

Oracle dispatches exactly one tier agent per PR check. Oracle is read-only — it
passes all graph context as dispatch parameters. The tier agent handles the GitHub
comment and the dailylog entry.

**afterburn never auto-blocks, auto-approves, or auto-rejects a pull request.**

### Distillation and Audit

| Agent | Model | Tools | Identity |
|---|---|---|---|
| **scribe** | claude-sonnet-4-6 | graph-query, memory-backend | Distills patterns → lessons |
| **self-reviewer** | claude-sonnet-4-6 | graph-query, memory-backend, sandbox-runner, file-read, file-write | Confidence updates; weekly replay |

sandbox-runner is authorized **only** for self-reviewer, and **only** in
`weekly-summary` mode. Every other agent's RULES.md explicitly prohibits it.

---

## Memory Backend Interface

All memory calls in every agent and skill go through `tools/memory-backend.yaml`.
Direct API calls to any backend are prohibited by RULES.md.

**Five methods:**

```yaml
save_incident(id, raw_text, metadata) → {id, backend}
save_lesson(id, body, confidence, metadata) → {id, backend}
search(query, scope, limit) → {records[], backend}
get(id) → {id, raw_text, metadata, backend}
list(scope, cursor, limit) → {records[], next_cursor, backend}
```

`list` supports cursor-based pagination. Pass `cursor: null` on the first call,
then forward `next_cursor` until it is null. Limit defaults to 100, capped at 500.

**Adapters:**

| Adapter | Backend | Semantic ranking | cursor_encoding |
|---|---|---|---|
| cognis | Lyzr Cognis | Server-side (opaque) | opaque server token |
| filesystem | local files | term_frequency_ratio | last filename, lexicographic |
| sqlite | SQLite FTS5 | FTS5 rank | last rowid of previous batch |
| s3 | AWS S3 | term_frequency_ratio | S3 ListObjectsV2 ContinuationToken |

Switch backends by setting `AFTERBURN_MEMORY_BACKEND`. After switching, run
`bootstrap-from-cognis` to rebuild the graph from the new backend's records.

---

## Causal Graph Schema

The graph lives at `knowledge/incident-graph.json`. Schema definitions are in
`knowledge/schema/`. The graph is the single source of truth for pattern detection
and tier routing.

### Node types (12)

| Type | Canonical id format | Key properties |
|---|---|---|
| Service | `service:<slug>` | name, version |
| Error | `error:<slug>` | message, code |
| Trigger | `trigger:<slug>-<date>` | source, occurred_at |
| RootCause | `root-cause:<slug>` | description, category |
| Symptom | `symptom:<slug>` | observable, severity |
| Mitigation | `mitigation:<slug>-<date>` | action, permanent |
| CodePath | `code-path:<raw-file-path>` | language, last_incident |
| Incident | `incident:<id>` | title, occurred_at, band_aid_candidate |
| Lesson | `lesson:<LES-YYYY-NNN>` | body, confidence |
| Pattern | `pattern:<type>:<key>` | threshold, first_seen |
| Hook | `hook:<name>` | trigger, phase |
| SkillFlow | `skillflow:<name>` | steps, trigger |

**CodePath ids use raw file paths with no slug transformation.**
`src/payments/webhook_handler.py` → `code-path:src/payments/webhook_handler.py`.
PR diff paths match graph keys directly. Do not normalize or slugify.

### Edge types (9)

| Type | Source → Target | Meaning |
|---|---|---|
| caused | RootCause → Service/Error/Symptom | direct causal link |
| manifested_as | Error → Symptom | observable surface |
| resolved | Mitigation → RootCause/Incident | stopped the incident (temporary) |
| touched | Incident → CodePath | files involved |
| depended_on | Service → Service | runtime dependency |
| satisfies | Mitigation → RootCause | **permanently addressed the root cause** |
| references | Lesson → Incident/Pattern | citation |
| prevented_by | RootCause → Mitigation | future prevention pointer |
| learned_from | Pattern → Incident | pattern evidence |

`resolved` and `satisfies` are distinct and both are required for the band-aid
check. A mitigation that `resolved` without a `satisfies` edge is a band-aid
candidate.

---

## Band-Aid Pattern: Worked Example

Source: `examples/sample-incident/incident.md`

**Incident PAY-2024-031501** — a missing database index on `webhook_events.stripe_event_id`
caused full table scans under Stripe retry load, exhausting the payments-service
connection pool and propagating timeouts to orders-service. The hotfix (adding the
index) stopped the incident but did not address the root cause (no index validation
in the migration pipeline).

**Graph after cartographer processes this incident:**

```
root-cause:missing-db-index-webhook-events
    │ caused
    ▼
error:connection-pool-exhaustion-payments
    │ manifested_as
    ▼
symptom:order-payment-status-timeout

incident:PAY-2024-031501
    │ touched
    ├──► code-path:src/payments/webhook_handler.py
    ├──► code-path:src/payments/db/migrations/0042_webhook_events.py
    └──► code-path:src/orders/payment_status.py

mitigation:add-webhook-events-index-2024-03-15
    │ resolved
    └──► incident:PAY-2024-031501
    (no satisfies edge → band_aid_candidate: true)

service:orders-service
    │ depended_on
    └──► service:payments-service
```

**What happens next:**

1. Cartographer finds no `satisfies` edge on `root-cause:missing-db-index-webhook-events`.
   Sets `band_aid_candidate: true` on the incident. Emits `pattern_flag`.
2. Scribe distills `LES-2024-001`: "Webhook handler tables need indexed lookup
   columns before production load. Missing index + retry storm = pool exhaustion."
   Confidence: 0.70.
3. A new PR touches `src/payments/webhook_handler.py`. Oracle queries the graph:
   one past incident, no multi-hop trigger. Routes to snr-oracle.
4. snr-oracle fetches `LES-2024-001` and posts the warning in
   `examples/sample-pr/expected-warning.md`.

---

## Skillflows

| Flow | Trigger | Steps | Purpose |
|---|---|---|---|
| `ingest-incident` | incident.created / manual | ingest → extract → reconcile → distill → log | Full pipeline for a single incident |
| `pr-check` | pull_request.opened / manual | check → log | PR tier dispatch |
| `self-review` | nightly 02:00 / weekly Sun 09:00 / manual | review → log | Confidence updates + weekly replay |
| `bootstrap-from-cognis` | manual | preflight → batch-ingest → log | Rebuild graph from memory backend |

**Skillflow constraints:**
- No conditional logic at the skillflow level. Branching lives inside skills.
- Every flow has a terminal log step writing to `memory/runtime/dailylog.md`.
- Data forwarded between steps via `${{ steps.X.outputs.Y }}` — never re-fetched.
- Iterative loops (pagination) owned by skills, not skillflows.
- `pull_request.synchronized` is excluded in v0.1. Revisit after self-review has
  tuned false-positive rates.

---

## Self-Review Loop

**Daily (02:00 UTC):**
- Retrieves lessons cited in PR warnings from the last 24 hours.
- Checks engineer outcomes: addressed / dismissed / failure occurred.
- Updates confidence weights (×1.1 for correct predictions, ×0.9 for false positives).
- Flags blind spots — missed warnings — in `memory/runtime/key-decisions.md`.

**Weekly (Sunday 09:00 UTC, `mode=weekly-summary`):**
- All daily steps, plus:
- Replays 30 days of PR checks in sandbox (sandbox-runner; network and filesystem
  writes disabled).
- Computes detection rate and false-positive rate.
- Logs both rates to `memory/runtime/dailylog.md`.

Confidence is bounded to [0.0, 1.0]. Initial confidence on new lessons is 0.7.

---

## Configuration Reference

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `GITHUB_TOKEN` | yes | — | PR diff fetch + comment posting |
| `AFTERBURN_MEMORY_BACKEND` | no | `cognis` | Active adapter |
| `LYZR_API_KEY` | if cognis | — | Lyzr authentication |
| `COGNIS_OWNER_ID` | if cognis | — | Cognis namespace |
| `COGNIS_API_URL` | no | `https://memory.studio.lyzr.ai` | Cognis endpoint |
| `AFTERBURN_FS_ROOT` | if filesystem | — | Root dir for file adapter |
| `AFTERBURN_SQLITE_PATH` | if sqlite | — | SQLite database path |
| `AFTERBURN_S3_BUCKET` | if s3 | — | S3 bucket name |
| `AFTERBURN_S3_REGION` | if s3 | — | S3 region |
| `AWS_ACCESS_KEY_ID` | if s3 | — | AWS credentials |
| `AWS_SECRET_ACCESS_KEY` | if s3 | — | AWS credentials |
| `AFTERBURN_S3_ENDPOINT` | no | — | S3-compatible endpoint override |

See `.env.example` for the full annotated list.
