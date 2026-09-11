import { ReplitConnectors } from "@replit/connectors-sdk";
import type { ScorecardHole, StoryCandidate } from "./story-engine";

export class CreatorContentError extends Error {
  readonly status: number;
  readonly diagnostic?: string;

  constructor(status: number, message: string, diagnostic?: string) {
    super(message);
    this.name = "CreatorContentError";
    this.status = status;
    this.diagnostic = diagnostic;
  }
}

export interface AuthorizedStory {
  creatorId: string;
  roundId: string;
  playerId: string;
  playerName: string | null;
  permissionId: string;
  permissionStatus: StoryPermissionStatus;
}

export type StoryPermissionStatus = "pending" | "requested" | "approved";

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
  proxy?: SupabaseRequestContext["proxy"],
  authFetch: typeof fetch = fetch,
  anonKey: string | undefined = process.env.SUPABASE_ANON_KEY,
): Promise<SupabaseRequestContext> {
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!token) throw new CreatorContentError(401, "A bearer token is required.");
  if (!anonKey) {
    throw new CreatorContentError(
      500,
      "Supabase session verification is not configured.",
    );
  }
  let diagnostic = "unexpected_verification_error";
  try {
    const parts = token.split(".");
    diagnostic = "malformed_jwt";
    if (parts.length !== 3) throw new Error("Malformed JWT");
    const claims = JSON.parse(Buffer.from(parts[1]!, "base64url").toString("utf8")) as {
      iss?: unknown;
    };
    diagnostic = "invalid_issuer";
    if (typeof claims.iss !== "string") throw new Error("Missing issuer");
    const issuer = new URL(claims.iss);
    if (
      issuer.protocol !== "https:"
      || issuer.port
      || issuer.username
      || issuer.password
      || issuer.search
      || issuer.hash
      || !/^[a-z0-9-]+\.supabase\.co$/i.test(issuer.hostname)
      || issuer.pathname.replace(/\/$/, "") !== "/auth/v1"
    ) {
      throw new Error("Invalid issuer");
    }

    const authResponse = await authFetch(`${issuer.origin}/auth/v1/user`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
      },
    });
    diagnostic = `auth_user_status_${authResponse.status}`;
    if (!authResponse.ok) throw new Error("Supabase rejected the session");
    const authenticatedUser = await authResponse.json() as {
      id?: unknown;
      email?: unknown;
    };
    diagnostic = "auth_user_missing_identity";
    if (typeof authenticatedUser.id !== "string") {
      throw new Error("Supabase returned no user identity");
    }

    const authProxy = proxy ?? ((path, init) => {
      const connectors = new ReplitConnectors();
      return connectors.proxy("supabase", path, init);
    });
    const projectResponse = await authProxy(
      `/auth/v1/admin/users/${encodeURIComponent(authenticatedUser.id)}`,
    );
    diagnostic = `connected_project_user_status_${projectResponse.status}`;
    if (!projectResponse.ok) throw new Error("User is not in the connected project");
    const projectUser = await projectResponse.json() as {
      id?: unknown;
      email?: unknown;
    };
    diagnostic = "connected_project_user_mismatch";
    if (
      projectUser.id !== authenticatedUser.id
      || (
        typeof authenticatedUser.email === "string"
        && projectUser.email !== authenticatedUser.email
      )
    ) {
      throw new Error("User does not match the connected project");
    }

    return {
      userId: authenticatedUser.id,
      ...(proxy ? { proxy } : {}),
    };
  } catch {
    throw new CreatorContentError(
      401,
      "The bearer token is invalid or expired.",
      diagnostic,
    );
  }
}

type CreatorRow = { id: string };
type PermissionRow = {
  id: string;
  story_id: string;
  user_id: string;
  permission_granted: boolean;
  approval_requested_at: string | null;
  granted_at: string | null;
  revoked_at: string | null;
};
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
    `story_permissions?select=id,story_id,user_id,permission_granted,approval_requested_at,granted_at,revoked_at&creator_id=eq.${encodeURIComponent(creator.id)}&story_id=eq.${encodeURIComponent(storyId)}&permission_granted=eq.true&revoked_at=is.null&limit=1`,
  );
  const permission = permissions[0];
  if (!permission) throw new CreatorContentError(403, "This creator is not permitted to access the story.");
  const stories = await rest<StoryRow[]>(
    context,
    `story_candidates?select=round_id,user_id,status,story_data&id=eq.${encodeURIComponent(storyId)}&status=in.(offered,shared)&limit=1`,
  );
  const story = stories[0];
  if (!story || story.user_id !== permission.user_id) {
    throw new CreatorContentError(403, "This creator is not permitted to access the story.");
  }
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
    permissionId: permission.id,
    permissionStatus: permission.granted_at
      ? "approved"
      : permission.approval_requested_at
        ? "requested"
        : "pending",
  };
}

type CreatorStoryQueueRow = {
  story_id: string;
  approval_requested_at: string | null;
  granted_at: string | null;
  story_candidates: {
    id: string;
    story_type: string;
    headline: string;
    summary: string;
    story_data: Record<string, unknown> | null;
    round_id: string;
    status: string;
  } | Array<{
    id: string;
    story_type: string;
    headline: string;
    summary: string;
    story_data: Record<string, unknown> | null;
    round_id: string;
    status: string;
  }>;
};

export async function fetchCreatorStoryQueue(context: SupabaseRequestContext) {
  const profiles = await rest<CreatorRow[]>(
    context,
    `creator_profiles?select=id&user_id=eq.${encodeURIComponent(context.userId)}&status=eq.active&limit=1`,
  );
  const creator = profiles[0];
  if (!creator) throw new CreatorContentError(403, "This account does not control an active creator profile.");
  const rows = await rest<CreatorStoryQueueRow[]>(
    context,
    "story_permissions?select=story_id,approval_requested_at,granted_at,story_candidates!inner(id,story_type,headline,summary,story_data,round_id,status)"
      + `&creator_id=eq.${encodeURIComponent(creator.id)}&permission_granted=eq.true&revoked_at=is.null`
      + "&story_candidates.status=in.(offered,shared)",
  );
  return rows.flatMap((permission) => {
    const stories = Array.isArray(permission.story_candidates)
      ? permission.story_candidates
      : [permission.story_candidates];
    const permissionStatus: StoryPermissionStatus = permission.granted_at
      ? "approved"
      : permission.approval_requested_at
        ? "requested"
        : "pending";
    return stories.map((story) => ({ ...story, permission_status: permissionStatus }));
  });
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
  round_id: string;
  story_id: string | null;
  category: string;
  title: string;
  hook: string;
  script: string;
  stats_used: Record<string, unknown> | null;
  status: string;
  created_at: string;
};

export interface CreatorContentIdea {
  id: string;
  story_id: string;
  category: string;
  title: string;
  hook: string;
  script: string;
  created_at: string;
}

export async function fetchPersistedCandidates(
  context: SupabaseRequestContext,
  storyId: string,
  roundId: string,
): Promise<CreatorContentIdea[]> {
  const rows = await rest<ContentIdeaRow[]>(
    context,
    `content_ideas?select=id,story_id,category,title,hook,script,created_at&round_id=eq.${encodeURIComponent(roundId)}&order=created_at.asc,id.asc`,
  );
  return rows.map((row) => ({
    id: row.id,
    story_id: storyId,
    category: row.category,
    title: row.title,
    hook: row.hook,
    script: row.script,
    created_at: row.created_at,
  }));
}

export async function fetchPersistedCandidate(
  context: SupabaseRequestContext,
  creatorId: string,
  storyId: string,
  candidateId: string,
): Promise<StoryCandidate> {
  const rows = await rest<ContentIdeaRow[]>(
    context,
    `content_ideas?select=id,round_id,story_id,category,title,hook,script,stats_used,status,created_at&story_id=eq.${encodeURIComponent(storyId)}&stats_used-%3E%3Estory_engine=eq.creator_story_v1&stats_used-%3E%3Ecreator_id=eq.${encodeURIComponent(creatorId)}&id=eq.${encodeURIComponent(candidateId)}&limit=1`,
  );
  const row = rows[0];
  const data = row?.stats_used;
  const candidate = row && data
    && data.story_engine === "creator_story_v1"
    && data.creator_id === creatorId
    && typeof data.why_interesting === "string"
    && Array.isArray(data.supporting_evidence)
    && Array.isArray(data.relevant_holes)
    && typeof data.confidence === "number"
    && Array.isArray(data.scorecard)
    ? {
      id: row.id,
      story_id: storyId,
      archetype: row.category as StoryCandidate["archetype"],
      category: row.category as StoryCandidate["archetype"],
      title: row.title,
      hook: row.hook,
      summary: typeof data.summary === "string" ? data.summary : row.script,
      why_interesting: data.why_interesting,
      supporting_evidence: data.supporting_evidence as string[],
      relevant_holes: data.relevant_holes as number[],
      confidence: data.confidence,
      suggested_format: typeof data.suggested_format === "string" ? data.suggested_format : undefined,
      transcript_highlights: Array.isArray(data.transcript_highlights) ? data.transcript_highlights as string[] : [],
      scorecard: data.scorecard as ScorecardHole[],
    }
    : null;
  if (!candidate) throw new CreatorContentError(404, "The selected persisted story candidate was not found.");
  return candidate;
}

export async function requestStoryApproval(
  context: SupabaseRequestContext,
  creatorId: string,
  storyId: string,
): Promise<StoryPermissionStatus> {
  const rows = await rest<PermissionRow[]>(
    context,
    `story_permissions?select=id,story_id,user_id,permission_granted,approval_requested_at,granted_at,revoked_at&creator_id=eq.${encodeURIComponent(creatorId)}&story_id=eq.${encodeURIComponent(storyId)}&permission_granted=eq.true&revoked_at=is.null&limit=1`,
  );
  const permission = rows[0];
  if (!permission) throw new CreatorContentError(404, "The active story permission was not found.");
  if (permission.granted_at) return "approved";
  if (permission.approval_requested_at) return "requested";

  const requested = await rest<PermissionRow[]>(
    context,
    `story_permissions?id=eq.${encodeURIComponent(permission.id)}&select=id,story_id,user_id,permission_granted,approval_requested_at,granted_at,revoked_at&creator_id=eq.${encodeURIComponent(creatorId)}&story_id=eq.${encodeURIComponent(storyId)}&permission_granted=eq.true&granted_at=is.null&revoked_at=is.null`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ approval_requested_at: new Date().toISOString() }),
    },
  );
  if (requested.length !== 1) {
    throw new CreatorContentError(409, "The approval request was not persisted.");
  }
  const row = requested[0]!;
  if (
    row.id !== permission.id
    || row.story_id !== storyId
    || row.user_id !== permission.user_id
    || row.permission_granted !== true
    || row.granted_at !== null
    || row.revoked_at !== null
    || !row.approval_requested_at
  ) {
    throw new CreatorContentError(409, "The approval request was not persisted.");
  }
  return "requested";
}

export async function dismissCreatorStory(
  context: SupabaseRequestContext,
  creatorId: string,
  storyId: string,
  permissionId: string,
): Promise<boolean> {
  const rows = await rest<Array<{ id: string; story_id: string; creator_id: string; permission_granted: boolean; revoked_at: string | null }>>(
    context,
    `story_permissions?id=eq.${encodeURIComponent(permissionId)}&select=id,story_id,creator_id,permission_granted,revoked_at&creator_id=eq.${encodeURIComponent(creatorId)}&story_id=eq.${encodeURIComponent(storyId)}&permission_granted=eq.true&revoked_at=is.null`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ permission_granted: false, revoked_at: new Date().toISOString() }),
    },
  );
  const row = rows[0];
  return rows.length === 1
    && row?.id === permissionId
    && row.story_id === storyId
    && row.creator_id === creatorId
    && row.permission_granted === false
    && Boolean(row.revoked_at);
}