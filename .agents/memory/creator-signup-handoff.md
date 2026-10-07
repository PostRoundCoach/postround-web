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

Keep referral-to-default-favorite persistence on the backend, not in native
attribution lookup/repair logic. An intentional player favorite must take
precedence over referral attribution.

**Why:** The user explicitly wants the backend's authoritative referral
relationship to supply native profile state, without making the native app
responsible for referral business logic.

**How to apply:** Keep future referral fixes within the server completion
transaction unless separately authorized. Even verified native source
consumption does not prove a distributed build or fresh same-account display.
