import { NextRequest, NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "../../../lib/supabase";
import { resend, FROM_ADDRESS, FROM_NAME } from "../../../lib/resend";
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

  const { error } = await supabase
    .from("waitlist")
    .insert({ email: normalized });

  if (error) {
    if (error.code === "23505") {
      // Email exists — check if they previously unsubscribed
      const { data: existing } = await supabaseAdmin
        .from("waitlist")
        .select("unsubscribed_at")
        .eq("email", normalized)
        .single();

      if (existing?.unsubscribed_at) {
        // Re-subscribe them
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

  // Send welcome email — fire and forget, don't fail the request if this errors
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ?? `https://${req.headers.get("host")}`;
  const link = unsubscribeUrl(normalized, baseUrl);
  resend.emails
    .send({
      from: `${FROM_NAME} <${FROM_ADDRESS}>`,
      to: normalized,
      subject: "You're on the AudioFlash waitlist 🎧",
      html: welcomeEmail(link),
    })
    .catch((err) => console.error("Welcome email error:", err));

  return NextResponse.json({ success: true }, { status: 200 });
}
