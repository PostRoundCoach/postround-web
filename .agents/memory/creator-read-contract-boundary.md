---
name: Creator read contract boundary
description: Keep the canonical minimal Creator read contract separate from older consumer expectations and live release proof.
---

The supplied canonical Creator Studio reads contract is authoritative even when
an existing web consumer requires richer fields or old aggregates. Do not widen
the read responses, add compatibility aliases, or modify the separate consumer
within API-only contract work.

**Why:** The user explicitly requested exact canonical responses and a separate
report of the incompatible consumer, rather than disguising that incompatibility.

**How to apply:** Treat consumer adaptation as separately scoped work. Local
mocked contract tests do not prove a serving release, real joined permission/count
behavior, or live authenticated integration. Keep source identity and release
identity separate, and exclude connector-backed fixture tests during explicitly
offline verification even when credentials are available.
