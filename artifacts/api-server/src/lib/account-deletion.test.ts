import assert from "node:assert/strict";
import test from "node:test";
import {
  AccountDeletionError,
  deleteAuthenticatedAccount,
} from "./account-deletion.ts";
import type { SupabaseRequestContext } from "./creator-content-data.ts";

const userId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const token = [
  Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url"),
  Buffer.from(`{"iss":"https://fixture-project.supabase.co/auth/v1","sub":"${userId}"}`).toString("base64url"),
  "signature",
].join(".");

function authFetch(): Promise<Response> {
  return Promise.resolve(Response.json({ id: userId, email: "fixture@example.com" }));
}

test("deletion derives identity from the bearer session and deletes Auth last", async () => {
  const requests: Array<{ path: string; method: string; body?: string }> = [];
  const proxy: NonNullable<SupabaseRequestContext["proxy"]> = async (path, init) => {
    requests.push({
      path,
      method: init?.method ?? "GET",
      body: typeof init?.body === "string" ? init.body : undefined,
    });
    if (path.startsWith("/auth/v1/admin/users/") && init?.method !== "DELETE") {
      return Response.json({ id: userId, email: "fixture@example.com" });
    }
    return new Response(null, { status: 204 });
  };

  assert.deepEqual(
    await deleteAuthenticatedAccount(`Bearer ${token}`, {
      proxy,
      authFetch,
      anonKey: "fixture-key",
    }),
    { deleted: true },
  );
  assert.equal(requests[1]?.path, "/rest/v1/rpc/delete_own_account_data");
  assert.deepEqual(JSON.parse(requests[1]?.body ?? "{}"), { p_user_id: userId });
  assert.equal(requests[2]?.path, `/auth/v1/admin/users/${userId}`);
  assert.equal(requests[2]?.method, "DELETE");
});

test("deletion rejects unauthenticated requests before cleanup", async () => {
  let requested = false;
  await assert.rejects(
    () => deleteAuthenticatedAccount(undefined, {
      proxy: async () => {
        requested = true;
        return Response.json({});
      },
      authFetch,
      anonKey: "fixture-key",
    }),
    (error: unknown) => error instanceof AccountDeletionError
      && error.status === 401
      && error.stage === "authentication",
  );
  assert.equal(requested, false);
});

test("cleanup failure prevents Auth deletion and reports no success", async () => {
  const requests: string[] = [];
  const proxy: NonNullable<SupabaseRequestContext["proxy"]> = async (path, init) => {
    requests.push(`${init?.method ?? "GET"} ${path}`);
    if (path.startsWith("/auth/v1/admin/users/") && init?.method !== "DELETE") {
      return Response.json({ id: userId, email: "fixture@example.com" });
    }
    if (path.includes("/rpc/")) return Response.json({ message: "failed" }, { status: 500 });
    return new Response(null, { status: 204 });
  };
  await assert.rejects(
    () => deleteAuthenticatedAccount(`Bearer ${token}`, {
      proxy,
      authFetch,
      anonKey: "fixture-key",
    }),
    (error: unknown) => error instanceof AccountDeletionError
      && error.stage === "application_cleanup",
  );
  assert.ok(!requests.some((item) => item.startsWith("DELETE /auth/")));
});

test("Auth deletion failure is retryable after idempotent cleanup", async () => {
  const proxy: NonNullable<SupabaseRequestContext["proxy"]> = async (path, init) => {
    if (path.startsWith("/auth/v1/admin/users/") && init?.method !== "DELETE") {
      return Response.json({ id: userId, email: "fixture@example.com" });
    }
    if (init?.method === "DELETE") return Response.json({ message: "failed" }, { status: 500 });
    return new Response(null, { status: 204 });
  };
  await assert.rejects(
    () => deleteAuthenticatedAccount(`Bearer ${token}`, {
      proxy,
      authFetch,
      anonKey: "fixture-key",
    }),
    (error: unknown) => error instanceof AccountDeletionError
      && error.stage === "auth_identity",
  );
});

test("repeated attempts run the same user-scoped cleanup and Auth operation", async () => {
  const cleanupBodies: string[] = [];
  const proxy: NonNullable<SupabaseRequestContext["proxy"]> = async (path, init) => {
    if (path.startsWith("/auth/v1/admin/users/") && init?.method !== "DELETE") {
      return Response.json({ id: userId, email: "fixture@example.com" });
    }
    if (path.includes("/rpc/")) cleanupBodies.push(String(init?.body));
    return new Response(null, { status: 204 });
  };
  const options = { proxy, authFetch, anonKey: "fixture-key" };
  await deleteAuthenticatedAccount(`Bearer ${token}`, options);
  await deleteAuthenticatedAccount(`Bearer ${token}`, options);
  assert.deepEqual(
    cleanupBodies.map((body) => JSON.parse(body)),
    [{ p_user_id: userId }, { p_user_id: userId }],
  );
});