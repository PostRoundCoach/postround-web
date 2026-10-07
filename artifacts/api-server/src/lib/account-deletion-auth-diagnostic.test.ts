import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { type AddressInfo } from "node:net";
import { createAccountRouter } from "../routes/account.ts";
import { AccountDeletionError, deleteAuthenticatedAccount } from "./account-deletion.ts";
import { authenticateSupabaseBearer, CreatorContentError } from "./creator-content-data.ts";
import { extractAccountDeletionAuthDiagnostic } from "./account-deletion-auth-diagnostic.ts";

const token = [
  Buffer.from('{"alg":"HS256"}').toString("base64url"),
  Buffer.from('{"iss":"https://fixture-project.supabase.co/auth/v1"}').toString("base64url"),
  "signature",
].join(".");

async function rejected(response: Response) {
  let downstream = 0;
  let rejection: AccountDeletionError | undefined;
  await assert.rejects(() => deleteAuthenticatedAccount(`Bearer ${token}`, {
    proxy: async () => {
      downstream++;
      throw new Error("No connector, cleanup or Auth deletion is permitted");
    },
    authFetch: async () => response,
    anonKey: "synthetic-anon-key",
  }), (error: unknown) => {
    assert.ok(error instanceof AccountDeletionError);
    rejection = error;
    assert.equal(error.status, 401);
    assert.equal(error.message, "The bearer token is invalid or expired.");
    assert.equal(error.stage, "authentication");
    assert.equal(error.diagnostic, `auth_user_status_${response.status}`);
    return true;
  });
  assert.equal(downstream, 0);
  assert.ok(rejection?.authDiagnostic);
  const diagnostic = rejection.authDiagnostic;
  assert.equal(diagnostic.stage, "authentication");
  assert.equal(diagnostic.verification_stage, "upstream_user_verification");
  assert.equal(diagnostic.upstream_status, response.status);
  assert.equal(new Date(diagnostic.timestamp).toISOString(), diagnostic.timestamp);
  return diagnostic;
}

test("401/403 diagnostics capture only known code/message/description variants", async () => {
  const variants = [
    { code: "bad_jwt", msg: "Invalid JWT" },
    { error_code: "session_not_found", message: "Auth session missing!" },
    { error: "session_expired", error_description: "Session expired" },
    { code: "bad_jwt", message: "invalid claim: token is expired" },
    { code: "invalid_api_key", message: "Invalid API key" },
    { message: "No API key found in request" },
    { code: "no_authorization", description: "This endpoint requires a Bearer token" },
  ];
  for (const status of [401, 403]) {
    for (const body of variants) {
      const diagnostic = await rejected(Response.json(body, { status }));
      assert.equal(diagnostic.error_code, body.code ?? body.error_code ?? body.error);
      assert.equal(diagnostic.message, body.msg ?? body.message);
      assert.equal(diagnostic.description, body.error_description ?? body.description);
    }
  }
});

test("unknown or sensitive codes/messages are omitted, including otherwise safe prefixes", async () => {
  const sensitive = [
    "Bearer synthetic-access-token", "refresh_token=synthetic-refresh-token",
    "Authorization: synthetic-authorization", "apikey=synthetic-anon-key",
    "service_role=synthetic-service-key", "Cookie: session=synthetic-session",
    "password=synthetic-password", "fixture@example.com",
    "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "session_id=synthetic-session-id",
    token, "sb_secret_synthetic", "sb_publishable_synthetic",
    "custom_unknown_error", "Invalid JWT\nAuthorization: secret",
  ];
  for (const value of sensitive) {
    const diagnostic = await rejected(Response.json({
      code: value, error_code: value, error: value,
      msg: value, message: `Invalid JWT: ${value}`,
      description: value, error_description: `Session expired ${value}`,
      user_id: value, email: value, access_token: value,
    }, { status: 403 }));
    assert.deepEqual(Object.keys(diagnostic).sort(), [
      "stage", "timestamp", "upstream_status", "verification_stage",
    ]);
    const serialized = JSON.stringify(diagnostic);
    assert.ok(!serialized.includes(value));
    assert.ok(!serialized.includes(token));
  }
});

test("missing, nested, non-scalar, malformed and oversized bodies keep only metadata", async () => {
  const responses = [
    Response.json({}, { status: 403 }),
    Response.json({ code: 403, message: { text: "Invalid JWT" }, description: ["Session expired"] }, { status: 403 }),
    Response.json({ nested: { code: "bad_jwt", message: "Invalid JWT" } }, { status: 403 }),
    Response.json(["Invalid JWT"], { status: 403 }),
    Response.json(null, { status: 403 }),
    new Response(null, { status: 403 }),
    new Response('{"message":', { status: 403 }),
    new Response("Forbidden <html>private</html>", { status: 403 }),
    Response.json({ message: "Invalid JWT", padding: "x".repeat(4096) }, { status: 403 }),
    Response.json({ code: "x".repeat(65), message: "x".repeat(161) }, { status: 403 }),
  ];
  for (const response of responses) {
    const diagnostic = await rejected(response);
    assert.equal(diagnostic.error_code, undefined);
    assert.equal(diagnostic.message, undefined);
    assert.equal(diagnostic.description, undefined);
  }
});

test("stream read errors, consumed bodies and stalled streams cannot change rejection", async () => {
  const broken = new Response(new ReadableStream({
    start(controller) { controller.error(new Error("synthetic-private-error")); },
  }), { status: 403 });
  const consumed = Response.json({ message: "Invalid JWT" }, { status: 403 });
  await consumed.text();
  let cancelled = false;
  const stalled = new Response(new ReadableStream({
    cancel() { cancelled = true; },
  }), { status: 403 });
  for (const response of [broken, consumed, stalled]) {
    const diagnostic = await rejected(response);
    assert.equal(diagnostic.message, undefined);
    assert.ok(!JSON.stringify(diagnostic).includes("synthetic-private-error"));
  }
  assert.equal(cancelled, true);
});

test("oversized streaming response stops reading and cancels without waiting for cancellation", async () => {
  let cancelled = false;
  const response = new Response(new ReadableStream({
    pull(controller) { controller.enqueue(new Uint8Array(4097)); },
    cancel() {
      cancelled = true;
      return new Promise<void>(() => {});
    },
  }), { status: 403 });
  await rejected(response);
  assert.equal(cancelled, true);
});

test("safe field selection skips untrusted alternatives and ignores raw extra fields", async () => {
  const diagnostic = await extractAccountDeletionAuthDiagnostic(Response.json({
    code: "secret-value", error_code: "bad_jwt",
    msg: "fixture@example.com", message: "Invalid JWT",
    error_description: "Bearer secret", description: "Session expired",
    password: "private-password",
  }, { status: 401 }));
  assert.equal(diagnostic.error_code, "bad_jwt");
  assert.equal(diagnostic.message, "Invalid JWT");
  assert.equal(diagnostic.description, "Session expired");
  assert.ok(!JSON.stringify(diagnostic).includes("secret"));
  assert.ok(!JSON.stringify(diagnostic).includes("private-password"));
});

test("malformed JWT and missing bearer still reject without requests or upstream evidence", async () => {
  for (const authorization of [undefined, "Bearer malformed"]) {
    let requests = 0;
    await assert.rejects(() => deleteAuthenticatedAccount(authorization, {
      proxy: async () => { requests++; return Response.json({}); },
      authFetch: async () => { requests++; return Response.json({}); },
      anonKey: "synthetic-key",
    }), (error: unknown) => error instanceof AccountDeletionError
      && error.status === 401 && error.stage === "authentication"
      && error.authDiagnostic === undefined);
    assert.equal(requests, 0);
  }
});

test("shared Creator callers do not read or emit additional rejection diagnostics", async () => {
  const response = Response.json({ code: "bad_jwt", message: "Invalid JWT" }, { status: 403 });
  await assert.rejects(() => authenticateSupabaseBearer(
    `Bearer ${token}`,
    async () => { throw new Error("No downstream identity lookup"); },
    async () => response,
    "synthetic-key",
  ), (error: unknown) => error instanceof CreatorContentError
    && error.diagnostic === "auth_user_status_403"
    && !("authDiagnostic" in error));
  assert.equal(response.bodyUsed, false);
});

test("diagnostic callback failures retain the original authentication outcome", async () => {
  let downstream = false;
  await assert.rejects(() => authenticateSupabaseBearer(
    `Bearer ${token}`,
    async () => { downstream = true; return Response.json({}); },
    async () => Response.json({}, { status: 403 }),
    "synthetic-key",
    async () => { throw new Error("synthetic-private-diagnostic-failure"); },
  ), (error: unknown) => error instanceof CreatorContentError
    && error.status === 401
    && error.message === "The bearer token is invalid or expired."
    && error.diagnostic === "auth_user_status_403");
  assert.equal(downstream, false);
});

test("API rejection and server-only warning remain unchanged even when logging fails", async () => {
  for (const loggingFails of [false, true]) {
    const warnings: unknown[] = [];
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.log = {
        warn(fields: unknown) {
          warnings.push(fields);
          if (loggingFails) throw new Error("synthetic-logger-failure");
        },
      } as typeof req.log;
      next();
    });
    app.use(createAccountRouter((authorization) => deleteAuthenticatedAccount(authorization, {
      proxy: async () => { throw new Error("No downstream operation"); },
      authFetch: async () => Response.json({
        code: "bad_jwt", message: "Invalid JWT", email: "private@example.com",
      }, { status: 403 }),
      anonKey: "synthetic-key",
    })));
    // A temporary loopback test server with injected mocks, never the live API.
    const server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server.once("listening", resolve));
    try {
      const response = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/account/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ confirmation: "DELETE" }),
      });
      assert.equal(response.status, 401);
      assert.deepEqual(await response.json(), {
        error: "The bearer token is invalid or expired.",
        stage: "authentication",
        retryable: false,
      });
      assert.equal(warnings.length, 1);
      const warning = warnings[0] as Record<string, unknown>;
      assert.equal(warning.diagnostic, "auth_user_status_403");
      assert.equal(warning.stage, "authentication");
      assert.equal(warning.status, 401);
      assert.ok(warning.auth_diagnostic);
      const serialized = JSON.stringify(warnings);
      assert.ok(!serialized.includes(token));
      assert.ok(!serialized.includes("private@example.com"));
      assert.ok(!serialized.includes("synthetic-key"));
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  }
});
