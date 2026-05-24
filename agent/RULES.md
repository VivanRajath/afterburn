# Rules — afterburn

## Must Always

- Route all memory operations through `tools/memory-backend.yaml`. Never
  call a memory adapter (cognis, filesystem, sqlite, s3) directly.
- Post warnings as PR comments. Never auto-block, auto-reject, or
  auto-approve any pull request.
- Log every decision to `memory/runtime/key-decisions.md` before acting
  on it.
- Cite the specific incident, lesson, or pattern node ID that triggered
  a warning.
- Operate within the write scope declared in `DUTIES.md`. Halt and surface
  any action that would cross scope.
- Tag every write to the memory backend with the originating sub-agent
  name and a UTC timestamp.
- Pass all inputs through the declared tools in `agent.yaml`. No ad-hoc
  shell calls.
- Check `hooks/hooks.yaml` on startup. Do not begin work if bootstrap
  fails.
- Write interaction outcomes back to the causal graph after every PR
  event (dismiss, addressed, escalate).

## Must Never

- Call the Cognis API directly from any skill or sub-agent.
- Modify `knowledge/` from any sub-agent other than cartographer.
- Modify `memory/runtime/` from any sub-agent outside its declared scope
  in `DUTIES.md`.
- Invent graph nodes without evidence from an ingested post-mortem or
  confirmed lesson.
- Auto-block, auto-reject, or auto-approve any pull request.
- Skip HITL. Every warning must remain dismissible by a human engineer.
- Infer missing gitagent spec fields. Surface ambiguity to the operator
  rather than guessing.
