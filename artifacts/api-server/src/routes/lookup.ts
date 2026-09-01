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
    smsSentAt: row.smsSentAt ? row.smsSentAt.toISOString() : null,
    hqSyncedAt: row.hqSyncedAt ? row.hqSyncedAt.toISOString() : null,
    roomSmsSentAt: row.roomSmsSentAt ? row.roomSmsSentAt.toISOString() : null,
    paymentSmsSentAt: row.paymentSmsSentAt
      ? row.paymentSmsSentAt.toISOString()
      : null,
    mealSelectionsSubmittedAt: row.mealSelectionsSubmittedAt
      ? row.mealSelectionsSubmittedAt.toISOString()
      : null,
    // Meal-collection tracking (food-collection ticketing) — explicit
    // conversion per the 7.10 lesson: any Drizzle timestamp exposed via the
    // API must be converted here, not spread raw, in case a validator is
    // ever added to this route.
    mealFridayEveningCollectedAt: row.mealFridayEveningCollectedAt
      ? row.mealFridayEveningCollectedAt.toISOString()
      : null,
    mealSaturdayAfternoonCollectedAt: row.mealSaturdayAfternoonCollectedAt
      ? row.mealSaturdayAfternoonCollectedAt.toISOString()
      : null,
    mealSaturdayEveningCollectedAt: row.mealSaturdayEveningCollectedAt
      ? row.mealSaturdayEveningCollectedAt.toISOString()
      : null,
    mealSundayAfternoonCollectedAt: row.mealSundayAfternoonCollectedAt
      ? row.mealSundayAfternoonCollectedAt.toISOString()
      : null,
    mealSundayEveningCollectedAt: row.mealSundayEveningCollectedAt
      ? row.mealSundayEveningCollectedAt.toISOString()
      : null,
    mealMondayBrunchCollectedAt: row.mealMondayBrunchCollectedAt
      ? row.mealMondayBrunchCollectedAt.toISOString()
      : null,
  };
}

router.get(
  "/my-registration/:referenceNumber",
  lookupLimiter,
  async (req, res): Promise<void> => {
    // This data changes over time (room/payment sync, admin edits) and is
    // looked up repeatedly by the same person, so make sure every request
    // hits the DB rather than a cached response — stale cached data here
    // would show someone an outdated room/payment status.
    res.set("Cache-Control", "no-store");
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
