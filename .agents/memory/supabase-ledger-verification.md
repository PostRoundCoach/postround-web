---
name: Supabase ledger verification
description: Limits of the connected Supabase data API when auditing schema migration history.
---

The connected Supabase data API exposes only `public` and `graphql_public`; it cannot read `supabase_migrations.schema_migrations`. Use the documented Supabase CLI workflow when ledger-level proof is required.

**Why:** PostgREST can confirm that a column, constraint-backed write behavior, or RPC exists, but those observations do not independently prove how the change entered the migration ledger.

**How to apply:** Treat public API behavior as runtime verification only. For migration audits, obtain before/after `supabase migration list` output from a correctly linked CLI session and do not claim direct ledger inspection from the data connector.