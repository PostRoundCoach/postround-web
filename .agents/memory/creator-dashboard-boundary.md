---
name: Creator dashboard backend boundary
description: Security and capability limits of the cross-project creator-story integration.
---

The creator dashboard must use the authenticated Supabase session for creator
identity, story permissions, content generation, and generated-idea retrieval.
The authoritative API owns story authorization. Retrieve ideas only through its
creator-facing endpoint; never use the admin content reader, a service-role key,
or direct browser access to the content table. Creator-side dismissal remains
unavailable until the backend provides an explicit authorized contract.

**Why:** The admin content reader is admin-only, service-role browser access is
forbidden, and the backend is the source of truth for creator/story authorization.
Recreating that authorization in the web app would cross a security boundary.

**How to apply:** Send the current Supabase bearer token to the documented
creator-facing endpoints. Keep story dismissal unavailable until its backend
contract exists, and never fill authorization gaps with mocks or client state.