<wizard-report>
# PostHog post-wizard report

The wizard completed a deep integration of AudioFlash Mobile with PostHog. The project already had PostHog installed (`posthog-react-native`, `posthog-react-native-session-replay`) and a solid base of event tracking. This integration extended that coverage with 4 new events across 3 files, updated the analytics configuration to use environment variables for the host, and built a dashboard with 5 insights.

**Changes made:**
- `lib/analytics.ts` — Changed `POSTHOG_HOST` to read from `EXPO_PUBLIC_POSTHOG_HOST` env variable (with fallback)
- `.env` — Set `EXPO_PUBLIC_POSTHOG_KEY` and `EXPO_PUBLIC_POSTHOG_HOST`
- `app/session-summary.tsx` — Added `useAnalytics` import and `session_summary_retry_missed` event
- `app/(tabs)/review.tsx` — Added `useAnalytics` import and `review_srs_started` / `review_named_started` events
- `app/lesson-ready/[topic].tsx` — Added `lesson_started` event on successful lesson preparation

| Event | Description | File |
|-------|-------------|------|
| `session_summary_retry_missed` | User taps "Retry Missed Cards" or "Review Missed Cards" on the session summary screen | `app/session-summary.tsx` |
| `review_srs_started` | User starts a spaced-repetition review session from the Review tab | `app/(tabs)/review.tsx` |
| `review_named_started` | User starts a named (saved) missed-cards review from the Review tab | `app/(tabs)/review.tsx` |
| `lesson_started` | User successfully starts a lesson from the Lesson Ready screen | `app/lesson-ready/[topic].tsx` |

**Pre-existing events (already in codebase):**

| Event | File |
|-------|------|
| `app_opened` | `app/_layout.tsx` |
| `auth_otp_requested`, `auth_otp_request_failed` | `app/(auth)/sign-in.tsx` |
| `auth_passkey_sign_in_started`, `auth_passkey_sign_in_failed` | `app/(auth)/sign-in.tsx` |
| `auth_otp_verified`, `auth_otp_verify_failed`, `auth_otp_resent` | `app/(auth)/verify.tsx` |
| `onboarding_started` | `app/(onboarding)/index.tsx` |
| `onboarding_name_set` | `app/(onboarding)/name.tsx` |
| `onboarding_target_languages_set`, `onboarding_completed` | `app/(onboarding)/target-languages.tsx` |
| `lesson_generate_started`, `lesson_generated`, `lesson_generate_failed` | `app/generate.tsx` |
| `lesson_ready_start_failed` | `app/lesson-ready/[topic].tsx` |
| `session_started` | `app/practice/[topic].tsx` |
| `card_result_submitted`, `session_completed` | `lib/use-session-manager.ts` |
| `settings_practice_saved`, `settings_target_language_selected`, `account_deleted`, `auth_signed_out` | `app/(tabs)/settings.tsx` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard — Analytics basics:** https://us.posthog.com/project/357074/dashboard/1433525
- **Sign-up → Onboarding → First Lesson Funnel:** https://us.posthog.com/project/357074/insights/KomVBqFD
- **Daily Active Learners (sessions completed):** https://us.posthog.com/project/357074/insights/77xRzkph
- **Lesson Generation Funnel (started → success vs failure):** https://us.posthog.com/project/357074/insights/QFkHLjQw
- **Session Start vs Completion Rate:** https://us.posthog.com/project/357074/insights/ZmuwnCdG
- **Churn Signals (account deletions & sign-outs):** https://us.posthog.com/project/357074/insights/VeRSLgCJ

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
