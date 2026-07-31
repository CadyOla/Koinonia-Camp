import { Router, type IRouter } from "express";
import { rateLimit } from "express-rate-limit";
import { eq, sql } from "drizzle-orm";
import { db, registrationsTable } from "@workspace/db";

const router: IRouter = Router();

const lookupLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please wait a minute and try again." },
});

function toApiRegistration(row: typeof registrationsTable.$inferSelect) {
  return {
    ...row,
    ministries: row.ministries ? row.ministries.split(",").filter(Boolean) : [],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

router.get(
  "/my-registration/:referenceNumber",
  lookupLimiter,
  async (req, res): Promise<void> => {
    const raw = req.params.referenceNumber?.trim().toUpperCase();

    if (!raw) {
      res.status(400).json({ error: "Reference number is required" });
      return;
    }

    const [row] = await db
      .select()
      .from(registrationsTable)
      .where(sql`upper(${registrationsTable.referenceNumber}) = ${raw}`);

    if (!row) {
      res
        .status(404)
        .json({ error: "No registration found with that reference number" });
      return;
    }

    res.json(toApiRegistration(row));
  },
);

export default router;
