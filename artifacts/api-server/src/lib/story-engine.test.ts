import assert from "node:assert/strict";
import test from "node:test";
import { ReplitConnectors } from "@replit/connectors-sdk";
import express from "express";
import contentRouter from "../routes/content.ts";
import { generateStoryCandidates, generateStoryDraft, type RoundEvidence } from "./story-engine.ts";
import {
  authenticateSupabaseBearer,
  authorizeCreatorStory,
  CreatorContentError,
  fetchCreatorStoryQueue,
  fetchCreatorLandingSummary,
  fetchPersistedCandidates,
  loadRoundEvidence,
  persistCandidates,
  requestStoryApproval,
  dismissCreatorStory,
  fetchRoundWebContract,
  buildCreatorIdeasResponse,
  type SupabaseRequestContext,
} from "./creator-content-data.ts";

const base: RoundEvidence = {
  storyId: "11111111-1111-1111-1111-111111111111",
  ownerId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  playerName: "Alex",
  totalScore: 74,
  coursePar: 72,
  historicalToPar: [],
  aiSummary: null,
  playerNotes: null,
  holeNotes: [],
  holes: [
    { hole: 1, yards: 401, par: 4, score: 6, fairway: "right", green: "short", playable: true, chips: 1, putts: 2, sand: false, penalties: 1 },
    { hole: 2, yards: 155, par: 3, score: 3, fairway: "none", green: "hit", playable: false, chips: 0, putts: 1, sand: false, penalties: 0 },
    { hole: 3, yards: 505, par: 5, score: 3, fairway: "hit", green: "hit", playable: false, chips: 0, putts: 1, sand: false, penalties: 0 },
    { hole: 4, yards: null, par: 4, score: 4, fairway: "hit", green: "hit", playable: false, chips: null, putts: 2, sand: null, penalties: null },
  ],
};

test("generation is deterministic, ranked, and limited", () => {
  const first = generateStoryCandidates(base);
  assert.deepEqual(generateStoryCandidates(base), first);
  assert.ok(first.length >= 2 && first.length <= 5);
  assert.equal(first[0]?.archetype, "Surprise");
  assert.deepEqual([...first].sort((a, b) => b.confidence - a.confidence).map((item) => item.id), first.map((item) => item.id));
});

test("displayed scorecard values are only stored values", () => {
  const candidates = generateStoryCandidates(base);
  for (const candidate of candidates) {
    assert.deepEqual(candidate.scorecard, base.holes);
    assert.ok(!candidate.summary.includes("I "));
    assert.ok(!candidate.hook.includes("I "));
  }
});

test("progress is gated by comparable historical rounds", () => {
  assert.ok(!generateStoryCandidates(base).some((candidate) => candidate.archetype === "Progress"));
  const improved = generateStoryCandidates({ ...base, historicalToPar: [5, 7] });
  assert.ok(improved.some((candidate) => candidate.archetype === "Progress"));
  const notImproved = generateStoryCandidates({ ...base, historicalToPar: [1] });
  assert.ok(!notImproved.some((candidate) => candidate.archetype === "Progress"));
});

test("missing optional analysis and scorecard values do not invent evidence", () => {
  const candidates = generateStoryCandidates({
    ...base,
    aiSummary: "Optional stored analysis",
    playerNotes: "Optional stored note",
    holeNotes: [{ hole: 1, note: "Stored note" }],
    holes: [{ ...base.holes[0]!, yards: null, score: null, par: null, fairway: null, green: null, penalties: null }],
  });
  assert.ok(candidates.every((candidate) => candidate.scorecard[0]?.yards === null));
  assert.ok(!candidates.some((candidate) => candidate.archetype === "Progress"));
});

test("draft formats use only the selected persisted candidate fields", () => {
  const candidate = generateStoryCandidates(base)[0]!;
  for (const format of ["caption", "short_video_script", "carousel_outline"] as const) {
    const draft = generateStoryDraft(candidate, format);
    assert.equal(draft.story_id, candidate.story_id);
    assert.equal(draft.candidate_id, candidate.id);
    assert.equal(draft.format, format);
    assert.ok(draft.content.includes(candidate.hook));
    assert.ok(draft.content.includes(candidate.summary));
    assert.ok(!draft.content.includes("shot shape"));
  }
});

const requestContext: SupabaseRequestContext = {
  userId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  proxy: async () => new Response(null, { status: 500 }),
};

test("authentication delegates session verification to the connected Supabase project", async () => {
  const token = [
    Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url"),
    Buffer.from(
      '{"iss":"https://fixture-project.supabase.co/auth/v1","sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}',
    ).toString("base64url"),
    "signature",
  ].join(".");
  let projectPath: string | undefined;
  let authRequest:
    | { url: string; apikey: string | null; authorization: string | null }
    | undefined;
  const proxy: NonNullable<SupabaseRequestContext["proxy"]> = async (path) => {
    projectPath = path;
    return Response.json({
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      email: "creator@example.com",
    });
  };
  const authFetch: typeof fetch = async (input, init) => {
    const headers = new Headers(init?.headers);
    authRequest = {
      url: String(input),
      apikey: headers.get("apikey"),
      authorization: headers.get("authorization"),
    };
    return Response.json({
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      email: "creator@example.com",
    });
  };

  const context = await authenticateSupabaseBearer(
    `Bearer ${token}`,
    proxy,
    authFetch,
    "fixture-anon-key",
  );

  assert.equal(context.userId, "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
  assert.deepEqual(authRequest, {
    url: "https://fixture-project.supabase.co/auth/v1/user",
    apikey: "fixture-anon-key",
    authorization: `Bearer ${token}`,
  });
  assert.equal(
    projectPath,
    "/auth/v1/admin/users/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  );
});

test("authentication rejects sessions that Supabase does not accept", async () => {
  const token = [
    Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url"),
    Buffer.from(
      '{"iss":"https://fixture-project.supabase.co/auth/v1","sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}',
    ).toString("base64url"),
    "signature",
  ].join(".");

  await assert.rejects(
    () => authenticateSupabaseBearer(
      `Bearer ${token}`,
      async () => Response.json({ id: "unused" }),
      async () => Response.json({ message: "Invalid JWT" }, { status: 401 }),
      "fixture-anon-key",
    ),
    (error: unknown) => error instanceof CreatorContentError
      && error.status === 401
      && error.message === "The bearer token is invalid or expired.",
  );
});

test("authentication reports a connected-project authorization failure without exposing credentials", async () => {
  const token = [
    Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url"),
    Buffer.from(
      '{"iss":"https://fixture-project.supabase.co/auth/v1","sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}',
    ).toString("base64url"),
    "signature",
  ].join(".");

  await assert.rejects(
    () => authenticateSupabaseBearer(
      `Bearer ${token}`,
      async () => Response.json({ message: "Unauthorized" }, { status: 401 }),
      async () => Response.json({
        id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        email: "creator@example.com",
      }),
      "fixture-anon-key",
    ),
    (error: unknown) => error instanceof CreatorContentError
      && error.status === 401
      && error.message === "The bearer token is invalid or expired."
      && error.diagnostic === "connected_project_user_status_401"
      && !error.diagnostic.includes(token),
  );
});

test("authentication rejects an identity that does not match the connected project", async () => {
  const token = [
    Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url"),
    Buffer.from(
      '{"iss":"https://fixture-project.supabase.co/auth/v1","sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}',
    ).toString("base64url"),
    "signature",
  ].join(".");

  await assert.rejects(
    () => authenticateSupabaseBearer(
      `Bearer ${token}`,
      async () => Response.json({
        id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        email: "other@example.com",
      }),
      async () => Response.json({
        id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        email: "creator@example.com",
      }),
      "fixture-anon-key",
    ),
    (error: unknown) => error instanceof CreatorContentError
      && error.status === 401
      && error.diagnostic === "connected_project_user_mismatch",
  );
});

test("authentication rejects malformed sessions without making a request", async () => {
  let requested = false;
  await assert.rejects(
    () => authenticateSupabaseBearer(
      "Bearer malformed",
      async () => {
        requested = true;
        return Response.json({});
      },
      async () => {
        requested = true;
        return Response.json({});
      },
      "fixture-anon-key",
    ),
    (error: unknown) => error instanceof CreatorContentError
      && error.status === 401,
  );
  assert.equal(requested, false);
});

test("authorization denies a creator without an active permission", async () => {
  const context: SupabaseRequestContext = {
    ...requestContext,
    proxy: async (path) => {
    const url = String(path);
    const body = url.includes("/creator_profiles")
      ? [{ id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb" }]
      : [];
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
    },
  };
  await assert.rejects(
    authorizeCreatorStory(context, base.storyId),
    (error: unknown) => error instanceof CreatorContentError && error.status === 403,
  );
});

test("authorization retains active creator, permission, revocation, and story status guards", async () => {
  const scenarios = [
    { name: "missing creator", profiles: [], permissions: [], stories: [] },
    { name: "missing or revoked permission", profiles: [{ id: base.ownerId }], permissions: [], stories: [] },
    {
      name: "invalid story status",
      profiles: [{ id: base.ownerId }],
      permissions: [{
        id: "permission", story_id: base.storyId,
        user_id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
        permission_granted: true, approval_requested_at: null, granted_at: null, revoked_at: null,
      }],
      stories: [],
    },
  ];
  for (const scenario of scenarios) {
    const paths: string[] = [];
    const context: SupabaseRequestContext = {
      ...requestContext,
      proxy: async (path) => {
        paths.push(path);
        if (path.includes("creator_profiles?")) return Response.json(scenario.profiles);
        if (path.includes("story_permissions?")) return Response.json(scenario.permissions);
        return Response.json(scenario.stories);
      },
    };
    await assert.rejects(
      authorizeCreatorStory(context, base.storyId),
      (error: unknown) => error instanceof CreatorContentError && error.status === 403,
      scenario.name,
    );
    if (scenario.permissions.length) {
      assert.ok(paths.some((path) => path.includes("status=in.(offered,shared)")));
    }
    if (scenario.profiles.length) {
      assert.ok(paths.some((path) => path.includes("permission_granted=eq.true")));
      assert.ok(paths.some((path) => path.includes("revoked_at=is.null")));
    }
  }
});

test("authorization resolves advanced capability and active voice from the creator profile", async () => {
  const paths: string[] = [];
  const voice = {
    id: "voice", name: "My Voice", tone: "warm", personality: null, humor_level: "light",
    energy: "high", storytelling_style: "evidence-first", sentence_style: "short",
    vocabulary_style: "accessible", golf_terminology: "standard",
    things_to_emphasize: "turning points", things_to_avoid: "cliches",
  };
  const context: SupabaseRequestContext = {
    ...requestContext,
    proxy: async (path) => {
      paths.push(path);
      if (path.includes("creator_profiles?")) {
        return Response.json([{
          id: base.ownerId, display_name: "Advanced Creator", advanced_creator: true,
          creator_voice_profiles: [voice],
        }]);
      }
      if (path.includes("story_permissions?")) return Response.json([{
        id: "permission", story_id: base.storyId, user_id: "player", permission_granted: true,
        approval_requested_at: null, granted_at: null, revoked_at: null,
      }]);
      return Response.json([{
        round_id: "round", user_id: "player", status: "shared", story_data: null,
      }]);
    },
  };
  const access = await authorizeCreatorStory(context, base.storyId);
  assert.equal(access.creatorName, "Advanced Creator");
  assert.equal(access.advancedCreator, true);
  assert.deepEqual(access.creatorVoice, voice);
  assert.ok(paths[0]?.includes("advanced_creator"));
  assert.ok(paths[0]?.includes("creator_voice_profiles("));
  assert.ok(paths[0]?.includes("creator_voice_profiles.status=eq.active"));
});

test("creator queue reload uses the authoritative active permission store", async () => {
  const paths: string[] = [];
  const context: SupabaseRequestContext = {
    ...requestContext,
    proxy: async (path) => {
      paths.push(path);
      if (path.includes("creator_profiles?")) return Response.json([{ id: base.ownerId }]);
      if (path.includes("/profiles?")) {
        return new Response(null, { headers: { "content-range": "0-0/1" } });
      }
      return Response.json([{
        story_id: base.storyId,
        approval_requested_at: "2026-09-10T12:00:00Z",
        granted_at: null,
        story_candidates: {
          id: base.storyId,
          story_type: "round_recap",
          headline: "A comeback",
          summary: "Stored story",
          story_data: {},
          round_id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
          status: "shared",
        },
      }]);
    },
  };
  const queue = await fetchCreatorStoryQueue(context);
  assert.equal(queue.stories[0]?.permission_status, "requested");
  assert.equal(queue.follower_count, 1);
  assert.ok(paths[2]?.includes(`creator_id=eq.${base.ownerId}`));
  assert.ok(paths[2]?.includes("permission_granted=eq.true"));
  assert.ok(paths[2]?.includes("revoked_at=is.null"));
});

test("creator queue counts only current favorites, including zero and changes between reads", async () => {
  const otherCreator = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee";
  const favorites = new Map([
    ["player-1", base.ownerId],
    ["player-2", base.ownerId],
    ["player-3", otherCreator],
    ["player-4", null],
  ]);
  const countRequests: Array<{ path: string; method?: string; headers?: Record<string, string> }> = [];
  const context: SupabaseRequestContext = {
    userId: requestContext.userId,
    proxy: async (path, init) => {
      if (path.includes("creator_profiles?")) {
        assert.ok(path.includes(`user_id=eq.${requestContext.userId}&status=eq.active`));
        return Response.json([{ id: base.ownerId }]);
      }
      if (path.includes("/profiles?")) {
        countRequests.push({ path, method: init?.method, headers: init?.headers });
        const creatorId = path.split("favorite_creator_id=eq.")[1];
        const total = [...favorites.values()].filter((favorite) => favorite === creatorId).length;
        return new Response(null, { headers: { "content-range": total ? `0-0/${total}` : "*/0" } });
      }
      return Response.json([]);
    },
  };
  assert.deepEqual(await fetchCreatorStoryQueue(context), { stories: [], follower_count: 2 });
  favorites.set("player-1", otherCreator);
  favorites.set("player-2", null);
  assert.deepEqual(await fetchCreatorStoryQueue(context), { stories: [], follower_count: 0 });
  favorites.set("player-4", base.ownerId);
  assert.equal((await fetchCreatorStoryQueue(context)).follower_count, 1);
  for (const request of countRequests) {
    assert.ok(request.path.endsWith(`favorite_creator_id=eq.${base.ownerId}`));
    assert.equal(request.method, "HEAD");
    assert.equal(request.headers?.Prefer, "count=exact");
    assert.equal(request.headers?.Range, "0-0");
  }
});

test("landing counts current followers and only active permissioned offered/shared stories", async () => {
  const paths: Array<{ path: string; method?: string; headers?: Record<string, string> }> = [];
  let followers = 3;
  let stories = 2;
  const context: SupabaseRequestContext = {
    ...requestContext,
    proxy: async (path, init) => {
      paths.push({ path, method: init?.method, headers: init?.headers });
      if (path.includes("creator_profiles?")) {
        assert.ok(path.includes(`user_id=eq.${requestContext.userId}&status=eq.active`));
        return Response.json([{ id: base.ownerId }]);
      }
      if (path.includes("/profiles?")) {
        return new Response(null, { headers: { "content-range": followers ? `0-0/${followers}` : "*/0" } });
      }
      if (path.includes("story_permissions?")) {
        return new Response(null, { headers: { "content-range": stories ? `0-0/${stories}` : "*/0" } });
      }
      throw new Error(`Unexpected path ${path}`);
    },
  };
  assert.deepEqual(await fetchCreatorLandingSummary(context), {
    follower_count: 3, available_story_count: 2,
  });
  followers = 0;
  stories = 0;
  assert.deepEqual(await fetchCreatorLandingSummary(context), {
    follower_count: 0, available_story_count: 0,
  });
  const followerRequests = paths.filter(({ path }) => path.includes("/profiles?"));
  const storyRequests = paths.filter(({ path }) => path.includes("story_permissions?"));
  assert.equal(followerRequests.length, 2);
  assert.equal(storyRequests.length, 2);
  for (const request of followerRequests) {
    assert.ok(request.path.endsWith(`favorite_creator_id=eq.${base.ownerId}`));
    assert.equal(request.method, "HEAD");
    assert.equal(request.headers?.Prefer, "count=exact");
  }
  for (const request of storyRequests) {
    assert.ok(request.path.includes(`creator_id=eq.${base.ownerId}`));
    assert.ok(request.path.includes("story_candidates!inner(id)"));
    assert.ok(request.path.includes("story_candidates.status=in.(offered,shared)"));
    assert.ok(request.path.includes("permission_granted=eq.true"));
    assert.ok(request.path.includes("revoked_at=is.null"));
    assert.equal(request.method, "HEAD");
    assert.equal(request.headers?.Prefer, "count=exact");
    assert.equal(request.headers?.Range, "0-0");
    assert.ok(!request.path.includes("story_data"));
  }
});

test("landing summary denies players and inactive creators before any count request", async () => {
  for (const profiles of [[], [{ id: base.ownerId, status: "inactive" }]]) {
    const paths: string[] = [];
    const context: SupabaseRequestContext = {
      ...requestContext,
      proxy: async (path) => {
        paths.push(path);
        if (path.includes("creator_profiles?")) return Response.json(profiles.filter((p) => p.status === "active"));
        throw new Error("No count is permitted for an inactive account");
      },
    };
    await assert.rejects(fetchCreatorLandingSummary(context),
      (error: unknown) => error instanceof CreatorContentError && error.status === 403);
    assert.equal(paths.length, 1);
  }
});

test("landing summary reports each count failure independently without inventing a number", async () => {
  let failFollower = true;
  let failStory = false;
  const context: SupabaseRequestContext = {
    ...requestContext,
    proxy: async (path) => {
      if (path.includes("creator_profiles?")) return Response.json([{ id: base.ownerId }]);
      if (path.includes("/profiles?")) {
        return failFollower ? new Response(null, { status: 503 })
          : new Response(null, { headers: { "content-range": "*/4" } });
      }
      return failStory ? new Response(null, { headers: { "content-range": "0-0/*" } })
        : new Response(null, { headers: { "content-range": "*/1" } });
    },
  };
  assert.deepEqual(await fetchCreatorLandingSummary(context), {
    follower_count: null, available_story_count: 1,
  });
  failFollower = false;
  failStory = true;
  assert.deepEqual(await fetchCreatorLandingSummary(context), {
    follower_count: 4, available_story_count: null,
  });
});

test("creator queue rejects missing or inactive owners without reading followers", async () => {
  for (const profiles of [
    [],
    [{ id: base.ownerId, user_id: requestContext.userId, status: "inactive" }],
    [{ id: "another-creator", user_id: "someone-else", status: "active" }],
  ]) {
    let followerRead = false;
    const context: SupabaseRequestContext = {
      ...requestContext,
      proxy: async (path) => {
        if (path.includes("/profiles?")) followerRead = true;
        if (path.includes("creator_profiles?")) {
          assert.ok(path.includes(`user_id=eq.${requestContext.userId}&status=eq.active`));
          return Response.json(profiles.filter((profile) =>
            profile.user_id === requestContext.userId && profile.status === "active",
          ));
        }
        throw new Error(`Unexpected connector path: ${path}`);
      },
    };
    await assert.rejects(
      fetchCreatorStoryQueue(context),
      (error: unknown) => error instanceof CreatorContentError && error.status === 403,
    );
    assert.equal(followerRead, false);
  }
});

test("creator queue fails explicitly when the exact count is unavailable or malformed", async () => {
  for (const response of [
    new Response(null, { status: 403 }),
    new Response(null),
    new Response(null, { headers: { "content-range": "0-0/*" } }),
    new Response(null, { headers: { "content-range": "0-0/9007199254740992" } }),
  ]) {
    const context: SupabaseRequestContext = {
      ...requestContext,
      proxy: async (path) => path.includes("creator_profiles?")
        ? Response.json([{ id: base.ownerId }])
        : response,
    };
    await assert.rejects(
      fetchCreatorStoryQueue(context),
      (error: unknown) => error instanceof CreatorContentError && error.status === 502,
    );
  }
});

test("authenticated story queue API returns the count without follower identities", async () => {
  const originalProxy = ReplitConnectors.prototype.proxy;
  const originalFetch = globalThis.fetch;
  const originalAnonKey = process.env.SUPABASE_ANON_KEY;
  const token = [
    Buffer.from('{"alg":"HS256"}').toString("base64url"),
    Buffer.from('{"iss":"https://fixture-project.supabase.co/auth/v1"}').toString("base64url"),
    "signature",
  ].join(".");
  process.env.SUPABASE_ANON_KEY = "fixture-key";
  globalThis.fetch = (async () => Response.json({ id: requestContext.userId })) as typeof fetch;
  ReplitConnectors.prototype.proxy = async (_provider, path, init) => {
    if (path.startsWith("/auth/v1/admin/users/")) return Response.json({ id: requestContext.userId });
    if (path.includes("creator_profiles?")) return Response.json([{ id: base.ownerId }]);
    if (path.includes("/profiles?")) {
      assert.equal(init?.method, "HEAD");
      return new Response(null, { headers: { "content-range": "0-0/2" } });
    }
    if (path.includes("story_permissions?")) return Response.json([]);
    throw new Error(`Unexpected connector path: ${path}`);
  };
  const api = express();
  api.use("/api", contentRouter);
  const server = api.listen(0);
  try {
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const response = await originalFetch(`http://127.0.0.1:${address.port}/api/content/stories`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, stories: [], follower_count: 2 });
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    ReplitConnectors.prototype.proxy = originalProxy;
    globalThis.fetch = originalFetch;
    if (originalAnonKey === undefined) delete process.env.SUPABASE_ANON_KEY;
    else process.env.SUPABASE_ANON_KEY = originalAnonKey;
  }
});

test("creator landing API requires a bearer token and returns only nullable counts", async () => {
  const originalProxy = ReplitConnectors.prototype.proxy;
  const originalFetch = globalThis.fetch;
  const originalAnonKey = process.env.SUPABASE_ANON_KEY;
  const token = [
    Buffer.from('{"alg":"HS256"}').toString("base64url"),
    Buffer.from('{"iss":"https://fixture-project.supabase.co/auth/v1"}').toString("base64url"),
    "signature",
  ].join(".");
  process.env.SUPABASE_ANON_KEY = "fixture-key";
  globalThis.fetch = (async () => Response.json({ id: requestContext.userId })) as typeof fetch;
  ReplitConnectors.prototype.proxy = async (_provider, path) => {
    if (path.startsWith("/auth/v1/admin/users/")) return Response.json({ id: requestContext.userId });
    if (path.includes("creator_profiles?")) return Response.json([{ id: base.ownerId }]);
    if (path.includes("/profiles?")) return new Response(null, { headers: { "content-range": "*/0" } });
    if (path.includes("story_permissions?")) return new Response(null, { status: 503 });
    throw new Error(`Unexpected connector path: ${path}`);
  };
  const api = express();
  api.use((req, _res, next) => {
    req.log = { warn() {}, error() {} } as unknown as typeof req.log;
    next();
  });
  api.use("/api", contentRouter);
  const server = api.listen(0);
  try {
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const url = `http://127.0.0.1:${address.port}/api/content/creator-summary`;
    // Missing authentication cannot read even the aggregate.
    const unauthenticated = await originalFetch(url);
    assert.equal(unauthenticated.status, 401);
    const response = await originalFetch(url, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      ok: true, follower_count: 0, available_story_count: null,
    });
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    ReplitConnectors.prototype.proxy = originalProxy;
    globalThis.fetch = originalFetch;
    if (originalAnonKey === undefined) delete process.env.SUPABASE_ANON_KEY;
    else process.env.SUPABASE_ANON_KEY = originalAnonKey;
  }
});

test("round evidence uses canonical course par and stored historical score to par", async () => {
  const paths: string[] = [];
  const context: SupabaseRequestContext = {
    userId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    proxy: async (path) => {
      paths.push(path);
      if (path.startsWith("/rest/v1/rounds?select=id,user_id,played_at,total_score,course_par,")) {
        return Response.json([{
          id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
          user_id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
          played_at: "2026-09-07",
          total_score: 34,
          course_par: 34,
          ai_summary: null,
          player_notes: null,
        }]);
      }
      if (path.startsWith("/rest/v1/holes?")) {
        return Response.json([
          {
            hole_number: 1,
            distance_to_pin_yards: null,
            par: 4,
            score: 3,
            fairway_result: "hit",
            gir_result: "hit",
            scramble_opportunity: false,
            chip_count: 0,
            putts: 1,
            bunker_shot: false,
            penalty_strokes: 0,
            player_notes: null,
            ai_feedback: null,
          },
        ]);
      }
      if (path.includes("select=score_to_par")) return Response.json([{ score_to_par: -3 }]);
      return Response.json([]);
    },
  };

  const evidence = await loadRoundEvidence(
    context,
    "cccccccc-cccc-cccc-cccc-cccccccccccc",
    "dddddddd-dddd-dddd-dddd-dddddddddddd",
  );
  assert.equal(evidence.round.course_par, 34);
  assert.deepEqual(evidence.historicalToPar, [-3]);
  assert.ok(paths.some((path) => path.includes("total_score,course_par,ai_summary")));
  assert.ok(paths.some((path) => path.includes("select=score_to_par")));
});

test("persistence replaces candidates and refreshes the structured result", async () => {
  const requests: Array<{ method: string; url: string; body?: string }> = [];
  const generated = generateStoryCandidates(base);
  const stored = generated.map((candidate) => ({
    id: candidate.id,
    round_id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
    story_id: candidate.story_id,
    category: candidate.archetype,
    title: candidate.title,
    hook: candidate.hook,
    script: candidate.summary,
    status: "draft",
    created_at: "2026-09-09T12:00:00Z",
    stats_used: {
      story_engine: "creator_story_v1",
      creator_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      summary: candidate.summary,
      why_interesting: candidate.why_interesting,
      supporting_evidence: candidate.supporting_evidence,
      relevant_holes: candidate.relevant_holes,
      confidence: candidate.confidence,
      suggested_format: candidate.suggested_format ?? null,
      transcript_highlights: candidate.transcript_highlights ?? [],
      scorecard: candidate.scorecard,
    },
  }));
  const context: SupabaseRequestContext = {
    ...requestContext,
    proxy: async (input: string, init) => {
    requests.push({
      method: init?.method ?? "GET",
      url: String(input),
      body: typeof init?.body === "string" ? init.body : undefined,
    });
    const body = init?.method === "GET" || init?.method === undefined
      ? String(input).includes("/content_ideas?")
        ? stored
        : []
      : undefined;
    return new Response(body === undefined ? null : JSON.stringify(body), {
      status: body === undefined ? 204 : 200,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    });
    },
  };
    await persistCandidates(
      context,
      "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      base.storyId,
      "cccccccc-cccc-cccc-cccc-cccccccccccc",
      generated,
    );
    const refreshed = await fetchPersistedCandidates(
      context,
      base.storyId,
      "cccccccc-cccc-cccc-cccc-cccccccccccc",
    );
    assert.deepEqual(refreshed.map((item) => item.id), generated.map((item) => item.id));
    assert.deepEqual(requests.map((item) => item.method), ["DELETE", "POST", "GET", "GET", "GET"]);
    assert.ok(requests[0]?.url.includes("creator_id=eq.bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"));
    assert.ok(requests[1]?.body?.includes('"story_engine":"creator_story_v1"'));
    assert.ok(requests[2]?.url.includes("round_id.eq.cccccccc-cccc-cccc-cccc-cccccccccccc"));
    assert.ok(requests[2]?.url.includes("story_id.eq.11111111-1111-1111-1111-111111111111"));
    assert.ok(requests[2]?.url.includes("order=created_at.asc,id.asc"));
});

test("creator-scoped persistence cannot erase another permitted creator's candidates", async () => {
  const creatorA = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
  const creatorB = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee";
  const generatedA = generateStoryCandidates({ ...base, ownerId: creatorA });
  const generatedB = generateStoryCandidates({ ...base, ownerId: creatorB });
  assert.notDeepEqual(generatedA.map((item) => item.id), generatedB.map((item) => item.id));

  const stored = new Map<string, unknown[]>();
  const context: SupabaseRequestContext = {
    userId: requestContext.userId,
    proxy: async (path, init) => {
      const creator = [creatorA, creatorB].find((id) => path.includes(`creator_id=eq.${id}`));
      if (init?.method === "DELETE") {
        if (creator) stored.delete(creator);
        return new Response(null, { status: 204 });
      }
      if (init?.method === "POST") {
        const rows = JSON.parse(String(init.body)) as Array<{
          stats_used: { creator_id: string };
        }>;
        for (const row of rows) {
          const current = stored.get(row.stats_used.creator_id) ?? [];
          stored.set(row.stats_used.creator_id, [...current, row]);
        }
        return new Response(null, { status: 201 });
      }
      return Response.json(creator ? stored.get(creator) ?? [] : []);
    },
  };

  await persistCandidates(context, creatorA, base.storyId, "cccccccc-cccc-cccc-cccc-cccccccccccc", generatedA);
  await persistCandidates(context, creatorB, base.storyId, "cccccccc-cccc-cccc-cccc-cccccccccccc", generatedB);
  assert.deepEqual(
    (stored.get(creatorA) as Array<{ id: string }>).map((item) => item.id),
    generatedA.map((item) => item.id),
  );
  assert.deepEqual(
    (stored.get(creatorB) as Array<{ id: string }>).map((item) => item.id),
    generatedB.map((item) => item.id),
  );
});

test("round retrieval returns production-shaped ideas without story or engine metadata", async () => {
  const requested: string[] = [];
  const roundId = "cccccccc-cccc-cccc-cccc-cccccccccccc";
  const playerId = "dddddddd-dddd-dddd-dddd-dddddddddddd";
  const context: SupabaseRequestContext = {
    ...requestContext,
    proxy: async (path) => {
      requested.push(path);
      if (path.startsWith("/rest/v1/rounds?")) {
        return Response.json([{
          id: roundId,
          user_id: playerId,
          played_at: "2026-09-09",
          course_name: "Pebble Beach Golf Links",
          tees: "White",
          total_score: 92,
          course_par: 72,
          score_to_par: 19,
          front_9: 46,
          back_9: 46,
          total_putts: 27,
          total_penalties: 2,
          fairways_hit: 8,
          total_fairways: 14,
          fairways_left: 2,
          fairways_right: 2,
          fairways_long: 1,
          fairways_short: 1,
          fairways_missed: 6,
          fairways_playable: 4,
          gir_hit: 5,
          total_gir: 18,
          gir_short: 4,
          gir_long: 2,
          gir_left: 4,
          gir_right: 3,
          gir_missed: 13,
          gir_playable: 7,
          scrambling_opportunities: 9,
          successful_scrambles: 4,
          three_putts: 2,
          birdies: 1,
          pars: 8,
          bogeys: 7,
          double_bogeys: 2,
          triple_bogeys: 1,
          eagles: 2,
          albatrosses: 1,
          hole_in_one: 1,
          sand_save_opportunities: 3,
          successful_sand_saves: 2,
        }]);
      }
      if (path.startsWith("/rest/v1/profiles?")) {
        return Response.json([{ id: playerId, display_name: "Aaron" }]);
      }
      if (path.startsWith("/rest/v1/holes?")) {
        return Response.json([
          {
            round_id: roundId,
            hole_number: 2,
            par: 3,
            score: 4,
            fairway_result: "none",
            gir_result: "short",
            putts: 2,
            chip_count: 1,
            bunker_shot: false,
            sand_save: null,
            penalty_strokes: 0,
            player_notes: null,
          },
          {
            round_id: roundId,
            hole_number: 1,
            par: 4,
            score: 5,
            fairway_result: "long",
            gir_result: "long",
            putts: 2,
            chip_count: 1,
            bunker_shot: false,
            sand_save: null,
            penalty_strokes: 0,
            player_notes: "Good drive, missed the green",
          },
        ]);
      }
      return Response.json([
        {
          id: "11111111-1111-4111-8111-111111111111",
          round_id: roundId,
          story_id: null,
          category: "Putting Insight",
          title: "11 Putts",
          hook: "Putting changed the round.",
          script: "Stored production script.",
          stats_used: { "Total Putts": 11 },
          status: "draft",
          created_at: "2026-09-09T12:00:00Z",
        },
        {
          id: "22222222-2222-4222-8222-222222222222",
          round_id: roundId,
          story_id: null,
          category: "Round Analysis",
          title: "Breaking Par",
          hook: "A complete round analysis.",
          script: "Second stored production script.",
          stats_used: { "Total Score": 34 },
          status: "draft",
          created_at: "2026-09-09T12:00:00Z",
        },
      ]);
    },
  };

  const ideas = await fetchPersistedCandidates(context, base.storyId, roundId);
  assert.deepEqual(ideas.map((idea) => idea.category), ["Putting Insight", "Round Analysis"]);
  assert.ok(ideas.every((idea) => idea.story_id === base.storyId));
  assert.deepEqual(Object.keys(ideas[0] ?? {}).sort(), [
    "category", "created_at", "hook", "id", "round", "script", "story_id", "title",
  ]);
  assert.equal(ideas[0]?.round?.player_display_name, "Aaron");
  assert.equal(ideas[0]?.round?.course_par, 72);
  assert.equal(ideas[0]?.round?.score_to_par, 19);
  assert.equal(ideas[0]?.round?.three_putts, 2);
  assert.equal(ideas[0]?.round?.triple_bogeys, 1);
  assert.equal(ideas[0]?.round?.eagles, 2);
  assert.equal(ideas[0]?.round?.albatrosses, 1);
  assert.equal(ideas[0]?.round?.hole_in_one, 1);
  assert.equal(ideas[0]?.round?.fairways_missed, 6);
  assert.equal(ideas[0]?.round?.fairways_playable, 4);
  assert.equal(ideas[0]?.round?.gir_missed, 13);
  assert.equal(ideas[0]?.round?.gir_playable, 7);
  assert.equal(ideas[0]?.round?.sand_save_opportunities, 3);
  assert.equal(ideas[0]?.round?.successful_sand_saves, 2);
  assert.equal(ideas[0]?.round?.fairways_long, 1);
  assert.equal(ideas[0]?.round?.fairways_short, 1);
  assert.deepEqual(ideas[0]?.round?.scorecard.map((hole) => hole.hole), [1, 2]);
  assert.equal(ideas[0]?.round?.scorecard[0]?.player_note, "Good drive, missed the green");
  assert.equal(ideas[0]?.round?.scorecard[0]?.fairway, "long");
  assert.equal(ideas[0]?.round?.scorecard[0]?.gir, "long");
  assert.deepEqual(Object.keys(ideas[0]?.round ?? {}).sort(), [
    "albatrosses", "back_9", "birdies", "bogeys", "course_name", "course_par",
    "double_bogeys", "eagles", "fairways_hit", "fairways_left", "fairways_long",
    "fairways_missed", "fairways_playable", "fairways_right", "fairways_short",
    "front_9", "gir_hit", "gir_left", "gir_long", "gir_missed", "gir_playable",
    "gir_right", "gir_short", "hole_in_one", "pars", "played_at",
    "player_display_name", "sand_save_opportunities", "score_to_par", "scorecard",
    "scrambling_opportunities", "successful_sand_saves", "successful_scrambles",
    "tees", "three_putts", "total_fairways", "total_gir", "total_penalties",
    "total_putts", "total_score", "triple_bogeys",
  ]);
  assert.ok(requested[0]?.includes(`round_id.eq.${roundId}`));
  assert.ok(!requested[0]?.includes("story_engine"));
  assert.ok(!requested[0]?.includes("creator_id"));
  assert.ok(requested.every((path) => !path.includes("player_stories")));
});

test("round retrieval preserves null and zero three-putt values without recalculation", async () => {
  const roundIds = ["round-null", "round-zero"];
  const context: SupabaseRequestContext = {
    ...requestContext,
    proxy: async (path) => {
      if (path.startsWith("/rest/v1/content_ideas?")) {
        return Response.json(roundIds.map((round_id, index) => ({
          id: `idea-${index}`, round_id, story_id: base.storyId, category: "Round Analysis",
          title: "Stored", hook: "Stored", script: "Stored", created_at: "2026-09-09T12:00:00Z",
        })));
      }
      if (path.startsWith("/rest/v1/rounds?")) {
        return Response.json(roundIds.map((id, index) => ({
          id, user_id: "player", played_at: "2026-09-09", course_name: null, tees: null,
          total_score: 80, course_par: 72, score_to_par: index === 0 ? 99 : -7,
          front_9: null, back_9: null, total_putts: null, total_penalties: null,
          eagles: null, albatrosses: null, hole_in_one: null, birdies: null, pars: null,
          bogeys: null, double_bogeys: null, triple_bogeys: null, fairways_hit: null,
          total_fairways: null, fairways_left: null, fairways_right: null, fairways_long: null,
          fairways_short: null, fairways_missed: null, fairways_playable: null, gir_hit: null,
          total_gir: null, gir_short: null, gir_long: null, gir_left: null, gir_right: null,
          gir_missed: null, gir_playable: null, scrambling_opportunities: null,
          successful_scrambles: null, sand_save_opportunities: null, successful_sand_saves: null,
          three_putts: index === 0 ? null : 0,
        })));
      }
      return Response.json([]);
    },
  };
  const ideas = await fetchPersistedCandidates(context, base.storyId, "authorized-round");
  assert.deepEqual(ideas.map((idea) => idea.round?.three_putts), [null, 0]);
  assert.deepEqual(ideas.map((idea) => idea.round?.score_to_par), [99, -7]);
});

test("legacy ideas without a round return a null round and linked rounds preserve nullable fields", async () => {
  const context: SupabaseRequestContext = {
    ...requestContext,
    proxy: async (path) => {
      assert.ok(path.startsWith("/rest/v1/content_ideas?"));
      return Response.json([{
        id: "33333333-3333-4333-8333-333333333333",
        round_id: null,
        story_id: base.storyId,
        category: "Round Analysis",
        title: "Legacy idea",
        hook: "A stored idea.",
        script: "Legacy script.",
        created_at: "2026-09-09T12:00:00Z",
      }]);
    },
  };

  const ideas = await fetchPersistedCandidates(context, base.storyId, "unused-round-id");
  assert.equal(ideas.length, 1);
  assert.equal(ideas[0]?.round, null);
});

test("standard creator ideas contract omits voice and angles", async () => {
  const idea = {
    id: "idea", story_id: base.storyId, category: "Round Analysis", title: "Stored",
    hook: "Stored", script: "Stored", created_at: "2026-09-09T12:00:00Z", round: null,
  };
  const response = buildCreatorIdeasResponse({
    creatorId: base.ownerId, creatorName: "Standard Creator", advancedCreator: false,
    creatorVoice: null, roundId: "round", playerId: "player", playerName: null,
    permissionId: "permission", permissionStatus: "approved",
  }, base.storyId, [idea]);
  assert.deepEqual(response.creator, {
    id: base.ownerId,
    name: "Standard Creator",
    capabilities: { advancedCreator: false, creatorVoice: false },
  });
  assert.equal("creatorVoice" in response, false);
  assert.equal("angles" in response.ideas[0]!, false);
});

test("advanced creator ideas contract includes active voice and stored creator-story angles", async () => {
  const angles = [
    { type: "primary" as const, lens: "Clutch Moment", story_angle: "A turn", why_interesting: "Tension" },
    { type: "creator_specific" as const, lens: "Round of Two Halves", story_angle: "Two chapters", why_interesting: "Contrast" },
    { type: "alternative" as const, lens: "How Did That Happen?", story_angle: "A puzzle", why_interesting: "Surprise" },
  ];
  const voice = {
    id: "voice", name: "My Voice", tone: "warm", personality: null, humor_level: "light",
    energy: "high", storytelling_style: "evidence-first", sentence_style: "short",
    vocabulary_style: "accessible", golf_terminology: "standard",
    things_to_emphasize: "turning points", things_to_avoid: "cliches",
  };
  const context: SupabaseRequestContext = {
    ...requestContext,
    proxy: async (path) => path.includes("/content_ideas?")
      ? Response.json([{
          id: "idea", round_id: null, story_id: base.storyId, category: "Round Analysis",
          title: "Stored", hook: "Stored", script: "Stored", created_at: "2026-09-09T12:00:00Z",
          content_type: "creator_story", angles,
        }])
      : Response.json([]),
  };
  const ideas = await fetchPersistedCandidates(context, base.storyId, "round", undefined, true);
  const response = buildCreatorIdeasResponse({
    creatorId: base.ownerId, creatorName: "Advanced Creator", advancedCreator: true,
    creatorVoice: voice, roundId: "round", playerId: "player", playerName: null,
    permissionId: "permission", permissionStatus: "approved",
  }, base.storyId, ideas);
  assert.deepEqual(response.creator.capabilities, { advancedCreator: true, creatorVoice: true });
  assert.deepEqual(response.creatorVoice, voice);
  assert.deepEqual(response.ideas[0]?.angles, angles);
  assert.equal(response.ideas[0]?.round, null);
});

test("advanced creator without an active voice omits the voice object", () => {
  const response = buildCreatorIdeasResponse({
    creatorId: base.ownerId, creatorName: "Advanced Creator", advancedCreator: true,
    creatorVoice: null, roundId: "round", playerId: "player", playerName: null,
    permissionId: "permission", permissionStatus: "pending",
  }, base.storyId, []);
  assert.deepEqual(response.creator.capabilities, { advancedCreator: true, creatorVoice: false });
  assert.equal("creatorVoice" in response, false);
});

test("round web contract authorizes by round and returns isolated experiences", async () => {
  const roundId = "cccccccc-cccc-cccc-cccc-cccccccccccc";
  const storyId = "11111111-1111-1111-1111-111111111111";
  const playerId = "dddddddd-dddd-dddd-dddd-dddddddddddd";
  const paths: string[] = [];
  const context: SupabaseRequestContext = {
    ...requestContext,
    proxy: async (path) => {
      paths.push(path);
      if (path.includes("creator_profiles?")) return Response.json([{ id: base.ownerId, advanced_creator: true }]);
      if (path.includes("story_candidates?")) return Response.json([{
        id: storyId, story_type: "round_recap", headline: "A comeback", summary: "Stored summary",
        status: "shared", user_id: playerId,
      }]);
      if (path.includes("story_permissions?")) return Response.json([{
        id: "permission", story_id: storyId, user_id: playerId, permission_granted: true,
        approval_requested_at: null, granted_at: "2026-09-10T12:00:00Z", revoked_at: null,
      }]);
      if (path.includes("rounds?")) return Response.json([{
        id: roundId, user_id: playerId, played_at: "2026-09-09", course_name: "Pebble Beach",
        tees: "White", total_score: 92, course_par: 72, front_9: 46,
        back_9: 46, total_putts: 27, total_penalties: 2, fairways_hit: 8, total_fairways: 14,
        fairways_left: 2, fairways_right: 2, fairways_long: 1, fairways_short: 1, gir_hit: 5,
        total_gir: 18, gir_short: 4, gir_long: 2, gir_left: 4, gir_right: 3,
        scrambling_opportunities: 9, successful_scrambles: 4, three_putts: 2, birdies: 1,
        pars: 8, bogeys: 7, double_bogeys: 2, eagles: 0, albatrosses: 0, hole_in_one: 0,
      }]);
      if (path.includes("profiles?")) return Response.json([{ display_name: "Aaron" }]);
      if (path.includes("holes?")) return Response.json([
        {
          hole_number: 2, par: 3, score: 4, fairway_result: "none", gir_result: "short",
          putts: 2, chip_count: 1, bunker_shot: false, sand_save: null, penalty_strokes: 0, player_notes: null,
        },
        {
          hole_number: 1, par: 4, score: 5, fairway_result: "long", gir_result: "long",
          putts: 2, chip_count: 1, bunker_shot: false, sand_save: null, penalty_strokes: 0,
          player_notes: "Good drive",
        },
      ]);
      if (path.includes("content_type=eq.creator_story")) return Response.json([{
        id: "idea-1", category: "Surprise", title: "A turn", hook: "The turn changed everything",
        script: null, story_angle: "The comeback", why_interesting: "Stored", created_at: "2026-09-10",
        content_type: "creator_story",
        angles: [{ type: "primary", lens: "Clutch Moment", story_angle: "The comeback", why_interesting: "Stored" }],
      }]);
      if (path.includes("category=eq.coaching_reflection")) return Response.json([{
        id: "reflection-1", category: "coaching_reflection", title: "Reflection", hook: "What changed?",
        reflection: "Stored reflection", script: "Alias", created_at: "2026-09-10",
      }]);
      return Response.json([]);
    },
  };
  const contract = await fetchRoundWebContract(context, roundId);
  assert.equal(contract.round.player_display_name, "Aaron");
  assert.deepEqual(Object.keys(contract.round).sort(), [
    "course_name", "played_at", "player_display_name", "tees",
  ]);
  assert.deepEqual(contract.scorecard.map((hole) => hole.hole), [1, 2]);
  assert.equal(contract.creatorContentStory.available, true);
  assert.equal(contract.creatorContentStory.contentIdea?.id, "idea-1");
  assert.deepEqual(contract.creatorContentStory.contentIdea?.angles, [
    { type: "primary", lens: "Clutch Moment", story_angle: "The comeback", why_interesting: "Stored" },
  ]);
  assert.equal(contract.coachingReflection.available, true);
  assert.ok(paths.every((path) => !path.includes("player_stories")));
  assert.ok(paths.some((path) => path.includes(`round_id=eq.${roundId}`)));
});

test("round web contract rejects an ineligible candidate before reading the round", async () => {
  const paths: string[] = [];
  const context: SupabaseRequestContext = {
    ...requestContext,
    proxy: async (path) => {
      paths.push(path);
      if (path.includes("creator_profiles?")) return Response.json([{ id: base.ownerId }]);
      if (path.includes("story_candidates?")) return Response.json([]);
      return Response.json([]);
    },
  };
  await assert.rejects(
    fetchRoundWebContract(context, "cccccccc-cccc-cccc-cccc-cccccccccccc"),
    (error: unknown) => error instanceof CreatorContentError && error.status === 403,
  );
  assert.ok(!paths.some((path) => path.includes("/rounds?")));
});

test("approval requests reuse the active pending permission and never approve it", async () => {
  const methods: string[] = [];
  const context: SupabaseRequestContext = {
    ...requestContext,
    proxy: async (_path, init) => {
      methods.push(init?.method ?? "GET");
      if (!init?.method) {
        return Response.json([{
          id: "99999999-9999-4999-8999-999999999999",
          story_id: base.storyId,
          user_id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
          permission_granted: true,
          approval_requested_at: null,
          granted_at: null,
          revoked_at: null,
        }]);
      }
      assert.equal(init.method, "PATCH");
      assert.ok(String(init.body).includes('"approval_requested_at"'));
      return Response.json([{
        id: "99999999-9999-4999-8999-999999999999",
        story_id: base.storyId,
        user_id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
        permission_granted: true,
        approval_requested_at: "2026-09-08T19:00:00Z",
        granted_at: null,
        revoked_at: null,
      }]);
    },
  };

  assert.equal(
    await requestStoryApproval(context, base.ownerId, base.storyId),
    "requested",
  );
  assert.deepEqual(methods, ["GET", "PATCH"]);
});

test("repeated approval requests reuse the requested permission without another mutation", async () => {
  const permissionId = "99999999-9999-4999-8999-999999999999";
  const patchPaths: string[] = [];
  const context: SupabaseRequestContext = {
    ...requestContext,
    proxy: async (path, init) => {
      if (init?.method === "PATCH") {
        patchPaths.push(path);
        assert.ok(!String(init.body).includes("granted_at"));
      }
      const row = {
        id: permissionId,
        story_id: base.storyId,
        user_id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
        permission_granted: true,
        approval_requested_at: patchPaths.length > 0 ? "2026-09-08T19:00:00Z" : null,
        granted_at: null,
        revoked_at: null,
      };
      return Response.json([row]);
    },
  };

  assert.equal(await requestStoryApproval(context, base.ownerId, base.storyId), "requested");
  assert.equal(await requestStoryApproval(context, base.ownerId, base.storyId), "requested");
  assert.equal(patchPaths.length, 1);
  assert.ok(patchPaths.every((path) => path.includes(`id=eq.${permissionId}`)));
});

test("an approved permission stays approved without a duplicate request mutation", async () => {
  const methods: string[] = [];
  const context: SupabaseRequestContext = {
    ...requestContext,
    proxy: async (_path, init) => {
      methods.push(init?.method ?? "GET");
      return Response.json([{
        id: "99999999-9999-4999-8999-999999999999",
        story_id: base.storyId,
        user_id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
        permission_granted: true,
        approval_requested_at: "2026-09-08T19:00:00Z",
        granted_at: "2026-09-08T20:00:00Z",
        revoked_at: null,
      }]);
    },
  };

  assert.equal(
    await requestStoryApproval(context, base.ownerId, base.storyId),
    "approved",
  );
  assert.deepEqual(methods, ["GET"]);
});

test("dismissal updates only the resolved creator permission row", async () => {
  const permissionId = "99999999-9999-4999-8999-999999999999";
  let requestedPath = "";
  const context: SupabaseRequestContext = {
    ...requestContext,
    proxy: async (path, init) => {
      requestedPath = path;
      assert.equal(init?.method, "PATCH");
      assert.ok(String(init?.body).includes('"permission_granted":false'));
      return Response.json([{
        id: permissionId,
        story_id: base.storyId,
        creator_id: base.ownerId,
        permission_granted: false,
        revoked_at: "2026-09-10T12:00:00Z",
      }]);
    },
  };

  assert.equal(
    await dismissCreatorStory(context, base.ownerId, base.storyId, permissionId),
    true,
  );
  assert.ok(requestedPath.includes(`id=eq.${permissionId}`));
  assert.ok(requestedPath.includes(`creator_id=eq.${base.ownerId}`));
  assert.ok(requestedPath.includes(`story_id=eq.${base.storyId}`));
});