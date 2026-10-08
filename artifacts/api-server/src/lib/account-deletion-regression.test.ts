import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import type { AddressInfo } from "node:net";
import { createAccountRouter } from "../routes/account.ts";
import { AccountDeletionError, deleteAuthenticatedAccount } from "./account-deletion.ts";
import { authenticateSupabaseBearer, CreatorContentError } from "./creator-content-data.ts";

const token = [
  Buffer.from('{"alg":"HS256"}').toString("base64url"),
  Buffer.from('{"iss":"https://fixture-project.supabase.co/auth/v1"}').toString("base64url"),
  "signature",
].join(".");

const bodyAccesses = new WeakMap<Response, string[]>();

function unreadRejection(status: number): Response {
  const response = Response.json({
    code: "bad_jwt", message: "Invalid JWT", email: "private@example.com",
  }, { status });
  const accesses: string[] = [];
  bodyAccesses.set(response, accesses);
  // Fail on any attempted body access, including readers that do not set bodyUsed.
  for (const method of ["json", "text", "arrayBuffer", "blob", "formData", "clone"]) {
    Object.defineProperty(response, method, {
      value: () => {
        accesses.push(method);
        assert.fail(`Rejected response ${method} must not be called`);
      },
    });
  }
  Object.defineProperty(response, "body", {
    get() {
      accesses.push("body");
      assert.fail("Rejected response stream must not be accessed");
    },
  });
  return response;
}

test("deletion and shared Creator authentication leave 401/403 bodies unread and stop downstream requests", async () => {
  for (const status of [401, 403]) {
    for (const deletion of [false, true]) {
      const response = unreadRejection(status);
      let downstream = 0;
      const proxy = async () => {
        downstream++;
        throw new Error("No connector identity lookup, cleanup or Auth deletion is permitted");
      };
      const authFetch = async () => response;
      await assert.rejects(
        () => deletion
          ? deleteAuthenticatedAccount(`Bearer ${token}`, { proxy, authFetch, anonKey: "synthetic-key" })
          : authenticateSupabaseBearer(`Bearer ${token}`, proxy, authFetch, "synthetic-key"),
        (error: unknown) => {
          assert.ok(error instanceof CreatorContentError);
          assert.equal(error.status, 401);
          assert.equal(error.message, "The bearer token is invalid or expired.");
          assert.equal(error.diagnostic, `auth_user_status_${status}`);
          assert.deepEqual(Object.keys(error).sort(), deletion
            ? ["diagnostic", "name", "stage", "status"]
            : ["diagnostic", "name", "status"]);
          if (deletion) {
            assert.ok(error instanceof AccountDeletionError);
            assert.equal(error.stage, "authentication");
          }
          return true;
        },
      );
      assert.equal(downstream, 0);
      assert.equal(response.bodyUsed, false);
      assert.deepEqual(bodyAccesses.get(response), []);
    }
  }
});

test("missing credentials, malformed JWT, invalid issuer and missing configuration stop before requests", async () => {
  const invalidIssuer = [
    "header",
    Buffer.from('{"iss":"http://fixture-project.supabase.co/auth/v1"}').toString("base64url"),
    "signature",
  ].join(".");
  for (const [authorization, anonKey, status, message, diagnostic] of [
    [undefined, "synthetic-key", 401, "A bearer token is required.", undefined],
    ["Bearer malformed", "synthetic-key", 401, "The bearer token is invalid or expired.", "malformed_jwt"],
    [`Bearer ${invalidIssuer}`, "synthetic-key", 401, "The bearer token is invalid or expired.", "invalid_issuer"],
    [`Bearer ${token}`, "", 500, "Supabase session verification is not configured.", undefined],
  ] as const) {
    let requests = 0;
    const request = async () => { requests++; return Response.json({}); };
    await assert.rejects(
      () => deleteAuthenticatedAccount(authorization, { proxy: request, authFetch: request, anonKey }),
      (error: unknown) => {
        assert.ok(error instanceof AccountDeletionError);
        assert.equal(error.status, status);
        assert.equal(error.stage, "authentication");
        assert.equal(error.message, message);
        assert.equal(error.diagnostic, diagnostic);
        return true;
      },
    );
    assert.equal(requests, 0);
  }
});

type LogEntry = { level: string; fields: unknown; message: string };

async function withMockRoute(
  deleteAccount: typeof deleteAuthenticatedAccount,
  run: (post: (body?: unknown) => Promise<Response>, logs: LogEntry[]) => Promise<void>,
): Promise<void> {
  const logs: LogEntry[] = [];
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    const capture = (level: string) => (fields: unknown, message: string): void => {
      logs.push({ level, fields, message });
    };
    req.log = {
      warn: capture("warn"), info: capture("info"), error: capture("error"),
    } as typeof req.log;
    next();
  });
  app.use(createAccountRouter(deleteAccount));
  // Temporary loopback server with injected mocks, never the live API.
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  try {
    const post = (body?: unknown) => fetch(
      `http://127.0.0.1:${(server.address() as AddressInfo).port}/account/delete`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      },
    );
    await run(post, logs);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test("API 401/403 rejection keeps the public contract and emits only the baseline warning", async () => {
  for (const status of [401, 403]) {
    const upstream = unreadRejection(status);
    let downstream = 0;
    await withMockRoute((authorization) => deleteAuthenticatedAccount(authorization, {
      proxy: async () => { downstream++; throw new Error("No downstream operation"); },
      authFetch: async () => upstream,
      anonKey: "synthetic-key",
    }), async (post, logs) => {
      const response = await post({ confirmation: "DELETE" });
      assert.equal(response.status, 401);
      assert.deepEqual(await response.json(), {
        error: "The bearer token is invalid or expired.",
        stage: "authentication",
        retryable: false,
      });
      assert.deepEqual(logs, [{
        level: "warn",
        fields: { stage: "authentication", status: 401, diagnostic: `auth_user_status_${status}` },
        message: "Authenticated account deletion did not complete",
      }]);
    });
    assert.equal(upstream.bodyUsed, false);
    assert.deepEqual(bodyAccesses.get(upstream), []);
    assert.equal(downstream, 0);
  }
});

test("confirmation must be exactly DELETE with no additional fields and precedes deletion", async () => {
  let deletions = 0;
  await withMockRoute(async () => { deletions++; return { deleted: true }; }, async (post, logs) => {
    for (const body of [
      undefined, {}, { confirmation: "delete" }, { confirmation: " DELETE " },
      { confirmation: "DELETE", user_id: "untrusted" }, { confirmation: true },
    ]) {
      const response = await post(body);
      assert.equal(response.status, 400);
      assert.deepEqual(await response.json(), {
        error: "Type DELETE to confirm permanent account deletion.",
        stage: "confirmation",
      });
    }
    assert.equal(deletions, 0);
    assert.deepEqual(logs, []);
  });
});

test("successful deletion forwards authorization and keeps completion response and logging", async () => {
  await withMockRoute(async (authorization) => {
    assert.equal(authorization, `Bearer ${token}`);
    return { deleted: true };
  }, async (post, logs) => {
    const response = await post({ confirmation: "DELETE" });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, deleted: true });
    assert.deepEqual(logs, [{
      level: "info", fields: { stage: "complete" },
      message: "Authenticated account deletion completed",
    }]);
  });
});

test("cleanup and Auth failures retain retryability and baseline warning fields", async () => {
  for (const stage of ["application_cleanup", "auth_identity"] as const) {
    for (const status of [500, 503]) {
      const message = "Account deletion could not be completed. No success was recorded.";
      const diagnostic = `${stage}_status_${status === 503 ? 403 : 500}`;
      await withMockRoute(async () => {
        throw new AccountDeletionError(status, message, stage, diagnostic);
      }, async (post, logs) => {
        const response = await post({ confirmation: "DELETE" });
        assert.equal(response.status, status);
        assert.deepEqual(await response.json(), { error: message, stage, retryable: true });
        assert.deepEqual(logs, [{
          level: "warn", fields: { stage, status, diagnostic },
          message: "Authenticated account deletion did not complete",
        }]);
      });
    }
  }
});

test("unexpected errors retain the pre-instrumentation response and error logging", async () => {
  const error = new Error("synthetic-unexpected-failure");
  await withMockRoute(async () => { throw error; }, async (post, logs) => {
    const response = await post({ confirmation: "DELETE" });
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), {
      error: "Account deletion could not be completed. No success was recorded.",
      stage: "unknown",
      retryable: true,
    });
    assert.deepEqual(logs, [{
      level: "error", fields: { stage: "unknown", err: error },
      message: "Authenticated account deletion failed unexpectedly",
    }]);
  });
});
