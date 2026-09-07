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
  "connected qualifying round exposes rounds.par and not rounds.course_par",
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
    assert.equal(evidence.round.par, 34);
    assert.equal(evidence.holes.length, 9);
    assert.equal(
      evidence.holes.reduce((sum, hole) => sum + (hole.par ?? 0), 0),
      34,
    );

    const nonexistentColumn = await connectors.proxy(
      "supabase",
      `/rest/v1/rounds?select=id,course_par&id=eq.${QUALIFYING_ROUND_ID}`,
    );
    assert.equal(nonexistentColumn.status, 400);
    const error = await nonexistentColumn.json() as { code?: unknown };
    assert.equal(error.code, "42703");

    const usage = await connectors.proxy(
      "supabase",
      "/rest/v1/round_buddy_hole_usage?select=id,user_id,billing_period,client_round_id,hole_number,status,reserved_at,consumed_at&limit=1",
    );
    assert.equal(usage.status, 200);
    const usageRows = await usage.json() as Array<Record<string, unknown>>;
    assert.ok(usageRows.every((row) =>
      !Object.keys(row).some((key) => /transcript|excerpt|message|content|text/i.test(key))
    ));

    for (const table of [
      "round_buddy_transcripts",
      "round_buddy_messages",
      "transcripts",
      "round_analysis",
    ]) {
      const unavailable = await connectors.proxy(
        "supabase",
        `/rest/v1/${table}?select=*&limit=1`,
      );
      assert.equal(unavailable.status, 404);
      const unavailableError = await unavailable.json() as { code?: unknown };
      assert.equal(unavailableError.code, "PGRST205");
    }
  },
);