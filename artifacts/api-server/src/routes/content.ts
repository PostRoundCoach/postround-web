import { Router, type IRouter, type Request, type Response } from "express";
import {
  authenticateSupabaseBearer, authorizeCreatorStory, CreatorContentError, fetchPersistedCandidates,
  loadRoundEvidence, persistCandidates, revokeStoryPermission,
} from "../lib/creator-content-data";
import { generateStoryCandidates } from "../lib/story-engine";

const router: IRouter = Router();
const storyId = (value: unknown): string | null => typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value) ? value : null;

function failure(req: Request, res: Response, error: unknown, stage: string): void {
  if (error instanceof CreatorContentError) {
    req.log.warn({ stage, status: error.status }, error.message);
    res.status(error.status).json({ error: error.message, stage });
    return;
  }
  req.log.error({ stage, err: error }, "Creator story content request failed");
  res.status(500).json({ error: "Creator story content could not be completed.", stage });
}

async function authorized(req: Request, id: string) {
  const context = await authenticateSupabaseBearer(req.header("authorization"));
  const result = await authorizeCreatorStory(context, id);
  req.log.info({ stage: "authorization", storyId: id, creatorId: result.creatorId }, "Creator story authorized");
  return { context, ...result };
}

router.post("/content/generate", async (req, res): Promise<void> => {
  const id = storyId(req.body?.story_id);
  if (!id || Object.keys(req.body ?? {}).some((key) => key !== "story_id")) {
    res.status(400).json({ error: "Body must contain only a valid story_id." });
    return;
  }
  let stage = "authorization";
  try {
    const access = await authorized(req, id);
    stage = "round_scorecard_lookup";
    req.log.info({ stage: "round_scorecard_lookup", storyId: id }, "Looking up round scorecard");
    const loaded = await loadRoundEvidence(access.context, access.roundId, access.playerId);
    stage = "transcript_analysis_lookup";
    req.log.info(
      {
        stage: "transcript_analysis_lookup",
        storyId: id,
        transcriptSource: "unavailable",
        storedAnalysisAvailable: Boolean(loaded.round.ai_summary || loaded.holeNotes.length),
      },
      "Connected schema has Round Buddy usage metadata but no genuine excerpt source",
    );
    stage = "generation";
    const candidates = generateStoryCandidates({
      storyId: id, ownerId: access.creatorId, playerName: access.playerName, totalScore: loaded.round.total_score,
      coursePar: loaded.round.par, holes: loaded.holes, historicalToPar: loaded.historicalToPar,
      aiSummary: loaded.round.ai_summary, playerNotes: loaded.round.player_notes, holeNotes: loaded.holeNotes,
    });
    req.log.info({ stage: "generation", storyId: id, candidateCount: candidates.length }, "Generated evidence-backed candidates");
    stage = "persistence";
    await persistCandidates(access.context, access.creatorId, id, access.roundId, candidates);
    req.log.info({ stage: "persistence", storyId: id, candidateCount: candidates.length }, "Persisted story candidates");
    res.json({ ok: true, count: candidates.length, candidates });
  } catch (error) { failure(req, res, error, stage); }
});

router.get("/content/ideas", async (req, res): Promise<void> => {
  const id = storyId(req.query.story_id);
  if (!id) { res.status(400).json({ error: "A valid story_id is required." }); return; }
  let stage = "authorization";
  try {
    const access = await authorized(req, id);
    stage = "refresh";
    const ideas = await fetchPersistedCandidates(access.context, access.creatorId, id);
    req.log.info({ stage: "refresh", storyId: id, candidateCount: ideas.length }, "Refreshed persisted story candidates");
    res.json({ ok: true, ideas });
  } catch (error) { failure(req, res, error, stage); }
});

router.patch("/content/stories/:storyId/permission", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.storyId) ? req.params.storyId[0] : req.params.storyId;
  const id = storyId(raw);
  if (!id) { res.status(400).json({ error: "A valid story_id is required." }); return; }
  let stage = "authorization";
  try {
    const context = await authenticateSupabaseBearer(req.header("authorization"));
    const creator = await authorizeCreatorStory(context, id);
    const revoked = await revokeStoryPermission(context, creator.creatorId, id);
    if (!revoked) throw new CreatorContentError(404, "The active story permission was not found.");
    req.log.info({ stage: "authorization", storyId: id, creatorId: creator.creatorId, action: "revoke" }, "Creator story permission revoked");
    res.json({ ok: true, story_id: id });
  } catch (error) { failure(req, res, error, stage); }
});

export default router;