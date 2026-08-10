import { Router, type IRouter } from "express";
import { and, eq, isNull } from "drizzle-orm";
import { requireAdmin } from "./admin-auth";
import { sendRoomSelectionSms } from "../lib/arkesel";
import { db, registrationsTable } from "@workspace/db";

const router: IRouter = Router();

// Configurable so a spelling mismatch in the DB's branch value can be fixed
// via env var alone, without a code change/redeploy.
const ACCRA_MAIN_BRANCH_VALUE =
  process.env.ACCRA_MAIN_BRANCH_VALUE || "Accra Main (Okponglo)";

const SEND_DELAY_MS = 300; // same pacing as the SMS backfill route

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// POST /admin/send-room-invite-sms
// Texts every registrant who: is in the Accra Main branch, chose Resident
// accommodation, has no roomAssignment yet, and hasn't already been sent
// this specific SMS (room_sms_sent_at IS NULL). Safe to press more than
// once — already-sent rows are skipped every time.
router.post(
  "/admin/send-room-invite-sms",
  requireAdmin,
  async (req, res): Promise<void> => {
    try {
      const targets = await db
        .select()
        .from(registrationsTable)
        .where(
          and(
            eq(registrationsTable.branch, ACCRA_MAIN_BRANCH_VALUE),
            eq(registrationsTable.accommodationPreference, "Resident"),
            isNull(registrationsTable.roomAssignment),
            isNull(registrationsTable.roomSmsSentAt),
          ),
        );

      const total = targets.length;
      let sent = 0;
      let failed = 0;
      const failures: { referenceNumber: string; error?: string }[] = [];

      for (const row of targets) {
        const result = await sendRoomSelectionSms(row.phoneNumber, row.fullName);

        if (result.ok) {
          await db
            .update(registrationsTable)
            .set({ roomSmsSentAt: new Date() })
            .where(eq(registrationsTable.id, row.id));
          sent++;
        } else {
          failed++;
          failures.push({
            referenceNumber: row.referenceNumber,
            error: result.error,
          });
          req.log.warn(
            { referenceNumber: row.referenceNumber, error: result.error },
            "Room invite SMS failed",
          );
        }

        await sleep(SEND_DELAY_MS);
      }

      req.log.info({ total, sent, failed }, "Room invite SMS run complete");
      res.json({ total, sent, failed, failures });
    } catch (err: any) {
      req.log.error({ message: err?.message }, "Room invite SMS run failed");
      res.status(500).json({ error: err?.message || "Unknown error" });
    }
  },
);

export default router;
