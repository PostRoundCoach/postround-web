#!/bin/sh
set -eu

if [ "${E2E_USE_EXISTING_BUILD:-}" = "1" ]; then
  # Only explicit focused reruns may reuse a completed isolated fixture build.
  test "${NEXT_DIST_DIR:-}" = ".next-e2e"
  test -f .next-e2e/BUILD_ID
  if find src package.json next.config.ts -type f -newer .next-e2e/BUILD_ID | grep -q .; then
    echo "Fixture build is stale; rebuild before reusing it." >&2
    exit 1
  fi
else
  pnpm run build
fi
# Next derives request.url from its bind hostname in this standalone fixture.
# Use trusted loopback (normalized to localhost by Next) and the matching
# browser baseURL so cookies and same-origin POST checks exercise the real path.
pnpm exec next start -p "$PORT" -H 127.0.0.1