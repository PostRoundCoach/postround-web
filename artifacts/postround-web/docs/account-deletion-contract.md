# Web account deletion contract

## Authority and evidence

Current wire behavior follows both supplied October 15, 2026 documents:

- `attached_assets/user-account-deletion-contract_1792085334543.md`
- `attached_assets/account-deletion-incident-evidence-2026-10-15_1792085334542.md`

These describe the separate authoritative API's inspected source and retained
candidate logs, not certification of the original incident-serving release or
hosted database. This workspace's API and earlier table/storage inventories are
not authority for that service. The documents' proposals are not implemented
guarantees. No production deletion or database access is needed for web tests.

## Request

Explicit submission requires a loaded user session, checked acknowledgment and
the exact visible string `DELETE` (no trimming, case conversion or coercion).
A synchronous single-attempt latch blocks concurrent submissions and remains
latched after errors, even if confirmation fields are edited.

One POST targets the deliberately configured
`NEXT_PUBLIC_POSTROUND_API_BASE_URL` origin plus `/api/account/delete`. Missing
or invalid configuration fails closed; no same-site fallback or inferred mobile
origin. HTTPS, no credentials/query/fragment/path in the configured origin;
loopback HTTP is allowed only by the existing development/fixture controls.

Headers: user's `Authorization: Bearer <session token>`,
`Content-Type: application/json`, `Accept: application/json`. Body is only
`{"confirmation":"DELETE"}`. No identity selectors, cookies, service credentials,
automatic redirects, automatic retries, invented request IDs or idempotency keys.

## Response decision table

Read HTTP status and JSON together. JSON must have application/json content type.
Public stage/retry/cleanup diagnostics are neither required nor used to decide
outcome. Unknown extra fields cannot grant retry permission or confirm partial
deletion.

| Response | Web classification and presentation |
| --- | --- |
| 200 JSON non-array object, strict `ok === true`, `deleted === true`, no `error` property | Confirmed success. Extra diagnostic fields are ignored, not guarantees. Missing release header does not invalidate success. |
| 401 exact error-only `{"error":"Authentication required"}` | Request rejected: API could not authorize this request. |
| 401 exact error-only `{"error":"Invalid or expired session"}` | Same request-scoped rejection; not evidence about a previous attempt or whether an identity remains. |
| 401 exact error-only `{"error":"Could not verify session"}` | Same rejection, not a diagnosis of invalid credentials or production Auth cause. |
| 400 exact error-only `{"error":"Confirmation must be \"DELETE\""}` | Request rejected: API did not accept this request's confirmation. |
| 500 `{"error":"Could not delete account. Please try again."}` | Unconfirmed. Never echo the upstream retry advice. |
| 500 `{"error":"Account deletion could not be completed. Please contact support."}` | Unconfirmed, NOT confirmed partial deletion or proof Auth still exists. |
| Generic 500, gateway/routing errors including HTML 404/502 | Unconfirmed. |
| Unexpected 2xx (including 201/202 with positive flags), missing/false/non-boolean flags, arrays/primitives, contradictory error fields | Unconfirmed. |
| Unknown/mismatched 400/401 error, added fields on a rejection envelope | Unconfirmed; status alone and invented stage values are insufficient. |
| Empty/malformed/interrupted/non-JSON response, network failure, abort, timeout | Unconfirmed, never complete failure or assumed success. |

Exact known status/error pairs are source-consistent pre-operation rejections,
not cryptographic proof of intermediary provenance. A proxy can mimic a body.
They describe only this request and cannot establish the outcome of an earlier
ambiguous request. The page does not offer another submission after any attempt.

Every unconfirmed outcome says some data may already have been removed and
directs the user to support **before another request**. It does not echo raw
upstream text, say deletion “did not complete,” infer success from absent
identities, or invite a retry.

## Partial deletion and incident limits

The current public wire contract cannot reliably distinguish true partial
deletion from fully performed but unacknowledged deletion. Even the documented
Auth-stage 500 can follow actual identity removal with an unexpected
acknowledgment. Internal `partialCompletion:true` is not proof Auth remains.
Reliably established partial deletion is a separate support classification,
requiring escalation/no retry, not a new client result envelope.

Retained candidate logs show cleanup-confirmed/unexpected-Auth-result diagnostics.
They are not uniquely correlated to the original reported incident and do not
prove Auth deletion failed. Neither mocks nor this web correction diagnoses or
repairs the authoritative API's acknowledgment behavior.

## Confirmed success and local follow-up

Commit success in UI state before best-effort local sign-out. Clear component
identity/confirmation state immediately. Returned/thrown/pending sign-out and
thrown/rejected home navigation cannot reverse confirmed success or resubmit.
Local SDK/router messages are never displayed. Home navigation is user-triggered.

## Coverage and retention

Confirmation acknowledges the configured application cleanup and Auth identity
removal operations, **not universal erasure**. Repository intent covers profile,
round/hole and related coaching data through explicit predicates and dependent
cascades; actual hosted dependencies and all-store coverage are unverified here.

Waitlist marketing records, security/admin audit history and detached creator
referral records may remain. Null foreign keys do not certify all retained fields
are anonymous. External providers, Stripe/payment records, uploaded media/object
storage, emails, logs, backups, analytics, caches and published copies are not
explicitly erased by this endpoint. Deletion does not cancel billing. Retain
Apple subscription instructions and direct other subscriptions to their provider.
Transactional cleanup alone is not a whole-workflow idempotency or safe-retry
guarantee. Do not repeat an ambiguous request to gather evidence.

## Support evidence

On rejected/unconfirmed responses, an expandable, local-only “Safe details for
support” section exposes:

- UTC request time, fixed method/path, validated configured destination origin;
- HTTP status (0 means response unavailable);
- envelope category and presence/types for only `ok`, `deleted`, `error`;
- client-owned classification, never arbitrary error values;
- exposed `X-API-Release` only when exactly `unbuilt` or `sha256:` plus 64
  lowercase hexadecimal digits.

Missing/malformed release headers are omitted. No correlation header is invented
or read. No arbitrary field names/values, raw response/SDK text, identities,
tokens, cookies, HAR files, service-role credentials or external telemetry.
Support must separately authorize any identification, readback or remediation.

## Offline verification

Targeted unit/source tests and the two deletion Playwright suites use only
injected responses and loopback Auth/API mocks, with external browser traffic
denied. The Next fixture builds into isolated `.next-e2e`; the outer runner
restores generated TypeScript config files and never shares preview build output.
See `docs/web-account-deletion-outcome-report-2026-10-15.md` for current commands,
results, blocked evidence and deployment boundaries.
