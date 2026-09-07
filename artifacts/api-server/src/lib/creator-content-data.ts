import { ReplitConnectors } from "@replit/connectors-sdk";
import { createPublicKey, verify as verifySignature } from "node:crypto";
import type { ScorecardHole, StoryCandidate } from "./story-engine";

export class CreatorContentError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "CreatorContentError";
    this.status = status;
  }
}

export interface AuthorizedStory {
  creatorId: string;
  roundId: string;
  playerId: string;
  playerName: string | null;
}

export interface SupabaseRequestContext {
  userId: string;
  proxy?: (
    path: string,
    init?: { method?: string; body?: unknown; headers?: Record<string, string> },
  ) => Promise<Response>;
}

async function rest<T>(
  context: SupabaseRequestContext,
  path: string,
  init: { method?: string; body?: unknown; headers?: Record<string, string> } = {},
): Promise<T> {
  const proxy = context.proxy ?? ((proxyPath: string, proxyInit?: typeof init) => {
    const connectors = new ReplitConnectors();
    return connectors.proxy("supabase", proxyPath, proxyInit);
  });
  const response = await proxy(`/rest/v1/${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (!response.ok) {
    throw new CreatorContentError(
      response.status >= 500 ? 502 : response.status,
      "The Story Engine data source could not complete this request.",
    );
  }
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return text ? JSON.parse(text) as T : undefined as T;
}

export async function authenticateSupabaseBearer(
  authorization: string | undefined,
): Promise<SupabaseRequestContext> {
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!token) throw new CreatorContentError(401, "A bearer token is required.");
  try {
    const parts = token.split(".");
    if (parts.length !== 3) throw new Error("Malformed JWT");
    const header = JSON.parse(Buffer.from(parts[0]!, "base64url").toString("utf8")) as {
      alg?: unknown;
      kid?: unknown;
    };
    const claims = JSON.parse(Buffer.from(parts[1]!, "base64url").toString("utf8")) as {
      sub?: unknown;
      email?: unknown;
      iss?: unknown;
      aud?: unknown;
      role?: unknown;
      exp?: unknown;
      nbf?: unknown;
    };
    if (header.alg !== "ES256" || typeof header.kid !== "string") throw new Error("Unsupported JWT");
    if (typeof claims.sub !== "string"
      || typeof claims.email !== "string"
      || claims.aud !== "authenticated"
      || claims.role !== "authenticated"
      || typeof claims.iss !== "string"
      || typeof claims.exp !== "number") throw new Error("Invalid claims");
    const issuer = new URL(claims.iss);
    if (issuer.protocol !== "https:"
      || !/^[a-z0-9-]+\.supabase\.co$/i.test(issuer.hostname)
      || issuer.pathname.replace(/\/$/, "") !== "/auth/v1") throw new Error("Invalid issuer");
    const now = Math.floor(Date.now() / 1000);
    if (claims.exp <= now || (typeof claims.nbf === "number" && claims.nbf > now)) {
      throw new Error("Expired JWT");
    }
    const jwksResponse = await fetch(`${claims.iss.replace(/\/$/, "")}/.well-known/jwks.json`);
    if (!jwksResponse.ok) throw new Error("JWKS unavailable");
    const jwks = await jwksResponse.json() as {
      keys?: Array<Record<string, unknown> & { kid?: string; alg?: string }>;
    };
    const jwk = jwks.keys?.find((key) => key.kid === header.kid && key.alg === "ES256");
    if (!jwk) throw new Error("Signing key unavailable");
    const valid = verifySignature(
      "sha256",
      Buffer.from(`${parts[0]}.${parts[1]}`),
      {
        key: createPublicKey(
          { key: jwk, format: "jwk" } as Parameters<typeof createPublicKey>[0],
        ),
        dsaEncoding: "ieee-p1363",
      },
      Buffer.from(parts[2]!, "base64url"),
    );
    if (!valid) throw new Error("Invalid signature");

    const connectors = new ReplitConnectors();
    const response = await connectors.proxy(
      "supabase",
      `/auth/v1/admin/users/${encodeURIComponent(claims.sub)}`,
    );
    if (!response.ok) throw new Error("User is not in the connected project");
    const user = await response.json() as { id?: unknown; email?: unknown };
    if (user.id !== claims.sub || user.email !== claims.email) {
      throw new Error("User does not match the connected project");
    }
    return { userId: claims.sub };
  } catch {
    throw new CreatorContentError(401, "The bearer token is invalid or expired.");
  }
}

type CreatorRow = { id: string };
type PermissionRow = { story_id: string };
type StoryRow = {
  round_id: string;
  user_id: string;
  status: string;
  story_data: Record<string, unknown> | null;
};

export async function authorizeCreatorStory(
  context: SupabaseRequestContext,
  storyId: string,
): Promise<AuthorizedStory> {
  const profiles = await rest<CreatorRow[]>(
    context,
    `creator_profiles?select=id&user_id=eq.${encodeURIComponent(context.userId)}&status=eq.active&limit=1`,
  );
  const creator = profiles[0];
  if (!creator) throw new CreatorContentError(403, "This account does not control an active creator profile.");
  const permissions = await rest<PermissionRow[]>(
    context,
    `story_permissions?select=story_id&creator_id=eq.${encodeURIComponent(creator.id)}&story_id=eq.${encodeURIComponent(storyId)}&permission_granted=eq.true&revoked_at=is.null&limit=1`,
  );
  if (!permissions[0]) throw new CreatorContentError(403, "This creator is not permitted to access the story.");
  const stories = await rest<StoryRow[]>(
    context,
    `story_candidates?select=round_id,user_id,status,story_data&id=eq.${encodeURIComponent(storyId)}&status=in.(offered,shared)&limit=1`,
  );
  const story = stories[0];
  if (!story) throw new CreatorContentError(403, "This creator is not permitted to access the story.");
  const data = story.story_data;
  const playerName = data && typeof data.golfer_display_name === "string"
    ? data.golfer_display_name
    : data && typeof data.golferDisplayName === "string"
      ? data.golferDisplayName
      : null;
  return {
    creatorId: creator.id,
    roundId: story.round_id,
    playerId: story.user_id,
    playerName,
  };
}

type DbHole = {
  hole_number: number; distance_to_pin_yards: number | null; par: number | null; score: number | null;
  fairway_result: string | null; gir_result: string | null; scramble_opportunity: boolean | null;
  chip_count: number | null; putts: number | null; bunker_shot: boolean | null; penalty_strokes: number | null;
  player_notes: string | null; ai_feedback: string | null;
};

type DbRound = {
  // Connected qualifying-round verification proves `par` exists while
  // `course_par` returns Postgres 42703; see story-engine.live.test.ts.
  id: string;
  user_id: string;
  played_at: string;
  total_score: number | null;
  par: number | null;
  ai_summary: string | null;
  player_notes: string | null;
};

export async function loadRoundEvidence(
  context: SupabaseRequestContext,
  roundId: string,
  playerId: string,
) {
  const rounds = await rest<DbRound[]>(
    context,
    `rounds?select=id,user_id,played_at,total_score,par,ai_summary,player_notes&id=eq.${encodeURIComponent(roundId)}&user_id=eq.${encodeURIComponent(playerId)}&limit=1`,
  );
  const round = rounds[0];
  if (!round) throw new CreatorContentError(404, "The round for this story no longer exists.");
  const [holeRows, historyRows] = await Promise.all([
    rest<DbHole[]>(
      context,
      `holes?select=hole_number,distance_to_pin_yards,par,score,fairway_result,gir_result,scramble_opportunity,chip_count,putts,bunker_shot,penalty_strokes,player_notes,ai_feedback&round_id=eq.${encodeURIComponent(roundId)}&order=hole_number.asc`,
    ),
    rest<Array<{ total_score: number; par: number }>>(
      context,
      `rounds?select=total_score,par&user_id=eq.${encodeURIComponent(playerId)}&played_at=lt.${encodeURIComponent(round.played_at)}&total_score=not.is.null&par=not.is.null&order=played_at.desc&limit=20`,
    ),
  ]);
  const holes: ScorecardHole[] = holeRows.map((hole) => ({
    hole: hole.hole_number, yards: hole.distance_to_pin_yards, par: hole.par, score: hole.score,
    fairway: hole.fairway_result, green: hole.gir_result, playable: hole.scramble_opportunity,
    chips: hole.chip_count, putts: hole.putts, sand: hole.bunker_shot, penalties: hole.penalty_strokes,
  }));
  return {
    round,
    holes,
    historicalToPar: historyRows.map((item) => item.total_score - item.par),
    holeNotes: holeRows.flatMap((hole) =>
      [hole.ai_feedback, hole.player_notes].filter((note): note is string => typeof note === "string" && note.trim() !== "")
        .map((note) => ({ hole: hole.hole_number, note })),
    ),
  };
}

export async function persistCandidates(
  context: SupabaseRequestContext,
  creatorId: string,
  storyId: string,
  roundId: string,
  candidates: StoryCandidate[],
): Promise<void> {
  await rest<void>(
    context,
    `content_ideas?story_id=eq.${encodeURIComponent(storyId)}&stats_used-%3E%3Estory_engine=eq.creator_story_v1&stats_used-%3E%3Ecreator_id=eq.${encodeURIComponent(creatorId)}`,
    { method: "DELETE", headers: { Prefer: "return=minimal" } },
  );
  if (candidates.length === 0) return;
  await rest<void>(context, "content_ideas", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(candidates.map((candidate) => ({
      id: candidate.id,
      round_id: roundId,
      story_id: storyId,
      category: candidate.archetype,
      title: candidate.title,
      hook: candidate.hook,
      script: candidate.summary,
      status: "draft",
      stats_used: {
        story_engine: "creator_story_v1",
        creator_id: creatorId,
        summary: candidate.summary,
        why_interesting: candidate.why_interesting,
        supporting_evidence: candidate.supporting_evidence,
        relevant_holes: candidate.relevant_holes,
        confidence: candidate.confidence,
        suggested_format: candidate.suggested_format ?? null,
        transcript_highlights: candidate.transcript_highlights ?? [],
        scorecard: candidate.scorecard,
      },
    }))),
  });
}

type ContentIdeaRow = {
  id: string;
  story_id: string;
  category: StoryCandidate["archetype"];
  title: string;
  hook: string;
  script: string;
  stats_used: {
    story_engine?: string;
    creator_id?: string;
    summary?: string;
    why_interesting?: string;
    supporting_evidence?: string[];
    relevant_holes?: number[];
    confidence?: number;
    suggested_format?: string | null;
    transcript_highlights?: string[];
    scorecard?: ScorecardHole[];
  } | null;
};

export async function fetchPersistedCandidates(
  context: SupabaseRequestContext,
  creatorId: string,
  storyId: string,
): Promise<StoryCandidate[]> {
  const rows = await rest<ContentIdeaRow[]>(
    context,
    `content_ideas?select=id,story_id,category,title,hook,script,stats_used&story_id=eq.${encodeURIComponent(storyId)}&stats_used-%3E%3Estory_engine=eq.creator_story_v1&stats_used-%3E%3Ecreator_id=eq.${encodeURIComponent(creatorId)}&order=created_at.desc`,
  );
  return rows.flatMap((row): StoryCandidate[] => {
    const data = row.stats_used;
    if (!data
      || data.story_engine !== "creator_story_v1"
      || data.creator_id !== creatorId
      || typeof data.why_interesting !== "string"
      || !Array.isArray(data.supporting_evidence)
      || !Array.isArray(data.relevant_holes)
      || typeof data.confidence !== "number"
      || !Array.isArray(data.scorecard)) return [];
    return [{
      id: row.id,
      story_id: row.story_id,
      archetype: row.category,
      category: row.category,
      title: row.title,
      hook: row.hook,
      summary: typeof data.summary === "string" ? data.summary : row.script,
      why_interesting: data.why_interesting,
      supporting_evidence: data.supporting_evidence,
      relevant_holes: data.relevant_holes,
      confidence: data.confidence,
      suggested_format: data.suggested_format ?? undefined,
      transcript_highlights: data.transcript_highlights ?? [],
      scorecard: data.scorecard,
    }];
  }).sort((a, b) => b.confidence - a.confidence || a.id.localeCompare(b.id));
}

export async function revokeStoryPermission(
  context: SupabaseRequestContext,
  creatorId: string,
  storyId: string,
): Promise<boolean> {
  const rows = await rest<Array<{ story_id: string }>>(
    context,
    `story_permissions?select=story_id&creator_id=eq.${encodeURIComponent(creatorId)}&story_id=eq.${encodeURIComponent(storyId)}&permission_granted=eq.true&revoked_at=is.null`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ permission_granted: false, revoked_at: new Date().toISOString() }),
    },
  );
  return rows.length === 1;
}