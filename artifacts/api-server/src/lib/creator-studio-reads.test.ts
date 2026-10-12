import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { request as httpRequest } from "node:http";
import type { AddressInfo } from "node:net";
import { createContentRouter } from "../routes/content.ts";
import accountRouter from "../routes/account.ts";
import {
  authenticateSupabaseBearer, type SupabaseRequestContext,
} from "./creator-content-data.ts";
import {
  fetchCreatorStoryQueue, fetchCreatorLandingSummary,
} from "./creator-studio-reads.ts";

const userId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const creatorId = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const token = ["header", Buffer.from('{"iss":"https://fixture-project.supabase.co/auth/v1"}')
  .toString("base64url"), "signature"].join(".");
const profile = {
  id: creatorId, user_id: userId, status: "active", display_name: "Fixture Creator",
  advanced_creator: false, creator_voice_profiles: [] as Array<{ id: string; status: string }>,
};
const creator = {
  id: creatorId, name: profile.display_name,
  capabilities: { advancedCreator: false, creatorVoice: false },
};
function story(index: number, status = "shared") {
  return {
    id: String(index).padStart(36, "0"), round_id: `round-${index}`,
    story_type: "multiple_birdies", headline: `Headline ${index}`, summary: "Stored summary",
    status, created_at: "2026-10-12T01:02:03.000+00:00",
    story_data: { player: "PRIVATE" }, significance_score: 88, user_id: "PRIVATE",
  };
}
type Candidate = ReturnType<typeof story>;
type Permission = { story_id: string; creator_id: string; permission_granted: boolean; revoked_at: string | null };
const grant = (id: string, overrides: Partial<Permission> = {}): Permission => ({
  story_id: id, creator_id: creatorId, permission_granted: true, revoked_at: null, ...overrides,
});
type Options = {
  initial?: unknown[]; owned?: unknown[];
  initialError?: boolean; helperError?: boolean; candidateError?: boolean;
  initialThrow?: boolean; helperThrow?: boolean; candidateThrow?: boolean;
  candidates?: Candidate[]; permissions?: Permission[]; countRange?: string | null;
};
function fixture(options: Options = {}) {
  const calls: Array<{ path: string; method: string }> = [];
  const candidates = options.candidates ?? [];
  const permissions = options.permissions ?? candidates.map((row) => grant(row.id));
  const context: SupabaseRequestContext = {
    userId,
    proxy: async (path, init) => {
      const method = init?.method ?? "GET";
      calls.push({ path, method });
      assert.ok(method === "GET" || method === "HEAD", "No mutation is permitted");
      const url = new URL(path, "https://offline.invalid");
      const params = url.searchParams;
      if (url.pathname === "/rest/v1/creator_profiles") {
        if (params.get("select") === "id") {
          assert.equal(params.get("user_id"), `eq.${userId}`);
          assert.equal(params.get("status"), "eq.active");
          assert.equal(params.get("limit"), "2", "Detect, don't conceal, ambiguity");
          if (options.initialThrow) throw new Error("private initial failure");
          return options.initialError ? new Response(null, { status: 503 })
            : Response.json(options.initial ?? [{ id: creatorId }]);
        }
        assert.equal(params.get("id"), `eq.${creatorId}`);
        assert.equal(params.get("select"),
          "id,user_id,status,display_name,advanced_creator,creator_voice_profiles(id,status)");
        if (options.helperThrow) throw new Error("private helper failure");
        return options.helperError ? new Response(null, { status: 503 })
          : Response.json(options.owned ?? [profile]);
      }
      assert.equal(url.pathname, "/rest/v1/story_candidates", "No follower or other queries");
      assert.equal(params.get("status"), "in.(offered,shared)");
      assert.equal(params.get("story_permissions.creator_id"), `eq.${creatorId}`);
      assert.equal(params.get("story_permissions.permission_granted"), "eq.true");
      assert.equal(params.get("story_permissions.revoked_at"), "is.null");
      assert.ok(params.get("select")?.endsWith(",story_permissions!inner(story_id)"));
      if (options.candidateThrow) throw new Error("private candidate failure");
      if (options.candidateError) return new Response(null, { status: 503 });
      // Simulate a correlated inner join, not independent permission predicates.
      const eligible = candidates.filter((row) =>
        ["offered", "shared"].includes(row.status) && permissions.some((permission) =>
          permission.story_id === row.id && permission.creator_id === creatorId
          && permission.permission_granted && permission.revoked_at === null));
      if (method === "HEAD") {
        assert.equal(params.get("select"), "id,story_permissions!inner(story_id)");
        assert.equal(init?.headers?.Prefer, "count=exact");
        assert.equal(init?.headers?.Range, "0-0");
        assert.equal(params.get("limit"), null);
        const range = options.countRange === undefined ? `*/${eligible.length}` : options.countRange;
        return new Response(null, { headers: range === null ? {} : { "content-range": range } });
      }
      assert.equal(params.get("order"), "created_at.desc,id.desc");
      assert.equal(params.get("limit"), "100");
      assert.equal(params.get("select"),
        "id,round_id,story_type,headline,summary,status,created_at,story_permissions!inner(story_id)");
      eligible.sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
      const offset = Number(params.get("offset"));
      return Response.json(eligible.slice(offset, offset + 100).map((row) => ({
        ...row, story_permissions: [grant(row.id)], generated_content: "PRIVATE",
      })));
    },
  };
  return { context, calls };
}

type Log = { fields: unknown; message: string };
type Reply = { status: number; type: string; text: string; json: () => unknown };
async function withApi(
  context: SupabaseRequestContext,
  run: (send: (path: string, authorization?: string, body?: unknown, method?: string) => Promise<Reply>, logs: Log[]) => Promise<void>,
  verify = async (authorization: string | undefined) => {
    await authenticateSupabaseBearer(authorization,
      async () => Response.json({ id: userId }),
      async () => Response.json({ id: userId }), "synthetic-key", true);
    return context;
  },
  reads = { fetchCreatorStoryQueue, fetchCreatorLandingSummary },
) {
  const logs: Log[] = [];
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    const capture = (fields: unknown, message: string) => { logs.push({ fields, message }); };
    req.log = { error: capture, warn: capture, info: capture } as typeof req.log;
    next();
  });
  app.use("/api", createContentRouter(reads, verify));
  app.use("/api", accountRouter);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  try {
    const send = (path: string, authorization: string | undefined = `Bearer ${token}`, body?: unknown, method = "GET") =>
      new Promise<Reply>((resolve, reject) => {
        const payload = body === undefined ? undefined : JSON.stringify(body);
        const request = httpRequest({
          hostname: "127.0.0.1", port: (server.address() as AddressInfo).port, path, method,
          headers: {
            ...(authorization ? { Authorization: authorization } : {}),
            ...(payload ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } : {}),
          },
        }, (response) => {
          let text = "";
          response.setEncoding("utf8").on("data", (chunk) => { text += chunk; }).on("end", () =>
            resolve({ status: response.statusCode!, type: String(response.headers["content-type"]),
              text, json: () => JSON.parse(text) }));
        });
        request.on("error", reject);
        request.end(payload);
      });
    await run(send, logs);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}
const endpoints = [
  { path: "/api/content/stories", summary: false, error: "Failed to fetch creator stories", diagnostic: "GET_CREATOR_STORIES_FAILED" },
  { path: "/api/content/creator-summary", summary: true, error: "Failed to fetch creator summary", diagnostic: "GET_CREATOR_SUMMARY_FAILED" },
];

for (const endpoint of endpoints) {
  for (const size of [0, 1, 99, 100, 101, 200, 205]) {
    test(`${endpoint.path}: exact ${size}-candidate envelope, internal pages, stable ties and read-only calls`, async () => {
      const { context, calls } = fixture({ candidates: Array.from({ length: size }, (_, index) => story(index, index % 2 ? "offered" : "shared")) });
      await withApi(context, async (send) => {
        const response = await send(endpoint.path);
        assert.equal(response.status, 200);
        assert.equal(response.type, "application/json; charset=utf-8");
        const expected = Array.from({ length: size }, (_, index) => {
          const { id, round_id, story_type, headline, summary, status, created_at } =
            story(size - index - 1, (size - index - 1) % 2 ? "offered" : "shared");
          return { id, round_id, story_type, headline, summary, status, created_at };
        });
        assert.deepEqual(response.json(), endpoint.summary
          ? { ok: true, creator, summary: { storyCount: size } } : { ok: true, creator, stories: expected });
      });
      const dataCalls = calls.slice(2);
      assert.equal(dataCalls.length, endpoint.summary ? 1 : Math.floor(size / 100) + 1);
      if (!endpoint.summary) assert.deepEqual(dataCalls.map(({ path }) =>
        new URL(path, "https://offline.invalid").searchParams.get("offset")),
      Array.from({ length: Math.floor(size / 100) + 1 }, (_, index) => String(index * 100)));
    });
  }

  for (const [advanced, voices, enabled] of [
    [false, [], false], [false, [{ id: "v1", status: "active" }], false],
    [true, [], false], [true, [{ id: "v1", status: "inactive" }], false],
    [true, [{ id: "v1", status: "active" }], true],
    [true, [{ id: "inactive", status: "inactive" }, { id: "v1", status: "active" }, { id: "v2", status: "active" }], true],
  ] as const) {
    test(`${endpoint.path}: DB capabilities advanced=${advanced}, voices=${voices.length}/${enabled}`, async () => {
      const { context } = fixture({ owned: [{ ...profile, advanced_creator: advanced, creator_voice_profiles: voices }] });
      await withApi(context, async (send) => {
        const response = await send(endpoint.path);
        assert.equal(response.status, 200);
        assert.deepEqual(response.json(), {
          ok: true, creator: { ...creator, capabilities: { advancedCreator: advanced, creatorVoice: enabled } },
          ...(endpoint.summary ? { summary: { storyCount: 0 } } : { stories: [] }),
        });
      });
    });
  }

  test(`${endpoint.path}: caller identity, capabilities, filters and pagination are ignored (query and GET body)`, async () => {
    const { context } = fixture({ candidates: [story(1), story(2)] });
    await withApi(context, async (send) => {
      const clean = await send(endpoint.path);
      const untrusted = { user_id: "other", creator_id: "other", advancedCreator: true,
        creatorVoice: true, status: "expired", limit: 0, offset: 999, page: 900 };
      const supplied = await send(endpoint.path + "?" + new URLSearchParams(
        Object.entries(untrusted).map(([key, value]) => [key, String(value)])), `Bearer ${token}`, untrusted);
      assert.equal(supplied.status, 200);
      assert.deepEqual(supplied.json(), clean.json());
    });
  });

  test(`${endpoint.path}: pending own permission cannot combine with other creator's grant; revoked/absent/ineligible excluded`, async () => {
    const candidates = Array.from({ length: 8 }, (_, index) => story(index,
      index === 6 ? "candidate" : index === 7 ? "expired" : index === 1 ? "offered" : "shared"));
    const permissions = [
      grant(candidates[0]!.id), grant(candidates[1]!.id),
      grant(candidates[2]!.id, { permission_granted: false }),
      grant(candidates[2]!.id, { creator_id: "other" }),
      grant(candidates[3]!.id, { revoked_at: "2026-10-12" }),
      grant(candidates[4]!.id, { creator_id: "other" }),
      grant(candidates[6]!.id), grant(candidates[7]!.id),
    ];
    const { context } = fixture({ candidates, permissions });
    await withApi(context, async (send) => {
      const response = await send(endpoint.path);
      assert.equal(response.status, 200);
      const result = response.json() as { stories: Candidate[]; summary: { storyCount: number } };
      if (endpoint.summary) assert.equal(result.summary.storyCount, 2);
      else assert.deepEqual(result.stories.map((row) => row.id), [candidates[1]!.id, candidates[0]!.id]);
    });
  });

  const failures: Array<[string, Options, number]> = [
    ["absent active creator", { initial: [] }, 403],
    ["ambiguous active creators", { initial: [{ id: creatorId }, { id: "other" }] }, 500],
    ["initial DB failure", { initialError: true }, 500],
    ["initial exception", { initialThrow: true }, 500],
    ["helper DB failure", { helperError: true }, 403],
    ["helper exception", { helperThrow: true }, 403],
    ["helper missing row", { owned: [] }, 403],
    ["helper inactive", { owned: [{ ...profile, status: "inactive" }] }, 403],
    ["helper wrong owner", { owned: [{ ...profile, user_id: "other" }] }, 403],
    ["helper wrong profile", { owned: [{ ...profile, id: "other" }] }, 403],
    ["joined DB failure", { candidateError: true }, 500],
    ["joined exception", { candidateThrow: true }, 500],
  ];
  for (const [name, options, status] of failures) {
    test(`${endpoint.path}: ${name} => exact ${status}, safe diagnostic`, async () => {
      const { context, calls } = fixture(options);
      await withApi(context, async (send, logs) => {
        const response = await send(endpoint.path);
        assert.equal(response.status, status);
        assert.equal(response.type, "application/json; charset=utf-8");
        assert.deepEqual(response.json(), { error: status === 403 ? "Creator profile not found or inactive" : endpoint.error });
        assert.deepEqual(logs, [{ fields: { diagnostic: endpoint.diagnostic }, message: "Creator Studio read failed" }]);
      });
      if (!options.candidateError && !options.candidateThrow) {
        assert.ok(calls.every(({ path }) => path.includes("/creator_profiles?")));
      }
    });
  }

  test(`${endpoint.path}: unexpected handler exception is endpoint-specific 500`, async () => {
    const { context } = fixture();
    const unexpected = async (): Promise<never> => { throw new Error(`private credential ${token}`); };
    await withApi(context, async (send, logs) => {
      const response = await send(endpoint.path);
      assert.equal(response.status, 500);
      assert.deepEqual(response.json(), { error: endpoint.error });
      assert.ok(!JSON.stringify(logs).includes(token));
    }, undefined, { fetchCreatorStoryQueue: unexpected, fetchCreatorLandingSummary: unexpected });
  });
}

for (const countRange of [null, "0-0/*", "*/-1", "*/1.5", "*/9007199254740992", "malformed"]) {
  test(`summary missing/invalid exact count ${countRange} fails, not null/zero`, async () => {
    const { context } = fixture({ countRange });
    await withApi(context, async (send) => {
      const response = await send("/api/content/creator-summary");
      assert.equal(response.status, 500);
      assert.deepEqual(response.json(), { error: "Failed to fetch creator summary" });
    });
  });
}

const authScenarios: Array<{ name: string; authorization?: string; auth?: () => Promise<Response>;
  proxy?: () => Promise<Response>; key?: string; error: string }> = [
  ...["", "bearer token", "BEARER token", "Bearer", "Bearer ", "Bearer    ", "Bearer\ttoken", "Basic token"]
    .map((authorization) => ({ name: `prefix ${JSON.stringify(authorization)}`, authorization, error: "Authentication required" })),
  { name: "malformed JWT", authorization: "Bearer malformed", error: "Invalid or expired session" },
  { name: "expired/rejected user", auth: async () => new Response(null, { status: 401 }), error: "Invalid or expired session" },
  { name: "missing user", auth: async () => Response.json({}), error: "Invalid or expired session" },
  { name: "null user", auth: async () => Response.json(null), error: "Invalid or expired session" },
  { name: "empty user ID", auth: async () => Response.json({ id: "" }), error: "Invalid or expired session" },
  { name: "connected project rejection", proxy: async () => new Response(null, { status: 403 }), error: "Invalid or expired session" },
  { name: "connected project mismatch", proxy: async () => Response.json({ id: "other" }), error: "Invalid or expired session" },
  { name: "null connected user", proxy: async () => Response.json(null), error: "Invalid or expired session" },
  { name: "thrown verification", auth: async () => { throw new Error(`private ${token}`); }, error: "Could not verify session" },
  { name: "thrown client acquisition", proxy: async () => { throw new Error("client acquisition failed"); }, error: "Could not verify session" },
  { name: "missing verification config", key: "", error: "Could not verify session" },
];
for (const scenario of authScenarios) {
  test(`read authentication ${scenario.name}: exact 401 for both reads and unknown GET`, async () => {
    const { context, calls } = fixture();
    let authCalls = 0;
    const verify = (authorization: string | undefined) => authenticateSupabaseBearer(authorization,
      scenario.proxy ?? (async () => Response.json({ id: userId })),
      async () => { authCalls++; return scenario.auth ? scenario.auth() : Response.json({ id: userId }); },
      scenario.key ?? "synthetic-key", true);
    await withApi(context, async (send, logs) => {
      for (const path of [...endpoints.map((endpoint) => endpoint.path), "/api/content/unknown"]) {
        const response = await send(path, scenario.authorization ?? `Bearer ${token}`);
        assert.equal(response.status, 401);
        assert.deepEqual(response.json(), { error: scenario.error });
        assert.equal(response.type, "application/json; charset=utf-8");
      }
      assert.deepEqual(logs, []);
    }, verify);
    assert.deepEqual(calls, []);
    if (scenario.error === "Authentication required") assert.equal(authCalls, 0);
  });
}

test("missing header stops auth before matching; authenticated unknown GET falls through to HTML 404", async () => {
  const { context, calls } = fixture();
  await withApi(context, async (send) => {
    for (const path of [...endpoints.map((endpoint) => endpoint.path), "/api/content/unknown"]) {
      const missing = await send(path, "");
      assert.equal(missing.status, 401);
      assert.deepEqual(missing.json(), { error: "Authentication required" });
    }
    const unknown = await send("/api/content/unknown");
    assert.equal(unknown.status, 404);
    assert.ok(unknown.type.startsWith("text/html"));
    assert.ok(unknown.text.includes("Cannot GET /api/content/unknown"));
  });
  assert.deepEqual(calls, []);
});

test("neighboring content and account validations keep their responses and precede read middleware", async () => {
  const { context } = fixture();
  await withApi(context, async (send) => {
    for (const [path, method, body, expected] of [
      ["/api/content/ideas", "GET", undefined, { error: "A valid story_id is required." }],
      ["/api/content/round/invalid", "GET", undefined, { error: "A valid round_id is required." }],
      ["/api/content/generate", "POST", {}, { error: "Body must contain valid story_id and creator_id." }],
      ["/api/content/draft", "POST", {}, { error: "Body must contain valid story_id, candidate_id, and supported format." }],
      ["/api/content/stories/invalid/approval-request", "POST", {}, { error: "A valid story_id and empty body are required." }],
      ["/api/content/stories/invalid/dismissal", "PATCH", {}, { error: "A valid story_id is required." }],
      ["/api/account/delete", "POST", {}, { error: "Type DELETE to confirm permanent account deletion.", stage: "confirmation" }],
    ] as const) {
      const response = await send(path, "", body, method);
      assert.equal(response.status, 400);
      assert.deepEqual(response.json(), expected);
    }
  }, async () => { assert.fail("Read verifier must not run on neighboring routes"); });
});

test("list ordering prioritizes created_at, then id for equal timestamps", async () => {
  const older = story(999);
  const newer = { ...story(1), created_at: "2026-10-13T01:02:03.000+00:00" };
  const sameTime = { ...story(2), created_at: newer.created_at };
  const { context } = fixture({ candidates: [older, newer, sameTime] });
  const result = await fetchCreatorStoryQueue(context);
  assert.deepEqual(result.stories.map((row) => row.id), [sameTime.id, newer.id, older.id]);
});

test("authentication verifies the session and connected project before returning identity", async () => {
  const requests: string[] = [];
  const context = await authenticateSupabaseBearer(`Bearer ${token}`,
    async (path) => {
      requests.push(path);
      assert.deepEqual(requests, ["issuer", `/auth/v1/admin/users/${userId}`]);
      return Response.json({ id: userId });
    },
    async (url, init) => {
      requests.push("issuer");
      assert.equal(String(url), "https://fixture-project.supabase.co/auth/v1/user");
      assert.equal(new Headers(init?.headers).get("authorization"), `Bearer ${token}`);
      return Response.json({ id: userId });
    }, "synthetic-key", true);
  assert.equal(context.userId, userId);
});

test("read authentication rejects malformed claims and invalid issuers without requesting data", async () => {
  for (const claims of ["{", "null", '{"iss":"http://fixture-project.supabase.co/auth/v1"}',
    '{"iss":"https://attacker.invalid/auth/v1"}', '{"iss":"https://fixture-project.supabase.co/other"}']) {
    const invalid = `header.${Buffer.from(claims).toString("base64url")}.signature`;
    await assert.rejects(() => authenticateSupabaseBearer(`Bearer ${invalid}`,
      async () => { assert.fail("No connected data access"); },
      async () => { assert.fail("No issuer access"); }, "synthetic-key", true),
    { status: 401, message: "Invalid or expired session" });
  }
});

test("read authentication leaves rejected bodies unread and preserves legacy parsing/error behavior", async () => {
  const rejected = new Response("private", { status: 401 });
  Object.defineProperty(rejected, "json", { value: () => assert.fail("Rejected body must stay unread") });
  await assert.rejects(() => authenticateSupabaseBearer(`Bearer ${token}`,
    async () => { assert.fail("No downstream access"); }, async () => rejected, "synthetic-key", true),
  { status: 401, message: "Invalid or expired session" });
  assert.equal(rejected.bodyUsed, false);
  const accepted = await authenticateSupabaseBearer(`bearer ${token}`,
    async () => Response.json({ id: userId }), async () => Response.json({ id: userId }), "synthetic-key");
  assert.equal(accepted.userId, userId);
  await assert.rejects(() => authenticateSupabaseBearer(undefined, undefined, undefined, "synthetic-key"),
    { status: 401, message: "A bearer token is required." });
});

test("summary counts independently of pages and reflects permission changes between requests", async () => {
  const candidate = story(1);
  const permissions = [grant(candidate.id)];
  const { context } = fixture({ candidates: [candidate], permissions });
  assert.equal((await fetchCreatorLandingSummary(context)).summary.storyCount, 1);
  permissions[0]!.revoked_at = "2026-10-12";
  assert.deepEqual((await fetchCreatorStoryQueue(context)).stories, []);
  assert.equal((await fetchCreatorLandingSummary(context)).summary.storyCount, 0);
});
