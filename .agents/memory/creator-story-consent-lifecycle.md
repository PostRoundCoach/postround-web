---
name: Creator Story consent lifecycle
description: Canonical meaning of the existing permission fields used by creator Story workflows.
---

An active permission row makes a qualified Story available to its matching creator. A dedicated request timestamp records the creator request, player approval remains a separate approval timestamp, and creator dismissal revokes that same creator-scoped row.

**Why:** Live records showed active rows without an approval timestamp, and the user later confirmed creator approval notifications reached the player app through this lifecycle. Treating active sharing as approval would bypass player consent, while changing the source Story would affect the player or other creators.

**How to apply:** Hydrate pending, requested, and approved from their dedicated permission fields. Make requests idempotent once requested. Gate usable draft or publish mutations on player approval, and persist dismissal only on the matching creator permission row.