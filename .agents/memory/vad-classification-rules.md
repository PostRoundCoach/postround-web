---
name: Conservative VAD classification
description: Evidence and severity constraints for deterministic VAD dashboard diagnoses.
---

Classify each diagnostic event using only its stored fields and earlier events in the
same session. Any earlier context used must identify its source event in the evidence.
Do not let later outcomes retroactively change an event-level diagnosis.

**Why:** Session-wide lookups can make ordinary earlier noise appear to have caused a
later submission problem, while incomplete route or meter data can create false device
diagnoses. High and critical labels are misleading unless persisted impact or a final
failure explicitly supports them.

**How to apply:** Treat normal meter windows as unclassified, require complete known
old/new routes for confirmed transitions, use explicit impact fields for high severity,
and use only normalized final-failure outcomes or explicit terminal events for critical
severity. Preserve the raw event payload separately from derived evidence.