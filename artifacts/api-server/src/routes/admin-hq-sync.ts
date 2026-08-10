import { Router, type IRouter } from "express";
import { requireAdmin } from "./admin-auth";
import { runHqSync } from "../lib/hq-sync";

const router: IRouter = Router();

router.post(
  "/admin/sync-hq-registrations",
  requireAdmin,
  async (req, res): Promise<void> => {
    try {
      const result = await runHqSync();
      res.json(result);
    } catch (err: any) {
      req.log.error({ message: err?.message }, "HQ registration sync failed");
      res.status(500).json({ error: err?.message || "HQ sync failed" });
    }
  },
);

export default router;
