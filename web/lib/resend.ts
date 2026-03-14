import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

// Use your verified domain once set up in Resend.
// For testing, onboarding@resend.dev works without domain verification.
export const FROM_ADDRESS = process.env.RESEND_FROM_ADDRESS ?? "onboarding@resend.dev";
export const FROM_NAME = "AudioFlash";
