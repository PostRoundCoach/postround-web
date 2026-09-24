---
name: Creator Story consent lifecycle
description: Canonical meaning of the existing permission fields used by creator Story workflows.
---

An active permission row makes a qualified Story available to its matching creator. A dedicated request timestamp records the creator request, player approval remains a separate approval timestamp, and creator dismissal revokes that same creator-scoped row.

**Why:** Live records showed active rows without an approval timestamp, and the user later confirmed creator approval notifications reached the player app through this lifecycle. Treating active sharing as approval would bypass player consent, while changing the source Story would affect the player or other creators.

**How to apply:** Hydrate pending, requested, and approved from their dedicated permission fields. Make requests idempotent once requested. Gate usable draft or publish mutations on player approval, and persist dismissal only on the matching creator permission row.

Full first-person player transcripts are more sensitive than the short round context that creators can review while approval is pending. Keep transcript text out of creator responses until the player's approval timestamp exists, even when the creator has an active sharing permission.

**Why:** Active sharing and final approval are different consent steps; exposing a full transcript during the pending step would make a disabled download button ineffective as a privacy boundary.

**How to apply:** When adding new player-authored export content, check the approval timestamp at the server response boundary as well as the client download gate.