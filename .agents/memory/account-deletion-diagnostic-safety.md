---
name: Account deletion diagnostic safety
description: Why authentication rejection evidence is deliberately incomplete
---

Keep upstream authentication rejection bodies unread on account deletion. Temporary body diagnostics were removed after user-reported successful deletion with a fresh session, not after a newly established authentication root cause.

**Why:** Authentication error bodies are untrusted and can contain credentials or identities. The historical 403 observations discarded their response bodies, so they do not establish a root cause. Confidentiality takes priority over complete error text.

**How to apply:** Preserve the original diagnostic document as historical evidence, not current runtime guidance. Do not interpret historical omitted fields as proof that Supabase supplied none. Obtaining new production evidence requires separately authorized release and reproduction, never deliberate bearer replay against deletion.

For existing-evidence deletion investigations, start with the separate Post Round
app project, which the user identifies as the authoritative API owner. Do not
substitute the marketing workspace's API artifact or connector. Stop at a missing
verified project link or read access, and request only existing sanitized evidence,
not a retry.

**Why:** The user requires a strictly read-only investigation; prior workspace
reads targeted development and did not establish the production serving release
or connector authority.

**How to apply:** Tie domain, release, immutable source and connector authority to
the incident time. Current source/configuration and historical authentication
failures cannot establish that chain.
