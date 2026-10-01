---
name: Next page visibility guards
description: Layout redirects can still serialize hidden child page content in client navigation responses.
---

When temporarily hiding a Next App Router page, redirect in the page before constructing its content, not only in an ancestor layout.

**Why:** Next renders layouts and pages in parallel. A layout redirect prevented visible navigation but still serialized the child page's original content in an RSC response during verification.

**How to apply:** Keep the original page JSX intact behind an awaited server guard. Check both document redirects and RSC responses for absence of hidden content. Preserve signed-out authentication behavior explicitly.