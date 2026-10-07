---
name: Signup credential proof
description: Why email verification and a signup response do not alone prove that the entered password is reusable.
---

Require reusable same-account password credentials before presenting shared web signup as complete.
Do not treat a successful signup response or verified email alone as proof that a newly entered password
was saved for an existing unconfirmed account. Interrupted signup should resume confirmation/resend,
not submit account creation with another password.

**Why:** The product requires email/password sign-in in Android and web. Supabase can return an existing
unconfirmed account without updating its password; confirmed duplicates can return a masked user.
A fixture that accepts every password hides the original problem.

**How to apply:** Verify confirmed matching identity and successful same-ID password authentication
before completion. Keep fixtures stateful and reject wrong passwords. Check signup-confirmation templates
separately from passwordless-login templates; a working login OTP is not evidence that signup delivers a code.
Leave production Auth configuration changes subject to separate approval, and do not label web fixture
results as native or real-email evidence.

Auth fixtures must model the server's response-version contract as well as its JSON body.

**Why:** The newer Supabase Auth SDK ignores a JSON `code` unless it can read an appropriate API-version
response header. Browser fixtures without an exposed response header silently turn weak-password and
duplicate-account cases into generic errors, even though the application error handling is correct.

**How to apply:** Match real Auth response headers and CORS exposure in browser fixtures, or deliberately
use the supported legacy error shape. Do not work around inaccurate fixtures by parsing backend message text.
