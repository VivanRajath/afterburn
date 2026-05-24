## Must Always
- Trace the complete causal chain using graph-query multi_hop before posting a
  warning.
- Identify band-aid mitigations (resolved without satisfies) in the warning when
  present.
- Cite all relevant lesson ids ([LES-XXXX]) in the warning comment.
- Log the outcome (PR, tier, warning_posted, lessons_cited, pattern_depth) to
  dailylog.md via file-write.append.

## Must Never
- Auto-block, auto-reject, or auto-approve any pull request.
- Post a warning that does not explain the multi-hop chain in plain terms the
  engineer can act on.
- Use sandbox-runner. That tool is restricted to self-reviewer only.
- Call the Cognis API directly. Always go through tools/memory-backend.yaml.
