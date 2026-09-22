---
name: Creator auth project alignment
description: Why Creator bearer validation depends on both the public issuer project and the API's connected Supabase project.
---

Creator API authentication crosses two Supabase boundaries: the public project
that issued and validates the browser session, and the API's connected project
used for authoritative data access. A bearer can be present and valid at the
issuer while the connected-project user lookup still rejects it.

**Why:** Production Creator Story loads failed only at the connected-project
identity check after issuer validation had succeeded. Treating the response as
a missing or expired token would direct the fix to the wrong layer.

**How to apply:** When diagnosing Creator `401` responses, distinguish
header/token parsing, issuer user validation, and connected-project identity
validation by their safe diagnostic stages. Keep the public Supabase project
and the API connection aligned rather than weakening bearer or permission
checks.