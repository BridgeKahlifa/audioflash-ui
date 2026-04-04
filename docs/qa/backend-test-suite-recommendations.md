# Backend QA Suite Recommendations

Last updated: 2026-04-03

## Test Layers

### 1. Smoke
- `startup_applies_local_migrations`
- `protected_route_requires_auth`
- `profile_get_creates_profile_if_missing`
- `lesson_start_returns_active_session`
- `flash_attempt_updates_progress`
- `lesson_end_completes_and_maybe_creates_review`
- `sessions_stats_reflect_created_session`
- `generate_returns_valid_response`

### 2. High-Value Regression
- `jwt_validation_and_key_rotation_retry`
- `dev_auth_missing_or_invalid_local_user_id`
- `profile_patch_unknown_language_ids_422`
- `lesson_start_same_category_reuses_active_session`
- `lesson_start_different_category_abandons_previous_session`
- `lesson_end_ownership_and_missing_session_errors`
- `flash_attempt_rejects_card_not_in_activity`
- `flash_attempt_update_reconciles_cards_correct`
- `review_create_is_idempotent_by_parent_session`
- `review_complete_updates_activity_status`
- `library_save_idempotent_and_unsave_missing_is_204`
- `srs_queue_reflects_sm2_updates`
- `generate_rate_limit_and_ai_unconfigured_errors`
- `generate_replace_reuses_pool_then_falls_back_to_llm`
- `profile_delete_cascades_without_failing_on_supabase_cleanup_error`

### 3. Integration / DB-Focused Tests
- Active lesson unique index behavior under race
- Review unique constraints
- Cascade delete integrity across profile -> sessions/reviews/saved lessons/user_card_state/activities
- Startup migration replay on pre-existing schema
- Legacy lesson session with empty `card_ids` gets initialized on read
- SRS scheduling progression across multiple answers/confidence values

### 4. Exploratory / Fault-Injection Charters
- Kill DB or LLM dependency mid-request
- Supabase JWKS or admin endpoint unavailable
- LLM returns malformed JSON or fenced JSON
- Moderation flags topic or output
- Large saved-library and flashcard volumes
- Multi-device concurrency for same user

## Recommended Automation Split

### API Contract Tests
- Schema validation
- status codes
- auth/ownership
- idempotency semantics

### Service Integration Tests
- generation cached/fresh branches
- lesson/review activity lifecycle
- SRS update side effects
- streak updates

### Database Migration Tests
- apply from empty DB
- apply on already-migrated DB
- apply on partially migrated DB with duplicate objects

### Manual / Exploratory
- performance under scale
- security posture review of public creation endpoints
- environment misconfiguration paths

## Highest-Risk Areas
- Active lesson uniqueness and race handling
- Review creation split across `end_lesson` and explicit `create_review`
- SRS correctness because it is best-effort and silent on failure
- Generation correctness because it depends on sanitization, moderation, caching, and external LLM behavior
- Delete-account cleanup because auth-user deletion is best-effort and silent

## Immediate Gaps Worth Filing
- Add stricter schema validation for profile numeric ranges and aggregate session counters.
- Consider admin auth or internal-only protection for create-language/category/flashcard endpoints.
- Add explicit observability/error surfacing for swallowed failures.
- Revisit global unique constraint on `reviews.review_name`.
- Add pagination and/or query limits for broader list endpoints.

