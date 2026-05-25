---
name: ask
description: >
  Answer natural-language questions about a connected repository's
  incident history. Routes questions to the appropriate existing
  skill: ingest for new repos, check-pr for PR questions, direct
  graph queries for "what incidents are there" type questions.
license: MIT
allowed-tools: graph-query file-read
---

## Instructions

When the user asks a question, classify the intent and respond:

1. INGEST intent — phrases like "ingest this repo", "load
   post-mortems from <url>", "scan <repo>".
   Direct the user to run: `npm run dev` and use the platform's
   Connect Repo button. CLI-direct ingestion is v0.2 roadmap.

2. LIST intent — phrases like "what incidents", "list incidents",
   "show me the graph", "what's in here".
   Read agent/knowledge/incident-graph.json directly via file-read.
   Summarize the incidents: title, severity, status, band_aid flag.
   Cap at 10. Note hot zones and patterns separately.

3. EXPLAIN intent — phrases like "tell me about incident X",
   "explain the band-aid pattern", "what is LES-2024-001".
   Use graph-query to fetch the specific node and its neighbors
   (incident → root cause → mitigations → affected code paths).
   Render as a structured summary.

4. CHECK intent — phrases like "would this PR cause issues",
   "what about changing X file", "check this diff".
   If the user pastes a diff: route to the check-pr skill's logic
   by reading agent/examples/sample-pr/diff.patch as a template
   and substituting the user's input.
   If the user describes a change verbally: query the graph for
   files matching their description, return matched incidents
   and any band-aid/hot-zone warnings.

5. META intent — phrases like "what can you do", "help", "what
   skills do you have".
   List the four intents above with one-line examples.

Default behavior for unclear questions: ask a clarifying question
rather than guess. Never hallucinate incident details that aren't
in the graph.

Always cite specific node IDs (incident:xxx, code-path:xxx) when
referencing graph data so the user can verify.
