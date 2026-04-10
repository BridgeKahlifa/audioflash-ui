import "react-native-url-polyfill/auto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { DEV_AUTH_MODE } from "./api";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";

const missingSupabaseEnvVars = [
  !supabaseUrl ? "EXPO_PUBLIC_SUPABASE_URL" : null,
  !supabaseAnonKey ? "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY" : null,
].filter((value): value is string => value !== null);

export const SUPABASE_CONFIG_ERROR =
  !DEV_AUTH_MODE && missingSupabaseEnvVars.length > 0
    ? `Missing required environment variable${
        missingSupabaseEnvVars.length > 1 ? "s" : ""
      }: ${missingSupabaseEnvVars.join(", ")}`
    : null;

function createMissingConfigClient(): SupabaseClient {
  return new Proxy({} as SupabaseClient, {
    get() {
      throw new Error(SUPABASE_CONFIG_ERROR ?? "Supabase is not configured.");
    },
  });
}

const storage = Platform.OS === "web"
  ? {
      getItem: async (key: string) => {
        if (typeof window === "undefined") return null;
        return window.localStorage.getItem(key);
      },
      setItem: async (key: string, value: string) => {
        if (typeof window === "undefined") return;
        window.localStorage.setItem(key, value);
      },
      removeItem: async (key: string) => {
        if (typeof window === "undefined") return;
        window.localStorage.removeItem(key);
      },
    }
  : {
      getItem: (key: string) => SecureStore.getItemAsync(key),
      setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
      removeItem: (key: string) => SecureStore.deleteItemAsync(key),
    };

export const supabase = SUPABASE_CONFIG_ERROR
  ? createMissingConfigClient()
  : createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
