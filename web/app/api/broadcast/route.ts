import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { resend, FROM_ADDRESS, FROM_NAME } from "../../../lib/resend";
import { unsubscribeUrl } from "../../../lib/token";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth || auth !== `Bearer ${process.env.BROADCAST_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { subject, html } = await req.json();

  if (!subject || !html) {
    return NextResponse.json(
      { error: "subject and html are required." },
      { status: 400 }
    );
  }

  // Fetch all subscribed emails
  const { data, error } = await supabaseAdmin
    .from("waitlist")
    .select("email")
    .is("unsubscribed_at", null);

  if (error) {
    console.error("Broadcast fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch waitlist." }, { status: 500 });
  }

  const emails = data.map((row: { email: string }) => row.email);

  if (emails.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? `https://${req.headers.get("host")}`;

  // Inject a unique unsubscribe link per recipient
  const BATCH_SIZE = 100;
  let sent = 0;

  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    const batch = emails.slice(i, i + BATCH_SIZE).map((to) => ({
      from: `${FROM_NAME} <${FROM_ADDRESS}>`,
      to,
      subject,
      html: html.replace("{{unsubscribe_url}}", unsubscribeUrl(to, baseUrl)),
    }));

    const { error: sendError } = await resend.batch.send(batch);
    if (sendError) {
      console.error("Batch send error:", sendError);
      return NextResponse.json(
        { error: "Batch send failed.", sent },
        { status: 500 }
      );
    }

    sent += batch.length;
  }

  return NextResponse.json({ sent });
}
