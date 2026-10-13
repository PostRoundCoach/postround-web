---
name: Creator Story consent lifecycle
description: Canonical meaning of the existing permission fields used by creator Story workflows.
---

When a player selects “Share with Creator” in the app, the player has approved
that story for sharing with the creator. An active granted permission is already
approved even when no approval request exists. Do not require a second approval
from the creator or player.

**Why:** The user explicitly confirmed this is established product behavior.

**How to apply:** Recognize approved sharing from the existing authenticated
permission grant and its timestamp, excluding revoked permissions. Preserve
the sharing flow, permission relationships and export behavior. Independently
supported pending/requested workflows still use their existing permission fields.
Dismiss only the matching creator permission row, not the underlying player Story.

Full first-person player transcripts are more sensitive than the short round context that creators can review while approval is pending. Keep transcript text out of creator responses until the player's approval timestamp exists, even when the creator has an active sharing permission.

**Why:** A pending permission without an approval grant must not expose sensitive
material merely because its download button is disabled. An approved Share with
Creator grant already satisfies approval; do not add another consent step.

**How to apply:** When adding new player-authored export content, check the approval timestamp at the server response boundary as well as the client download gate.