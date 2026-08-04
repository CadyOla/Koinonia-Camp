import { Router, type IRouter } from "express";
import { requireAdmin } from "./admin-auth";
import { sendRegistrationSms } from "../lib/arkesel";
import { isNull } from "drizzle-orm";
import { db, registrationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// POST /admin/backfill-sms
// One-time (repeatable/safe) job: texts everyone who registered before the
// SMS feature existed. Only sends to rows where sms_sent_at is still null,
// so running it more than once will never double-text anyone.
router.post(
  "/admin/backfill-sms",
  requireAdmin,
  async (req, res): Promise<void> => {
    const pending = await db
      .select()
      .from(registrationsTable)
      .where(isNull(registrationsTable.smsSentAt));

    let sent = 0;
    let failed = 0;
    const failures: { referenceNumber: string; error?: string }[] = [];

    for (const row of pending) {
      const result = await sendRegistrationSms(
        row.phoneNumber,
        row.fullName,
        row.referenceNumber,
      );

      if (result.ok) {
        sent += 1;
        await db
          .update(registrationsTable)
          .set({ smsSentAt: new Date() })
          .where(eq(registrationsTable.id, row.id));
      } else {
        failed += 1;
        failures.push({ referenceNumber: row.referenceNumber, error: result.error });
      }

      // Small delay between sends so we don't burst-flood Arkesel
      await sleep(300);
    }

    req.log.info(
      { total: pending.length, sent, failed },
      "SMS backfill completed",
    );

    res.json({ total: pending.length, sent, failed, failures });
  },
);

export default router;
