import { usePostHog } from "posthog-react-native";

// Re-export the hook so screens only need to import from one place
export { usePostHog as useAnalytics };

export const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? "";
export const POSTHOG_HOST = "https://us.i.posthog.com";
