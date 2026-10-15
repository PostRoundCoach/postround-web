---
name: Creator signup app handoff
description: User-verified native navigation and deliberate limits of the creator web signup handoff.
---

Historical manual verification covered exactly `golf-coach://`; the user now
reports that Open Post Round launches an installed app, but without the app it
opens a stalled scheme tab. Do not treat browser fixtures as device proof. The user
separately reports working creator signup, attribution, and manual same-account
native login; do not repeat these via production account mutations.

**Why:** The latest user report separates installed-app launch from the known
absent-app stalled tab. Source declarations and browser fixtures cannot establish
what a distributed installed build actually handles.

**How to apply:** Keep app opening independent of referral attribution and web
account success. Preserve store-first Install Referrer routing. The user says
Android distribution is through Google Play internal testing and supplied its
fallback link. Internal-test access is not a public details listing or proof of
Install Referrer support; keep that fallback separate from referral routing.
No package-derived or placeholder listing is acceptable. Web fixtures do not prove actual app launch,
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
