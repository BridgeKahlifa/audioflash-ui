import { createHmac, timingSafeEqual } from "crypto";

// Generates a signed token for an email address using HMAC-SHA256.
// Stateless — no DB storage needed.
export function generateUnsubscribeToken(email: string): string {
  return createHmac("sha256", process.env.UNSUBSCRIBE_SECRET!)
    .update(email.toLowerCase().trim())
    .digest("hex");
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  const expected = generateUnsubscribeToken(email);
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function unsubscribeUrl(email: string, baseUrl: string): string {
  const token = generateUnsubscribeToken(email);
  const params = new URLSearchParams({ email, token });
  return `${baseUrl}/unsubscribe?${params}`;
}
