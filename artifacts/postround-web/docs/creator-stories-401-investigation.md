# Creator Stories 401 investigation

Investigation date: 2026-09-22

## Result

The failing Creator Studio request did not lose its bearer token.

The first failing transition was inside API authentication, after the API had
successfully parsed the browser's bearer header and validated the session with
the Supabase project named by the token. The subsequent lookup of that user in
the separately connected Supabase project returned `401`.

Production recorded this safe diagnostic:

```text
GET /api/content/stories
stage=story_queue
status=401
diagnostic=connected_project_user_status_401
```

No token, key, user ID, email address, or reversible credential material was
recorded during the investigation.

## Production configuration resolution

Follow-up verification on 2026-09-22 established both project identities before
any configuration change:

- the production `NEXT_PUBLIC_SUPABASE_URL` project reference is
  `pcyhnijyfzmgyghrzlyp`;
- the Creator session fixture's non-secret JWT issuer project reference is
  `pcyhnijyfzmgyghrzlyp`; and
- the API connector's authoritative admin-user lookup returned `200` for the
  fixture identity, with matching user and email identities.

The API connector also returned `200` from the expected Creator REST schema.
Therefore, the incident was an authorization/connection problem, not a Supabase
project mismatch. The minimum production configuration fix was restoration of
the existing connector's admin-user authorization. No Supabase URL, bearer
validation, or Creator permission setting was changed.

The available Creator fixture had expired by the time of this verification, so
it was not used to claim a successful live Creator request. It was used only
for non-secret issuer metadata and an authoritative connector identity match.
The API's focused authentication tests cover accepted matching identities,
connector rejection, malformed or rejected sessions, and cross-project identity
mismatches without logging credential material.

## Traced request

### Browser session and caller

The deployed `/creator` route is server-protected. It calls
`supabase.auth.getUser()` and redirects to `/login` without a user. After that
check succeeds, `CreatorDashboard` is rendered with the creator profile and its
client load calls `fetchPermissionedCreatorStories`.

That client function:

1. calls `supabase.auth.getSession()`;
2. waits up to five seconds for an auth-state token if initial hydration has
   not completed;
3. does not issue the stories request without an access token; and
4. sets `Authorization: Bearer <access token>` on the final fetch.

The production web bundle is configured for the same public Supabase project
origin used by the supplied Creator session fixture. The fixture available to
this workspace was already expired at investigation time, so it was used only
to compare non-secret issuer and expiry metadata, not to authenticate.

### Request destination and ingress

The checked-in client constructs:

```text
${NEXT_PUBLIC_POSTROUND_API_BASE_URL}/api/content/stories
```

The active public deployment is `https://postroundcoach-web.replit.app`, and a
request to its `/api/content/stories` path reaches Express directly (the
response identifies Express, includes the API CORS header, and returns the
API's bearer-required JSON). Express mounts the content router at `/api`, so
the resulting handler is `GET /api/content/stories`.

At `2026-09-22T19:17:55.254Z` and again at
`2026-09-22T19:17:57.958Z`, production handled Creator Studio requests at that
route. Both reached `story_queue` with a parseable bearer token:

1. bearer syntax and JWT shape passed;
2. the issuer URL passed validation;
3. `${issuer}/auth/v1/user` accepted the token and returned a user identity;
4. the connected-project admin lookup for that identity returned `401`; and
5. the API converted that result to the generic invalid-or-expired `401`.

The responses took 859 ms and 315 ms, consistent with the two upstream auth
checks. This rules out browser omission, a redirect, CORS preflight behavior,
or intermediary header stripping for these failing loads.

At `2026-09-22T19:21:22.656Z`, a separate deliberately headerless request
produced `A bearer token is required` in 1 ms. That request demonstrates the
diagnostic difference and must not be conflated with the two Creator Studio
failures.

## Causes considered

| Candidate | Evidence | Conclusion |
| --- | --- | --- |
| Session hydration | The client cannot send this fetch before obtaining a token; production advanced beyond issuer `/auth/v1/user` validation. | Not the cause. |
| Expired browser token | Issuer `/auth/v1/user` accepted each failing request. | Not the cause of the traced loads. |
| Alternate caller | Route, timing, and repeated `story_queue` requests match the expected Creator Dashboard load. The normal checked-in caller is the only Creator load caller found. | No evidence of an alternate caller. |
| Deployed frontend origin/version | The deployment uses the expected Supabase origin and the request reached the configured authoritative `/api` service. | Not the failing boundary. |
| Gateway, redirect, or CORS stripping | Express parsed the bearer and used it successfully against the issuer. | Ruled out. |
| Connected Supabase project verification | The issuer accepted the user, then the connector-backed admin-user lookup returned `401`. | Reproducible root cause. |

## Why Creator Studio shows only a generic error

The API intentionally returns a generic authentication message while retaining
the safe `connected_project_user_status_401` diagnostic in server logs.
`fetchPermissionedCreatorStories` converts the non-OK response to an error, and
`CreatorDashboard` catches all errors without inspecting their status or stage,
rendering the single generic Creator workspace error state.

## Configuration rule

Keep the API's connected Supabase project/authorization aligned with the public
Supabase project that issues Creator Studio sessions. Verify that the
connector-backed admin-user lookup returns the same user identity. Do not
weaken bearer validation, accept cookies as a substitute, or broaden Creator
permissions.

## Regression coverage

Two focused assertions are needed:

1. **API authentication boundary:** given a token accepted by its issuer,
   exercise the connected-project check and assert that a connector `401`
   produces diagnostic `connected_project_user_status_401`. Also assert the
   success case only when issuer identity and connected-project identity match.
2. **Creator browser contract:** make the E2E fake reject
   `GET /api/content/stories` when `userFromRequest(request)` is null, and assert
   that a normal Creator Dashboard load sends an `Authorization` bearer header.
   The current fake always returns `200`, so the browser test can pass even when
   the header is absent.

These checks separate “header missing” from “connected project rejected the
validated user,” which is the distinction that exposed this incident.