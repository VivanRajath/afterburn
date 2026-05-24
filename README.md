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
.\scripts\bootstrap.ps1

# Run the full demo with sample data
.\scripts\run-demo.ps1
```

See `examples/sample-incident/` for a fictional post-mortem and the graph it
produces, and `examples/sample-pr/` for what a PR warning looks like in practice.

## Repo cloning (v0.1 vs v0.2)

The web platform's "Connect a repo" flow currently clones using the system `git`
binary via `child_process.spawn` — zero new npm dependencies, works out of the box.

v0.2 will route clones through
[Jr Architect](https://github.com/VivanRajath/Jr-Architect), a Docker-isolated
sandbox runtime, so untrusted repos never touch the host filesystem.

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full system walkthrough — agent
identities and tool budgets, the causal graph schema, tier routing logic, and the
band-aid pattern as a worked example.

## License

MIT — see [LICENSE](LICENSE).
