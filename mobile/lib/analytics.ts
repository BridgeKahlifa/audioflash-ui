import { usePostHog } from "posthog-react-native";

// Re-export the hook so screens only need to import from one place
export { usePostHog as useAnalytics };

export const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? "";
export const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

type AnalyticsProperties = Record<string, unknown>;
const REDACTED = "[REDACTED]";
const SENSITIVE_KEY_PATTERN = /(token|secret|password|authorization|cookie|session|apikey|api_key|email|phone)/i;
const SENSITIVE_VALUE_PATTERN =
  /((bearer\s+)?[a-z0-9_\-.]{16,}|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi;

function sanitizeValue(value: unknown, key?: string): unknown {
  if (key && SENSITIVE_KEY_PATTERN.test(key)) {
    return REDACTED;
  }

  if (typeof value === "string") {
    return value.replace(SENSITIVE_VALUE_PATTERN, REDACTED);
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([nestedKey, nestedValue]) => [
        nestedKey,
        sanitizeValue(nestedValue, nestedKey),
      ]),
    );
  }

  return value;
}

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return {
      error_kind: sanitizeValue(error.name || "Error"),
      error_message: sanitizeValue(error.message),
      error_stack: sanitizeValue(error.stack ?? ""),
    };
  }

  return {
    error_kind: "Error",
    error_message: sanitizeValue(typeof error === "string" ? error : "Unknown error"),
    error_stack: "",
  };
}

export function buildErrorProperties(error: unknown, context: AnalyticsProperties = {}) {
  return {
    ...normalizeError(error),
    ...(sanitizeValue(context) as AnalyticsProperties),
  };
}

export function buildExceptionProperties(error: unknown, context: AnalyticsProperties = {}) {
  return buildErrorProperties(error, context);
}
