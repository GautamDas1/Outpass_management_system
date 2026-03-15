import QRCode from "qrcode";

export async function generateQRCode(outpassId: string): Promise<string> {
  // We include a prefix to make the QR unique to our app
  const payload = `outpass:${outpassId}`;
  
  const qrDataURL = await QRCode.toDataURL(payload, {
    errorCorrectionLevel: "M", // 'M' is a good balance for phone screens
    width: 400,
    margin: 2,
    color: { 
      dark: "#ffffff", // White modules (for dark mode/inverted)
      light: "#000000" // Black background
    },
  });
  return qrDataURL;
}

export function parseQRPayload(raw: string): { id: string } | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();

  // 1. Handle "outpass:ID" format (Your current QR code format)
  if (trimmed.startsWith("outpass:")) {
    const id = trimmed.split(":")[1];
    return id ? { id } : null;
  }

  // 2. Handle JSON format (Backward compatibility)
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed?.id) return { id: parsed.id };
  } catch {
    // Not JSON
  }

  // 3. Handle Plain ID (No prefix, not JSON)
  // If it's a long string of numbers or a UUID, accept it
  if (trimmed.length > 5) {
    return { id: trimmed };
  }

  return null;
}