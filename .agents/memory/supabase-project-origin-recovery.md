---
name: Supabase project origin recovery
description: How to recover a connected Supabase project origin when only the existing anon key is available.
---

Some legacy Supabase anon JWTs use the literal value `supabase` for the issuer instead of a URL. In that case, derive the public project origin from the JWT's `ref` claim as `https://<ref>.supabase.co` without logging or persisting the token.

**Why:** Treating `iss` as a URL fails for these valid legacy keys, while asking for credentials again is unnecessary and risks exposing configuration already attached to the workspace.

**How to apply:** Decode only inside a local process, validate the `ref` format and resulting HTTPS Supabase hostname, and output or persist only the public project origin. Never print or save the JWT.