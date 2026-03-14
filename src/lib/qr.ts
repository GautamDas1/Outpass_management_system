import QRCode from "qrcode";

export async function generateQRCode(outpassId: string): Promise<string> {
  const payload = JSON.stringify({
    id: outpassId,
    ts: Date.now(),
  });
  const qrDataURL = await QRCode.toDataURL(payload, {
    errorCorrectionLevel: "H",
    width: 300,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
  });
  return qrDataURL;
}

export function parseQRPayload(raw: string): { id: string; ts: number } | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
