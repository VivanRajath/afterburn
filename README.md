# afterburn

> Institutional memory with pattern recognition — surfaces warnings when a PR
> touches code that burned your team before.

## The problem

Engineering teams write post-mortems. They extract lessons, file action items, and
archive everything in Notion or Confluence. Six months later a new engineer opens a
pull request touching the exact payment processor code that caused a production
outage, and nobody warns them. The lesson exists. The connection to the code does
not.

The post-mortem pipeline has a last-mile problem: the knowledge it produces is
human-readable but not machine-actionable at PR time.

## The insight

The causal graph of past incidents is fully derivable from the post-mortems you
already have. Once that graph exists, matching a PR diff against it is a traversal,
not a search. The warning writes itself.

## What afterburn does

- **Ingests post-mortems** from GitHub issues or uploaded files and builds a
  persistent causal knowledge graph linking root causes, mitigations, services,
  and code paths.
- **Detects patterns** — hot zones (files touched in 3+ incidents), recurring
  root causes (no permanent fix), and band-aid mitigations (resolved without ever
  satisfying the root cause).
- **Checks PRs** at open time and routes appropriately: silent pass, single-lesson
  warning with citation, or a full multi-hop causal chain analysis.
- **Distills lessons** from patterns into 280-character summaries with confidence
  weights that update nightly based on engineer outcomes.
- **Audits itself** weekly — measuring detection rate and false-positive rate,
  surfacing blind spots, decaying stale confidence.

afterburn **never** auto-blocks, auto-approves, or auto-rejects a pull request.
It posts comments. Engineers decide.

## Status

Everything below is runnable end-to-end today:

- Live GitHub repo ingestion via system `git` + ontology extraction (Groq-primary,
  Anthropic / OpenAI fallback)
- Causal graph stored in `agent/knowledge/incident-graph.json` — 63 nodes, 83 edges
  seeded from PostHog post-mortems
- Tier-routed PR check (`jnr` / `snr` / `architect`) based on graph query results
- Band-aid pattern detection (mitigation resolved an incident but has no `satisfies`
  edge back to the root cause)
- Hot zone detection (code path touched in 3+ distinct incidents)
- Diff-aware graph highlighting: matched nodes glow at full opacity, unmatched dim to
  25%; hovering a highlighted node shows the relevant diff hunk in a tooltip
- Stale-diff auto-fade: if the diff changes after a check, matched nodes drop to 50%
  opacity and a banner prompts a re-run
- Pluggable memory adapters (Cognis default; filesystem, SQLite, S3 declared)
- Spec-compliant gitagent v0.1.0 (9 sub-agents, 9 skills, 11 tools — validates clean with 0 warnings)
- `ask` skill: natural-language REPL interface via `gitclaw --dir agent`

## Demo

See demo video: [link to be added after recording]

## How it fits the gitagent ecosystem

afterburn is a native [gitagent v0.1.0](https://www.gitagent.sh/) agent. Its
default memory backend is [Cognis by Lyzr](https://memory.studio.lyzr.ai) — a
team-scoped semantic memory store that makes incident knowledge searchable across
your engineering org. All memory calls go through the `tools/memory-backend.yaml`
interface, which means you can swap Cognis for a local filesystem, SQLite database,
or S3 bucket without modifying a single skill.

## Quick start

```bash
# 1. Copy and fill environment variables
cp .env.example .env

# 2. Ingest a post-mortem
gitagent run skillflows/ingest-incident.yaml \
  --input source_url=https://github.com/your-org/your-repo/issues/42

# 3. Check a PR
gitagent run skillflows/pr-check.yaml \
  --input repo=your-org/your-repo \
  --input pr_number=88

# 4. Bootstrap graph from an existing memory backend
gitagent run skillflows/bootstrap-from-cognis.yaml
```

On Windows, use the included PowerShell scripts:

```powershell
# Verify environment and seed graph
.\agent\scripts\bootstrap.ps1

# Run the full demo with sample data
.\agent\scripts\run-demo.ps1
```

See `examples/sample-incident/` for a fictional post-mortem and the graph it
produces, and `examples/sample-pr/` for what a PR warning looks like in practice.

### CLI via gitclaw

afterburn exposes a natural-language REPL through the `ask` skill,
backed by **Groq** (`llama-3.3-70b-versatile`):

```powershell
# 1. Install gitclaw
npm install -g gitclaw

# 2. Set your Groq API key (free tier works — get one at console.groq.com)
$env:GROQ_API_KEY = "gsk_..."

# 3. Launch the REPL
npm run demo:cli
# — or —
gitclaw --dir agent
```

Sample prompts once the REPL starts:

| Intent | Example prompt |
|---|---|
| Meta | `what can you do?` |
| List | `what incidents are there?` |
| Explain | `tell me about the band-aid pattern` |
| Check | `what would happen if I changed src/payments/handler.py?` |

The `ask` skill is read-only — it queries the graph and surfaces warnings;
it never writes.

## Roadmap

**v0.2**

- Route repo clones through [Jr Architect](https://github.com/VivanRajath/Jr-Architect),
  a Docker-isolated sandbox runtime, so untrusted repos never touch the host filesystem
- Incremental graph updates (re-ingest only changed post-mortem files, not the full repo)
- GitHub App mode: afterburn posts PR comments directly instead of surfacing warnings
  only in the web UI

## Architecture

See [agent/ARCHITECTURE.md](agent/ARCHITECTURE.md) for the full system walkthrough — agent
identities and tool budgets, the causal graph schema, tier routing logic, and the
band-aid pattern as a worked example.

## License

MIT — see [LICENSE](LICENSE).
