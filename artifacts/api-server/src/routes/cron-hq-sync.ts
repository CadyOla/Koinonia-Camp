import { Router, type IRouter } from "express";
import { timingSafeEqual } from "node:crypto";
import { runHqSync } from "../lib/hq-sync";

const router: IRouter = Router();

function isValidSecret(provided: string | undefined): boolean {
  const expected = process.env.CRON_SYNC_SECRET;
  if (!expected || !provided) return false;
  if (provided.length !== expected.length) return false;
  // Constant-time comparison to avoid leaking the secret via response timing.
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

// GET so a plain URL works in any free external cron scheduler
// (e.g. cron-job.org) — no custom headers or request body needed.
// Not behind requireAdmin: this is called by an external service, not a
// logged-in browser, so it has its own secret check instead.
router.get(
  "/cron/sync-hq-registrations",
  async (req, res): Promise<void> => {
    const provided = typeof req.query.secret === "string" ? req.query.secret : undefined;

    if (!isValidSecret(provided)) {
      res.status(401).json({ error: "Invalid or missing secret" });
      return;
    }

    try {
      const result = await runHqSync();
      req.log.info(result, "Scheduled HQ registration sync completed");
      res.json({ ok: true, ...result });
    } catch (err: any) {
      req.log.error({ message: err?.message }, "Scheduled HQ sync failed");
      res.status(500).json({ error: err?.message || "HQ sync failed" });
    }
  },
);

export default router;
