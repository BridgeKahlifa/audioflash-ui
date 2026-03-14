import { NextRequest, NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "../../../lib/supabase";
import { verifyUnsubscribeToken } from "../../../lib/token";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");
  const token = searchParams.get("token");

  if (!email || !token) {
    return NextResponse.json({ error: "Missing email or token." }, { status: 400 });
  }

  if (!verifyUnsubscribeToken(email, token)) {
    return NextResponse.json({ error: "Invalid token." }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from("waitlist")
    .select("unsubscribed_at")
    .eq("email", email.toLowerCase().trim())
    .single();

  if (error) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  return NextResponse.json({ alreadyUnsubscribed: data.unsubscribed_at !== null });
}

export async function POST(req: NextRequest) {
  const { email, token } = await req.json();

  if (!email || !token) {
    return NextResponse.json({ error: "Missing email or token." }, { status: 400 });
  }

  if (!verifyUnsubscribeToken(email, token)) {
    return NextResponse.json({ error: "Invalid token." }, { status: 403 });
  }

  const { error } = await supabase
    .from("waitlist")
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq("email", email.toLowerCase().trim())
    .is("unsubscribed_at", null);

  if (error) {
    console.error("Unsubscribe error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
