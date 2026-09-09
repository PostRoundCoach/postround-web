---
name: Creator dashboard backend boundary
description: Security and capability limits of the cross-project creator-story integration.
---

The creator dashboard must use the authenticated Supabase session for creator
identity, story permissions, generated-idea retrieval, and creator-specific dismissal.
The authoritative API owns story authorization. Retrieve ideas only through its
creator-facing endpoint; never use the admin content reader, a service-role key,
or direct browser access to the content table. Resolve the authorized Story to
its source round server-side and query ideas by round; production ideas may have
a null `story_id` and no creator-engine metadata.

**Why:** The admin content reader is admin-only, service-role browser access is
forbidden, and the backend is the source of truth for creator/story authorization.
Recreating that authorization in the web app would cross a security boundary.

**How to apply:** Send the current Supabase bearer token to the documented
creator-facing endpoints. Treat `granted_at` as the approval signal, scope
dismissal to the resolved creator permission, and never fill authorization gaps
with direct table access or client state.