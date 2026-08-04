// Sends a one-way transactional SMS via Arkesel. Never throws -- a failed
// SMS must never block or fail a registration. Callers should not await
// this expecting it to reject; check the return value's `ok` field instead.

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

export async function sendRegistrationSms(
  phoneNumber: string,
  fullName: string,
  referenceNumber: string,
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.ARKESEL_API_KEY;
  const senderId = process.env.ARKESEL_SENDER_ID || "GFC Accra";

  if (!apiKey) {
    return { ok: false, error: "ARKESEL_API_KEY not configured" };
  }

  const firstName = fullName.trim().split(/\s+/)[0] || "there";
  const message =
    `Hi ${firstName}, your Koinonia Camp '26 registration is confirmed!\n` +
    `Ref: ${referenceNumber}\n` +
    `Look up your details: ${LOOKUP_URL}`;

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
