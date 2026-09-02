import { Router, type IRouter } from "express";
import { rateLimit } from "express-rate-limit";
import { eq, sql } from "drizzle-orm";
import { db, registrationsTable } from "@workspace/db";
import { MEAL_SLOTS, type MealSlotKey } from "../lib/meal-menu";
import { requireFoodAccess } from "./food-auth";

const router: IRouter = Router();

// Higher limit than the public lookup limiters (5/min) since this is used
// repeatedly, in quick succession, by a small number of trusted volunteers
// at a food line — not a public, potentially-abusable endpoint.
const foodLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please wait a moment and try again." },
});

type RegistrationRow = typeof registrationsTable.$inferSelect;

const COLLECTED_COLUMN: Record<MealSlotKey, keyof RegistrationRow> = {
  mealFridayEvening: "mealFridayEveningCollectedAt",
  mealSaturdayAfternoon: "mealSaturdayAfternoonCollectedAt",
  mealSaturdayEvening: "mealSaturdayEveningCollectedAt",
  mealSundayAfternoon: "mealSundayAfternoonCollectedAt",
  mealSundayEvening: "mealSundayEveningCollectedAt",
  mealMondayBrunch: "mealMondayBrunchCollectedAt",
};

function buildMealSummary(row: RegistrationRow) {
  return MEAL_SLOTS.map((slot) => {
    const collectedAtRaw = row[COLLECTED_COLUMN[slot.key]] as Date | null;
    return {
      key: slot.key,
      label: slot.label,
      dish: (row[slot.key] as string | null) ?? null,
      collectedAt: collectedAtRaw ? collectedAtRaw.toISOString() : null,
    };
  });
}

async function findByReference(referenceNumber: string) {
  const raw = referenceNumber.trim().toUpperCase();
  const [row] = await db
    .select()
    .from(registrationsTable)
    .where(sql`upper(${registrationsTable.referenceNumber}) = ${raw}`);
  return row;
}

// GET /food/lookup/:referenceNumber
router.get(
  "/food/lookup/:referenceNumber",
  foodLimiter,
  requireFoodAccess,
  async (req, res): Promise<void> => {
    const raw = req.params.referenceNumber?.trim();
    if (!raw) {
      res.status(400).json({ error: "Reference number is required" });
      return;
    }

    const row = await findByReference(raw);
    if (!row) {
      res
        .status(404)
        .json({ error: "No registration found with that reference number" });
      return;
    }

    if (row.feedingPreference !== "Church Feeding") {
      res
        .status(400)
        .json({ error: "This registrant is not on Church Feeding" });
      return;
    }

    if (!row.mealSelectionsSubmittedAt) {
      res
        .status(400)
        .json({ error: "This registrant has not submitted meal choices yet" });
      return;
    }

    res.json({
      referenceNumber: row.referenceNumber,
      fullName: row.fullName,
      meals: buildMealSummary(row),
    });
  },
);

// POST /food/lookup/:referenceNumber/collect
// body: { slot: MealSlotKey, collected: boolean }
router.post(
  "/food/lookup/:referenceNumber/collect",
  foodLimiter,
  requireFoodAccess,
  async (req, res): Promise<void> => {
    const raw = req.params.referenceNumber?.trim();
    const { slot, collected } = req.body ?? {};

    // TEMPORARY DEBUG LOGGING — remove once the bug is found.
    req.log.info(
      { raw, slot, collected, collectedType: typeof collected },
      "[food-debug] incoming collect request",
    );

    if (!raw) {
      res.status(400).json({ error: "Reference number is required" });
      return;
    }

    const validSlot = MEAL_SLOTS.find((s) => s.key === slot);
    if (!validSlot || typeof collected !== "boolean") {
      res.status(400).json({ error: "Invalid slot or collected value" });
      return;
    }

    const row = await findByReference(raw);
    if (!row) {
      res
        .status(404)
        .json({ error: "No registration found with that reference number" });
      return;
    }

    const columnKey = COLLECTED_COLUMN[validSlot.key];

    // TEMPORARY DEBUG LOGGING
    req.log.info(
      { columnKey, rowId: row.id, beforeValue: row[columnKey] },
      "[food-debug] resolved column and row before update",
    );

    const updateValues = { [columnKey]: collected ? new Date() : null } as any;

    // TEMPORARY DEBUG LOGGING
    req.log.info({ updateValues }, "[food-debug] update payload about to run");

    const [updated] = await db
      .update(registrationsTable)
      .set(updateValues)
      .where(eq(registrationsTable.id, row.id))
      .returning();

    // TEMPORARY DEBUG LOGGING
    req.log.info(
      { afterValue: updated[columnKey], updatedRowId: updated.id },
      "[food-debug] value immediately after update",
    );

    res.json({
      referenceNumber: updated.referenceNumber,
      fullName: updated.fullName,
      meals: buildMealSummary(updated),
    });
  },
);

export default router;
