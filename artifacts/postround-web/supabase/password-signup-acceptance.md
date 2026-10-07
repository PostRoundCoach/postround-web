# Password signup acceptance and release gates

## Implementation contract

- Web creates accounts with `auth.signUp({ email, password, options: { data: { display_name } } })`.
  It does not call `signInWithOtp`, `updateUser`, administrative account creation, or password replacement.
- The installed packages are `@supabase/supabase-js` 2.110.8 and `@supabase/ssr` 0.5.2.
  The installed Auth client supports email/password signup, `verifyOtp({ email, token, type: 'signup' })`
  and `resend({ email, type: 'signup' })`. Signup confirmation is distinct from a passwordless login OTP.
- Email confirmation must be enabled. A signup response containing an immediate session is treated as an
  incompatible configuration: the form signs out and does not continue. No configuration is changed.
- The **Confirm sign up** template must actually deliver `{{ .Token }}` and the token length must be six.
  Existing passwordless-login email delivery proves neither condition. Supabase's public
  [email template documentation](https://supabase.com/docs/guides/auth/auth-email-templates)
  describes `.Token` as a six-digit OTP. `.ConfirmationURL` alone is insufficient for this form.
  Do not change the signup template, token length, confirmation requirement, redirect settings,
  or password policy without separate owner approval.
- The web policy is at least eight characters with a letter and number, matching the existing recovery
  form. Supabase's active password policy remains authoritative; `weak_password` errors ask for a
  stronger password. The deployed policy has not been inspected or altered.
- Completion requires a server-validated, email-confirmed user matching the entered email, then a successful
  password sign-in returning the **same user ID**. This extra check is deliberate: an existing unconfirmed
  account can be returned by signup without saving the newly entered password. Supabase's upstream
  [signup handler](https://github.com/supabase/auth/blob/master/internal/api/signup.go) deliberately does not
  update an existing unconfirmed user because it cannot trust the claimed identity. The installed server
  version must still be verified on an approved test project.
- Confirmed duplicate accounts may yield a masked user with no identities or an explicit duplicate error.
  The UI provides conditional login/recovery guidance, never claims that a new password was saved,
  and cannot verify a confirmed account through a new signup code.
- An interrupted signup resumes by verification/resend, not another account/password submission. Only
  email, referral UI context, a resend deadline and an incompatible-configuration flag are stored in tab-scoped session storage.
  Passwords and OTPs stay in component memory, never storage, URLs, logs, analytics, or referral payloads.
  After refresh the original signup password must be re-entered to prove the credentials.
- Resend uses signup semantics, has a 60-second UI cooldown and respects server throttling.
  Request locks prevent concurrent form submits. Failed verification and network failures remain retryable.
- Referred completion still reads durable original attribution and retries transient referral failures.
  Ordinary completion still goes to the dashboard. Referral availability is not an authentication error.
  The confirmation page requires an authenticated email-confirmed user before constructing its content.
- App navigation remains exactly `golf-coach://`, with no path, credentials, session, or referral data.
  App opening is not authentication. The page tells users to sign in with their chosen email/password
  and follow the app's normal verification step.
- Login, recovery callbacks, native authentication, billing, referral schema and claim contract are unchanged.
  Signup is no longer automatically redirected by middleware on refresh, allowing its interrupted
  verification and credential checks to finish with the correct referred destination.

## Evidence available in this workspace

No owner-approved non-production Supabase Auth project or test inbox was designated.
No real signup emails were sent and no real Auth users were created for this change.
Production Auth configuration, email templates, password policy, migrations, environment variables,
and deployments were not changed.

Local fixture coverage is deliberately stateful: it stores the chosen signup password, rejects the wrong
password, blocks password login until email confirmation, consumes signup codes, checks verification/resend
types, masks confirmed duplicates, and preserves existing password/passwordless/unconfirmed credentials.
Browser coverage includes same-ID signout and password login, confirmation gating, referral immutability,
expired session/code, refresh, interrupted responses, temporary failures, resends, duplicate submissions,
recovery requests and credential-free app links. This proves the web request/response behavior against the
fixture only; it does **not** prove live Supabase configuration, email delivery, native sign-in or billing.

### Recorded results

- Unit/source regression checks: **124 passed**.
- Browser regressions: **35 scenarios passed across the initial run and focused retries**, covering password
  signup, public creator routes, verification/confirmation, referral immutability and portal navigation.
  The final seven outstanding scenarios passed in the current Chromium headless mode. Two invalid-evidence
  scenarios passed before that focused retry; earlier successful scenarios were not rerun unnecessarily.
- Isolated Next production build: **passed** with local fixture Auth/API variables.
- Final TypeScript check: **passed**; generated test-build configuration is restored by the runner.
- The initial browser runs had fixture/locator failures, legacy headless-shell actionability stalls,
  build-startup timeouts and a workspace restart. Completed-build reuse and the current Chromium mode
  allowed the outstanding assertions to run without weakening them. Interrupted runs do not count as passes.
- No approved non-production Auth project/inbox or Android device was available to the agent.
  Real email delivery, deployed policy/template compatibility and native same-user-ID sign-in remain
  **unverified**. The owner offered to perform the manual acceptance checklist below.

See `e2e/password-signup.spec.ts`, `e2e/signup-confirmation.spec.ts`, `e2e/fake-supabase.mjs`
and `src/lib/auth/signup.test.ts`. Browser suites build with `.next-e2e` and restore Next-generated
configuration via `e2e/run-tests.sh`; do not reuse the managed preview's `.next` output.

For focused reruns after a successful isolated fixture build, `E2E_USE_EXISTING_BUILD=1`
starts that build without rebuilding it. The runner refuses this mode unless `.next-e2e/BUILD_ID`
exists and the web source, package manifest and Next configuration are not newer than the build.
Normal runs still build first. On a slow workspace, build separately with the same local fixture
Auth/API variables rather than repeatedly aborting the production build at the browser-startup deadline.

## Required real-email checks before release

An owner must approve a non-production project, inbox, and test-account creation first.
Use that project's normal configuration **without altering it to make the test pass**.

1. Inspect non-secret evidence of email confirmation being enabled, active password policy,
   **Confirm sign up** template including `.Token`, token length, expiry, resend rate limits and
   the web/native Supabase project identity. Record only non-secret settings.
2. Create a new referred account with a unique test email, display name and user-chosen password.
   Confirm the email includes a usable six-digit **signup** code. Before entering it, assert that
   neither dashboard access nor account-ready/app-opening controls are available.
3. Exercise incorrect/expired codes and a resend. Confirm resend delivers a new usable signup code
   and throttling is retryable. Refresh the form and re-enter the original password without recreating
   the account. Complete verification and record the Supabase user ID locally for comparison.
4. Confirm the durable creator attribution, sign out through the web UI, and sign in with the chosen
   email/password. Confirm the same Supabase user ID and original attribution. A later creator link
   must not replace the original attribution.
5. Repeat ordinary signup and confirm the dashboard destination. Test existing password and
   passwordless accounts with approved fixtures: signup must not replace their credentials, and
   login/recovery remains their safe route.
6. Check the existing password-reset callback end-to-end without changing it.

**Precise configuration blocker:** if confirmation is disabled, the signup template sends only a link,
or signup tokens are not six digits, stop release. Report the specific setting/template evidence and
request separate approval for a configuration change. Do not substitute passwordless creation followed
by password setup, switch to link confirmation silently, or deploy anyway.

## Android same-account acceptance (not performed)

Requires an actual supported Android device, installed distribution build, and an approved test account
on the same Supabase project as web.

1. Complete the real-email web test above and sign out of the app.
2. Tap **Open Post Round**. Confirm `golf-coach://` only opens the app and does not sign in.
3. Use the app's existing email/password login with the exact chosen credentials, then complete its
   normal six-digit verification step if requested.
4. Compare the authenticated native Supabase user ID to the web user ID, not merely the email or display
   name. Confirm the same original creator attribution and expected account data.
5. Sign out and sign in again on Android, then repeat web login. Check wrong-password rejection and
   the app's existing recovery path.

Native same-ID sign-in, real app launch in this change, and external Stripe/billing return behavior remain
**unverified**. Native source/build evidence and billing acceptance were not available in this web task;
no changes were made to them. Existing user verification of the bare app scheme is navigation evidence
only, not authentication proof.

## Release approval

Production deployment requires separate owner approval after the real-email and Android acceptance
checks. Any production Auth/template/environment change and any production test-user creation require
their own explicit approval. This implementation and passing fixtures are not production release approval.
