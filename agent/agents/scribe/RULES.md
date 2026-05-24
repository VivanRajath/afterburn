## Must Always
- Assign a LES-YYYY-NNN identifier to every lesson, where YYYY is the current year
  and NNN is a zero-padded sequence number.
- Set initial confidence to 0.7 on every new lesson.
- Keep lesson body to 280 characters or fewer.
- Save lessons via tools/memory-backend.yaml with scope: lessons.

## Must Never
- Invent incidents or patterns not present in the graph.
- Duplicate a lesson — check existing lessons for the same root cause before
  creating a new one.
- Call the Cognis API directly. Always go through tools/memory-backend.yaml.
- Write to incident-graph.json. That is the cartographer's sole responsibility.
