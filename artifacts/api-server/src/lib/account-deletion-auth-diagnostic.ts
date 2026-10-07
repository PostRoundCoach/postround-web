/** Untrusted upstream text is never copied unless it exactly matches a safe value. */
export interface AccountDeletionAuthDiagnostic {
  stage: "authentication";
  verification_stage: "upstream_user_verification";
  upstream_status: number;
  timestamp: string;
  error_code?: string;
  message?: string;
  description?: string;
}

const safeCodes = new Set([
  "bad_jwt", "no_authorization", "session_not_found", "session_expired",
  "user_not_found", "user_banned", "invalid_credentials", "unexpected_failure",
  "not_admin", "invalid_api_key",
]);
const safeMessages = new Set([
  "Invalid JWT", "JWT expired", "invalid JWT", "jwt expired",
  "Invalid API key", "No API key found in request",
  "Auth session missing!", "Session not found", "Session expired",
  "User not found", "User from sub claim in JWT does not exist",
  "invalid claim: missing sub claim", "invalid claim: missing exp claim",
  "invalid claim: token is expired", "invalid claim: missing aud claim",
  "invalid claim: missing iss claim", "invalid claim: signature is invalid",
  "This endpoint requires a Bearer token",
]);

const MAX_BODY_BYTES = 4096;
const READ_TIMEOUT_MS = 200;

async function boundedJson(response: Response): Promise<unknown> {
  const reader = response.body?.getReader();
  if (!reader) return undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("Diagnostic read timeout")), READ_TIMEOUT_MS);
  });
  try {
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { value, done } = await Promise.race([reader.read(), deadline]);
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) return undefined;
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } finally {
    clearTimeout(timer);
    // Cancellation must not extend the rejection path if the stream misbehaves.
    void reader.cancel().catch(() => {});
  }
}

export async function extractAccountDeletionAuthDiagnostic(
  response: Response,
): Promise<AccountDeletionAuthDiagnostic> {
  const diagnostic: AccountDeletionAuthDiagnostic = {
    stage: "authentication",
    verification_stage: "upstream_user_verification",
    upstream_status: response.status,
    timestamp: new Date().toISOString(),
  };
  try {
    const body = await boundedJson(response);
    if (!body || typeof body !== "object" || Array.isArray(body)) return diagnostic;
    const fields = body as Record<string, unknown>;
    for (const name of ["code", "error_code", "error"]) {
      const value = fields[name];
      if (typeof value === "string" && value.length <= 64 && safeCodes.has(value)) {
        diagnostic.error_code = value;
        break;
      }
    }
    for (const [target, names] of [
      ["message", ["msg", "message"]],
      ["description", ["error_description", "description"]],
    ] as const) {
      for (const name of names) {
        const value = fields[name];
        if (typeof value === "string" && value.length <= 160 && safeMessages.has(value)) {
          diagnostic[target] = value;
          break;
        }
      }
    }
  } catch {
    // Reading/parsing evidence cannot alter the original authentication rejection.
  }
  return diagnostic;
}
