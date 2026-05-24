# Bootstrap Hook

Runs at agent startup before any skill or sub-agent is invoked. If any
step fails, the agent halts. Do not proceed with degraded state.

## Steps

### 1. Verify knowledge graph

Open `knowledge/incident-graph.json`. Confirm:
- The file exists at the expected path.
- It parses as valid JSON.
- It contains the keys `nodes`, `edges`, `version`, and `updated_at`.

If the file is missing or malformed, halt with: "Bootstrap failed: knowledge
graph missing or invalid. Run `scripts/bootstrap.ps1` to reinitialize."

### 2. Verify memory backend

Using `tools/memory-backend.yaml`, issue a `get` call with a known-absent
id (e.g. `probe:bootstrap-check`). A `null record` response confirms the
backend is reachable. An error response means the backend is unreachable.

If unreachable, halt with: "Bootstrap failed: memory backend
`<AFTERBURN_MEMORY_BACKEND>` is not reachable. Check credentials and
network access."

### 3. Generate and log run id

Generate a run id in the format `run-<YYYY-MM-DD>-<HHMMSS>` using the
current UTC time.

Write the following to `memory/runtime/context.md` (overwrite, not append):

```
run_id: <run-id>
started_at: <ISO 8601 UTC>
memory_backend: <active adapter name>
knowledge_graph: knowledge/incident-graph.json (valid, <N> nodes, <M> edges)
```

Append one line to `memory/runtime/dailylog.md`:

```
## <YYYY-MM-DD>
- <HH:MM:SS> UTC | bootstrap | started | run_id=<run-id>
```
