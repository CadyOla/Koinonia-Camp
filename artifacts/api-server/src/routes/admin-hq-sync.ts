import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { requireAdmin } from "./admin-auth";
import { db, registrationsTable } from "@workspace/db";

const router: IRouter = Router();

// Base URL of HQ's WordPress site, e.g. https://koinoniacamp.com
const HQ_SITE_URL = process.env.HQ_SITE_URL || "";
// The Eventer event_id for this branch's registration, e.g. "422" for Accra Main
const HQ_EVENT_ID = process.env.HQ_EVENT_ID || "";
// Bearer API key shown in the working curl command, e.g. evt_reg_...
const HQ_API_KEY = process.env.HQ_EVENTER_API_KEY || "";

/**
 * Normalizes a phone number for matching purposes: strips everything but
 * digits and compares the last 9 digits, so 0245121811 / 245121811 /
 * +233245121811 / 233245121811 all collapse to the same key.
 */
function normalizePhoneForMatch(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digitsOnly = raw.replace(/\D/g, "");
  if (digitsOnly.length < 9) return null;
  return digitsOnly.slice(-9);
}

function normalizeEmailForMatch(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

// ---------------------------------------------------------------------------
// Confirmed shape from a live curl against event_id=414:
// {
//   event_ids: [414], page: 1, per_page: 50, total: 4, total_pages: 1,
//   registrations: [{
//     booking_id: 13, event_id: 414, booking_category: "Havilah",
//     name: "Keziah Ampofo", email: "rubicomconsult@gmail.com",
//     fields: { Phone: "0244503840", Gender: "Female", Membership: "Member",
//               Branch: "Havilah", Roommate: "", Age: "", "Name Of Parent": "" },
//     ticket: "Non-Resident × 1", accommodation: "", amount: 100.00,
//     payment_method: "Paystack", transaction_id: "...",
//     status: "completed", status_label: "Completed", ...
//   }]
// }
// Note: booking_category mirrors fields.Branch in this sample (both "Havilah")
// — it's a category label, not a room. Room comes from `accommodation`, which
// is blank here because these four are all Non-Resident. Re-verify once a
// Resident record with a populated `accommodation` value is available.
// ---------------------------------------------------------------------------
interface HqRegistration {
  booking_id: number | string;
  event_id?: number;
  booking_category?: string;
  name?: string;
  email?: string;
  fields?: {
    Phone?: string;
    [key: string]: unknown;
  };
  ticket?: string;
  accommodation?: string;
  amount?: number;
  payment_method?: string;
  transaction_id?: string;
  status?: string;
  status_label?: string;
  [key: string]: unknown;
}

interface HqApiResponse {
  event_ids?: number[];
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  registrations: HqRegistration[];
}

function extractHqPhone(reg: HqRegistration): string | undefined {
  return reg.fields?.Phone;
}

function extractHqEmail(reg: HqRegistration): string | undefined {
  return reg.email;
}

function extractHqRoom(reg: HqRegistration): string | undefined {
  const val = reg.accommodation;
  return val && val.trim().length > 0 ? val : undefined;
}

/**
 * Reads the person's actual accommodation choice on HQ's side from the
 * `ticket` field, e.g. "Non-Resident × 1" or "Resident × 1". Used to keep
 * our local accommodationPreference in sync if someone registered as one
 * type here but ultimately chose the other on HQ's form.
 */
function extractHqAccommodationType(
  reg: HqRegistration,
): "Resident" | "Non-Resident" | undefined {
  const ticket = reg.ticket || "";
  if (/non-resident/i.test(ticket)) return "Non-Resident";
  if (/resident/i.test(ticket)) return "Resident";
  return undefined;
}

function extractHqPaymentStatus(reg: HqRegistration): string | undefined {
  return reg.status_label || reg.status;
}

function extractHqBookingId(reg: HqRegistration): string | undefined {
  return reg.booking_id !== undefined ? String(reg.booking_id) : undefined;
}

/**
 * Fetches every page of registrations for HQ_EVENT_ID using the confirmed
 * page/total_pages pagination shape.
 */
async function fetchAllHqRegistrations(): Promise<HqRegistration[]> {
  const all: HqRegistration[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const url = `${HQ_SITE_URL}/wp-json/eventer/v1/registrations?event_id=${encodeURIComponent(
      HQ_EVENT_ID,
    )}&page=${page}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${HQ_API_KEY}` },
    });
    if (!res.ok) {
      throw new Error(`HQ API request failed: ${res.status} ${res.statusText}`);
    }
    const body = (await res.json()) as HqApiResponse;

    all.push(...(body.registrations || []));
    totalPages = body.total_pages || 1;
    page++;
  } while (page <= totalPages);

  return all;
}

// POST /admin/sync-hq-registrations
router.post(
  "/admin/sync-hq-registrations",
  requireAdmin,
  async (req, res): Promise<void> => {
    if (!HQ_SITE_URL || !HQ_EVENT_ID || !HQ_API_KEY) {
      res.status(500).json({
        error:
          "HQ_SITE_URL, HQ_EVENT_ID, and HQ_EVENTER_API_KEY env vars must all be set before syncing.",
      });
      return;
    }

    try {
      const hqRegistrations = await fetchAllHqRegistrations();

      // Build lookup maps from our own registrations table
      const localRows = await db.select().from(registrationsTable);
      const byPhone = new Map<string, typeof localRows[number]>();
      const byEmail = new Map<string, typeof localRows[number]>();

      for (const row of localRows) {
        const phoneKey = normalizePhoneForMatch(row.phoneNumber);
        if (phoneKey && !byPhone.has(phoneKey)) byPhone.set(phoneKey, row);
        const emailKey = normalizeEmailForMatch(row.email);
        if (emailKey && !byEmail.has(emailKey)) byEmail.set(emailKey, row);
      }

      let matched = 0;
      let updated = 0;
      let reassigned = 0;
      const unmatched: string[] = [];

      for (const hqReg of hqRegistrations) {
        const hqPhoneKey = normalizePhoneForMatch(extractHqPhone(hqReg));
        const hqEmailKey = normalizeEmailForMatch(extractHqEmail(hqReg));

        const localRow =
          (hqPhoneKey && byPhone.get(hqPhoneKey)) ||
          (hqEmailKey && byEmail.get(hqEmailKey)) ||
          undefined;

        if (!localRow) {
          unmatched.push(
            `booking_id ${extractHqBookingId(hqReg)} (${hqReg.name || "unknown"})`,
          );
          continue;
        }

        matched++;

        const room = extractHqRoom(hqReg);
        const paymentStatus = extractHqPaymentStatus(hqReg);
        const bookingId = extractHqBookingId(hqReg);
        const hqAccommodationType = extractHqAccommodationType(hqReg);

        const updateSet: Partial<typeof registrationsTable.$inferInsert> = {
          hqSyncedAt: new Date(),
        };
        if (paymentStatus) updateSet.paymentStatus = paymentStatus;
        if (bookingId) updateSet.hqBookingId = bookingId;

        // If HQ's actual ticket type disagrees with what was originally
        // selected here (e.g. registered as Resident, switched to
        // Non-Resident on HQ's form), correct the local record to match —
        // this keeps /my-registration's banners/confirmation and the admin
        // stats accurate instead of stuck showing the original choice.
        const switchedType =
          hqAccommodationType && hqAccommodationType !== localRow.accommodationPreference;
        if (switchedType) {
          updateSet.accommodationPreference = hqAccommodationType;
          reassigned++;
        }

        // roomAssignment should only ever hold a real room name. Set it when
        // HQ has one; clear any stale value (e.g. from a prior sync, or a
        // type switch) when the person is now Non-Resident and has none.
        const effectiveType = hqAccommodationType || localRow.accommodationPreference;
        if (room) {
          updateSet.roomAssignment = room;
        } else if (effectiveType === "Non-Resident") {
          updateSet.roomAssignment = null;
        }

        // Room-type/lodging preferences are meaningless once someone is
        // Non-Resident — clear them so the Accommodation row doesn't show
        // a stale "Non-Resident · Double" combination after a switch.
        if (switchedType && hqAccommodationType === "Non-Resident") {
          updateSet.roomTypePreference = null;
          updateSet.lodgingType = null;
        }

        await db
          .update(registrationsTable)
          .set(updateSet)
          .where(eq(registrationsTable.id, localRow.id));

        updated++;
      }

      req.log.info(
        {
          fetched: hqRegistrations.length,
          matched,
          updated,
          reassigned,
          unmatchedCount: unmatched.length,
        },
        "HQ registration sync complete",
      );

      res.json({
        fetched: hqRegistrations.length,
        matched,
        updated,
        reassigned,
        unmatched,
      });
    } catch (err: any) {
      req.log.error({ message: err?.message }, "HQ registration sync failed");
      res.status(500).json({ error: err?.message || "Unknown error" });
    }
  },
);

export default router;
