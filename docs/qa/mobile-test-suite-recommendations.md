# Mobile QA Suite Recommendations

Last updated: 2026-04-03

## Test Layers

### 1. Smoke
- `launch_signed_out_routes_to_auth`
- `launch_onboarded_routes_to_home`
- `otp_sign_in_to_onboarding`
- `onboarding_complete_to_tabs`
- `browse_start_lesson_reaches_practice`
- `practice_complete_reaches_summary`
- `settings_save_and_sign_out`

### 2. High-Value Regression
- `otp_resend_and_invalid_code_error`
- `passkey_sign_in_failure_state`
- `home_shows_due_review_and_resume_lesson`
- `categories_requires_language_when_missing`
- `lesson_ready_handles_missing_difficulty_or_empty_cards`
- `generate_rate_limit_and_generic_failure`
- `generate_preview_remove_select_regenerate`
- `practice_attempt_failure_blocks_progression`
- `resume_lesson_restores_server_index`
- `review_start_srs_and_named_review`
- `summary_retry_missed_cards_review_branch`
- `settings_unsaved_changes_tab_switch_guard`
- `settings_language_change_rolls_back_on_failure`
- `delete_account_failure_and_success`

### 3. Integration / Component Tests
- Root route guard behavior with mocked auth/profile states
- `AuthModeBadge` clear-cache and onboard actions
- `LanguagePickerModal` open/close/select behavior
- Generate preview card selection/removal state transitions
- Practice reveal-delay timer and answered-card restoration
- Session summary chart states: loading, empty, error, points
- Settings dirty-state detection and save batching

### 4. Manual / Exploratory Charters
- Offline with warm cache
- Offline with cold cache
- Background app during:
  - OTP verify
  - lesson generation
  - practice mid-card
  - final card submission
- Accessibility:
  - VoiceOver/TalkBack
  - dynamic type
  - contrast and touch targets
- Device matrix:
  - small iPhone
  - large iPhone
  - small Android
  - modern Android with gesture nav

## Recommended Automation Split

### E2E
- Route protection and session restoration
- Auth and onboarding
- Primary learning flows
- Settings guard and sign-out

### Integration
- Query invalidation after completion
- Local persistence helpers
- Error-state rendering
- Modal and chart interactions

### Manual
- Audio/TTS quality
- Notification-toggle expectation mismatch
- Mail linking
- Visual layout polish across devices

## Risk Register

### Highest Risk
- Practice completion orchestration touches local storage, remote attempts, remote lesson lifecycle, review creation, analytics, and query invalidation.
- Session summary depends on local `lastSession`, so direct route entry and cache/storage corruption can break summary independently of backend truth.
- Settings has dual leave guards and multiple save paths, making navigation regressions likely.
- Several flows still have silent failure handling, which can hide broken backend behavior.

### Immediate Gaps Worth Filing
- Add explicit retry CTA where network failures are currently passive banners.
- Differentiate practice `loading` from `failed to load cards`.
- Implement real reminder permission + scheduling or relabel the setting.
- Surface OTP resend failures.
- Add defensive handling for missing route params on verify/practice/lesson-ready.

