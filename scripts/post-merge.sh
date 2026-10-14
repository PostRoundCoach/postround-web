#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/.."
CI=true pnpm install --frozen-lockfile --prefer-offline

# Database changes require explicit approval and must not run on every merge.
# The application uses Supabase; the template Drizzle schema is empty.
