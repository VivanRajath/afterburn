
# afterburn — Build Brief for Claude Code

## 0. How to use this document

You are building afterburn, a gitagent-native AI agent. This file is the
source of truth. Read it end to end before writing any code. Re-read
relevant sections before each phase. When in doubt, ask the user — do
not invent.

## 1. The one-line pitch

afterburn turns post-incident chaos into pre-incident warnings. It
ingests post-mortems, builds a causal graph of services and root causes
in the gitagent knowledge/ tree, and surfaces specific historical
warnings on PRs that touch the same patterns.

## 2. The spec we comply with

gitagent v0.1.0 — the open standard at https://www.gitagent.sh/

Key files the spec mandates and their roles:
- agent.yaml         : config — model, skills, tools, sub-agents, runtime
- SOUL.md            : identity, personality, mission
- RULES.md           : must-always / must-never constraints
- AGENTS.md          : sub-agent index (a top-level catalog)
- INSTRUCTIONS.md    : operational runbook (how to use the agent)
- DUTIES.md          : segregation-of-duties policy
- scheduler.yml      : cron + webhook triggers
- skills/<name>/SKILL.md   : capability modules with YAML frontmatter
- tools/<name>.yaml  : capability primitives
- knowledge/         : structured knowledge (the causal graph lives here)
- memory/MEMORY.md + memory/runtime/{dailylog,key-decisions,context}.md
- hooks/{hooks.yaml,bootstrap.md,teardown.md}
- skillflows/<name>.yaml   : deterministic multi-step pipelines
- compliance/{risk-assessment.md, regulatory-map.yaml}
- agents/<name>/     : sub-agents, each with their own agent.yaml/SOUL.md/RULES.md

## 3. Architectural principles — non-negotiable

PRINCIPLE 1: Storage is pluggable. afterburn separates the reasoning
layer (the causal graph in knowledge/) from the storage layer (raw text
and lessons). Cognis is the default and recommended backend. The
filesystem, sqlite, and s3 adapters exist as escape hatches. A
bidirectional exporter lets teams migrate between backends.

PRINCIPLE 2: Cognis is default but never required. Every memory call
goes through the memory-backend interface. Never call the Cognis API
directly from a skill or sub-agent.

PRINCIPLE 3: Seven role-isolated sub-agents, with the Oracle further
split into three cost tiers (jnr/snr/architect). Each sub-agent has
bounded write scope declared in DUTIES.md. No agent crosses scope.

PRINCIPLE 4: HITL by default. afterburn never auto-blocks merges. It
posts warnings as PR comments. Engineers can dismiss, mark addressed,
or rewrite. Every outcome is logged back to the graph.

PRINCIPLE 5: Self-correcting. The self-reviewer runs weekly to audit
past predictions and log blind spots. The agent gets sharper over time.

## 4. The seven sub-agents

| Sub-agent       | Job                                                  | Write scope                  |
|-----------------|------------------------------------------------------|------------------------------|
| ingestor        | Fetch raw incident text. No interpretation.          | memory backend (raw)         |
| extractor       | Run ontology extraction on text.                     | memory/runtime/              |
| cartographer    | Merge subgraphs into knowledge/incident-graph.json   | knowledge/                   |
| oracle          | Router for PR checks. Inspects diff, picks tier.     | (read-only)                  |
| jnr-oracle      | Cheap-tier check. Skip-or-skim. No-history diffs.    | memory/runtime/ (log only)   |
| snr-oracle      | Mid-tier. Standard warning citing past lessons.      | PR comment                   |
| architect-oracle| Premium tier. Multi-hop traversal + band-aid detect. | PR comment                   |
| scribe          | Write distilled lessons to the memory backend.       | memory backend (lessons)     |
| self-reviewer   | Weekly audit of past predictions. Log blind spots.   | memory backend + memory/     |

The Oracle is a router. It dispatches to jnr/snr/architect based on:
- jnr: changed files have zero past incidents in the graph
- snr: changed files have 1-2 past incidents OR are flagged hot zones
- architect: diff resembles a past trigger pattern (multi-hop match)

## 5. The memory backend interface

Every memory operation goes through this contract. Four methods only:

  save_incident(id, raw_text, metadata)
  save_lesson(id, distilled_text, tags)
  search(query, scope, limit)
  get(id)

Adapters that must exist:
  - memory-cognis     : default, recommended
  - memory-filesystem : always available, zero config
  - memory-sqlite     : self-hosted small teams
  - memory-s3         : enterprise blob storage

The exporter (skills/export-memory) reads from one adapter and writes
to another using only the interface. It must not depend on any
adapter's internals.

## 6. Data model — the causal graph

Node types: Service, Error, Trigger, RootCause, Symptom, Mitigation,
            CodePath, Incident, Lesson, Pattern, Hook, SkillFlow

Edge types: caused, manifested_as, resolved, touched, depended_on,
            satisfies, references, prevented_by, learned_from

The graph lives in knowledge/incident-graph.json as a flat JSON
document with {nodes: [...], edges: [...]}. Schema is declared in
knowledge/schema/nodes.yaml and knowledge/schema/edges.yaml.

Pattern flags are first-class nodes:
  - pattern:hot-zone:<file>           (file in 3+ incidents)
  - pattern:recurring:<root-cause>    (same cause, multiple times)
  - pattern:band-aid:<mitigation>     (same fix, root cause unfixed)

## 7. Build order — do these in phases. Stop and show me after each.

### Phase 1: Manifest and identity
  1. agent.yaml         (the manifest — everything references this)
  2. SOUL.md            (identity)
  3. RULES.md           (constraints)
  4. DUTIES.md          (segregation of duties)
  5. AGENTS.md          (sub-agent index)
  6. INSTRUCTIONS.md    (operational runbook)
  STOP. Show me. I will review.

### Phase 2: The memory backend (the architectural keystone)
  7. tools/memory-backend.yaml   (the interface contract)
  8. tools/memory-cognis.yaml
  9. tools/memory-filesystem.yaml
 10. tools/memory-sqlite.yaml
 11. tools/memory-s3.yaml
 STOP. Show me.

### Phase 3: The remaining tools
 12. tools/ontology-extractor.yaml
 13. tools/graph-query.yaml
 14. tools/github-client.yaml
 15. tools/sandbox-runner.yaml
 16. tools/file-read.yaml
 17. tools/file-write.yaml
 STOP.

### Phase 4: Knowledge schema and patterns
 18. knowledge/index.yaml
 19. knowledge/schema/nodes.yaml
 20. knowledge/schema/edges.yaml
 21. knowledge/patterns/hot-zones.yaml
 22. knowledge/patterns/band-aid-signatures.yaml
 23. knowledge/patterns/recurring-causes.yaml
 24. knowledge/incident-graph.json   (empty {nodes:[], edges:[]})
 STOP.

### Phase 5: Memory runtime templates and hooks
 25. memory/MEMORY.md
 26. memory/runtime/dailylog.md          (just a header — runtime appends)
 27. memory/runtime/key-decisions.md
 28. memory/runtime/context.md
 29. hooks/hooks.yaml
 30. hooks/bootstrap.md
 31. hooks/teardown.md
 32. scheduler.yml
 STOP.

### Phase 6: Skills (the seven capabilities)
 33. skills/ingest-incident/SKILL.md
 34. skills/extract-ontology/SKILL.md
 35. skills/reconcile-graph/SKILL.md
 36. skills/distill-lesson/SKILL.md
 37. skills/check-pr/SKILL.md           (the demo skill)
 38. skills/self-review/SKILL.md
 39. skills/export-memory/SKILL.md
 STOP.

### Phase 7: Skillflows (the deterministic pipelines)
 40. skillflows/ingest-incident.yaml
 41. skillflows/pr-check.yaml           (the demo flow)
 42. skillflows/self-review.yaml
 43. skillflows/bootstrap-from-cognis.yaml
 STOP.

### Phase 8: Sub-agents (the nine specialists)
 44. agents/ingestor/        (agent.yaml + SOUL.md + RULES.md)
 45. agents/extractor/
 46. agents/cartographer/
 47. agents/oracle/          (the router)
 48. agents/jnr-oracle/
 49. agents/snr-oracle/
 50. agents/architect-oracle/
 51. agents/scribe/
 52. agents/self-reviewer/
 STOP.

### Phase 9: Compliance, examples, scripts, docs
 53. compliance/risk-assessment.md
 54. compliance/regulatory-map.yaml
 55. compliance/validation-schedule.yaml
 56. examples/sample-incident/incident.md       (a realistic post-mortem)
 57. examples/sample-incident/expected-graph.json
 58. examples/sample-pr/diff.patch
 59. examples/sample-pr/expected-warning.md
 60. .env.example                                (Cognis + GitHub + LLM keys)
 61. .gitignore
 62. README.md                                   (user-facing)
 63. ARCHITECTURE.md                             (technical deep-dive)
 64. LICENSE                                     (MIT)
 65. scripts/bootstrap.ps1                       (windows setup)
 66. scripts/run-demo.ps1                        (run the demo end-to-end)
 STOP.

## 8. Do-not rules — guardrails

DO NOT call the Cognis API from any skill or sub-agent directly. Always
go through tools/memory-backend.yaml.

DO NOT auto-block PRs anywhere. afterburn posts comments. Humans decide.

DO NOT invent gitagent spec fields. If unsure, refer to the official
spec at https://www.gitagent.sh/ or ask me.

DO NOT write Python or JavaScript implementations during scaffolding.
Tools and skills are declarative YAML/Markdown. Implementation code
comes later in a separate phase.

DO NOT add features beyond the seven sub-agents listed in section 4.
If you think something is missing, ask before adding.

DO NOT make the file count larger than necessary. Each file should
earn its place.

DO NOT use Lyzr-specific assumptions outside the Cognis adapter. The
rest of the system is vendor-agnostic by design.

## 9. Style and tone

For SOUL.md files: first person, direct, no marketing language.
"I am the Extractor. I read text. I find entities. I do not interpret."

For RULES.md files: imperative bullets. "Never modify knowledge/ from
this agent. Always log a decision before writing."

For SKILL.md files: include YAML frontmatter (name, description,
license, allowed-tools), then concise step-by-step instructions.

For agent.yaml files: follow the gitagent v0.1.0 schema. spec_version
"0.1.0". Always include name, version, description, author, license,
model, skills, tools, runtime.

For YAML in general: 2-space indent, no trailing whitespace, comments
for non-obvious fields.

## 10. When you finish each phase

Output two things:
  1. A list of files created in that phase.
  2. One paragraph: "what I did, what I deferred, what I'm unsure about."

Then stop and wait for my review. Do not start the next phase until I
say "continue."

## 11. Reference repos I've shipped (for context)

- Knowledge Graph Builder — ontology extraction from documents. The
  extractor's design draws from this.
- repo-sandbox-agent — 23-agent orchestrator with guardrails and the
  tier-routing pattern that informs the Oracle.
- Jr Architect — sandboxed repo runner. The sandbox-runner tool's
  design draws from this.

afterburn is the synthesis of these into a single focused agent.