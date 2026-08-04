// Sends a one-way transactional SMS via Arkesel. Never throws -- a failed
// SMS must never block or fail a registration. Callers should not await
// this expecting it to reject; check the return value's `ok` field instead.

const ARKESEL_URL = "https://sms.arkesel.com/api/v2/sms/send";

/**
 * Normalizes a Ghanaian phone number to Arkesel's expected +233 format.
 * Accepts local format (0XXXXXXXXX) or already-international (+233XXXXXXXXX).
 */
function toArkeselFormat(rawPhone: string): string {
  const trimmed = rawPhone.trim().replace(/[\s-]/g, "");
  if (trimmed.startsWith("+233")) return trimmed;
  if (trimmed.startsWith("233")) return `+${trimmed}`;
  if (trimmed.startsWith("0")) return `+233${trimmed.slice(1)}`;
  return trimmed;
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
    `Hi ${firstName}, your Koinonia Camp 2026 registration is confirmed! ` +
    `Your reference number is ${referenceNumber}. Keep it safe -- you can ` +
    `look up your details anytime using it.`;

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
