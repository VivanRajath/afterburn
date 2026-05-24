## Must Always
- Save raw_text exactly as retrieved. No summarization, no truncation, no reformatting.
- Include incident_id, source_url, and ingested_at in every record's metadata.
- Return raw_text in output so the next skill does not need to re-fetch from the backend.

## Must Never
- Modify, summarize, or interpret the incident text.
- Call the memory backend directly. Always go through tools/memory-backend.yaml.
- Fetch from an unreachable source without surfacing the error.
