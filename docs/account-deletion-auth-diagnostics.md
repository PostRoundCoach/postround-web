# Account deletion authentication diagnostics

## Implementation and safeguards

The existing server warning, `Authenticated account deletion did not complete`,
keeps its existing `stage`, `status`, and `diagnostic` fields. For a rejected
issuer `/auth/v1/user` response on the deletion path only, it additionally
contains `auth_diagnostic`:

- `stage`: `authentication`
- `verification_stage`: `upstream_user_verification`
- `upstream_status`: the issuer response's HTTP status
- `timestamp`: server-generated ISO timestamp
- Optional `error_code`, `message`, and `description`

Only exact allowlisted scalar strings are accepted from top-level error fields.
Codes are selected from `code`, `error_code`, or `error`; messages from `msg` or
`message`; descriptions from `error_description` or `description`. Unknown
values, including otherwise recognizable messages with appended credentials or
identities, are omitted. Code strings are bounded to 64 characters and message
strings to 160 characters. The accepted values are defined in
`artifacts/api-server/src/lib/account-deletion-auth-diagnostic.ts`.

Body reads are limited to 4,096 bytes and 200 ms. Oversized, malformed, non-JSON,
consumed, failed, or stalled bodies yield metadata only. Stream cancellation is
not awaited. Raw bodies, headers, arbitrary errors, JWT claims, issuer details,
tokens, keys, cookies, passwords, and user/session identities are not included
in the new metadata.

Authentication decisions, issuer validation, connected-project verification,
and deletion operations are unchanged. An upstream rejection still returns
HTTP 401 with:

```json
{
  "error": "The bearer token is invalid or expired.",
  "stage": "authentication",
  "retryable": false
}
```

It still stops before connector identity lookup, application cleanup, and Auth
deletion. Diagnostic extraction, callback, and warning-logger failures cannot
change this rejection. Successful deletion still performs issuer verification,
connector identity verification, application cleanup, then Auth deletion.
Creator callers do not read rejection bodies or receive the additional metadata.

## Isolated verification — 2026-10-07

Commands and exact final results:

1. `pnpm --filter @workspace/api-server exec node --test --experimental-strip-types src/lib/account-deletion.test.ts src/lib/account-deletion-auth-diagnostic.test.ts src/lib/story-engine.test.ts`
   - Exit 0: 53 tests, 53 passed, 0 failed, 0 cancelled, 0 skipped, 0 todo.
   - Includes 10 focused diagnostic tests, 5 existing deletion tests, and 38
     shared authentication/story-engine tests.
   - All issuer responses and downstream operations are synthetic mocks.
     The API test uses a temporary loopback server with injected mocks,
     not the running or deployed deletion endpoint.
2. `pnpm run typecheck`
   - Exit 0: shared-library build and all four selected leaf packages passed.
3. `pnpm --filter @workspace/api-server run typecheck`
   - Exit 0 after the final route formatting and deletion-order assertions.
4. `git diff --check`
   - Exit 0.

The API preview workflow was restarted once; its build succeeded and logs
confirmed `Server listening` with no startup error.

`story-engine.live.test.ts` was inspected but not executed. It reads qualifying
rounds from connected Supabase, so it was excluded to keep verification isolated.
The package's general `test` script includes that live file and was deliberately
not used. No connected-service mutation, real login/session operation,
production deployment, or live deletion request was performed. There were no
test or typecheck failures in the commands above.

## Production evidence and safe handoff

Read-only logs still show the historical 2026-10-07 19:20–19:30 UTC attempts with
`stage=authentication`, `diagnostic=auth_user_status_403`, and public status 401.
They do not contain an upstream error code or message. The old implementation
discarded those response bodies; their contents cannot be recovered from these
logs. No new live rejection with this instrumentation was captured.
**The precise upstream reason remains unknown.** Values such as `bad_jwt` or
`Invalid JWT` used in tests are simulated, not production findings.

After separately approved deployment and separately approved user reproduction,
an authorized operator can read the server warning at the reproduction time,
filtering by `stage=authentication` and `diagnostic=auth_user_status_403`
(or the corresponding upstream status). Inspect only the new `auth_diagnostic`
fields and report their sanitized status/code/message/description and timestamp.
Missing optional fields can mean omitted unsafe or unrecognized text, missing
upstream fields, or a failed/bounded body read; they do not prove a root cause.

Do not replay a bearer against account deletion or request tokens/raw response
bodies for troubleshooting. Successful authentication can permit irreversible
account deletion. Reproduction must use the user's normal flow only with
explicit consent to that consequence. Deployment and reproduction were not
authorized or performed as part of this implementation.
