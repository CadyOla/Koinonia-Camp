// Sends one-way transactional SMS via Arkesel. Never throws -- a failed
// SMS must never block or fail a registration. Callers should not await
// this expecting it to reject; check the return value's ok field instead.

const ARKESEL_URL = "https://sms.arkesel.com/api/v2/sms/send";
const LOOKUP_URL = "koinonia-camp-frontend.onrender.com/my-registration";

/**
 * Normalizes a Ghanaian phone number to Arkesel's expected +233 format.
 * Handles the formats registrants have actually been entering:
 *   0245121811     (10 digits, leading 0)      -> +233245121811
 *   245121811      (9 digits, no leading 0)    -> +233245121811
 *   +233245121811  (already correct)           -> unchanged
 *   233245121811   (country code, no +)        -> +233245121811
 */
function toArkeselFormat(rawPhone: string): string {
  const trimmed = rawPhone.trim().replace(/[\s-]/g, "");
  if (trimmed.startsWith("+233")) return trimmed;
  if (trimmed.startsWith("233") && trimmed.length === 12) return `+${trimmed}`;
  if (trimmed.startsWith("0") && trimmed.length === 10) return `+233${trimmed.slice(1)}`;
  if (/^\d{9}$/.test(trimmed)) return `+233${trimmed}`;
  // Fallback: strip any leading zero/plus and prefix +233 as a best effort
  const digitsOnly = trimmed.replace(/^\+?0*/, "");
  return `+233${digitsOnly}`;
}

/**
 * Shared low-level sender. Both sendRegistrationSms and
 * sendRoomSelectionSms go through this so the Arkesel call shape, error
 * handling, and API-key/sender-ID lookup only exist in one place.
 */
async function sendSms(
  phoneNumber: string,
  message: string,
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.ARKESEL_API_KEY;
  const senderId = process.env.ARKESEL_SENDER_ID || "GFC Accra";
  if (!apiKey) {
    return { ok: false, error: "ARKESEL_API_KEY not configured" };
  }
  try {
    const res = await fetch(ARKESEL_URL, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: senderId,
        message,
        recipients: [toArkeselFormat(phoneNumber)],
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body?.status !== "success") {
      return { ok: false, error: JSON.stringify(body) };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Unknown SMS error" };
  }
}

function firstNameOf(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || "there";
}

// ---------------------------------------------------------------------------
// Registration confirmation SMS (existing, unchanged behavior)
// ---------------------------------------------------------------------------
export async function sendRegistrationSms(
  phoneNumber: string,
  fullName: string,
  referenceNumber: string,
): Promise<{ ok: boolean; error?: string }> {
  const message =
    `Hi ${firstNameOf(fullName)}, your Koinonia Camp '26 registration is confirmed!\n` +
    `Ref: ${referenceNumber}\n` +
    `Look up your details: ${LOOKUP_URL}`;

  return sendSms(phoneNumber, message);
}

// ---------------------------------------------------------------------------
// Room-selection invite SMS (NEW) — nudges Residents who haven't picked a
// room yet. Fully separate from the registration-confirmation flow above:
// different trigger (admin button, not the POST /registrations handler),
// different DB tracking column (room_sms_sent_at, not sms_sent_at).
// ---------------------------------------------------------------------------
const ROOM_SELECTION_URL = "https://koinonia-camp-frontend.onrender.com/my-registration";

export async function sendRoomSelectionSms(
  phoneNumber: string,
  fullName: string,
): Promise<{ ok: boolean; error?: string }> {
  const message =
    `Hi ${firstNameOf(fullName)}, select your Koinonia Camp '26 room here: ` +
    `${ROOM_SELECTION_URL} \u2013 GFC Accra`;

  return sendSms(phoneNumber, message);
}

// ---------------------------------------------------------------------------
// Payment reminder SMS (NEW) — for Non-Residents, who don't select a room
// but still owe the mandatory GHS100 registration fee. Separate wording
// (no "room" language) and its own DB tracking column (payment_sms_sent_at).
// ---------------------------------------------------------------------------
export async function sendPaymentReminderSms(
  phoneNumber: string,
  fullName: string,
): Promise<{ ok: boolean; error?: string }> {
  const message =
    `Hi ${firstNameOf(fullName)}, complete your Koinonia Camp '26 registration ` +
    `by paying GHS100 here: ${ROOM_SELECTION_URL} \u2013 GFC Accra`;

  return sendSms(phoneNumber, message);
}
