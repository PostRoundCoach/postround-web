---
name: Account deletion diagnostic safety
description: Why authentication rejection evidence is deliberately incomplete
---

Keep upstream authentication rejection bodies unread on account deletion. Temporary body diagnostics were removed after user-reported successful deletion with a fresh session, not after a newly established authentication root cause.

**Why:** Authentication error bodies are untrusted and can contain credentials or identities. The historical 403 observations discarded their response bodies, so they do not establish a root cause. Confidentiality takes priority over complete error text.

**How to apply:** Preserve the original diagnostic document as historical evidence, not current runtime guidance. Do not interpret historical omitted fields as proof that Supabase supplied none. Obtaining new production evidence requires separately authorized release and reproduction, never deliberate bearer replay against deletion.
