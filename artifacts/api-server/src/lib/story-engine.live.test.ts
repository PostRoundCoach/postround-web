import assert from "node:assert/strict";
import test from "node:test";
import { ReplitConnectors } from "@replit/connectors-sdk";
import { loadRoundEvidence, type SupabaseRequestContext } from "./creator-content-data.ts";

const QUALIFYING_ROUND_ID = "a4c3ea74-8337-4c1b-92ba-2c3fecdde58e";
const QUALIFYING_PLAYER_ID = "f2eb972e-ca28-4f0a-bb0d-3440c6d365b3";
const hasConnectedSupabase = Boolean(
  process.env.REPLIT_CONNECTORS_HOSTNAME && process.env.REPL_IDENTITY,
);

test(
  "connected qualifying round exposes canonical course_par and score_to_par",
  { skip: !hasConnectedSupabase },
  async () => {
    const connectors = new ReplitConnectors();
    const context: SupabaseRequestContext = { userId: QUALIFYING_PLAYER_ID };
    const evidence = await loadRoundEvidence(
      context,
      QUALIFYING_ROUND_ID,
      QUALIFYING_PLAYER_ID,
    );

    assert.equal(evidence.round.total_score, 34);
    assert.equal(evidence.round.course_par, 34);
    assert.equal(evidence.holes.length, 9);
    assert.equal(
      evidence.holes.reduce((sum, hole) => sum + (hole.par ?? 0), 0),
      34,
    );

    const canonicalRound = await connectors.proxy(
      "supabase",
      `/rest/v1/rounds?select=id,course_par,score_to_par&id=eq.${QUALIFYING_ROUND_ID}`,
    );
    assert.equal(canonicalRound.status, 200);
    const rows = await canonicalRound.json() as Array<{
      course_par: unknown;
      score_to_par: unknown;
    }>;
    assert.equal(rows[0]?.course_par, 34);
    assert.equal(rows[0]?.score_to_par, 0);
    const unavailableInputMethod = await connectors.proxy(
      "supabase",
      `/rest/v1/rounds?select=id,input_method&id=eq.${QUALIFYING_ROUND_ID}`,
    );
    assert.equal(unavailableInputMethod.status, 400);
    const inputMethodError = await unavailableInputMethod.json() as { code?: unknown };
    assert.equal(inputMethodError.code, "42703");

  },
);