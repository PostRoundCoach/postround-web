# Post Round Coach — Marketing Website

A marketing website for Post Round Coach, an AI golf coaching app that builds your "Player DNA" by analyzing your game after every round.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- External Supabase schema history: `artifacts/postround-web/supabase/migrations`
- Supabase migration workflow and production baseline:
  `artifacts/postround-web/supabase/README.md`

## Architecture decisions

- Supabase production changes are reviewed migration files applied with the
  Supabase CLI. The repository migration chain is the desired history and
  Supabase's migration ledger is the application record; ad-hoc SQL editor and
  startup-time DDL changes are not part of the supported workflow.

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- The Supabase production schema predates the complete accessible migration
  chain. Read its dated baseline before replaying or repairing legacy versions.
- `rounds.input_method` is intentionally unresolved by the schema baseline; do
  not infer a product decision from historical SQL or the current live shape.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
