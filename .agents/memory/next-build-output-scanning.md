---
name: Next build outputs and Tailwind scanning
description: Why custom Next.js build directories must remain generated and untracked.
---

Never commit custom Next.js distribution directories, including production-check outputs.

**Why:** Tailwind's automatic source discovery can scan tracked generated CSS during a later clean deployment build. Reprocessing compiled selectors can turn them into invalid asset references and fail Webpack with misleading errors reported against `globals.css`.

**How to apply:** Keep every configured or temporary Next dist directory ignored. Validate deployment builds from clean source and remove temporary output after verification.