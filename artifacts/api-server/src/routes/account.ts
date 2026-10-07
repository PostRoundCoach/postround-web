import { Router, type IRouter } from "express";
import {
  AccountDeletionError,
  deleteAuthenticatedAccount,
} from "../lib/account-deletion.ts";

export function createAccountRouter(
  deleteAccount: typeof deleteAuthenticatedAccount = deleteAuthenticatedAccount,
): IRouter {
  const router: IRouter = Router();

  router.post("/account/delete", async (req, res): Promise<void> => {
    if (
      req.body?.confirmation !== "DELETE"
      || Object.keys(req.body ?? {}).some((key) => key !== "confirmation")
    ) {
      res.status(400).json({
        error: "Type DELETE to confirm permanent account deletion.",
        stage: "confirmation",
      });
      return;
    }

    try {
      await deleteAccount(req.header("authorization"));
      req.log.info(
        { stage: "complete" },
        "Authenticated account deletion completed",
      );
      res.json({ ok: true, deleted: true });
    } catch (error) {
      if (error instanceof AccountDeletionError) {
        try {
          req.log.warn(
            {
              stage: error.stage,
              status: error.status,
              diagnostic: error.diagnostic,
              ...(error.authDiagnostic ? { auth_diagnostic: error.authDiagnostic } : {}),
            },
            "Authenticated account deletion did not complete",
          );
        } catch {
          // A failed diagnostic logger must not change the rejection response.
        }
        res.status(error.status).json({
          error: error.message,
          stage: error.stage,
          retryable: error.stage !== "authentication",
        });
        return;
      }
      req.log.error(
        { stage: "unknown", err: error },
        "Authenticated account deletion failed unexpectedly",
      );
      res.status(500).json({
        error: "Account deletion could not be completed. No success was recorded.",
        stage: "unknown",
        retryable: true,
      });
    }
  });

  return router;
}

export default createAccountRouter();