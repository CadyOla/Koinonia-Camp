import { Router, type IRouter } from "express";
import { and, eq, isNull, ne, or } from "drizzle-orm";
import { requireAdmin } from "./admin-auth";
import { sendPaymentReminderSms } from "../lib/arkesel";
import { db, registrationsTable } from "@workspace/db";

const router: IRouter = Router();

const ACCRA_MAIN_BRANCH_VALUE =
  process.env.ACCRA_MAIN_BRANCH_VALUE || "Accra Main (Okponglo)";

const SEND_DELAY_MS = 300; // same pacing as the other SMS bulk-send routes

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// POST /admin/send-payment-reminder-sms
// Texts every Non-Resident registrant in Accra Main who hasn't paid the
// mandatory GHS100 fee yet (paymentStatus not "Completed") and hasn't
// already been sent this specific SMS. Safe to press more than once.
router.post(
  "/admin/send-payment-reminder-sms",
  requireAdmin,
  async (req, res): Promise<void> => {
    try {
      const targets = await db
        .select()
        .from(registrationsTable)
        .where(
          and(
            eq(registrationsTable.branch, ACCRA_MAIN_BRANCH_VALUE),
            eq(registrationsTable.accommodationPreference, "Non-Resident"),
            or(
              isNull(registrationsTable.paymentStatus),
              ne(registrationsTable.paymentStatus, "Completed"),
            ),
            isNull(registrationsTable.paymentSmsSentAt),
          ),
        );

      const total = targets.length;
      let sent = 0;
      let failed = 0;
      const failures: { referenceNumber: string; error?: string }[] = [];

      for (const row of targets) {
        const result = await sendPaymentReminderSms(row.phoneNumber, row.fullName);

        if (result.ok) {
          await db
            .update(registrationsTable)
            .set({ paymentSmsSentAt: new Date() })
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
            "Payment reminder SMS failed",
          );
        }

        await sleep(SEND_DELAY_MS);
      }

      req.log.info({ total, sent, failed }, "Payment reminder SMS run complete");
      res.json({ total, sent, failed, failures });
    } catch (err: any) {
      req.log.error({ message: err?.message }, "Payment reminder SMS run failed");
      res.status(500).json({ error: err?.message || "Unknown error" });
    }
  },
);

export default router;
