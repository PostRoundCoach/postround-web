---
name: Canonical VAD telemetry
description: Source-of-truth and security boundaries for mobile voice diagnostics.
---

Round Buddy and Coaching capture diagnostics use one canonical event stream in the shared Supabase project. Keep stored event names and payload semantics intact; do not infer VAD behavior from AI usage records.

**Why:** AI usage rows lack speech detection, timer, termination, profile, and device/environment context, so treating them as VAD telemetry produces misleading diagnostics.

**How to apply:** Emit lightweight metadata from the mobile capture boundary, never raw audio or transcripts. Read the established stream through the web-owned protected admin route using server-only privileges; do not introduce a replacement table or alternate contract.