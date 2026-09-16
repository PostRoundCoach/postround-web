---
name: Next preview cold starts
description: Why the managed web preview separates artifact health responses from Next development compilation.
---

Keep the artifact-managed port responsive while Next lazily compiles the root page on an internal port.

**Why:** Next can report ready before the root route finishes compiling. The managed preview health request can time out during that compile even though the server is otherwise healthy.

**How to apply:** Preserve the injected public `PORT` for the startup proxy, run Next on an internal port, and only forward root requests after an internal warm-up request has completed successfully.