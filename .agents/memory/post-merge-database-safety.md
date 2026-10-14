---
name: Post-merge database safety
description: Why automatic task reconciliation must not synchronize a database schema in this project.
---

Automatic task merges are not authorization to mutate a database. Keep schema changes separate from dependency setup and obtain explicit approval before applying them.

**Why:** The application uses an existing Supabase project, while the template Drizzle schema is not its authoritative schema. An unconditional template schema push during reconciliation is unnecessary and can affect an unrelated database. The user has explicitly withheld authorization for database changes during release and diagnostic work.

**How to apply:** When extending merge setup, do not reintroduce automatic schema synchronization. Scope any approved database migration to the intended project and reviewed migration separately.
