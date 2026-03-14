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

  // Fetch all subscribed emails with pagination to avoid Supabase's default 1000-row limit
  const PAGE_SIZE = 1000;
  const emails: string[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabaseAdmin
      .from("waitlist")
      .select("email")
      .is("unsubscribed_at", null)
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error("Broadcast fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch waitlist." },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      break;
    }

    for (const row of data as { email: string }[]) {
      emails.push(row.email);
    }

    if (data.length < PAGE_SIZE) {
      // Last page reached
      break;
    }

    offset += PAGE_SIZE;
  }

  // Limit the number of recipients per broadcast to avoid long-running requests
  const BATCH_SIZE = 100;
  const MAX_BATCHES = 5; // adjust as needed based on your serverless timeout
  const MAX_RECIPIENTS = BATCH_SIZE * MAX_BATCHES;

  if (emails.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  if (emails.length > MAX_RECIPIENTS) {
    return NextResponse.json(
      {
        error: "Broadcast too large for synchronous processing.",
        detail:
          `This endpoint can send to at most ${MAX_RECIPIENTS} recipients per request. ` +
          "Use a background job/queue or split the broadcast into smaller segments.",
        maxRecipients: MAX_RECIPIENTS,
        totalRecipients: emails.length,
      },
      { status: 413 }
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? `https://${req.headers.get("host")}`;

  // Inject a unique unsubscribe link per recipient
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
