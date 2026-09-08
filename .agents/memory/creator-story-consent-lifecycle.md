---
name: Creator Story consent lifecycle
description: Canonical meaning of the existing permission fields used by creator Story workflows.
---

An active permission row makes a qualified Story available to its matching creator, but player approval is represented separately by a non-null approval timestamp. Creator dismissal is represented by revoking that same creator-scoped row.

**Why:** Live records showed active rows without an approval timestamp. Treating active sharing as approval would bypass player consent, while changing the source Story would affect the player or other creators.

**How to apply:** Allow an authorized creator to preview and request approval while the active row is pending. Gate usable draft or publish mutations on the matching approval timestamp, and persist dismissal only on the matching creator permission row.