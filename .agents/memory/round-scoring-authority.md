---
name: Round scoring authority
description: Canonical source-of-truth and nullability rule for round scoring metrics.
---

Treat hole rows as the auditable scoring authority. Treat round scoring fields as a nullable, scope-aware materialized summary derived from the same eligible holes by one centralized calculation.

**Why:** Web and creator consumers need stable round-level reads, but independently stored and recomputed totals already coexist. The accessible workspace does not contain the mobile writer or complete production DDL, so column existence does not prove calculation consistency. Zero must not replace unknown when hole evidence is incomplete.

**How to apply:** For future scoring work, define eligible holes and round completeness first. Derive summaries centrally on finalization and later hole edits, preserve null for unavailable metrics, and reconcile stored round values against holes.