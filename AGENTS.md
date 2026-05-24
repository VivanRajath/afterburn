# Agents — Sub-agent Index

Top-level catalog of all nine sub-agents. Grouped by pipeline.

---

## Ingestion Pipeline

### ingestor
- **Path**: `agents/ingestor/`
- **Job**: Fetch raw incident text. No interpretation, no enrichment.
  Accepts a URL, file path, or raw text body. Writes to the memory
  backend under the raw-incidents scope.
- **Write scope**: memory backend (raw incidents)
- **Triggers**: manual invocation; `POST /hooks/ingest` webhook

### extractor
- **Path**: `agents/extractor/`
- **Job**: Run ontology extraction on raw incident text. Identify
  services, errors, triggers, root causes, mitigations, and code paths.
  Stages output in memory/runtime/ for cartographer to consume.
- **Write scope**: memory/runtime/ (extraction staging)
- **Triggers**: after ingestor (skillflow: ingest-incident)

### cartographer
- **Path**: `agents/cartographer/`
- **Job**: Merge extractor staging output into the causal graph. Resolve
  duplicate nodes. Detect and promote recurring patterns to first-class
  Pattern nodes (hot-zone, recurring, band-aid).
- **Write scope**: knowledge/incident-graph.json
- **Triggers**: after extractor (skillflow: ingest-incident)

---

## PR Check Pipeline

### oracle
- **Path**: `agents/oracle/`
- **Job**: Router. Inspects the PR diff, queries the causal graph, and
  dispatches to the appropriate cost tier: jnr, snr, or architect.
  Selection logic is defined in the check-pr skill.
- **Write scope**: read-only
- **Triggers**: PR opened or updated (skillflow: pr-check)

### jnr-oracle
- **Path**: `agents/jnr-oracle/`
- **Job**: Cheap-tier check. Skip or skim. Activated when changed files
  have zero past incidents in the graph. Logs the skip decision; no
  PR comment unless configured.
- **Write scope**: memory/runtime/ (decision log only)
- **Triggers**: dispatched by oracle (jnr condition)

### snr-oracle
- **Path**: `agents/snr-oracle/`
- **Job**: Standard check. Post a single PR comment citing 1–2 past
  lessons. Activated when changed files have prior incident history or
  are flagged as hot zones.
- **Write scope**: PR comment via github-client
- **Triggers**: dispatched by oracle (snr condition)

### architect-oracle
- **Path**: `agents/architect-oracle/`
- **Job**: Premium check. Multi-hop causal traversal. Detects band-aid
  patterns. Activated when the diff matches a prior trigger pattern.
  Posts a detailed PR comment with graph-traversal evidence.
- **Write scope**: PR comment via github-client
- **Triggers**: dispatched by oracle (architect condition)

---

## Memory & Learning Pipeline

### scribe
- **Path**: `agents/scribe/`
- **Job**: Distill raw lessons from confirmed incidents into structured,
  searchable lesson nodes. Writes only to the memory backend under the
  lessons scope.
- **Write scope**: memory backend (lessons)
- **Triggers**: after cartographer (skillflow: ingest-incident); on-demand

### self-reviewer
- **Path**: `agents/self-reviewer/`
- **Job**: Weekly audit. Compare past PR warnings against actual outcomes
  (dismiss, addressed, escalate). Log blind spots. Update confidence
  weights on lesson nodes.
- **Write scope**: memory backend + memory/runtime/
- **Triggers**: weekly cron (scheduler.yml); manual invocation
