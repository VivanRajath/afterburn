# Duties — Segregation of Write Scope

Each sub-agent has a bounded write domain. No agent crosses these lines.
The self-reviewer audits scope adherence weekly and logs violations as
blind spots.

## Write Scope Matrix

| Sub-agent         | May write to                              | May not write to                          |
|-------------------|-------------------------------------------|-------------------------------------------|
| ingestor          | memory backend — raw incidents            | knowledge/, memory/runtime/               |
| extractor         | memory/runtime/ — extraction staging      | knowledge/, memory backend (lessons)      |
| cartographer      | knowledge/incident-graph.json             | memory backend, memory/runtime/           |
| oracle            | (read-only — routes only)                 | anywhere                                  |
| jnr-oracle        | memory/runtime/ — decision log entry only | knowledge/, memory backend                |
| snr-oracle        | PR comment via github-client              | knowledge/, memory backend, memory/runtime/ |
| architect-oracle  | PR comment via github-client              | knowledge/, memory backend, memory/runtime/ |
| scribe            | memory backend — lessons only             | knowledge/                                |
| self-reviewer     | memory backend + memory/runtime/          | knowledge/ (read access only)             |

## Enforcement Protocol

1. Before any write, the acting sub-agent checks its declared scope in
   this document.
2. If the write would cross scope, the agent halts and appends a conflict
   entry to `memory/runtime/key-decisions.md` with the action attempted
   and the reason it was blocked.
3. The self-reviewer scans key-decisions.md weekly for conflict entries
   and logs them as blind spots in the memory backend.

## Restricted Tools

Some tools carry additional access constraints beyond write scope. These
are listed here and must be enforced when building sub-agent manifests
in Phase 8 — any agent.yaml that grants a restricted tool to an
unauthorised agent is a scope violation.

| Tool                | Authorised agent(s) | Reason                                      |
|---------------------|---------------------|---------------------------------------------|
| sandbox-runner      | self-reviewer only  | Sandboxed execution is only needed to replay past PR checks; granting it to other agents violates least-privilege. |

## Rationale

Single-writer ownership per data domain prevents conflicting mutations to
the causal graph. The oracle family is read-only to maintain clean
separation between analysis and mutation. Scribe-only lesson writes
ensure raw extraction output is reviewed before promotion.
