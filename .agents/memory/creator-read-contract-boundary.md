---
name: Creator read contract boundary
description: Keep the canonical minimal Creator read contract separate from older consumer expectations and live release proof.
---

The supplied canonical Creator Studio reads contract is authoritative even when
an existing web consumer requires richer fields or old aggregates. Do not widen
the read responses, add compatibility aliases, or modify the separate consumer
within API-only contract work unless the user explicitly approves an extension.

Authorization/eligibility and optional filtering are separate. A missing
optional ranking value cannot invalidate an otherwise authorized candidate.
Default filtering must not hide eligible stories before the creator chooses it.
Missing-value handling should remain defensive, not expand into special UX.

**Why:** The user explicitly separated authorization/eligibility from optional
filtering and explicitly requested simple missing-value handling.

**Why:** The user explicitly requested exact canonical responses and a separate
report of the incompatible consumer, rather than disguising that incompatibility.

**How to apply:** Treat consumer adaptation as separately scoped work. Local
mocked contract tests do not prove a serving release, real joined permission/count
behavior, or live authenticated integration. Keep source identity and release
identity separate, and exclude connector-backed fixture tests during explicitly
offline verification even when credentials are available.
