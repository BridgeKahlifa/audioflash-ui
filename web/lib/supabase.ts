import { createClient, SupabaseClient } from "@supabase/supabase-js";

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL;
}

function getSupabaseAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

function getSupabaseServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY;
}

export function hasPublicSupabaseConfig() {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}

export function hasAdminSupabaseConfig() {
  return Boolean(getSupabaseUrl() && getSupabaseServiceRoleKey());
}

export function getSupabase(): SupabaseClient {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();

  if (!url || !anonKey) {
    throw new Error("Public Supabase configuration is missing.");
  }

  return createClient(url, anonKey);
}

export function getSupabaseAdmin(): SupabaseClient {
  const url = getSupabaseUrl();
  const serviceRoleKey = getSupabaseServiceRoleKey();

  if (!url || !serviceRoleKey) {
    throw new Error("Admin Supabase configuration is missing.");
  }

  return createClient(url, serviceRoleKey);
}
