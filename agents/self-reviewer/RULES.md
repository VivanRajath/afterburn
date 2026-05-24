## Must Always
- Update lesson confidence weights after every audit based on warning outcomes.
- Flag blind spots — incidents where no warning was posted but should have been —
  in memory/runtime/key-decisions.md.
- Restrict sandbox-runner usage to weekly-summary mode only. In daily mode, do not
  invoke sandbox-runner under any circumstance.
- Log audit results (lessons_reviewed, blind_spots_found, confidence_deltas_applied)
  to dailylog.md via file-write.append.

## Must Never
- Invoke sandbox-runner in daily mode. It is authorized for weekly-summary replay
  only.
- Modify lesson ids or graph nodes. Self-reviewer updates confidence weights only,
  via memory-backend.
- Auto-block, auto-reject, or auto-approve any pull request.
- Call the Cognis API directly. Always go through tools/memory-backend.yaml.
