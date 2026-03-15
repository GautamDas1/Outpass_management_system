import QRCode from "qrcode";

export async function generateQRCode(outpassId: string): Promise<string> {
  // Store just the ID as plain text — simpler QR = much easier to scan
  // Lower error correction = less dense QR pattern = faster camera detection
  const qrDataURL = await QRCode.toDataURL(outpassId, {
    errorCorrectionLevel: "L",  // L=low density, easiest to scan
    width: 300,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
  });
  return qrDataURL;
}

export function parseQRPayload(raw: string): { id: string } | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Try JSON first (for backward compatibility with old QR codes)
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed?.id) return { id: parsed.id };
  } catch {
    // Not JSON — treat entire string as the outpass ID directly
  }

  // Plain UUID format (new QR codes)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(trimmed)) {
    return { id: trimmed };
  }

  return null;
}