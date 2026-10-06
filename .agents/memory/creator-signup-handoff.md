---
name: Creator signup app handoff
description: User-verified native navigation and deliberate limits of the creator web signup handoff.
---

The user manually verified that the installed Android APK responds to exactly
`golf-coach://`. Use it only for user-initiated navigation, without inventing a
path, transferring a web session, or claiming native authentication was verified.

**Why:** The existing APK scheme was confirmed by the user, but no native source
or authentication handoff was verified as part of the web signup work.

**How to apply:** Keep app opening independent of referral attribution and web
account success. Preserve store-first Install Referrer routing. Leave the Google
Play destination unset until a verified listing exists; no package-derived or
placeholder listing is acceptable. Web fixtures do not prove actual app launch,
native sign-in, or native Install Referrer capture.
