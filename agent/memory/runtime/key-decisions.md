# Key Decisions

<!-- Runtime append log. Do not edit manually.
     Every agent must append an entry here before performing a write
     that could affect graph integrity or cross a scope boundary.

     Entry format:
       ## YYYY-MM-DDTHH:MM:SSZ | <agent-name>
       **Decision:** <what was decided>
       **Reason:** <why>
       **Outcome:** <pending | completed | blocked>

     Example (do not pre-populate):
       ## 2024-11-15T02:01:30Z | cartographer
       **Decision:** Merged 4 new nodes from extraction INC-2024-007
       **Reason:** extractor staging complete, no duplicates detected
       **Outcome:** completed

     Scope violation entries use the format:
       **Decision:** BLOCKED — attempted write to <path>
       **Reason:** outside declared scope per DUTIES.md
       **Outcome:** blocked
-->
