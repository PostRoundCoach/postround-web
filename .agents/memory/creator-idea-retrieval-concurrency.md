---
name: Creator idea retrieval concurrency
description: Why automatic Creator Dashboard idea retrieval must use bounded concurrency.
---

Automatic retrieval of persisted creator ideas must remain bounded across Story cards and treat a transient 429 as a retryable read failure.

**Why:** Production diagnostics showed a first-render burst of five authorized idea GETs; four failed with 429 during authorization while later individual retries succeeded.

**How to apply:** Any new bulk refresh or prefetch path for creator ideas must reuse the existing bounded authenticated GET lifecycle rather than issuing unbounded per-card requests.