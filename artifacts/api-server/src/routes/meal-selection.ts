import { Router, type IRouter } from "express";
import { rateLimit } from "express-rate-limit";
import { eq, sql } from "drizzle-orm";
import { db, registrationsTable } from "@workspace/db";
import { MEAL_SLOTS } from "../lib/meal-menu";

const router: IRouter = Router();

const mealSubmitLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please wait a minute and try again." },
});

// POST /my-registration/:referenceNumber/meals
// Public (reference number is the credential, same pattern as GET
// /my-registration/:referenceNumber), rate-limited, one-time only.
router.post(
  "/my-registration/:referenceNumber/meals",
  mealSubmitLimiter,
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

    if (row.feedingPreference !== "Church Feeding") {
      res.status(403).json({
        error: "Meal selection is only available for Church Feeding registrants",
      });
      return;
    }

    if (row.mealSelectionsSubmittedAt) {
      res.status(409).json({
        error: "Meal choices have already been submitted and cannot be changed",
      });
      return;
    }

    const body = req.body ?? {};
    const updateSet: Record<string, string> = {};

    for (const slot of MEAL_SLOTS) {
      const value = body[slot.key];
      if (typeof value !== "string" || !(slot.options as readonly string[]).includes(value)) {
        res.status(400).json({
          error: `Invalid or missing selection for ${slot.label}`,
        });
        return;
      }
      updateSet[slot.key] = value;
    }

    const [updated] = await db
      .update(registrationsTable)
      .set({
        ...updateSet,
        mealSelectionsSubmittedAt: new Date(),
      })
      .where(eq(registrationsTable.id, row.id))
      .returning();

    res.json({
      mealFridayEvening: updated.mealFridayEvening,
      mealSaturdayAfternoon: updated.mealSaturdayAfternoon,
      mealSaturdayEvening: updated.mealSaturdayEvening,
      mealSundayAfternoon: updated.mealSundayAfternoon,
      mealSundayEvening: updated.mealSundayEvening,
      mealSelectionsSubmittedAt: updated.mealSelectionsSubmittedAt?.toISOString() ?? null,
    });
  },
);

export default router;
