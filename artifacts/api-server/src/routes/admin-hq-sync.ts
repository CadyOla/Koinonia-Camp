import { Router, type IRouter } from "express";
import { requireAdmin } from "./admin-auth";
import { eq } from "drizzle-orm";
import { db, registrationsTable } from "@workspace/db";

const router: IRouter = Router();

interface HqRegistration {
  booking_id: number;
  event_id: number;
  booking_category: string;
  name: string;
  email: string;
  fields: {
    Phone?: string;
    [key: string]: unknown;
  };
  ticket: string;
  accommodation: string;
  amount: number;
  payment_method: string;
  transaction_id: string;
  status: string;
  status_label: string;
  registered_at: string;
}

interface HqResponse {
  event_ids: number[];
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  registrations: HqRegistration[];
}

// Matches phone numbers regardless of format (0245121811, 245121811,
// +233245121811, 233245121811 all normalize to the same last-9-digits key).
function normalizePhoneForMatch(phone: string | null | undefined): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  return digits.slice(-9);
}

async function fetchAllHqRegistrations(): Promise<HqRegistration[]> {
  const apiKey = process.env.HQ_EVENTER_API_KEY;
  const eventId = process.env.HQ_EVENTER_EVENT_ID || "422";
  const baseUrl =
    process.env.HQ_EVENTER_BASE_URL ||
    "https://koinoniacamp.com/wp-json/eventer/v1/registrations";

  if (!apiKey) {
    throw new Error("HQ_EVENTER_API_KEY is not configured");
  }

  const all: HqRegistration[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const url = `${baseUrl}?event_id=${eventId}&page=${page}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`HQ API error ${res.status}: ${body.slice(0, 300)}`);
    }

    const data = (await res.json()) as HqResponse;
    all.push(...data.registrations);
    totalPages = data.total_pages;
    page += 1;
  } while (page <= totalPages);

  return all;
}

router.post(
  "/admin/sync-hq-registrations",
  requireAdmin,
  async (req, res): Promise<void> => {
    try {
      const hqRegistrations = await fetchAllHqRegistrations();
      const localRows = await db.select().from(registrationsTable);

      type LocalRow = (typeof localRows)[number];
      const byPhone = new Map<string, LocalRow>();
      const byEmail = new Map<string, LocalRow>();
      for (const row of localRows) {
        const normPhone = normalizePhoneForMatch(row.phoneNumber);
        if (normPhone) byPhone.set(normPhone, row);
        if (row.email) byEmail.set(row.email.trim().toLowerCase(), row);
      }

      let matched = 0;
      let updated = 0;
      const unmatched: Array<{ name: string; email: string; phone: string }> =
        [];

      for (const hqReg of hqRegistrations) {
        // Only sync completed/paid bookings — skip abandoned carts.
        if (hqReg.status !== "completed") continue;

        const hqPhone = normalizePhoneForMatch(hqReg.fields?.Phone);
        const hqEmail = hqReg.email?.trim().toLowerCase() ?? "";

        const localRow = byPhone.get(hqPhone) ?? byEmail.get(hqEmail);

        if (!localRow) {
          unmatched.push({
            name: hqReg.name,
            email: hqReg.email,
            phone: hqReg.fields?.Phone ?? "",
          });
          continue;
        }

        matched += 1;

        // "accommodation" is only populated for Resident/room-tier bookings;
        // fall back to the ticket type (e.g. "Non-Resident × 1") otherwise.
        const newRoomAssignment = hqReg.accommodation || hqReg.ticket || null;

        const alreadySynced =
          localRow.hqBookingId === String(hqReg.booking_id) &&
          localRow.roomAssignment === newRoomAssignment &&
          localRow.paymentStatus === hqReg.status_label;

        if (alreadySynced) continue;

        await db
          .update(registrationsTable)
          .set({
            roomAssignment: newRoomAssignment,
            paymentStatus: hqReg.status_label,
            hqBookingId: String(hqReg.booking_id),
            hqSyncedAt: new Date(),
          })
          .where(eq(registrationsTable.id, localRow.id));

        updated += 1;
      }

      res.json({
        fetched: hqRegistrations.length,
        matched,
        updated,
        unmatched: unmatched.length,
        unmatchedDetails: unmatched,
      });
    } catch (err: any) {
      req.log.error({ message: err?.message }, "HQ registration sync failed");
      res.status(500).json({ error: err?.message || "HQ sync failed" });
    }
  },
);

export default router;
