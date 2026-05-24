# Instructions — afterburn Operational Runbook

## What afterburn does

afterburn ingests post-mortems, builds a causal knowledge graph, and
posts targeted warnings on pull requests that touch historically fragile
patterns. It never blocks merges. Engineers decide.

---

## Prerequisites

1. A GitHub token with `pull_requests: write` and `contents: read` scope.
2. A memory backend configured (default: Cognis). See `.env.example`.
3. At least one ingested post-mortem before PR checks produce useful output.

---

## First-time setup

```
cp .env.example .env
# Fill in COGNIS_API_KEY, GITHUB_TOKEN, and ANTHROPIC_API_KEY
scripts/bootstrap.ps1
```

Bootstrap loads hooks, verifies the memory backend connection, and
confirms the knowledge graph structure is intact.

---

## Ingest a post-mortem

Trigger the `ingest-incident` skillflow manually or via webhook:

```
# Manual — local file
afterburn run skillflow ingest-incident --source path/to/postmortem.md

# Manual — URL
afterburn run skillflow ingest-incident --source https://...

# Webhook (configure endpoint in scheduler.yml)
POST /hooks/ingest  { "source": "url-or-path" }
```

The skillflow runs in order: ingestor → extractor → cartographer → scribe.
Each stage must complete successfully before the next begins.

---

## Enable PR checks

Add afterburn to your GitHub Actions workflow, or configure the webhook
trigger in `scheduler.yml`. On each PR open or synchronize event, the
`pr-check` skillflow fires: oracle → (jnr | snr | architect)-oracle.

The dispatched oracle tier posts a comment on the PR, or stays silent
(jnr tier when no incident history exists for changed files).

---

## Respond to a warning

Engineers have three comment commands:

| Command                          | Effect                                              |
|----------------------------------|-----------------------------------------------------|
| `/afterburn dismiss <reason>`    | Logs dismissal to the graph. No further action.     |
| `/afterburn addressed`           | Marks lesson node as addressed. Raises confidence.  |
| `/afterburn escalate`            | Re-routes to architect-oracle regardless of tier.   |

All outcomes feed back into the causal graph and inform future dispatches.

---

## Change the memory backend

Set `AFTERBURN_MEMORY_BACKEND` in `.env` to one of:
`cognis` | `filesystem` | `sqlite` | `s3`

To migrate data between backends:

```
afterburn run skill export-memory --from cognis --to filesystem
```

The exporter uses only the memory-backend interface — it never touches
adapter internals.

---

## Weekly self-review

Runs automatically via the scheduler. To trigger manually:

```
afterburn run skillflow self-review
```

Results appear in `memory/runtime/dailylog.md` and as updated lesson
nodes in the memory backend.

---

## Troubleshooting

| Symptom                           | Check                                                          |
|-----------------------------------|----------------------------------------------------------------|
| No PR warnings appear             | Confirm at least one incident is ingested; inspect `knowledge/incident-graph.json` |
| Memory backend connection fails   | Verify `.env` credentials; run `export-memory --dry-run`       |
| Bootstrap fails on startup        | Check `hooks/hooks.yaml`; confirm all required env vars are set |
| Warning cites wrong incident      | Run `self-review` manually; check lesson node confidence weights |
