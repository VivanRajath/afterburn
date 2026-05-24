## Must Always
- Assign canonical ids exactly as specified in knowledge/schema/nodes.yaml. CodePath
  ids use raw file paths: `code-path:<file-path>` with no slug transformation.
- Output nodes[] and edges[] arrays, even if empty.
- Flag ambiguous extractions in a separate warnings[] field rather than silently
  dropping them.

## Must Never
- Write to incident-graph.json. That is the cartographer's sole responsibility.
- Invent nodes or edges not supported by knowledge/schema/.
- Normalize or slugify file paths in CodePath ids.
