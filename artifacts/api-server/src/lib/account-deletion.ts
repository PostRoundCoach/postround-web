import { ReplitConnectors } from "@replit/connectors-sdk";
import {
  authenticateSupabaseBearer,
  CreatorContentError,
  type SupabaseRequestContext,
} from "./creator-content-data.ts";

type Proxy = NonNullable<SupabaseRequestContext["proxy"]>;

export type AccountDeletionStage =
  | "authentication"
  | "application_cleanup"
  | "auth_identity";

export class AccountDeletionError extends CreatorContentError {
  readonly stage: AccountDeletionStage;

  constructor(
    status: number,
    message: string,
    stage: AccountDeletionStage,
    diagnostic?: string,
  ) {
    super(status, message, diagnostic);
    this.name = "AccountDeletionError";
    this.stage = stage;
  }
}

function connectedProxy(): Proxy {
  const connectors = new ReplitConnectors();
  return (path, init) => connectors.proxy("supabase", path, init);
}

async function expectSuccess(
  proxy: Proxy,
  path: string,
  init: Parameters<Proxy>[1],
  stage: AccountDeletionStage,
): Promise<Response> {
  const response = await proxy(path, init);
  if (!response.ok) {
    const diagnostic = `${stage}_status_${response.status}`;
    throw new AccountDeletionError(
      response.status === 401 || response.status === 403 ? 503 : 500,
      "Account deletion could not be completed. No success was recorded.",
      stage,
      diagnostic,
    );
  }
  return response;
}

/**
 * Deletes application data transactionally through the reviewed database RPC,
 * then removes the Auth identity last. A retry is safe when cleanup committed
 * but the separate Auth administration request failed.
 */
export async function deleteAuthenticatedAccount(
  authorization: string | undefined,
  options: {
    proxy?: Proxy;
    authFetch?: typeof fetch;
    anonKey?: string;
  } = {},
): Promise<{ deleted: true }> {
  const proxy = options.proxy ?? connectedProxy();
  let context: SupabaseRequestContext;
  try {
    context = await authenticateSupabaseBearer(
      authorization,
      proxy,
      options.authFetch,
      options.anonKey,
    );
  } catch (error) {
    if (error instanceof CreatorContentError) {
      throw new AccountDeletionError(
        error.status,
        error.message,
        "authentication",
        error.diagnostic,
      );
    }
    throw error;
  }

  await expectSuccess(
    proxy,
    "/rest/v1/rpc/delete_own_account_data",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ p_user_id: context.userId }),
    },
    "application_cleanup",
  );

  await expectSuccess(
    proxy,
    `/auth/v1/admin/users/${encodeURIComponent(context.userId)}`,
    { method: "DELETE" },
    "auth_identity",
  );

  return { deleted: true };
}