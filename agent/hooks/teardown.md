# Teardown Hook

Runs at agent shutdown after all skills and sub-agents have completed.
Teardown failure is logged but does not prevent shutdown — the goal is
to record state, not to block exit.

## Steps

### 1. Flush runtime writes

Confirm that all pending `file-write append` calls to `memory/runtime/`
have been flushed to disk. If any writes are buffered, flush them now.

### 2. Commit graph state

Read `knowledge/incident-graph.json`. If `updated_at` is non-null (meaning
the cartographer wrote at least one change this session), log the final
graph state to `memory/runtime/dailylog.md`:

```
- <HH:MM:SS> UTC | teardown | graph-committed | <N> nodes, <M> edges, updated_at=<updated_at>
```

If `updated_at` is null, the graph was not modified this session. No
commit entry is needed.

### 3. Log run duration

Read `started_at` from `memory/runtime/context.md`. Calculate elapsed
time. Append to `memory/runtime/dailylog.md`:

```
- <HH:MM:SS> UTC | teardown | completed | run_id=<run-id>, duration=<Xs>
```
