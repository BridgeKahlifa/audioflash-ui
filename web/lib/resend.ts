import { Resend } from "resend";

export const FROM_ADDRESS =
  process.env.RESEND_FROM_ADDRESS ?? "onboarding@resend.dev";
export const FROM_NAME = "AudioFlash";

export function hasResendConfig() {
  return Boolean(process.env.RESEND_API_KEY);
}

export function getResend() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("Resend API key is missing.");
  }

  return new Resend(apiKey);
}
