#!/bin/sh
set -eu

pnpm run build
# Next derives request.url from its bind hostname in this standalone fixture.
# Use trusted loopback (normalized to localhost by Next) and the matching
# browser baseURL so cookies and same-origin POST checks exercise the real path.
pnpm exec next start -p "$PORT" -H 127.0.0.1