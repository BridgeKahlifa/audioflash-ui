import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { error: "Server is missing Supabase configuration." },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { email } = await req.json();

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Valid email required." }, { status: 400 });
  }

  const normalized = email.toLowerCase().trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalized)) {
    return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
  }

  const { error } = await supabase
    .from("waitlist")
    .insert({ email: normalized });

  if (error) {
    // Unique constraint violation — already signed up
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "You're already on the list!" },
        { status: 409 }
      );
    }
    console.error("Waitlist insert error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
