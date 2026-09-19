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