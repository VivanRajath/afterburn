---
name: ask
description: >
  Answer natural-language questions about a connected repository's
  incident history. Routes questions to graph queries and the
  existing audit logic. Uses Groq as the LLM provider per the
  agent's model configuration.
license: MIT
allowed-tools: graph-query file-read
---

## Instructions

Classify the user's question into one of four intents and respond
accordingly.

1. LIST intent — "what incidents", "list incidents", "show me 
   the graph", "what's in here".
   Read agent/knowledge/incident-graph.json via file-read.
   Summarize incidents: title, severity, status, band_aid flag.
   Cap at 10. Note hot zones and patterns separately.

2. EXPLAIN intent — "tell me about incident X", "explain the
   band-aid pattern", "what is LES-2024-001".
   Use graph-query to fetch the node and its neighbors (incident
   → root cause → mitigations → affected code paths). Render as
   a structured summary citing exact node IDs.

3. CHECK intent — "would this PR cause issues", "what about
   changing X file", "check this diff".
   If the user names a file path, query the graph for any
   code-path node matching it; return incidents that touched it
   and any band-aid / hot-zone warnings.

4. META intent — "what can you do", "help".
   List the three intents above with one-line examples.

Default behavior for unclear questions: ask a clarifying question
rather than guess. Never hallucinate incident details that aren't
in the graph.

Always cite specific node IDs (incident:xxx, code-path:xxx) when
referencing graph data.
