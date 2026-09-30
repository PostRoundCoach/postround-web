---
name: Player entitlement display provenance
description: Why web subscription copy must distinguish account records from deployed catalog and pricing.
---

Show the authenticated player's recorded subscription plan, raw status, and stored Free report counter independently of catalog offers. Do not publish included credit allowances, personalized remaining PR Credits, or paid prices from the mobile contract or a bundled fallback when the authoritative deployed read surface cannot be confirmed.

**Why:** The accessible web/API workspace does not contain the referenced mobile entitlement or billing implementation, and the deployed public billing-prices path returned 404 during verification. A source document describes intended behavior, not whether its migration and catalog are live.

**How to apply:** Recheck the deployed authoritative catalog and read-only balance/pricing endpoints before adding numeric offers. Distinguish a plan's allowance from actual remaining included credits, purchased credits, and the separate stored Free report balance. Do not infer a fresh Free balance from an unhealthy paid status.