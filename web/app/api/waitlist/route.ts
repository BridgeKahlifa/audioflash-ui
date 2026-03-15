import { NextRequest, NextResponse } from "next/server";
import {
  getSupabase,
  getSupabaseAdmin,
  hasAdminSupabaseConfig,
  hasPublicSupabaseConfig,
} from "../../../lib/supabase";
import {
  FROM_ADDRESS,
  FROM_NAME,
  getResend,
  hasResendConfig,
} from "../../../lib/resend";
import { welcomeEmail } from "../../../emails/welcome";
import { unsubscribeUrl } from "../../../lib/token";

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  if (!email || typeof email !== "string") {
    return NextResponse.json(
      { error: "Valid email required." },
      { status: 400 },
    );
  }

  const normalized = email.toLowerCase().trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalized)) {
    return NextResponse.json(
      { error: "Invalid email address." },
      { status: 400 },
    );
  }

  if (!hasPublicSupabaseConfig()) {
    return NextResponse.json(
      { error: "Server is missing Supabase configuration." },
      { status: 500 },
    );
  }

  const supabase = getSupabase();
  const supabaseAdmin = hasAdminSupabaseConfig() ? getSupabaseAdmin() : null;

  const { error } = await supabase
    .from("waitlist")
    .insert({ email: normalized });

  if (error) {
    if (error.code === "23505") {
      if (!supabaseAdmin) {
        return NextResponse.json(
          { error: "You're already on the list!" },
          { status: 409 },
        );
      }

      const { data: existing } = await supabaseAdmin
        .from("waitlist")
        .select("unsubscribed_at")
        .eq("email", normalized)
        .single();

      if (existing?.unsubscribed_at) {
        const { error: updateError } = await supabaseAdmin
          .from("waitlist")
          .update({ unsubscribed_at: null })
          .eq("email", normalized);

        if (updateError) {
          console.error("Re-subscribe error:", updateError);
          return NextResponse.json(
            { error: "Something went wrong. Please try again." },
            { status: 500 },
          );
        }
      } else {
        return NextResponse.json(
          { error: "You're already on the list!" },
          { status: 409 },
        );
      }
    } else {
      console.error("Waitlist insert error:", error);
      return NextResponse.json(
        { error: "Something went wrong. Please try again." },
        { status: 500 },
      );
    }
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ?? `https://${req.headers.get("host")}`;
  const link = unsubscribeUrl(normalized, baseUrl);
  if (hasResendConfig()) {
    try {
      const resend = getResend();
      const { error: emailError } = await resend.emails.send({
        from: `${FROM_NAME} <${FROM_ADDRESS}>`,
        to: normalized,
        subject: "You're on the AudioFlash waitlist",
        html: welcomeEmail(link),
      });
      if (emailError) console.error("Welcome email error:", emailError);
    } catch (err) {
      console.error("Welcome email error:", err);
    }
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
