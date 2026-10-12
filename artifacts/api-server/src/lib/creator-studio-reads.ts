import {
  exactCount, rest, type SupabaseRequestContext,
} from "./creator-content-data.ts";

// Isolated from the action/round helpers: their existing contracts stay unchanged.
export class CreatorAuthError extends Error {
  constructor() {
    super("Creator profile not found or inactive");
    this.name = "CreatorAuthError";
  }
}

type CreatorProfile = {
  id: string;
  user_id: string;
  status: string;
  display_name: string;
  advanced_creator: boolean;
  creator_voice_profiles: Array<{ id: string; status: string }> | null;
};

async function resolveCreatorOwnership(context: SupabaseRequestContext, creatorId: string) {
  let rows: CreatorProfile[];
  try {
    rows = await rest<CreatorProfile[]>(context,
      "creator_profiles?select=id,user_id,status,display_name,advanced_creator,creator_voice_profiles(id,status)"
      + `&id=eq.${encodeURIComponent(creatorId)}`);
  } catch {
    // Helper-level lookup failures deliberately differ from initial lookup errors.
    throw new CreatorAuthError();
  }
  const creator = rows?.[0];
  if (rows?.length !== 1 || !creator || creator.id !== creatorId
    || creator.user_id !== context.userId || creator.status !== "active") {
    throw new CreatorAuthError();
  }
  const advancedCreator = Boolean(creator.advanced_creator);
  const voice = creator.creator_voice_profiles?.find((row) => row.status === "active");
  return {
    id: creator.id,
    name: creator.display_name,
    capabilities: { advancedCreator, creatorVoice: advancedCreator && Boolean(voice) },
  };
}

async function readCreator(context: SupabaseRequestContext) {
  const rows = await rest<Array<{ id: string }>>(context,
    `creator_profiles?select=id&user_id=eq.${encodeURIComponent(context.userId)}&status=eq.active&limit=2`);
  // Two rows are enough to detect ambiguity, without arbitrarily choosing one.
  if (rows.length > 1) throw new Error("Ambiguous active creator profiles");
  if (!rows[0]) throw new CreatorAuthError();
  return resolveCreatorOwnership(context, rows[0].id);
}

export const ELIGIBLE_CREATOR_READ_STATUSES = ["offered", "shared"] as const;
const storyFields = "id,round_id,story_type,headline,summary,status,created_at";
type CreatorStory = {
  id: string; round_id: string; story_type: string; headline: string;
  summary: string; status: string; created_at: string;
};

function candidateQuery(creatorId: string, fields: string) {
  // All permission predicates apply to ONE joined row, correlated by story_id.
  return `story_candidates?select=${fields},story_permissions!inner(story_id)`
    + `&status=in.(${ELIGIBLE_CREATOR_READ_STATUSES.join(",")})`
    + `&story_permissions.creator_id=eq.${encodeURIComponent(creatorId)}`
    + "&story_permissions.permission_granted=eq.true&story_permissions.revoked_at=is.null";
}

export async function fetchCreatorStoryQueue(context: SupabaseRequestContext) {
  const creator = await readCreator(context);
  const stories: CreatorStory[] = [];
  for (let offset = 0; ; offset += 100) {
    const page = await rest<CreatorStory[]>(context,
      candidateQuery(creator.id, storyFields) + `&order=created_at.desc,id.desc&offset=${offset}&limit=100`);
    for (const row of page) {
      // Explicit projection prevents embedded permissions or future columns leaking.
      const { id, round_id, story_type, headline, summary, status, created_at } = row;
      stories.push({ id, round_id, story_type, headline, summary, status, created_at });
    }
    if (page.length < 100) break;
  }
  return { creator, stories };
}

export async function fetchCreatorLandingSummary(context: SupabaseRequestContext) {
  const creator = await readCreator(context);
  const storyCount = await exactCount(context, candidateQuery(creator.id, "id"));
  return { creator, summary: { storyCount } };
}
