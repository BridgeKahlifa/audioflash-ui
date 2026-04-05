import { usePostHog } from "posthog-react-native";

// Re-export the hook so screens only need to import from one place
export { usePostHog as useAnalytics };

export const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? "";
export const POSTHOG_HOST = "https://us.i.posthog.com";

type AnalyticsProperties = Record<string, unknown>;

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return {
      error_kind: error.name || "Error",
      error_message: error.message,
      error_stack: error.stack ?? "",
    };
  }

  return {
    error_kind: "Error",
    error_message: typeof error === "string" ? error : "Unknown error",
    error_stack: "",
  };
}

export function buildErrorProperties(error: unknown, context: AnalyticsProperties = {}) {
  return {
    ...normalizeError(error),
    ...context,
  };
}
