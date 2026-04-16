# Mobile App Test Coverage Map

Last updated: 2026-04-03
Scope: `mobile/` Expo React Native app

## Assumptions

- This map is derived from the current mobile codebase, not backend specs.
- The app supports two auth modes: normal Supabase auth and `EXPO_PUBLIC_AUTH_MODE=dev`.
- "Reminders" currently persist a profile flag only. There is no visible local notification permission request or scheduling implementation in the mobile app.
- Deep link support is not explicitly implemented in the screens reviewed; routing is app-internal via Expo Router.
- The app relies on remote APIs for profile, lessons, reviews, analytics-backed score history, SRS queue.
- The app also uses local persistence via AsyncStorage for current cards, session history, progress, review queue, query cache, settings, and cached profile/session stats.

## A. App Flow Inventory

### 1. App Bootstrap And Session Routing
- App launch and splash gating
- Config fetch and dev-environment badge visibility
- Persisted query cache restore
- Auth state restoration
- Profile fetch
- Preloaded app data fetch
- Initial route decision
  - Signed-out user to auth
  - Signed-in user needing onboarding to onboarding
  - Signed-in onboarded user to tabs

### 2. Authentication
- Email OTP sign-in request
- OTP verification
- OTP resend
- Passkey sign-in
- Sign-out
- Session expiry / unauthorized recovery
- Dev auth bypass flow

### 3. Onboarding
- Welcome screen
- Name capture
- Target language selection
- Onboarding completion and transition to tabs
- Re-onboarding trigger via dev badge `Onboard`

### 4. Home And Primary Navigation
- Home dashboard load
- Resume in-progress lesson
- Start SRS review from home
- Start generated lesson from home
- Browse categories from home

### 5. Browse And Lesson Start
- Category browse with preferred language
- Category browse without preferred language
- Switch learning language from browse
- Topic selection
- Lesson-ready screen
- Difficulty selection
- Start category lesson

### 6. AI Lesson Generation
- Generate lesson form load
- Language selection
- Topic input and suggestion tap
- Difficulty selection
- Card-count selection
- Generate lesson request
- Generation failure recovery
- Review generated cards
- Remove generated cards
- Select generated cards
- Regenerate selected cards
- Start generated lesson
- Regenerate all / return to form

### 7. Practice Session
- Load cards from local storage
- Resume in-progress remote lesson
- Auto-play prompt audio
- Playback speed adjustment
- Manual replay audio
- Reveal answer delay and reveal button
- Confidence selection
- Submit knew / didn’t know result
- Swipe navigation between cards
- Previous/next manual navigation
- Resume previously answered cards
- Attempt save failure recovery
- Lesson completion

### 8. Review Feature Area
- Review tab load
- SRS queue preview
- Start SRS review session
- Saved reviews list
- Start named saved review
- Empty saved review state
- Review completion lifecycle

### 9. Session Summary And Retry
- Last-session summary load
- Empty/no recent session state
- Missed card list
- Score history chart load
- Grade history empty/error states
- Retry missed cards locally
- Start missed-cards saved review lifecycle
- Navigate to progress

### 10. Progress And History
- Progress dashboard load
- Weekly chart
- Streak and aggregate stats
- Recent sessions list
- Start new lesson from progress
- Local-only history screen

### 11. Settings And Account Management
- Settings load
- Edit name
- Edit email
- Save email confirmation prompt state
- Change target language
- Adjust cards per session
- Adjust audio speed
- Toggle reminders flag
- Save settings
- Unsaved changes guard on navigation away
- Unsaved changes guard on tab switch
- Contact support
- Account deletion
- Sign out
- Dev auth restricted account actions

### 12. Secondary / Hidden Support Flows
- Query invalidation after session completion
- Cache clear via dev badge
- Cold-start reset with splash delay
- Background refetch on app foreground
- Config refresh on foreground in non-prod env
- Local progress/review queue persistence after session completion

### 13. Failure / Recovery / Edge Flows
- Missing route params
- Missing profile id during lesson start or completion
- Empty lesson payload
- Missing activity id on review start
- Partial data fetch failure on home/progress/settings/review
- Network failure during session answer submission
- Offline app with warm cache
- Offline app with cold cache
- Abandoned in-progress remote lesson
- Back navigation out of lesson/practice
- Stale cached query data after crash or cache clear
- Mismatch between local current cards and remote lesson session state

## B. Flow Breakdown

### Flow: App Launch And Initial Routing
- Trigger / entry point: cold start, warm start, foreground resume
- Preconditions: app installed; config, auth, query cache, and network vary
- Step-by-step path:
  1. Root layout mounts providers.
  2. Config fetch starts.
  3. Query cache restore runs.
  4. Auth session is restored or dev auth session is synthesized.
  5. Profile query starts when authenticated.
  6. AppDataProvider preloads SRS queue, in-progress lesson, categories, languages, sessions, stats, and saved reviews.
  7. Splash remains until loading/profile/app-data gating resolves.
  8. Router redirects to auth, onboarding, or tabs.
- Alternate branches:
  - Signed out goes to `/(auth)/sign-in`
  - Signed in with `onboarding_completed=false` goes to `/(onboarding)`
  - Signed in and onboarded goes to `/(tabs)`
  - Dev environment badge is shown when config env is non-prod
- Failure branches:
  - Config fetch fails: app continues using last in-memory value
  - One or more app-data queries fail: app still becomes ready after fetch settlement
  - Profile fetch fails: splash behavior depends on query state; user may see downstream error states
- Exit conditions:
  - Stable authenticated or unauthenticated root route reached

### Flow: Email OTP Sign-In
- Trigger / entry point: `/(auth)/sign-in`
- Preconditions: user is signed out; Supabase auth mode active
- Step-by-step path:
  1. User enters email.
  2. User taps `Continue with Email`.
  3. OTP request is sent.
  4. Success routes to verify screen with email param.
- Alternate branches:
  - User submits via keyboard return
  - User uses passkey instead if supported
- Failure branches:
  - Empty email
  - Backend auth request failure
  - Loading state lock prevents double-submit
- Exit conditions:
  - Verify screen shown or error shown on sign-in screen

### Flow: OTP Verification
- Trigger / entry point: auth verify screen with `email` route param
- Preconditions: OTP has been requested
- Step-by-step path:
  1. User enters 6-digit code.
  2. User taps `Verify Code`.
  3. OTP verification request is sent.
  4. On success auth state changes.
  5. Root router redirects to onboarding or tabs.
- Alternate branches:
  - User taps back to return to sign-in
  - User taps resend code
- Failure branches:
  - Missing or malformed email param
  - Code shorter than 6 digits
  - Invalid or expired code
  - Resend failure is not surfaced explicitly in UI
- Exit conditions:
  - Authenticated route reached or verify error shown

### Flow: Passkey Sign-In
- Trigger / entry point: passkey CTA on sign-in screen
- Preconditions: `Passkey.isSupported()` true, Supabase auth mode active
- Step-by-step path:
  1. User taps passkey button.
  2. Client creates anonymous auth session.
  3. Client lists MFA factors.
  4. Client creates MFA challenge for WebAuthn factor.
  5. Native passkey prompt appears.
  6. Response is verified.
  7. Root router redirects.
- Alternate branches:
  - User cancels native passkey prompt
- Failure branches:
  - No registered passkey
  - Challenge/verify failure
  - User-cancelled flow returns no visible success
- Exit conditions:
  - Authenticated route reached or sign-in error shown

### Flow: First-Time Onboarding
- Trigger / entry point: authenticated user with `onboarding_completed=false`
- Preconditions: profile exists, signed in
- Step-by-step path:
  1. Welcome screen shown.
  2. User taps `Get Started`.
  3. Name screen shown; user submits non-empty name.
  4. Target language screen loads languages.
  5. User selects one or more languages.
  6. Profile updates with `target_language_ids` and `onboarding_completed=true`.
  7. User is routed to tabs.
- Alternate branches:
  - Existing values prefilled indirectly through profile state if re-onboarding
  - Dev badge `Onboard` can reset onboarding flag and re-enter flow
- Failure branches:
  - Empty name
  - Language fetch failure
  - Save profile failure
  - User leaves flow mid-way and resumes later
- Exit conditions:
  - Home tabs reached with onboarding complete

### Flow: Browse And Start Category Lesson
- Trigger / entry point: home `Browse Categories` CTA or browse tab
- Preconditions: authenticated user
- Step-by-step path:
  1. Categories screen loads profile, languages, and categories.
  2. If no preferred target language, language picker is shown first.
  3. User selects language; profile updates.
  4. User selects topic tile.
  5. User taps `Start Lesson`.
  6. Lesson-ready screen receives params.
  7. User selects difficulty.
  8. App fetches lesson cards for category and creates lesson session.
  9. Current cards are persisted locally.
  10. Practice screen opens.
- Alternate branches:
  - User changes learning language from browse header
- Failure branches:
  - No categories available
  - Languages or categories fetch failure
  - Missing `apiCategoryId`
  - Category has no supported difficulties
  - Lesson fetch returns empty set
  - Lesson session creation fails
- Exit conditions:
  - Practice screen opens or lesson-ready error/empty state shown

### Flow: Generate AI Lesson
- Trigger / entry point: home `Generate a Lesson`
- Preconditions: authenticated session token
- Step-by-step path:
  1. Generate form loads languages.
  2. User selects language, topic, difficulty, and card count.
  3. User taps generate.
  4. Backend creates category/cards or returns cached result.
  5. Review Cards preview is shown.
  6. User optionally removes cards.
  7. User optionally selects cards and regenerates those cards.
  8. User starts lesson.
  9. App creates lesson session, persists current cards, and opens practice.
- Alternate branches:
  - Suggested topic chip tap
  - Regenerate all returns to form
  - All cards removed state
- Failure branches:
  - Language fetch failure
  - Topic validation failure
  - Rate limit failure
  - Inappropriate topic failure
  - Generic network failure
  - Replacement generation failure
  - Start lesson failure after successful generation
- Exit conditions:
  - Practice starts, preview remains editable, or user returns to form

### Flow: Practice Session
- Trigger / entry point: lesson-ready start, generated lesson start, SRS start, saved review start, resume lesson, retry missed cards
- Preconditions: current cards exist locally or remote resume can reconstruct them
- Step-by-step path:
  1. Practice route loads cards from local storage, or from remote lesson session if resuming.
  2. Session start analytics fire.
  3. Current card prompt audio auto-plays.
  4. Reveal timer enables answer after 1.5 seconds unless card already answered.
  5. User optionally adjusts playback speed and replays audio.
  6. User reveals answer.
  7. User optionally sets confidence.
  8. User submits knew / didn’t know.
  9. Attempt is created or updated remotely when activity/card ids exist.
  10. User advances or navigates backward.
  11. On last card, lesson or review lifecycle is completed.
  12. Missed-card review may be created.
  13. Local session history, progress, and review queue update.
  14. Remote aggregate session record is created fire-and-forget.
  15. Queries are invalidated and session summary opens.
- Alternate branches:
  - Resume lesson uses server `current_index`
  - Existing answered card restores confidence and reveal state
  - Swipe navigation and previous button navigation
  - Review sessions complete review lifecycle rather than end lesson
- Failure branches:
  - No cards available shows indefinite loading-style empty state text
  - Attempt save fails and blocks progression
  - Missing learner profile blocks completion
  - Missing lesson session id blocks lesson completion
  - Review completion API fails
  - End lesson or create review fails
- Exit conditions:
  - Session summary opened or blocking error shown on practice screen

### Flow: Review Tab
- Trigger / entry point: review tab or home SRS CTA
- Preconditions: authenticated user
- Step-by-step path:
  1. SRS queue and saved reviews load.
  2. User sees due count and preview cards.
  3. User starts SRS review or a named review.
  4. Current cards are persisted locally.
  5. Practice screen opens with review metadata.
- Alternate branches:
  - Queue empty
  - Saved reviews empty
  - Focus refetch when tab revisited
- Failure branches:
  - Review start missing `activity_id`
  - `fetchFlashcards()` does not include all ids needed for named review
  - Network failures starting SRS or named review
- Exit conditions:
  - Practice screen opens or error banner shown

### Flow: Session Summary And Retry
- Trigger / entry point: automatic after practice completion or direct route access
- Preconditions: local last session exists for normal flow
- Step-by-step path:
  1. Last session loads from local storage.
  2. Summary card shows counts and accuracy.
  3. Missed cards list is shown.
  4. Grade history chart is fetched if category and difficulty exist.
  5. User taps retry/review missed cards.
  6. Local current cards are rebuilt from missed cards.
  7. If `reviewId` exists, review lifecycle is restarted remotely.
  8. Practice opens with retry/review context.
- Alternate branches:
  - Perfect session disables retry
  - No grade history available
- Failure branches:
  - No recent session found
  - Grade chart fetch fails
  - Missing auth token for review restart
  - Review restart missing activity id
- Exit conditions:
  - Practice restarts or user navigates to progress/home

### Flow: Settings And Account
- Trigger / entry point: settings tab
- Preconditions: authenticated user
- Step-by-step path:
  1. Settings screen loads profile and languages.
  2. User edits name or email inline.
  3. User opens language picker and changes target language.
  4. User adjusts cards per session and audio speed.
  5. User toggles reminders flag.
  6. User saves settings.
  7. User may navigate away; unsaved changes guard intercepts leave.
  8. User may sign out, contact support, or delete account.
- Alternate branches:
  - Dev auth disables email change, sign out, and delete account
  - Tab press interception also shows unsaved-changes modal
- Failure branches:
  - Save name/email/settings failure
  - Language change failure with rollback
  - Contact support fallback alert if mail client unavailable
  - Delete account unauthorized/network failure
- Exit conditions:
  - Settings saved, user signs out, or account deleted

## C. QA Coverage Matrix

Legend:
- Priority: `P0` critical path, `P1` important, `P2` secondary
- Automation candidate: `Yes` means deterministic enough for E2E or integration automation

| Screen / Component | Action | Expected Result | What to test | Edge cases | Negative cases | Platform-specific concerns | Priority | Automation candidate? |
|---|---|---|---|---|---|---|---|---|
| Root layout / splash | Launch app | Correct route chosen after loading gates | Splash timing, redirect logic, cached-session restore, profile-loading gate, app-data gate, no route flicker | Warm cache, cold cache, dev auth, expired session, onboarding incomplete | Profile fetch failure, partial app-data failures, cache clear mid-session | iOS app resume timing vs Android task restore | P0 | Yes |
| ConfigProvider + AuthModeBadge | Foreground app in non-prod env | Badge reflects current env | Config refresh on `AppState=active`, badge hidden in prod, badge visible in local/dev | Env changes while app alive | Config fetch failure retains stale env | AppState event differences iOS/Android | P2 | Partial |
| Sign-in screen | Submit empty email | Inline validation shown | Email required validation, error clearing on edit, button state, keyboard submit | Whitespace-only input | Invalid email format is not validated client-side | Keyboard avoidance and autofill behavior | P0 | Yes |
| Sign-in screen | Submit email OTP request | Verify screen shown with email param | Loading spinner, duplicate tap prevention, analytics `auth_otp_requested`, route params | Leading/trailing whitespace trimmed | Backend error shows message and `auth_otp_request_failed` | Keyboard type and submit key behavior | P0 | Yes |
| Sign-in screen | Use passkey | Native auth flow starts | Button visibility when supported, loading state, cancellation handling, analytics start/fail | User cancels passkey prompt | No passkey registered, verify failure | Passkey support varies by OS/device | P1 | Partial |
| Verify screen | Enter partial code | Verify disabled / validation error | 6-digit enforcement, numeric keyboard, autofocus, error reset on edit | Paste code, leading zeros | Missing email param, malformed param | iOS one-time-code autofill if available | P0 | Yes |
| Verify screen | Verify OTP success | Root redirects to onboarding or tabs | Success path, auth state change timing, analytics `auth_otp_verified` | Slow network with spinner visible | Invalid/expired code clears input and shows error | Back button behavior on both OSes | P0 | Yes |
| Verify screen | Resend OTP | Code resent feedback shown | `resent` message timer, code reset, analytics `auth_otp_resent` | Multiple resend taps | Resend API failure has no visible UI; confirm hidden failure impact | SMS/email autofill behavior differs | P1 | Yes |
| Onboarding welcome | Tap Get Started | Name screen shown | Navigation, analytics `onboarding_started` | Re-onboarding from populated profile | Double tap | Safe-area spacing on small screens | P1 | Yes |
| Onboarding name | Continue with valid name | Profile updates then language step | Required validation, trim behavior, spinner, error handling, state persistence after backgrounding | Very long name, multi-word name, non-Latin chars | Empty name, API error | Keyboard overlap and return-key submit | P0 | Yes |
| Onboarding target-languages | Load languages | List renders or error state shows | Loading spinner, empty/error states, selection styling, multi-select, continue gating | Profile already has target language(s), coming-soon language present | Fetch failure, save failure | Scroll performance on small devices | P0 | Yes |
| Onboarding target-languages | Complete onboarding | `onboarding_completed=true`, tabs shown | Profile mutation, analytics `onboarding_target_languages_set` and `onboarding_completed`, replace vs push behavior | Multiple selected languages | Save error leaves user on screen | Back stack should not re-enter finished flow unexpectedly | P0 | Yes |
| Home screen | Load dashboard | Greeting, streak, and cards render | First-name parsing, streak messaging, partial error banner, SRS card visibility, in-progress lesson CTA visibility | No name, no streak, stale data | SRS query fail, in-progress lesson fail | Safe area and scroll on smaller phones | P1 | Yes |
| Home screen | Tap Continue Lesson | Resume practice route opened | Route params, lesson name resolution, `continuingLesson` lock, analytics `home_action_tapped` | In-progress lesson missing category name, server current index near end | Lesson becomes unavailable between load and tap | Android back behavior into tabs | P0 | Yes |
| Home screen | Tap SRS review CTA | Review tab opens | CTA hidden when due count 0, analytics payload | Very large due count | Route push failure | Text truncation and touch target size | P1 | Yes |
| Home screen | Tap Generate / Browse | Correct destination opens | Analytics for each action, repeated taps, navigation consistency | Home data partially failed | Navigation with stale route params | Tab + stack transitions on both OSes | P1 | Yes |
| Categories screen | Load with no preferred language | Language picker shown | Correct gating from profile state, loading, error banner | Preferred language removed from backend list | Profile null with loading spinner | Scroll/picker behavior differs by OS | P0 | Yes |
| Categories language picker | Select language | Profile updates and category browse shown | Save spinner, rollback on failure, coming-soon disablement | Rapid selection changes | Save failure resets resolved language and shows error | Pressable disabled visuals | P1 | Yes |
| Categories browse | Select topic then Start Lesson | Lesson-ready opened with correct params | Topic selection state, disabled CTA until selected, category icon mapping | No categories, odd number of tiles, supported difficulty empty | Categories query fail | Grid wrapping on narrow screens | P0 | Yes |
| Lesson-ready | Missing params | Error state shown | Required param validation for category and difficulties | Deep-linked or malformed route | No `apiCategoryId`, no supported difficulties | Back navigation route path correctness | P0 | Yes |
| Lesson-ready | Change difficulty | Difficulty chip selection updates state | Selected visuals, reset of prior empty/error state, disabled while starting | Unsupported difficulty list order, duplicate difficulty values | Tap while starting or while status error | Hit targets and text scale | P1 | Yes |
| Lesson-ready | Start lesson success | Cards fetched, session created, practice opens | Start lock, loading title, settings/profile card count precedence, local current cards persistence | Empty lesson result, category returns fewer cards than expected | Fetch/create failure, missing profile id | Back stack after push | P0 | Yes |
| Generate form | Load screen | Languages and controls render | Default selections, target-language preselection, `loadError`, suggestions list, keyboard handling | No languages returned | Language fetch failure | Keyboard avoidance differs by OS | P1 | Yes |
| Generate form | Submit valid prompt | Preview screen shown | Topic min length, status transitions, analytics start/success/fail, card count and difficulty payloads | Topic with punctuation/emoji, long topics, fast repeated taps | Rate limit, inappropriate topic, generic failure | Return-key submission and loading jank | P0 | Yes |
| Generate preview | Select/deselect card | Card selection toggles | Selection visuals, count text, disabled while replacing | Many selected cards, replacing subset | Tap replacing card | Scroll perf with many cards | P1 | Yes |
| Generate preview | Remove card | Card disappears | State update, selected-id cleanup, empty-state transition | Remove last card | Remove during replacement | Press target conflicts with parent card press | P1 | Yes |
| Generate preview | Regenerate selected | Chosen cards replaced only | Request payload excludes remaining ids, replacing spinner state, selected reset | Duplicate replacement ids, cards reorder stability | Replacement request fails | Animation / opacity differences | P1 | Partial |
| Generate preview | Start generated lesson | Practice opens | Local card persistence, session creation, params correctness, status `starting` | Preview card count reduced by removals | Session creation failure | Replace vs push affects back behavior | P0 | Yes |
| Practice screen | Initial load | Cards appear or loading placeholder stays | Local-vs-remote card loading, resume logic, analytics `session_started`, current index resolution | Resume current index out of bounds, remote card ordering mismatch | No stored cards, remote fetch failure leaves indefinite loading | Audio autoplay restrictions may vary | P0 | Yes |
| Practice screen | Auto-play prompt audio | Prompt audio plays once per fresh card | `speakText` invocation, replay button, play count reset per card | Backgrounded during playback, playback speed adjusted before replay | TTS failure has no visible error | iOS vs Android TTS voice/latency | P1 | Partial |
| Practice screen | Wait 1.5 seconds then reveal | Reveal button appears | Delay timing, timer cleanup on navigation, answered-card restore | Navigate away/back before timer completes | Timer leaks or duplicate timers | App background may pause timers differently | P1 | Yes |
| Practice screen | Reveal answer | Source, romanization, translation visible | Hidden/visible states, accessibility labels, text wrapping | Very long text, empty romanization | Reveal while submitting | Font scaling and overflow | P0 | Yes |
| Practice screen | Select confidence 1-5 | Choice highlighted | Selection persistence when moving backward/forward, disabled during submit | No confidence selected | Tap spam while submitting | Touch target size on smaller devices | P1 | Yes |
| Practice screen | Submit knew / didn’t know | Attempt saved and next card or completion occurs | Submit lock, loading labels, analytics `card_result_submitted`, response-time and play-count capture | Update existing attempt on revisited card, resume session next index from server | Attempt API failure blocks progress and shows error | Double-tap behavior and animation smoothness | P0 | Yes |
| Practice screen | Navigate between cards | Card state restores | Swipe thresholds, previous button disablement, result state restoration, reveal state restoration | Swiping during submit, edge cards | Current card undefined due to race | Gesture sensitivity can differ by platform | P1 | Yes |
| Practice completion | Finish normal lesson | End lesson, create review if missed cards, local persistence, summary route | Query invalidation, fire-and-forget remote session create, analytics `session_completed` | All correct, all incorrect, zero missed vs many missed | Missing profile id, missing lesson session id, end lesson/create review failure | Completion timing around app backgrounding | P0 | Partial |
| Practice completion | Finish named review | Review lifecycle completes, summary route | Review completion API, summary copy, review metadata | Review with all correct or all wrong | Missing review id/activity id | Back stack differences after replace | P0 | Partial |
| Review tab | Load queue and reviews | Due count and saved reviews render | Focus refetch, empty states, error banner, preview card truncation | Large queues, stale cache | Partial data load | Long review names on narrow screens | P1 | Yes |
| Review tab | Start SRS review | Practice route opened | Profile id lookup, startLesson payload, local card persistence | Queue size 1 or very large | No auth token, startLesson failure | Button disablement visual consistency | P0 | Yes |
| Review tab | Start named review | Practice route opened with review metadata | Start lifecycle, activity id requirement, flashcard lookup completeness | Missing flashcard records in global fetch | No activity id, fetchFlashcards failure | Long list scroll and touch precision | P1 | Partial |
| Session summary | Load latest session | Stats and missed cards shown | Local last-session dependency, accuracy calculation, missing session fallback | Session with no missed cards | No local session present | Chart press targets on iOS/Android | P1 | Yes |
| Session summary | Load score history chart | Chart, loading, empty, or error state shown | Category/difficulty prerequisites, chart tooltip interactions, date/time formatting | Single point, multi-day data | Analytics endpoint failure | SVG rendering differences | P2 | Partial |
| Session summary | Retry missed cards | Practice restarts from missed cards | Local rebuild of current cards, review restart path, button disablement, route params | Perfect run disables CTA | Missing auth token for review retry, missing activity id | Replace navigation and back behavior | P1 | Yes |
| Progress dashboard | Load progress | Stats, streak, chart, and recent sessions render | Focus refetch, stale fallback message, derived weekly totals, empty recent sessions | Large session history, timezone around date boundaries | Sessions/stats query failure | Date formatting can vary by locale | P1 | Yes |
| History screen | Load local history | Local history entries shown | Local-only persistence, order, accuracy calc | Large history near 100-entry cap | Empty history | Locale/time formatting | P2 | Yes |
| Goals screen | Load daily goal | Goal card and toggle render | Profile loading, ratio calculation, local progress dependency, toggle visuals | Daily goal 0 not possible via UI but API may return it | Profile update failure is unsurfaced | Progress uses local data while profile uses remote | P2 | Partial |
| Goals screen | Change goal / reminder | Profile updates silently | Increment/decrement clamp, notifications flag mutation, persistence after relaunch | Rapid taps | Network failure with no UI error | Hit target size | P2 | Partial |
| Settings | Load settings | Fields prefilled | Profile loading, language data dependency, dev-auth restrictions, section rendering | Empty name/email, missing target language | Profile or language load failure | Keyboard + scroll in long form | P0 | Yes |
| Settings name field | Submit name | Inline status icon updates | Save on submit, trim expectations, error message, status reset on edit | Long/Unicode names | API failure | Keyboard return behavior | P1 | Yes |
| Settings email field | Submit email | Success status and confirmation note shown | Editable only outside dev auth, save on submit, status states | Same email resubmitted | Invalid email or update failure | Email keyboard/autofill | P1 | Yes |
| Settings language picker | Change target language | Sheet opens and selection persists | Modal animation, overlay dismissal, single-select behavior, analytics event | Large language list, coming-soon language present | Save failure rolls back selection | Modal back handling on Android | P1 | Yes |
| Settings practice controls | Adjust cards per session / audio speed | Local state updates | Clamps 5-50 cards, 0.5x-1.5x speed, unsaved-changes detection | Repeated fast taps, decimal rounding | Save later fails | Touch target size | P1 | Yes |
| Settings reminders | Toggle reminders | Local state changes | Unsaved-changes detection, save payload | Toggle multiple times before save | Save later fails | No actual notification permission request exists | P1 | Yes |
| Settings save | Tap Save Settings | Settings persist and saved message shows | Combined payload, analytics `settings_practice_saved`, success timeout | Save while other inline edits pending | API failure shows banner | Disabled state absent; repeated taps | P1 | Yes |
| Settings unsaved guard | Navigate away with dirty form | Alert asks Cancel / Discard / Save | `usePreventRemove` and tabPress guard, save-then-navigate path | Simultaneous dirty name, email, and settings | Save branch failure should stay on settings | Android hardware back vs iOS gestures | P0 | Yes |
| Settings account | Sign out | Session clears and app routes to auth | Query cache clear, analytics `auth_signed_out`, post-signout routing | Sign out from deep stack | Network or auth SDK error during sign out | Android back stack should not reopen protected screens | P0 | Yes |
| Settings account | Contact support | Mail app opens or fallback alert shown | URL capability check, alert fallback | No mail client installed | Linking error | Mailto handling varies by OS | P2 | Partial |
| Settings account | Delete account | Confirmation then account removal | Alert copy, destructive action, auth/session cleanup, analytics `account_deleted` | Unauthorized or expired session | Network failure, forbidden | Native alert behavior differs by OS | P0 | Partial |
| Dev badge | Tap Clear Cache | Query cache reset and splash-ready cycle restarts | Cold-start reset, cache persistence removal, no data corruption | Tap during network requests | Stuck reset if queries never settle | Overlay placement around dynamic islands / notches | P2 | Partial |
| Dev badge | Tap Onboard | Profile onboarding flag false then onboarding shown | Mutation success, route replace, user can complete onboarding again | Existing populated profile values | Mutation failure silently no-op | Overlay touch hit boxes | P2 | Partial |

## D. Cross-Flow Test Areas

### Authentication / Session Behavior
- Session restore after app relaunch.
- Expired/invalid token handling during profile and session actions.
- Behavior difference between Supabase auth and dev auth mode.
- Sign-out from nested routes and route-guard enforcement afterward.
- Post-delete-account cleanup and redirection.
- Passkey flows on supported and unsupported devices.

### Navigation Consistency
- `router.push` vs `router.replace` consistency across auth, onboarding, practice, summary, and settings.
- Back navigation from lesson-ready and practice currently targets `"/categories"` while route file lives under tabs; verify path aliases actually resolve.
- Returning from preview/form screens in generate flow.
- Unsaved-changes guard interaction with tab switching, stack back, and gesture back.
- Session summary navigation to progress and home.

### Deep Links
- No explicit deep-link implementation is visible, but malformed route params remain a risk.
- Test direct route entry for:
  - `/practice/[topic]` without local cards
  - `/lesson-ready/[topic]` without params
  - `/session-summary` without `lastSession`
  - `/verify` without `email`

### Push Notifications
- Current app only toggles `notifications_enabled` in profile/settings.
- Missing implementation risk:
  - No permission prompt
  - No OS notification scheduling
  - No recovery flow when notifications are denied
  - No UX explaining reminder status vs real device notification state

### Background / Foreground Transitions
- App foreground should refetch stale queries.
- Config refresh should happen when app returns active in non-prod env.
- Practice timers and autoplay need testing when app backgrounds mid-card.
- In-progress lesson should remain resumable if app is terminated mid-session.
- Verify race conditions if app backgrounds during OTP verify or session completion.

### App Updates / Versioning / Persistence
- Persisted query cache compatibility across builds.
- AsyncStorage migrations for settings, progress, cached profile, and session history.
- Cached current cards surviving app kill and being reused by stale routes.
- Clear-cache behavior on old persisted data.

### Performance
- Cold start with no cache and 1.5s minimum splash.
- Home and review with large queue/review data sets.
- Generate preview with many cards and repeated regeneration.
- Practice rendering under rapid swipes and audio replay.
- SVG chart rendering on lower-end devices.

### Localization / Internationalization
- Date/time formatting is locale dependent in verify, history, progress, and session summary.
- Long translated/source strings can overflow cards and list items.
- Non-Latin learner names and target languages.
- Right-to-left support is not implemented; confirm current breakage if ever enabled.

### Accessibility
- VoiceOver/TalkBack labels for icon-only controls.
- Announcements for loading, save success, and errors.
- Focus order in auth, onboarding, settings modal, and practice.
- Minimum touch target size for circular icon buttons and chips.
- Text scaling with large accessibility fonts.
- Color contrast for muted text, disabled states, and accent banners.

### Permissions
- Passkey availability and native prompt handling.
- Notification permission gap between settings toggle and actual OS permission.
- Mail client linking fallback.
- Audio/TTS behavior does not request permission, but should be tested under silent mode and accessibility audio settings.

### Crash-Prone / Fragile Areas
- Practice screen when cards fail to load and UI stays on generic loading text.
- Resume lesson route when server and local card sets diverge.
- Review start path relying on global `fetchFlashcards()` and matching all review ids.
- Session summary retry path when `reviewId` exists but auth token does not.
- Unsaved-changes guards firing while save requests are in-flight.
- Silent failure paths:
  - resend OTP
  - goal/reminder save
  - dev badge onboard failure

## Coverage Gaps And Risk Hotspots

### Missing Or Incomplete Flows In Product
- No explicit forgot-session / session-expired UX.
- No explicit offline UX; most screens just show generic error or stale data.
- No notification permission/request/scheduling despite reminder toggles.
- No deep-link recovery UX for malformed entry params.
- No visible retry CTA on several network failure states.
- No loading-vs-empty distinction on practice when card load fails.

### Risky Assumptions
- `"/categories"` path alias resolves correctly from screens that are technically under `/(tabs)`.
- `fetchFlashcards()` returns all flashcards needed for every named review.
- Profile always exists after auth.
- Backend always returns consistent `current_index`, `activity_id`, and ordered `card_ids`.
- Local progress in `Goals` is trustworthy even though main progress data comes from remote sessions.
- Silent reminder-goal update failures are acceptable.

### Likely Untested Scenarios
- App killed during practice after some attempt submissions but before completion.
- User revisits already answered card, changes answer, then completes session.
- Switching languages in settings while a cached in-progress lesson exists from another language.
- Deleting account with unsaved settings edits present.
- OTP verify screen opened directly without `email`.
- Generate preview with all cards removed, then regenerate and start again.
- Review completion followed by immediate home/dashboard refresh and stale cache reconciliation.

### Areas Where Regressions Are Likely
- Route guards in root layout.
- Unsaved settings navigation interception.
- Practice completion and query invalidation.
- Resume lesson flow after backend changes.
- Onboarding completion and re-onboarding reset.
- Cold-start cache reset and splash timing.

### Hidden Dependencies
- `practice` depends on `setCurrentCards` from lesson-ready/generate/review/summary retry.
- `session-summary` depends entirely on local `lastSession`, not route params.
- `progress` and `home` freshness depend on `useInvalidateAppData()` being called at practice completion.
- `goals` mixes remote profile values with local progress values.
- `settings` language picker depends on `useLanguages()` query and profile update rollback.
- `AuthModeBadge` depends on `ConfigProvider` and authenticated profile mutation.
- Missed-card review creation is backend-owned and idempotent by `parent_session_id`; the frontend still calls `createReview` after `endLesson`, so regression testing should cover duplicate-review protection and name/flashcard ownership coming from the server rather than the client payload.

## E. Recommended Test Suite Structure

### Smoke Tests
- Launch app and route signed-out user to sign-in.
- Sign in via OTP and complete onboarding.
- Launch app as onboarded user and land on home.
- Start category lesson and complete one session.
- Start generated lesson and reach preview.
- Open review tab and verify empty/non-empty states.
- Open settings, save one practice change, sign out.

### Regression Tests
- All auth branches: OTP request, verify, resend, passkey failure, session expiry.
- Onboarding validation and completion.
- Home dashboard with due reviews and in-progress lesson.
- Category browse, language switching, lesson-ready validations.
- Generate flow: success, rate limit, inappropriate topic, preview edits, start lesson.
- Practice flow: reveal delay, confidence, submit, back navigation, resume, completion, summary.
- Review flow: SRS start, saved review start, completion.
- Settings unsaved-changes guard on tab switch and back navigation.
- Library save/remove/start behavior.
- Progress and summary chart fallback states.

### End-to-End Tests
- New user: sign in -> onboarding -> browse -> practice -> summary -> progress.
- Returning user with in-progress lesson: launch -> continue -> finish -> summary.
- Power user: generate custom lesson -> prune/regenerate cards -> save -> start -> finish.
- Recovery: network failure during answer submit -> retry -> finish.
- Account management: edit settings -> intercept unsaved leave -> save -> sign out.

### Exploratory Tests
- Offline mode with warm cache vs cold cache.
- App background/foreground during OTP, generation, practice, and completion.
- Low-memory/device rotation scenarios where supported.
- Large text accessibility, screen readers, and reduced-motion environments.
- Timezone/date-boundary behavior for streak, progress chart, and review due cards.
- Multi-locale date formatting and long translated strings.

### Automation Priorities
- P0 E2E first:
  - launch routing
  - OTP auth
  - onboarding
  - browse -> lesson-ready -> practice -> summary
  - generate -> preview -> practice
  - settings unsaved-changes guard
  - sign out / account deletion happy path mocks
- P1 integration/UI tests next:
  - review queue rendering and start paths
  - progress derivations
  - session summary retry branches
  - language picker modal
  - dev badge utilities in non-prod
- P2 exploratory/manual focus:
  - TTS/audio nuances
  - SVG chart interaction
  - mailto fallback
  - silent-failure UX quality
