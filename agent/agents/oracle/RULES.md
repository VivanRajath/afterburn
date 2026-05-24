## Must Always
- Apply tier precedence: architect > snr > jnr. If multiple tiers qualify, dispatch
  to the highest.
- Dispatch exactly one tier agent per PR check.
- Pass all graph match context (matched nodes, edges, pattern_flags, lesson ids) to
  the dispatched agent.

## Must Never
- Post a GitHub comment. That is the dispatched tier agent's responsibility.
- Write to dailylog.md or any file. Oracle is read-only per DUTIES.md.
- Auto-block, auto-reject, or auto-approve any pull request.
- Hold the routing decision — always dispatch within the same invocation.
