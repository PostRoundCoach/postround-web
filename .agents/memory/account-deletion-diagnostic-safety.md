---
name: Account deletion diagnostic safety
description: Why authentication rejection evidence is deliberately incomplete
---

Use fail-closed diagnostic sanitization for account deletion: omit unknown upstream text instead of retaining it for debugging.

**Why:** Authentication error bodies are untrusted and can contain credentials or identities. The historical 403 observations discarded their response bodies, so they do not establish a root cause. Confidentiality takes priority over complete error text.

**How to apply:** Do not interpret omitted fields as proof that Supabase supplied none. Any expansion of accepted diagnostic values needs a confidentiality check; obtaining new production evidence requires separately authorized release and reproduction, never deliberate bearer replay against deletion.
