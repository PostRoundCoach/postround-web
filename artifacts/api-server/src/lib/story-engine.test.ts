import assert from "node:assert/strict";
import test from "node:test";
import { generateStoryCandidates, generateStoryDraft, type RoundEvidence } from "./story-engine.ts";
import {
  authorizeCreatorStory,
  CreatorContentError,
  fetchPersistedCandidates,
  loadRoundEvidence,
  persistCandidates,
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

test("live round lookup contract uses rounds.par and maps it to course par", async () => {
  const paths: string[] = [];
  const context: SupabaseRequestContext = {
    userId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    proxy: async (path) => {
      paths.push(path);
      if (path.startsWith("/rest/v1/rounds?select=id,user_id,played_at,total_score,par,")) {
        return Response.json([{
          id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
          user_id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
          played_at: "2026-09-07",
          total_score: 34,
          par: 34,
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
      return Response.json([]);
    },
  };

  const evidence = await loadRoundEvidence(
    context,
    "cccccccc-cccc-cccc-cccc-cccccccccccc",
    "dddddddd-dddd-dddd-dddd-dddddddddddd",
  );
  assert.equal(evidence.round.par, 34);
  assert.ok(paths.some((path) => path.includes("total_score,par,ai_summary")));
  assert.ok(paths.every((path) => !path.includes("course_par")));
});

test("persistence replaces candidates and refreshes the structured result", async () => {
  const requests: Array<{ method: string; url: string; body?: string }> = [];
  const generated = generateStoryCandidates(base);
  const stored = generated.map((candidate) => ({
    id: candidate.id,
    story_id: candidate.story_id,
    category: candidate.archetype,
    title: candidate.title,
    hook: candidate.hook,
    script: candidate.summary,
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
    const body = init?.method === "GET" || init?.method === undefined ? stored : undefined;
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
      "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      base.storyId,
    );
    assert.deepEqual(refreshed.map((item) => item.id), generated.map((item) => item.id));
    assert.deepEqual(requests.map((item) => item.method), ["DELETE", "POST", "GET"]);
    assert.ok(requests[0]?.url.includes("creator_id=eq.bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"));
    assert.ok(requests[1]?.body?.includes('"story_engine":"creator_story_v1"'));
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
    (await fetchPersistedCandidates(context, creatorA, base.storyId)).map((item) => item.id),
    generatedA.map((item) => item.id),
  );
  assert.deepEqual(
    (await fetchPersistedCandidates(context, creatorB, base.storyId)).map((item) => item.id),
    generatedB.map((item) => item.id),
  );
});