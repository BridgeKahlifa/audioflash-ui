# App Store submission — App Privacy answers & review notes

Reference for filling in App Store Connect for AudioFlash (`ai.audioflash.mobile`, ASC app id `6761799123`).
Verified against the code at release 1.0.5.

## Part 1 — App Privacy answers

Answer "Yes, we collect data from this app." Declare the four types below.

### Data collected

| Data type | Category | Linked to identity | Used for tracking | Purposes |
|---|---|---|---|---|
| Email address | Contact Info | **Yes** | No | App Functionality, Analytics |
| Name | Contact Info | **Yes** | No | App Functionality, Analytics |
| User ID | Identifiers | **Yes** | No | App Functionality, Analytics |
| Product Interaction | Usage Data | **Yes** | No | Analytics, App Functionality |
| Crash Data | Diagnostics | **Yes** | No | App Functionality |
| Other User Content (flashcards, decks, study history) | User Content | **Yes** | No | App Functionality |

### Why each answer

- **Email + Name → Contact Info, linked.** `app/_layout.tsx:91` calls
  `posthog.identify(session.user.id, { email, name, ... })`, so both are attached to a
  persistent profile in PostHog. They are also held in Supabase for the account itself.
  This must be declared as linked — declaring it unlinked would be inaccurate.
- **User ID → Identifiers, linked.** The Supabase user id is the PostHog distinct id.
- **Product Interaction → Usage Data.** PostHog autocapture plus `captureAppLifecycleEvents: true`.
- **Crash Data → Diagnostics.** PostHog error tracking (`errorTracking.autocapture`), gated on
  `EXPO_PUBLIC_POSTHOG_ENABLE_ERROR_TRACKING`. Declare it — the flag can be enabled without a resubmit.
- **User Content.** Decks, flashcards, and study progress stored in Supabase against the account.

### "Used for tracking" — answer No for everything

Tracking, in Apple's sense, means linking this app's data to third-party data for targeted
advertising or sharing with a data broker. AudioFlash does none of that:

- No `AppTrackingTransparency` / `expo-tracking-transparency` in the project, no IDFA access
- No ad SDKs, no ad networks, no data brokers
- PostHog is first-party product analytics on your own instance (`EXPO_PUBLIC_POSTHOG_HOST`)

Because the answer is No, **do not** add `NSUserTrackingUsageDescription` and do not show an ATT
prompt. Adding one without tracking is itself a rejection cause.

### Session replay — currently off in production

`posthog-react-native-session-replay` ships in the binary, but replay is enabled only when
`EXPO_PUBLIC_POSTHOG_ENABLE_SESSION_REPLAY === "true"` (`lib/analytics.ts:8`). That variable is
**not set in the production EAS environment**, so replay is disabled in App Store builds.

The declarations above already cover replay if you later turn it on. When it is on, the config at
`app/_layout.tsx:274` masks `maskAllTextInputs`, `maskAllImages`, and `maskAllSandboxedViews`,
so text entry and images are not captured. Keep those masks — if you enable replay in production
with masking off, the privacy declarations here become inaccurate.

### Privacy policy URL

`https://<your-domain>/privacy` — served from `web/app/privacy`. Confirm the live page names
PostHog and Supabase as processors and describes account deletion before you submit.

---

## Part 2 — App Review notes

Paste into **App Review Information → Notes**.

```
SIGN-IN FOR REVIEW
------------------
The normal sign-in options are Sign in with Apple, Google OAuth, and a one-time
code sent by email, none of which is convenient for review. We have added a
dedicated password sign-in for App Review.

  1. Launch the app.
  2. On the sign-in screen, tap "App reviewer sign-in" (below the sign-in buttons).
  3. Email:    <REVIEW ACCOUNT EMAIL>
     Password: <REVIEW ACCOUNT PASSWORD>

This is a permanent account and requires no email or SMS round-trip. It is
pre-populated with sample decks so all features are reachable immediately.

ABOUT THE APP
-------------
AudioFlash is an audio-first language learning app. Users generate AI flashcard
lessons for a chosen language and topic, practise them with spaced repetition,
and track progress over time. Audio is produced on-device with the system
text-to-speech voices (expo-speech); no microphone access is used or requested.

WHAT TO TRY
-----------
  - Create a deck: Home > New deck > pick a language and topic. Generation takes
    a few seconds and calls our backend.
  - Study: open any deck and swipe through the cards; tap a card to hear it.
  - Progress: the Activity tab shows study history and streaks.
  - Account deletion: Settings > Delete account (guideline 5.1.1(v)). Please use
    a throwaway account if you exercise this, as it is irreversible.

ACCOUNT CREATION AND DELETION
-----------------------------
An account is required because decks and study progress sync across devices.
Users can delete their account and all associated data in-app from Settings,
with no support contact required.

THIRD-PARTY LOGIN (guideline 4.8)
---------------------------------
Sign in with Apple is offered on iOS as an equivalent login option, shown first
on the sign-in screen, above Google Sign-In and at the same prominence. It
requests only name and email, supports Hide My Email, and is not used for
advertising or tracking. A one-time code sent to the user's email address is
also available.

TRACKING
--------
The app does not track users as defined by App Tracking Transparency. There is
no advertising SDK, no IDFA access, and no data sharing with data brokers.
Analytics are first-party (self-hosted PostHog) and used only to improve the app.

CONTACT
-------
<your support email>
```

### Before you paste

- [ ] Enable the **Apple** provider in Supabase Auth and list the bundle id
      `ai.audioflash.mobile` as an authorized client id — native Sign in with Apple sends an
      identity token whose `aud` is the bundle id, so sign-in fails without it
      (`signInWithApple`, `lib/auth-context.tsx`).
- [ ] In the Apple Developer portal, enable the **Sign In with Apple** capability on the
      `ai.audioflash.mobile` App ID. `usesAppleSignIn: true` in `app.json` adds the entitlement
      to the build, but the App ID must allow it or the build is rejected at upload.
- [ ] If you ever email users directly, register Apple's private email relay domain in
      Certificates, Identifiers & Profiles → Sign In with Apple for Email Communication.
      Hide My Email addresses (`@privaterelay.appleid.com`) must keep working throughout.
- [ ] Verify Sign in with Apple end to end on a **real device** — the native button and
      `isAvailableAsync()` do not work in Expo Go, and the simulator needs an Apple ID
      signed in under Settings.
- [ ] Create the review account in Supabase with a **password** (`signInWithPassword`,
      `lib/auth-context.tsx:457`). An OTP-only account will not work.
- [ ] Confirm `EXPO_PUBLIC_AUTH_MODE` is not `dev` in production — password sign-in is
      disabled in dev auth mode (`lib/auth-context.tsx:458`).
- [ ] Seed the review account with a few decks so the reviewer isn't looking at empty state.
- [ ] Sign in as the reviewer on a **production-profile** build and confirm the flow end to end.
- [ ] Fill in the email, password, and support email placeholders above.

### Other ASC fields

- Screenshots: 6.9" iPhone required. `supportsTablet: false`, so no iPad set needed.
- Export compliance: `ITSAppUsesNonExemptEncryption: false` is set in `app.json`, so the
  per-build questionnaire is skipped automatically.
- Age rating, category, pricing, territories, support URL, marketing URL.
