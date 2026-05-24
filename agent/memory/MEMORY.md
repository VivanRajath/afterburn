# Memory — afterburn

Index of the afterburn memory system. Two layers: the persistent backend
(incidents and lessons, managed via tools/memory-backend.yaml) and the
runtime scratch space (append-only logs for the current session).

## Persistent backend

Incidents and lessons are stored in the configured memory backend adapter.
Select the adapter with `AFTERBURN_MEMORY_BACKEND`. Default: cognis.

See `tools/memory-backend.yaml` for the interface contract.
See `tools/memory-cognis.yaml` (and the other adapter files) for
adapter-specific configuration.

## Runtime scratch space

Files in `memory/runtime/` are append-only markdown logs maintained for
the current session. Agents write to these files; they are never read by
the memory backend interface. They survive across runs and are audited by
the self-reviewer.

| File                         | Written by                    | Purpose                          |
|------------------------------|-------------------------------|----------------------------------|
| memory/runtime/dailylog.md   | all agents (via file-write)   | Chronological activity log       |
| memory/runtime/key-decisions.md | any agent before a write   | Decision audit trail             |
| memory/runtime/context.md    | bootstrap hook                | Current run context (id, backend, started_at) |
