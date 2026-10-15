# Production account deletion contract

Verified against the connected production PostgREST table inventory documented
in `supabase/baseline/production-2026-09-17.md`, the recovered migrations, and a
live storage inventory on 2026-09-19.

## Deleted

- Profile preferences, local subscription/entitlement fields, and report credits
- Rounds, holes, VAD telemetry, story candidates, player story permissions, and
  content ideas whose ownership is proven through a deleted round or story
- Creator profile, social accounts, creator-side permissions, and Story Engine
  ideas tagged with an owned creator identity
- Supabase Auth identity, only after application cleanup commits

The transactional cleanup is idempotent. This permits a safe retry if the final
Supabase Auth administration request fails after the database commit.

## Retained

- `admin_audit_log` is retained for security and audit history. Its Auth foreign
  keys use `ON DELETE SET NULL`, so the deleted identity is not retained there.
- `waitlist` is not account-owned. It represents separate marketing contact
  data and is not altered by account deletion.
- No storage buckets existed in the live connected project on 2026-09-19, and
  the accessible application code has no storage-object writer.

## Boundary and failure behavior

Postgres cleanup and Supabase Auth administration cannot share one transaction.
The API therefore commits all application cleanup first and removes Auth last.
It never returns success if either stage fails. Database cleanup is idempotent,
so users can safely retry a failed Auth stage while their bearer session remains
valid.

The cleanup function checks that every reviewed production relation exists and
fails before deleting anything if the schema contract is incomplete. Any new
user-owned table or storage bucket must be added to this inventory and cleanup
contract before release.

Deleting Post Round data does not cancel an Apple App Store subscription. Users
must manage that subscription through Apple.

## Web outcome boundary

The browser confirms completion only from a successful HTTP response containing
both boolean `ok:true` and `deleted:true`, without a contradictory error field.
It records that success before best-effort local session cleanup. Returned or
thrown sign-out errors and user-triggered home-navigation errors are reported
separately; they cannot change confirmed deletion into failure.

Lost transport or malformed, empty, unexpected or contradictory responses leave
the outcome unconfirmed, even if the server might have finished. Error responses
from cleanup/Auth stages do not prove that all account data remains. The web page
does not retry automatically and blocks another submission after an attempt;
it directs uncertain/incomplete outcomes to support rather than assuming a
bearer session is still valid. Database idempotence alone does not establish
that a browser retry is safe or necessary.

These are reviewed source and fixture-tested contracts, not attestation of the
separate authoritative API's serving release. See
`docs/web-account-deletion-outcome-report-2026-10-15.md` at the repository root
for the unresolved production-evidence boundary and test results.