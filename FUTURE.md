# Future Directions

afterburn v0.1 is a working foundation. Four roadmaps beyond v0.2 worth naming.

## Runtime behavioral ingestion

Current ingestion is static — scan markdown post-mortems for what teams have already
written down. The richer source is the running application itself.

Clone the repo, boot it in a sandboxed runtime (Jr Architect, also mine, already
solves this), instrument lightly, run smoke tests, and observe which routes receive
traffic, which functions are reached, which database queries fire, which third-party
services are called, and which code paths are NEVER touched.

Dead code becomes a first-class graph node. Unused endpoints become predictive risk
signals — "this endpoint hasn't been called in 90 days; the PR refactoring it has
no production reference traffic." The graph schema doesn't change. Only the extractor.

## Cross-repo causal graphs

A frontend PR can cause a backend incident. A schema migration in service A breaks
service B's nightly batch job. v0.1 builds a graph per repo; v2 builds a graph per
team or org, with services as the connective tissue across repos. The afterburn
warning becomes "this PR changes a contract consumed by 3 other services."

## Multi-modal post-mortem ingestion

Markdown is one source. Others worth adapting:

- GitHub Issues labeled `incident` or `postmortem`
- Slack threads in `#incidents` channels (with consent)
- Notion / Confluence post-mortem databases
- PagerDuty / Datadog incident timelines

The ingest-repo skill becomes ingest-source with N adapters. Each produces nodes
against the same schema. The reasoning layer doesn't care where the raw text came from.

## Real-time diff-aware interaction

v0.1 ships a one-shot check: paste a diff, run Check, see highlights. The next layer
is incremental: each keystroke in the diff textarea incrementally updates which graph
nodes are relevant, before the user even hits Check. The diff becomes a live lens
over the graph.
