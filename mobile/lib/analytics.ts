import { usePostHog, type PostHog } from "posthog-react-native";

// Re-export the hook so screens only need to import from one place
export { usePostHog as useAnalytics };

export const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? "";
export const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
export const POSTHOG_ENABLE_SESSION_REPLAY =
  process.env.EXPO_PUBLIC_POSTHOG_ENABLE_SESSION_REPLAY === "true";
export const POSTHOG_ENABLE_ERROR_TRACKING =
  process.env.EXPO_PUBLIC_POSTHOG_ENABLE_ERROR_TRACKING === "true";

type AnalyticsValue =
  | string
  | number
  | boolean
  | null
  | AnalyticsValue[]
  | { [key: string]: AnalyticsValue };
type AnalyticsProperties = Record<string, AnalyticsValue>;
type AnalyticsClient = Pick<PostHog, "capture" | "captureException"> | null | undefined;
const REDACTED = "[REDACTED]";
let globalAnalyticsClient: AnalyticsClient = null;
const SENSITIVE_KEY_PATTERN = /(token|secret|password|authorization|cookie|session|apikey|api_key|email|phone)/i;
const SENSITIVE_VALUE_PATTERN =
  /((bearer\s+)?[a-z0-9_\-.]{16,}|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi;

function sanitizeValue(value: unknown, key?: string): AnalyticsValue {
  if (key && SENSITIVE_KEY_PATTERN.test(key)) {
    return REDACTED;
  }

  if (typeof value === "string") {
    return value.replace(SENSITIVE_VALUE_PATTERN, REDACTED);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (value == null) {
    return null;
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
    ) as AnalyticsProperties;
  }

  return String(value);
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

function createSanitizedError(error: unknown): Error {
  const normalized = normalizeError(error);
  const message =
    typeof normalized.error_message === "string" && normalized.error_message.length > 0
      ? normalized.error_message
      : "Unknown error";
  const sanitizedError = new Error(message);

  sanitizedError.name =
    typeof normalized.error_kind === "string" && normalized.error_kind.length > 0
      ? normalized.error_kind
      : "Error";

  if (typeof normalized.error_stack === "string" && normalized.error_stack.length > 0) {
    sanitizedError.stack = normalized.error_stack;
  }

  return sanitizedError;
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

export function sanitizeAnalyticsProperties(
  context: AnalyticsProperties = {},
): AnalyticsProperties {
  return sanitizeValue(context) as AnalyticsProperties;
}

export function setAnalyticsClient(client: AnalyticsClient) {
  globalAnalyticsClient = client;
}

export function captureHandledException(
  posthog: AnalyticsClient,
  error: unknown,
  context: AnalyticsProperties = {},
) {
  if (!posthog) return;

  const sanitizedContext = {
    error_handled: true,
    ...sanitizeAnalyticsProperties(context),
  };

  if (typeof posthog.captureException === "function") {
    posthog.captureException(createSanitizedError(error), sanitizedContext);
    return;
  }

  posthog.capture("handled_exception", {
    ...buildErrorProperties(error),
    ...sanitizedContext,
  });
}

export function captureGlobalHandledException(
  error: unknown,
  context: AnalyticsProperties = {},
) {
  captureHandledException(globalAnalyticsClient, error, context);
}
