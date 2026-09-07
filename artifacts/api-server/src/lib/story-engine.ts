import { createHash } from "node:crypto";

export const STORY_ARCHETYPES = [
  "Achievement",
  "Drama",
  "Surprise",
  "Failure / Disaster",
  "Insight",
  "Progress",
] as const;

export type StoryArchetype = (typeof STORY_ARCHETYPES)[number];

export interface ScorecardHole {
  hole: number;
  yards: number | null;
  par: number | null;
  score: number | null;
  fairway: string | null;
  green: string | null;
  playable: boolean | null;
  chips: number | null;
  putts: number | null;
  sand: boolean | null;
  penalties: number | null;
}

export interface StoryCandidate {
  id: string;
  story_id: string;
  archetype: StoryArchetype;
  category: StoryArchetype;
  title: string;
  hook: string;
  summary: string;
  why_interesting: string;
  supporting_evidence: string[];
  relevant_holes: number[];
  confidence: number;
  suggested_format?: string;
  transcript_highlights?: string[];
  scorecard: ScorecardHole[];
}

export interface RoundEvidence {
  storyId: string;
  ownerId: string;
  playerName: string | null;
  totalScore: number | null;
  coursePar: number | null;
  holes: ScorecardHole[];
  historicalToPar: number[];
  aiSummary: string | null;
  playerNotes: string | null;
  holeNotes: Array<{ hole: number; note: string }>;
}

interface RankedCandidate extends StoryCandidate {
  score: number;
}

const player = (name: string | null): string => name?.trim() || "The player";
const candidateId = (storyId: string, ownerId: string, archetype: StoryArchetype): string => {
  const hex = createHash("sha256")
    .update(`${storyId}:${ownerId}:${archetype}`)
    .digest("hex")
    .slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20)}`;
};
const scoreDiff = (hole: ScorecardHole): number | null =>
  hole.score === null || hole.par === null ? null : hole.score - hole.par;
const scorePhrase = (score: number, par: number): string =>
  `score ${score} on par ${par} (${score - par > 0 ? "+" : ""}${score - par})`;

function storedAnalysis(evidence: RoundEvidence, holes: number[]): string[] {
  const highlights: string[] = [];
  if (evidence.aiSummary?.trim()) highlights.push(`Stored round analysis: ${evidence.aiSummary.trim()}`);
  if (evidence.playerNotes?.trim()) highlights.push(`Stored player note: ${evidence.playerNotes.trim()}`);
  for (const item of evidence.holeNotes) {
    if (holes.includes(item.hole)) highlights.push(`Stored note for hole ${item.hole}: ${item.note}`);
  }
  return highlights.slice(0, 3);
}

function buildCandidate(
  evidence: RoundEvidence,
  archetype: StoryArchetype,
  title: string,
  hook: string,
  summary: string,
  whyInteresting: string,
  supportingEvidence: string[],
  relevantHoles: number[],
  confidence: number,
  score: number,
): RankedCandidate {
  return {
    id: candidateId(evidence.storyId, evidence.ownerId, archetype),
    story_id: evidence.storyId,
    archetype,
    category: archetype,
    title,
    hook,
    summary,
    why_interesting: whyInteresting,
    supporting_evidence: [...supportingEvidence, ...storedAnalysis(evidence, relevantHoles)],
    relevant_holes: relevantHoles,
    confidence,
    suggested_format: "Scorecard carousel",
    scorecard: evidence.holes,
    score,
  };
}

/**
 * Produces only claims which can be recalculated from the supplied round.
 * This module deliberately has no model dependency: stored evidence is the
 * authoritative source for every number in a candidate.
 */
export function generateStoryCandidates(evidence: RoundEvidence): StoryCandidate[] {
  const name = player(evidence.playerName);
  const ranked: RankedCandidate[] = [];
  const scored = evidence.holes.filter((hole) => scoreDiff(hole) !== null);
  const birdies = scored.filter((hole) => (scoreDiff(hole) ?? 0) < 0);
  const disasters = scored.filter((hole) => (scoreDiff(hole) ?? 0) >= 2);
  const penalties = evidence.holes.filter((hole) => (hole.penalties ?? 0) > 0);

  if (birdies.length > 0) {
    const hole = birdies[0]!;
    ranked.push(buildCandidate(
      evidence, "Achievement", `A scoring moment on hole ${hole.hole}`,
      `${name} went under par on hole ${hole.hole}.`,
      `${name} recorded ${scorePhrase(hole.score!, hole.par!)} on hole ${hole.hole}.`,
      "A specific under-par result gives the audience a clear scorecard moment to revisit.",
      [`Hole ${hole.hole}: ${scorePhrase(hole.score!, hole.par!)}.`], [hole.hole], 0.96, 96,
    ));
  }

  for (let index = 0; index < scored.length - 1; index += 1) {
    const first = scored[index]!;
    const second = scored[index + 1]!;
    if ((scoreDiff(first) ?? 0) >= 2 && (scoreDiff(second) ?? 0) <= 0) {
      ranked.push(buildCandidate(
        evidence, "Drama", `The turn from hole ${first.hole} to ${second.hole}`,
        `${name}'s scorecard changed direction over two holes.`,
        `Hole ${first.hole} was ${scorePhrase(first.score!, first.par!)}; hole ${second.hole} was ${scorePhrase(second.score!, second.par!)}.`,
        "The adjacent holes create a verifiable change in the round without assigning intent or emotion.",
        [`Hole ${first.hole}: ${scorePhrase(first.score!, first.par!)}.`, `Hole ${second.hole}: ${scorePhrase(second.score!, second.par!)}.`],
        [first.hole, second.hole], 0.94, 94,
      ));
      break;
    }
  }

  const exceptional = scored.find((hole) => (scoreDiff(hole) ?? 0) <= -2);
  if (exceptional) {
    ranked.push(buildCandidate(
      evidence, "Surprise", `A rare score on hole ${exceptional.hole}`,
      `${name} finished hole ${exceptional.hole} two or more under par.`,
      `${name} recorded ${scorePhrase(exceptional.score!, exceptional.par!)} on hole ${exceptional.hole}.`,
      "This score differs from par by at least two strokes and is directly visible in the scorecard.",
      [`Hole ${exceptional.hole}: ${scorePhrase(exceptional.score!, exceptional.par!)}.`], [exceptional.hole], 0.98, 98,
    ));
  }

  if (disasters.length > 0 || penalties.length > 0) {
    const hole = disasters[0] ?? penalties[0]!;
    const facts: string[] = [];
    if (hole.score !== null && hole.par !== null) facts.push(`Hole ${hole.hole}: ${scorePhrase(hole.score, hole.par)}.`);
    if ((hole.penalties ?? 0) > 0) facts.push(`Hole ${hole.hole}: ${hole.penalties} stored penalty stroke${hole.penalties === 1 ? "" : "s"}.`);
    ranked.push(buildCandidate(
      evidence, "Failure / Disaster", `A difficult hole ${hole.hole}`,
      `Hole ${hole.hole} is a scorecard pressure point for ${name}.`,
      facts.join(" "),
      "The candidate stays with recorded strokes and does not infer what caused the result.",
      facts, [hole.hole], 0.9, 90,
    ));
  }

  const fairways = evidence.holes.filter((hole) => hole.fairway !== null && hole.fairway !== "none");
  const greens = evidence.holes.filter((hole) => hole.green !== null && hole.green !== "none");
  const fairwayHits = fairways.filter((hole) => hole.fairway === "hit");
  const greenHits = greens.filter((hole) => hole.green === "hit");
  if (fairways.length >= 3 || greens.length >= 3) {
    const facts: string[] = [];
    if (fairways.length >= 3) facts.push(`${fairwayHits.length} fairways hit in ${fairways.length} recorded fairway results.`);
    if (greens.length >= 3) facts.push(`${greenHits.length} greens hit in ${greens.length} recorded green results.`);
    ranked.push(buildCandidate(
      evidence, "Insight", `What the recorded approach data shows`,
      `${name}'s stored fairway and green results give the round a measurable angle.`,
      facts.join(" "),
      "The observation is limited to recorded result fields; unavailable shots are not counted.",
      facts, [...new Set([...fairways, ...greens].map((hole) => hole.hole))], 0.84, 84,
    ));
  }

  const currentToPar = evidence.totalScore !== null && evidence.coursePar !== null
    ? evidence.totalScore - evidence.coursePar : null;
  if (currentToPar !== null && evidence.historicalToPar.length > 0) {
    const historicalAverage = evidence.historicalToPar.reduce((sum, value) => sum + value, 0) / evidence.historicalToPar.length;
    if (currentToPar < historicalAverage) {
      ranked.push(buildCandidate(
        evidence, "Progress", `A lower score relative to par`,
        `${name}'s current round was lower relative to par than the available earlier-round average.`,
        `This round was ${currentToPar > 0 ? "+" : ""}${currentToPar} to par; the average across ${evidence.historicalToPar.length} earlier recorded round${evidence.historicalToPar.length === 1 ? "" : "s"} was ${historicalAverage.toFixed(1)} to par.`,
        "Progress is included only because comparable stored earlier-round scores and pars are available.",
        [`Current round: ${currentToPar > 0 ? "+" : ""}${currentToPar} to par.`, `Earlier-round average: ${historicalAverage.toFixed(1)} to par across ${evidence.historicalToPar.length} rounds.`],
        [], 0.88, 88,
      ));
    }
  }

  return ranked
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, 5)
    .map(({ score: _score, ...candidate }) => candidate);
}