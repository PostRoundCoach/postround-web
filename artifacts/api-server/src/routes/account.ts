import { Router, type IRouter } from "express";
import {
  AccountDeletionError,
  deleteAuthenticatedAccount,
} from "../lib/account-deletion";

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
    await deleteAuthenticatedAccount(req.header("authorization"));
    req.log.info(
      { stage: "complete" },
      "Authenticated account deletion completed",
    );
    res.json({ ok: true, deleted: true });
  } catch (error) {
    if (error instanceof AccountDeletionError) {
      req.log.warn(
        {
          stage: error.stage,
          status: error.status,
          diagnostic: error.diagnostic,
        },
        "Authenticated account deletion did not complete",
      );
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

export default router;