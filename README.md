# afterburn

> Institutional memory with pattern recognition — surfaces warnings when a PR touches code that burned your team before.

## The problem

Engineering teams write post-mortems. They extract lessons, file action items, and archive everything in Notion or Confluence. Six months later a new engineer opens a pull request touching the exact payment processor code that caused a production outage, and nobody warns them. The lesson exists. The connection to the code does not.

The post-mortem pipeline has a last-mile problem: the knowledge it produces is human-readable but not machine-actionable at PR time.

## What it does

- **Ingests post-mortems** from GitHub repos or uploaded files and builds a persistent causal knowledge graph linking root causes, mitigations, services, and code paths.
- **Detects patterns** — hot zones (files touched in 3+ incidents), recurring root causes (no permanent fix), and band-aid mitigations (resolved without ever addressing the root cause).
- **Checks PRs** at open time and routes to the right tier: silent pass, single-lesson warning with citation, or a full multi-hop causal chain analysis.
- **Distills lessons** from patterns into concise summaries with confidence weights that update nightly based on engineer outcomes.
- **Audits itself** weekly — measuring detection rate and false-positive rate, surfacing blind spots, decaying stale confidence.

afterburn **never** auto-blocks, auto-approves, or auto-rejects a pull request. It posts comments. Engineers decide.

## Tech stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Graph viz**: react-force-graph-2d (force-directed, canvas-rendered)
- **LLM**: Groq (`llama-3.3-70b-versatile`) primary, Anthropic / OpenAI fallback
- **Agent layer**: 9 sub-agents, 9 skills, 4 pipelines — declarative YAML/Markdown
- **Storage**: flat JSON causal graph + pluggable memory backend (filesystem, SQLite, S3)

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Set environment variables
cp agent/.env.example agent/.env
# Add GROQ_API_KEY (or ANTHROPIC_API_KEY) to .env.local

# 3. Run the web app
npm run dev
# → http://localhost:3000
```

Enter a GitHub repo URL (default pre-filled: `PostHog/post-mortems`), wait ~30–60 s for ingestion, then paste a diff and click **Check**.

## CLI — natural-language graph queries

```bash
npm install -g gitclaw

# Set your Groq API key
export GROQ_API_KEY="gsk_..."   # or $env:GROQ_API_KEY on PowerShell

# Launch the REPL
npm run demo:cli
```

| Intent | Example prompt |
|---|---|
| Meta | `what can you do?` |
| List | `what incidents are there?` |
| Explain | `tell me about the band-aid pattern` |
| Check | `what would happen if I changed src/payments/handler.py?` |

## What's in the graph today

63 nodes · 83 edges · seeded from PostHog public post-mortems

Node types: Service, Error, Trigger, RootCause, Symptom, Mitigation, CodePath, Incident, Lesson, Pattern, Hook, SkillFlow

## How the PR check works

```
PR opened → oracle reads diff → queries causal graph
  ├── 0 matches          → silent pass (jnr-oracle)
  ├── 1-2 matches / hot zone → cited warning (snr-oracle)
  └── multi-hop pattern  → full chain analysis (architect-oracle)
```

Band-aid detection: a mitigation that `resolved` an incident but has no `satisfies` edge back to the root cause is flagged — the fix stopped the bleeding but the underlying problem remains.

## Roadmap

**v0.2**

- Docker-isolated sandbox runtime so untrusted repos never touch the host filesystem
- Incremental graph updates (re-ingest only changed post-mortem files, not the full repo)
- GitHub App mode: post PR comments directly without the web UI

## Architecture

See [agent/ARCHITECTURE.md](agent/ARCHITECTURE.md) for the full system walkthrough — sub-agent identities, tool budgets, the causal graph schema, tier routing logic, and the band-aid pattern as a worked example.

## License

MIT — see [LICENSE](LICENSE).
