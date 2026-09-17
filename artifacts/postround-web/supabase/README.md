# Supabase schema and migrations

This directory is the source of truth for the external Supabase database used by
Post Round Coach.

## Authoritative records

- **Desired schema history:** the reviewed SQL files in `migrations/`, in filename
  order.
- **Production application history:** Supabase's
  `supabase_migrations.schema_migrations` ledger.
- **Legacy production starting point:** `baseline/production-2026-09-17.md`.

The baseline exists because part of the production schema predates the migration
chain available in this repository. It is an inventory, not an executable
migration. A table listed only in the baseline is known to exist in production,
but its original DDL and application event cannot be proven from the accessible
ledger or repository.

## Canonical workflow for future changes

1. Create one new, timestamp-named migration:

   ```sh
   supabase migration new <short_description>
   ```

2. Put all DDL, policies, functions, grants, and data backfills required by the
   change in that file. Make reruns safe where practical, but do not hide an
   unexpected schema mismatch with broad exception handling.
3. Open a review before applying the migration. The review must call out
   destructive operations, locks, backfills, and rollback or recovery steps.
4. Test against a non-production Supabase project that has been cloned from the
   dated production baseline. Because the pre-baseline chain is incomplete, do
   not claim that `db reset` can reconstruct the entire database from an empty
   project. Inspect the pending change with:

   ```sh
   supabase migration list
   supabase db push --dry-run
   ```

5. After approval, a collaborator with production database access links the CLI
   to the correct Supabase project and applies exactly the reviewed files:

   ```sh
   supabase link --project-ref <production-project-ref>
   supabase migration list
   supabase db push
   supabase migration list
   ```

6. Confirm the new version is present both in `migrations/` and in the production
   ledger. Include the before/after `supabase migration list` output in the
   change review without credentials or connection strings.

Do not make production schema changes through the SQL editor, application
startup, ad-hoc scripts, or generated dashboard SQL. Those paths bypass the
reviewed migration chain or its ledger.

## Legacy files and baseline reconciliation

Files `001` through `003` predate this workflow. Files `056` and `057` were
recovered from historical SQL artifacts and are preserved with their original
migration identities. The approval-column migration was renumbered `058` so its
dependency on `057` is explicit. Their presence in source control documents
provenance; it does not assert that the current production ledger contains
matching versions.

Do not run the baseline or blindly replay legacy files against production. Before
adopting an existing production project into CLI management, compare
`supabase migration list` with this directory. If a legacy file is confirmed as
already represented in production, use Supabase's documented `migration repair`
procedure to reconcile only that confirmed version. Never mark an unverified
migration as applied.

## `rounds.input_method`

The baseline records only what was observable on 2026-09-17: the production
PostgREST representation did not expose an `input_method` column, while an older
SQL artifact defined one with historical values. This repository makes no
product decision about whether that column should exist or what values it should
allow. Any such decision requires a separate reviewed product/schema change.