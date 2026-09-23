import { ReplitConnectors } from "@replit/connectors-sdk";
import type { ScorecardHole, StoryCandidate } from "./story-engine";
import type {
  CoachingReflectionContent,
  CreatorContentIdeaSummary,
  CreatorEditorialAngle,
  CreatorContentStory,
  RoundHighlights,
  RoundSummary,
  RoundWebContract,
  ScorecardEntry,
  StoryCandidateSummary,
  StoryPermissionTimestamps,
} from "./roundWebContract";

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
  creatorName: string;
  advancedCreator: boolean;
  creatorVoice: CreatorVoiceProfile | null;
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

export interface CreatorVoiceProfile {
  id: string;
  name: string | null;
  tone: string | null;
  personality: string | null;
  humor_level: string | null;
  energy: string | null;
  storytelling_style: string | null;
  sentence_style: string | null;
  vocabulary_style: string | null;
  golf_terminology: string | null;
  things_to_emphasize: string | null;
  things_to_avoid: string | null;
}

type CreatorRow = {
  id: string;
  display_name?: string | null;
  advanced_creator?: boolean | null;
  creator_voice_profiles?: CreatorVoiceProfile | CreatorVoiceProfile[] | null;
};
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
    "creator_profiles?select=id,display_name,advanced_creator,"
      + "creator_voice_profiles(id,name,tone,personality,humor_level,energy,storytelling_style,sentence_style,"
      + "vocabulary_style,golf_terminology,things_to_emphasize,things_to_avoid)"
      + `&user_id=eq.${encodeURIComponent(context.userId)}&status=eq.active`
      + "&creator_voice_profiles.status=eq.active&limit=1",
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
  const voiceRelation = creator.creator_voice_profiles;
  const activeVoice = Array.isArray(voiceRelation) ? voiceRelation[0] ?? null : voiceRelation ?? null;
  const advancedCreator = creator.advanced_creator === true;
  const playerName = data && typeof data.golfer_display_name === "string"
    ? data.golfer_display_name
    : data && typeof data.golferDisplayName === "string"
      ? data.golferDisplayName
      : null;
  return {
    creatorId: creator.id,
    creatorName: creator.display_name ?? "",
    advancedCreator,
    creatorVoice: advancedCreator ? activeVoice : null,
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

async function countCreatorFollowers(
  context: SupabaseRequestContext,
  creatorId: string,
): Promise<number> {
  const proxy = context.proxy ?? ((path: string, init?: Parameters<NonNullable<SupabaseRequestContext["proxy"]>>[1]) => {
    const connectors = new ReplitConnectors();
    return connectors.proxy("supabase", path, init);
  });
  // The server connector has cross-profile read access; the browser's own-profile
  // RLS view cannot provide this aggregate. HEAD returns no follower identities.
  const response = await proxy(
    `/rest/v1/profiles?select=id&favorite_creator_id=eq.${encodeURIComponent(creatorId)}`,
    { method: "HEAD", headers: { Prefer: "count=exact", Range: "0-0" } },
  );
  if (!response.ok) {
    throw new CreatorContentError(502, "The creator follower count could not be loaded.");
  }
  const range = response.headers.get("content-range");
  const total = range?.match(/^(?:\*|\d+-\d+)\/(\d+)$/)?.[1];
  const count = total === undefined ? NaN : Number(total);
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new CreatorContentError(502, "The creator follower count could not be loaded.");
  }
  return count;
}

export async function fetchCreatorStoryQueue(context: SupabaseRequestContext) {
  const profiles = await rest<CreatorRow[]>(
    context,
    `creator_profiles?select=id&user_id=eq.${encodeURIComponent(context.userId)}&status=eq.active&limit=1`,
  );
  const creator = profiles[0];
  if (!creator) throw new CreatorContentError(403, "This account does not control an active creator profile.");
  const follower_count = await countCreatorFollowers(context, creator.id);
  const rows = await rest<CreatorStoryQueueRow[]>(
    context,
    "story_permissions?select=story_id,approval_requested_at,granted_at,story_candidates!inner(id,story_type,headline,summary,story_data,round_id,status)"
      + `&creator_id=eq.${encodeURIComponent(creator.id)}&permission_granted=eq.true&revoked_at=is.null`
      + "&story_candidates.status=in.(offered,shared)",
  );
  const stories = rows.flatMap((permission) => {
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
  return { stories, follower_count };
}

type RoundContractRow = {
  id: string;
  user_id: string;
  played_at: string;
  course_name: string | null;
  tees: string | null;
  total_score: number | null;
  course_par: number | null;
  score_to_par: number | null;
  front_9: number | null;
  back_9: number | null;
  total_putts: number | null;
  total_penalties: number | null;
  fairways_hit: number | null;
  total_fairways: number | null;
  fairways_left: number | null;
  fairways_right: number | null;
  fairways_long: number | null;
  fairways_short: number | null;
  gir_hit: number | null;
  total_gir: number | null;
  gir_short: number | null;
  gir_long: number | null;
  gir_left: number | null;
  gir_right: number | null;
  scrambling_opportunities: number | null;
  successful_scrambles: number | null;
  three_putts: number | null;
  birdies: number | null;
  pars: number | null;
  bogeys: number | null;
  double_bogeys: number | null;
  triple_bogeys: number | null;
  eagles: number | null;
  albatrosses: number | null;
  hole_in_one: number | null;
};

type RoundCandidateRow = StoryCandidateSummary & { user_id: string };
type RoundPermissionRow = PermissionRow;
type RoundProfileRow = { display_name: string | null };
type RoundHoleRow = {
  hole_number: number;
  par: number | null;
  score: number | null;
  fairway_result: string | null;
  gir_result: string | null;
  putts: number | null;
  chip_count: number | null;
  bunker_shot: boolean | null;
  sand_save: boolean | null;
  penalty_strokes: number | null;
  player_notes: string | null;
};
type RoundContentIdeaRow = {
  id: string;
  category: string;
  title: string;
  hook: string;
  script: string | null;
  story_angle: string | null;
  why_interesting: string | null;
  reflection: string | null;
  created_at: string;
  status: string;
  content_type: string | null;
  angles?: unknown;
};

const roundSelect = [
  "id", "user_id", "played_at", "course_name", "tees",
  "total_score", "course_par", "score_to_par", "front_9", "back_9", "total_putts", "total_penalties",
  "fairways_hit", "total_fairways", "fairways_left", "fairways_right", "fairways_long",
  "fairways_short", "gir_hit", "total_gir", "gir_short", "gir_long", "gir_left", "gir_right",
  "scrambling_opportunities", "successful_scrambles", "three_putts", "birdies", "pars",
  "bogeys", "double_bogeys", "triple_bogeys", "eagles", "albatrosses", "hole_in_one",
].join(",");

function nullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function fairwayResult(value: string | null): ScorecardEntry["fairway"] {
  return value === "hit" || value === "left" || value === "right"
    || value === "short" || value === "long" || value === "none"
    ? value
    : null;
}

function girResult(value: string | null): ScorecardEntry["gir"] {
  return value === "hit" || value === "short" || value === "long"
    || value === "left" || value === "right" || value === "none"
    ? value
    : null;
}

function mapRoundHighlights(round: RoundContractRow): RoundHighlights {
  return {
    total_score: round.total_score, course_par: round.course_par, score_to_par: round.score_to_par,
    front_9: round.front_9,
    back_9: round.back_9, total_putts: round.total_putts, total_penalties: round.total_penalties,
    fairways_hit: round.fairways_hit, total_fairways: round.total_fairways,
    fairways_left: round.fairways_left, fairways_right: round.fairways_right,
    fairways_long: round.fairways_long, fairways_short: round.fairways_short,
    gir_hit: round.gir_hit, total_gir: round.total_gir, gir_short: round.gir_short,
    gir_long: round.gir_long, gir_left: round.gir_left, gir_right: round.gir_right,
    scrambling_opportunities: round.scrambling_opportunities,
    successful_scrambles: round.successful_scrambles, three_putts: round.three_putts,
    birdies: round.birdies, pars: round.pars, bogeys: round.bogeys,
    double_bogeys: round.double_bogeys, triple_bogeys: round.triple_bogeys, eagles: round.eagles,
    albatrosses: round.albatrosses, hole_in_one: round.hole_in_one,
  };
}

function mapPermission(permission: RoundPermissionRow): StoryPermissionTimestamps {
  return {
    granted_at: permission.granted_at,
    revoked_at: permission.revoked_at,
    approval_requested_at: permission.approval_requested_at,
  };
}

function editorialAngles(value: unknown): CreatorEditorialAngle[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const angles = value.filter((angle): angle is CreatorEditorialAngle => {
    if (!angle || typeof angle !== "object") return false;
    const item = angle as Record<string, unknown>;
    return (item.type === "primary" || item.type === "creator_specific" || item.type === "alternative")
      && typeof item.lens === "string"
      && typeof item.story_angle === "string"
      && typeof item.why_interesting === "string";
  });
  return angles.length === value.length ? angles : undefined;
}

function mapContentIdea(row: RoundContentIdeaRow, advancedCreator: boolean): CreatorContentIdeaSummary {
  const angles = advancedCreator && row.content_type === "creator_story"
    ? editorialAngles(row.angles)
    : undefined;
  return {
    id: row.id, category: row.category, title: row.title, hook: row.hook,
    script: nullableString(row.script), story_angle: nullableString(row.story_angle),
    why_interesting: nullableString(row.why_interesting), created_at: row.created_at,
    ...(angles ? { angles } : {}),
  };
}

/**
 * Loads the unified round contract only after resolving the creator, eligible
 * candidate, and active permission from server-side identity.
 */
async function fetchRoundWebContractData(
  context: SupabaseRequestContext,
  roundId: string,
): Promise<RoundWebContract> {
  const profiles = await rest<CreatorRow[]>(
    context,
    `creator_profiles?select=id,advanced_creator&user_id=eq.${encodeURIComponent(context.userId)}&status=eq.active&limit=1`,
  );
  const creator = profiles[0];
  if (!creator) throw new CreatorContentError(403, "This account does not control an active creator profile.");

  const candidates = await rest<RoundCandidateRow[]>(
    context,
    `story_candidates?select=id,story_type,headline,summary,status,user_id&round_id=eq.${encodeURIComponent(roundId)}&status=in.(offered,shared)`,
  );
  if (candidates.length === 0) {
    throw new CreatorContentError(403, "This creator is not permitted to access the round.");
  }

  const permissions = await rest<RoundPermissionRow[]>(
    context,
    `story_permissions?select=id,story_id,user_id,permission_granted,approval_requested_at,granted_at,revoked_at&creator_id=eq.${encodeURIComponent(creator.id)}&story_id=in.(${candidates.map((item) => encodeURIComponent(item.id)).join(",")})&permission_granted=eq.true&revoked_at=is.null&limit=1`,
  );
  const permission = permissions[0];
  const candidate = permission
    ? candidates.find((item) => item.id === permission.story_id && item.user_id === permission.user_id)
    : undefined;
  if (!permission || !candidate) {
    throw new CreatorContentError(403, "This creator is not permitted to access the round.");
  }

  const rounds = await rest<RoundContractRow[]>(
    context,
    `rounds?select=${roundSelect}&id=eq.${encodeURIComponent(roundId)}&user_id=eq.${encodeURIComponent(candidate.user_id)}&limit=1`,
  );
  const round = rounds[0];
  if (!round) throw new CreatorContentError(404, "The requested round does not exist.");

  const [profilesForRound, holes, creatorIdeas, coachingIdeas] = await Promise.all([
    rest<RoundProfileRow[]>(
      context,
      `profiles?select=display_name&id=eq.${encodeURIComponent(round.user_id)}&limit=1`,
    ),
    rest<RoundHoleRow[]>(
      context,
      `holes?select=hole_number,par,score,fairway_result,gir_result,putts,chip_count,bunker_shot,sand_save,penalty_strokes,player_notes&round_id=eq.${encodeURIComponent(roundId)}&order=hole_number.asc`,
    ),
    rest<RoundContentIdeaRow[]>(
      context,
      `content_ideas?select=id,category,title,hook,script,story_angle,why_interesting,reflection,created_at,status,content_type,angles&round_id=eq.${encodeURIComponent(roundId)}&story_id=eq.${encodeURIComponent(candidate.id)}&content_type=eq.creator_story&status=neq.generating&order=created_at.asc,id.asc&limit=1`,
    ),
    rest<RoundContentIdeaRow[]>(
      context,
      `content_ideas?select=id,category,title,hook,script,story_angle,why_interesting,reflection,created_at,status,content_type,angles&round_id=eq.${encodeURIComponent(roundId)}&story_id=eq.${encodeURIComponent(candidate.id)}&category=eq.coaching_reflection&status=neq.generating&order=created_at.asc,id.asc&limit=1`,
    ),
  ]);

  const candidateSummary: StoryCandidateSummary = {
    id: candidate.id, story_type: candidate.story_type, headline: candidate.headline,
    summary: candidate.summary, status: candidate.status,
  };
  const creatorContentStory: CreatorContentStory = {
    available: true, permissionState: "granted", permission: mapPermission(permission),
    candidate: candidateSummary,
    contentIdea: creatorIdeas[0] ? mapContentIdea(creatorIdeas[0], creator.advanced_creator === true) : null,
  };
  const coaching = coachingIdeas[0];
  const coachingReflection = coaching
    ? {
        available: true as const,
        content: {
          id: coaching.id, title: coaching.title, hook: coaching.hook,
          reflection: nullableString(coaching.reflection), script: nullableString(coaching.script),
          created_at: coaching.created_at,
        } satisfies CoachingReflectionContent,
      }
    : { available: false as const };
  const scorecard: ScorecardEntry[] = holes
    .sort((a, b) => a.hole_number - b.hole_number)
    .map((hole) => ({
      hole: hole.hole_number, par: hole.par, score: hole.score,
      fairway: fairwayResult(hole.fairway_result),
      gir: girResult(hole.gir_result),
      putts: hole.putts, chips: hole.chip_count, bunker: hole.bunker_shot,
      sand_save: hole.sand_save, penalties: hole.penalty_strokes, player_note: hole.player_notes,
    }));

  return {
    round: {
      played_at: round.played_at, course_name: round.course_name, tees: round.tees,
      player_display_name: profilesForRound[0]?.display_name ?? null,
    },
    roundHighlights: mapRoundHighlights(round),
    scorecard,
    creatorContentStory,
    coachingReflection,
  };
}

export async function fetchRoundWebContract(
  context: SupabaseRequestContext,
  roundId: string,
): Promise<RoundWebContract> {
  try {
    return await fetchRoundWebContractData(context, roundId);
  } catch (error) {
    if (error instanceof CreatorContentError && error.status === 502) {
      throw new CreatorContentError(500, error.message, error.diagnostic);
    }
    throw error;
  }
}

type DbHole = {
  hole_number: number; distance_to_pin_yards: number | null; par: number | null; score: number | null;
  fairway_result: string | null; gir_result: string | null; scramble_opportunity: boolean | null;
  chip_count: number | null; putts: number | null; bunker_shot: boolean | null; penalty_strokes: number | null;
  player_notes: string | null; ai_feedback: string | null;
};

type DbRound = {
  id: string;
  user_id: string;
  played_at: string;
  total_score: number | null;
  course_par: number | null;
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
    `rounds?select=id,user_id,played_at,total_score,course_par,ai_summary,player_notes&id=eq.${encodeURIComponent(roundId)}&user_id=eq.${encodeURIComponent(playerId)}&limit=1`,
  );
  const round = rounds[0];
  if (!round) throw new CreatorContentError(404, "The round for this story no longer exists.");
  const [holeRows, historyRows] = await Promise.all([
    rest<DbHole[]>(
      context,
      `holes?select=hole_number,distance_to_pin_yards,par,score,fairway_result,gir_result,scramble_opportunity,chip_count,putts,bunker_shot,penalty_strokes,player_notes,ai_feedback&round_id=eq.${encodeURIComponent(roundId)}&order=hole_number.asc`,
    ),
    rest<Array<{ score_to_par: number }>>(
      context,
      `rounds?select=score_to_par&user_id=eq.${encodeURIComponent(playerId)}&played_at=lt.${encodeURIComponent(round.played_at)}&score_to_par=not.is.null&order=played_at.desc&limit=20`,
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
    historicalToPar: historyRows.map((item) => item.score_to_par),
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
  round_id: string | null;
  story_id: string | null;
  category: string;
  title: string;
  hook: string;
  script: string;
  stats_used: Record<string, unknown> | null;
  status: string;
  created_at: string;
  content_type?: string | null;
  angles?: unknown;
};

type DbIdeaRound = {
  id: string;
  user_id: string;
  played_at: string | null;
  course_name: string | null;
  tees: string | null;
  total_score: number | null;
  course_par: number | null;
  score_to_par: number | null;
  front_9: number | null;
  back_9: number | null;
  total_putts: number | null;
  total_penalties: number | null;
  fairways_hit: number | null;
  total_fairways: number | null;
  fairways_left: number | null;
  fairways_right: number | null;
  fairways_long: number | null;
  fairways_short: number | null;
  fairways_missed: number | null;
  fairways_playable: number | null;
  gir_hit: number | null;
  total_gir: number | null;
  gir_short: number | null;
  gir_long: number | null;
  gir_left: number | null;
  gir_right: number | null;
  gir_missed: number | null;
  gir_playable: number | null;
  scrambling_opportunities: number | null;
  successful_scrambles: number | null;
  three_putts: number | null;
  birdies: number | null;
  pars: number | null;
  bogeys: number | null;
  double_bogeys: number | null;
  triple_bogeys: number | null;
  eagles: number | null;
  albatrosses: number | null;
  hole_in_one: number | null;
  sand_save_opportunities: number | null;
  successful_sand_saves: number | null;
};

type DbIdeaHole = {
  round_id?: string;
  hole_number: number;
  par: number | null;
  score: number | null;
  fairway_result: string | null;
  gir_result: string | null;
  putts: number | null;
  chip_count: number | null;
  bunker_shot: boolean | null;
  sand_save: boolean | null;
  penalty_strokes: number | null;
  player_notes: string | null;
};

type IdeaScorecardHole = {
  hole: number;
  par: number | null;
  score: number | null;
  fairway: string | null;
  gir: string | null;
  putts: number | null;
  chips: number | null;
  bunker: boolean | null;
  sand_save: boolean | null;
  penalties: number | null;
  player_note: string | null;
};

export interface CreatorContentIdeaRound {
  player_display_name: string | null;
  played_at: string | null;
  course_name: string | null;
  tees: string | null;
  total_score: number | null;
  course_par: number | null;
  score_to_par: number | null;
  front_9: number | null;
  back_9: number | null;
  total_putts: number | null;
  total_penalties: number | null;
  fairways_hit: number | null;
  total_fairways: number | null;
  fairways_left: number | null;
  fairways_right: number | null;
  fairways_long: number | null;
  fairways_short: number | null;
  fairways_missed: number | null;
  fairways_playable: number | null;
  gir_hit: number | null;
  total_gir: number | null;
  gir_short: number | null;
  gir_long: number | null;
  gir_left: number | null;
  gir_right: number | null;
  gir_missed: number | null;
  gir_playable: number | null;
  scrambling_opportunities: number | null;
  successful_scrambles: number | null;
  three_putts: number | null;
  birdies: number | null;
  pars: number | null;
  bogeys: number | null;
  double_bogeys: number | null;
  triple_bogeys: number | null;
  eagles: number | null;
  albatrosses: number | null;
  hole_in_one: number | null;
  sand_save_opportunities: number | null;
  successful_sand_saves: number | null;
  scorecard: IdeaScorecardHole[];
}

export interface CreatorContentIdea {
  id: string;
  story_id: string;
  category: string;
  title: string;
  hook: string;
  script: string;
  created_at: string;
  angles?: CreatorEditorialAngle[];
  round: CreatorContentIdeaRound | null;
}

export function buildCreatorIdeasResponse(
  access: AuthorizedStory,
  storyId: string,
  ideas: CreatorContentIdea[],
) {
  return {
    ok: true as const,
    creator: {
      id: access.creatorId,
      name: access.creatorName,
      capabilities: {
        advancedCreator: access.advancedCreator,
        creatorVoice: Boolean(access.creatorVoice),
      },
    },
    ...(access.creatorVoice ? { creatorVoice: access.creatorVoice } : {}),
    story_id: storyId,
    ideas,
    permission_status: access.permissionStatus,
  };
}

export async function fetchPersistedCandidates(
  context: SupabaseRequestContext,
  storyId: string,
  roundId: string,
  playerId?: string,
  advancedCreator = false,
): Promise<CreatorContentIdea[]> {
  const rows = await rest<ContentIdeaRow[]>(
    context,
    `content_ideas?select=id,round_id,story_id,category,title,hook,script,created_at,content_type,angles`
      + `&or=(round_id.eq.${encodeURIComponent(roundId)},and(round_id.is.null,story_id.eq.${encodeURIComponent(storyId)}))`
      + "&order=created_at.asc,id.asc",
  );

  const linkedRoundIds = [...new Set(
    rows
      .map((row) => row.round_id)
      .filter((id): id is string => typeof id === "string" && id.length > 0),
  )];
  const roundFilter = linkedRoundIds.map((id) => encodeURIComponent(id)).join(",");
  const rounds = linkedRoundIds.length === 0
    ? []
    : await rest<DbIdeaRound[]>(
      context,
      `rounds?select=id,user_id,played_at,course_name,tees,total_score,course_par,score_to_par,front_9,back_9,total_putts,total_penalties,eagles,albatrosses,hole_in_one,birdies,pars,bogeys,double_bogeys,triple_bogeys,fairways_hit,total_fairways,fairways_left,fairways_right,fairways_long,fairways_short,fairways_missed,fairways_playable,gir_hit,total_gir,gir_short,gir_long,gir_left,gir_right,gir_missed,gir_playable,scrambling_opportunities,successful_scrambles,sand_save_opportunities,successful_sand_saves,three_putts&id=in.(${roundFilter})`
        + (playerId ? `&user_id=eq.${encodeURIComponent(playerId)}` : ""),
    );
  const profileIds = [...new Set(
    rounds
      .map((round) => round.user_id)
      .filter((id): id is string => typeof id === "string" && id.length > 0),
  )];
  const profileFilter = profileIds.map((id) => encodeURIComponent(id)).join(",");
  const profiles = profileIds.length === 0
    ? []
    : await rest<Array<{ id: string; display_name: string | null }>>(
      context,
      `profiles?select=id,display_name&id=in.(${profileFilter})`,
    );
  const holes = linkedRoundIds.length === 0
    ? []
    : await rest<DbIdeaHole[]>(
      context,
      `holes?select=round_id,hole_number,par,score,fairway_result,gir_result,putts,chip_count,bunker_shot,sand_save,penalty_strokes,player_notes&round_id=in.(${roundFilter})&order=hole_number.asc`,
    );
  const profileNames = new Map(profiles.map((profile) => [profile.id, profile.display_name]));
  const holesByRound = new Map<string, DbIdeaHole[]>();
  for (const hole of holes) {
    // `round_id` is selected for multi-round responses. A few older test and
    // proxy responses omit it; a single requested round is unambiguous there.
    const holeRoundId = hole.round_id ?? (linkedRoundIds.length === 1 ? linkedRoundIds[0] : undefined);
    if (!holeRoundId) continue;
    const roundHoles = holesByRound.get(holeRoundId) ?? [];
    roundHoles.push(hole);
    holesByRound.set(holeRoundId, roundHoles);
  }
  const roundData = new Map(rounds.map((round) => {
    const scorecard = (holesByRound.get(round.id) ?? [])
      .sort((a, b) => a.hole_number - b.hole_number)
      .map((hole) => ({
        hole: hole.hole_number,
        par: hole.par ?? null,
        score: hole.score ?? null,
        fairway: hole.fairway_result ?? null,
        gir: hole.gir_result ?? null,
        putts: hole.putts ?? null,
        chips: hole.chip_count ?? null,
        bunker: hole.bunker_shot ?? null,
        sand_save: hole.sand_save ?? null,
        penalties: hole.penalty_strokes ?? null,
        player_note: hole.player_notes ?? null,
      }));
    const mapped: CreatorContentIdeaRound = {
      player_display_name: profileNames.get(round.user_id) ?? null,
      played_at: round.played_at ?? null,
      course_name: round.course_name ?? null,
      tees: round.tees ?? null,
      total_score: round.total_score ?? null,
      course_par: round.course_par ?? null,
      score_to_par: round.score_to_par ?? null,
      front_9: round.front_9 ?? null,
      back_9: round.back_9 ?? null,
      total_putts: round.total_putts ?? null,
      total_penalties: round.total_penalties ?? null,
      fairways_hit: round.fairways_hit ?? null,
      total_fairways: round.total_fairways ?? null,
      fairways_left: round.fairways_left ?? null,
      fairways_right: round.fairways_right ?? null,
      fairways_long: round.fairways_long ?? null,
      fairways_short: round.fairways_short ?? null,
      fairways_missed: round.fairways_missed ?? null,
      fairways_playable: round.fairways_playable ?? null,
      gir_hit: round.gir_hit ?? null,
      total_gir: round.total_gir ?? null,
      gir_short: round.gir_short ?? null,
      gir_long: round.gir_long ?? null,
      gir_left: round.gir_left ?? null,
      gir_right: round.gir_right ?? null,
      gir_missed: round.gir_missed ?? null,
      gir_playable: round.gir_playable ?? null,
      scrambling_opportunities: round.scrambling_opportunities ?? null,
      successful_scrambles: round.successful_scrambles ?? null,
      three_putts: round.three_putts ?? null,
      birdies: round.birdies ?? null,
      pars: round.pars ?? null,
      bogeys: round.bogeys ?? null,
      double_bogeys: round.double_bogeys ?? null,
      triple_bogeys: round.triple_bogeys ?? null,
      eagles: round.eagles ?? null,
      albatrosses: round.albatrosses ?? null,
      hole_in_one: round.hole_in_one ?? null,
      sand_save_opportunities: round.sand_save_opportunities ?? null,
      successful_sand_saves: round.successful_sand_saves ?? null,
      scorecard,
    };
    return [round.id, mapped] as const;
  }));

  return rows.map((row) => {
    const angles = advancedCreator && row.content_type === "creator_story"
      ? editorialAngles(row.angles)
      : undefined;
    return {
      id: row.id,
      story_id: storyId,
      category: row.category,
      title: row.title,
      hook: row.hook,
      script: row.script,
      created_at: row.created_at,
      ...(angles ? { angles } : {}),
      round: row.round_id ? roundData.get(row.round_id) ?? null : null,
    };
  });
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