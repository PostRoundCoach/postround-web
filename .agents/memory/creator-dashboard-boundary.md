---
name: Creator dashboard backend boundary
description: Security and capability limits of the cross-project creator-story integration.
---

The creator dashboard must read the owned active creator profile with the
authenticated Supabase client. Build its story queue from active
`story_permissions` scoped to that canonical creator, with an inner
`story_candidates` relation limited to `offered` and `shared`; a direct candidate
query can also reveal the creator's own golfer stories through separate owner
RLS. Content generation
uses the authenticated app endpoint and currently returns only a confirmed count.
Do not display generated ideas or offer creator-side dismissal until the backend
provides explicit creator-authorized contracts for those operations.

**Why:** The existing admin content reader is admin-only, service-role browser
access is forbidden, and the follower-side story status route does not authorize
creator revocation. Reusing either would cross an authorization boundary.

**How to apply:** Keep generated-idea retrieval and story dismissal visibly
unavailable in creator UI until a backend contract verifies canonical creator
ownership and permission. Never fill these gaps with mocks or client-side state.