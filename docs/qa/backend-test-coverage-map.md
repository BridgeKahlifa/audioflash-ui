# Backend Test Coverage Map

Last updated: 2026-04-03
Scope: `../api` FastAPI backend

## Assumptions

- This model is derived from the current backend code, migrations, and schemas in `../api`.
- The API runs under `/api` and primarily serves the mobile app, but some routes are also generic admin/data routes.
- Authentication has two modes:
  - normal bearer-token validation against Supabase JWKS
  - dev bypass when `AUTH_ENABLED=false`, using `X-Dev-User-Id` or `LOCAL_USER_ID`
- The backend uses PostgreSQL via SQLAlchemy async sessions and applies local SQL migrations on startup when `DB_ENV=local`.
- Row-level security exists in the database, but the app largely uses service-role style server access and enforces ownership in application code.
- AI generation uses an OpenAI-compatible client if configured; moderation is fail-open unless content is explicitly flagged.

## A. App Flow Inventory

### 1. Service Bootstrap And Infrastructure
- FastAPI app creation
- CORS configuration
- Router registration
- App container initialization
- Database selection and logging
- Startup migration application
- Shutdown resource disposal

### 2. Authentication And Authorization
- Bearer token extraction
- Supabase JWKS fetch and cache
- JWT verification and key rotation retry
- Dev auth bypass using request header/env var
- Current user resolution
- Ownership enforcement on user-scoped routes

### 3. Profile Management
- Lazy profile creation on first GET
- Profile fetch
- Profile update
- Target language validation
- Profile deletion
- Optional Supabase auth-user deletion side effect

### 4. Static Data And Configuration
- Health check
- Config fetch
- Languages list
- Language creation
- Categories list
- Category creation
- Flashcard list
- Flashcards by category
- Flashcard creation
- Flashcard bulk creation

### 5. Lesson Session Lifecycle
- Create explicit lesson session
- Start lesson session from category
- Auto-abandon prior in-progress lesson
- Resume in-progress lesson
- Get lesson session by id
- Get lesson session flashcards
- End lesson
- Auto-create missed-card review after completion
- Initialize missing session progress for legacy rows

### 6. Flashcard Attempt Lifecycle
- Create lesson/review flashcard attempt via activity endpoint
- Fallback activity resolution from lesson session id
- Ownership validation for attempts
- Card membership validation
- Activity progress updates
- Attempt mutation / answer correction
- SRS state update on answer save

### 7. Practice Session Analytics / Progress
- Create aggregate practice session record
- Update streak on create session
- List practice sessions
- Aggregate stats

### 8. Review Lifecycle
- Create review from parent session
- Get active reviews
- Start review
- Complete review
- Idempotent review creation per parent session
- Review-name generation

### 9. Review Queue And SRS
- Get SRS queue
- Get SRS queue count

### 10. AI Generation
- Generate lesson
- Rate limiting by generation request history
- Topic sanitization / prompt-injection rejection
- Topic moderation
- Language validation
- Cached-category lookup by topic/language/difficulty
- Unseen-card reuse from existing category pool
- New category + flashcard creation
- Generation request audit logging
- Replace selected cards
- Replacement reuse from unseen pool
- Replacement fresh generation

### 11. Database State And Side Effects
- Activity creation for lessons and reviews
- Unique active lesson per profile
- Unique review per parent session
- Unique review name constraint
- Cascade deletes from profile/category/session/activity
- SRS SM-2 updates
- Legacy migration compatibility

### 12. Failure / Recovery / Edge Flows
- Invalid/missing auth
- Invalid dev user id config
- Missing profile/category/language/flashcard/session/review
- Category with no flashcards
- Attempt against completed lesson
- Attempt against card not in lesson/review
- Integrity races when creating active lesson
- Generation service not configured
- LLM invalid schema
- Moderation failures
- Silent external cleanup failure on profile delete

## B. Flow Breakdown

### Flow: API Startup
- Trigger / entry point: process boot
- Preconditions: environment configured, DB reachable
- Step-by-step path:
  1. FastAPI app is created.
  2. CORS middleware is configured from env.
  3. Routers are registered under `/api`.
  4. Startup initializes the app container.
  5. Selected DB source is logged.
  6. If `DB_ENV=local`, pending SQL migrations are applied in filename order.
  7. Database table count is logged.
- Alternate branches:
  - `DB_ENV!=local` skips migrations
- Failure branches:
  - DB migration failure aborts startup
  - table-count logging failure is tolerated only inside nested try/catch
- Exit conditions:
  - API ready to serve requests

### Flow: Auth Resolution
- Trigger / entry point: any protected route
- Preconditions: protected route hit
- Step-by-step path:
  1. HTTP bearer dependency extracts token if present.
  2. If auth disabled, request header/env dev user id is parsed.
  3. If auth enabled, JWT header/claims are read.
  4. JWKS is fetched/cached by issuer.
  5. Matching key is resolved by `kid`, with one cache-bust retry.
  6. JWT is verified and `sub` is returned as user UUID.
- Alternate branches:
  - dev mode header override via `X-Dev-User-Id`
- Failure branches:
  - missing token
  - invalid/expired token
  - invalid JWKS key
  - invalid/missing `LOCAL_USER_ID`
- Exit conditions:
  - `CurrentUserId` available or 401/500 returned

### Flow: Profile Fetch And Lazy Creation
- Trigger / entry point: `GET /api/profile`
- Preconditions: authenticated user
- Step-by-step path:
  1. Service looks up profile by auth user id.
  2. If absent, profile row is created automatically.
  3. Response is serialized as `ProfileResponse`.
- Alternate branches:
  - existing profile returned unchanged
- Failure branches:
  - database lookup/create failure
- Exit conditions:
  - profile exists and is returned

### Flow: Profile Update
- Trigger / entry point: `PATCH /api/profile`
- Preconditions: authenticated user, profile row exists
- Step-by-step path:
  1. Request schema accepts optional profile fields.
  2. Service fetches profile.
  3. If `target_language_ids` present, all ids are validated against languages table.
  4. Non-null fields are applied and committed.
  5. Updated profile is returned.
- Alternate branches:
  - partial update of any subset of fields
- Failure branches:
  - profile missing returns 404
  - unknown target language ids returns 422
  - invalid schema/types rejected by FastAPI/Pydantic
- Exit conditions:
  - persisted profile mutation returned

### Flow: Profile Delete
- Trigger / entry point: `DELETE /api/profile`
- Preconditions: authenticated user
- Step-by-step path:
  1. Profile row is deleted if present.
  2. If service role key and Supabase URL exist, backend best-effort deletes auth user via admin API.
- Alternate branches:
  - profile already absent returns 204 effectively
  - auth-user deletion may be skipped by config
- Failure branches:
  - DB delete failure
  - external auth delete failure is swallowed
- Exit conditions:
  - profile deleted from DB; external auth deletion may or may not have happened

### Flow: Start Lesson
- Trigger / entry point: `POST /api/lessons/start`
- Preconditions: authenticated user, body `profile_id` matches auth user
- Step-by-step path:
  1. Profile and category are validated.
  2. Existing active lesson for profile is checked.
  3. If active lesson same category exists, it is returned.
  4. If active lesson different category exists, it is abandoned.
  5. Random flashcard ids are chosen from category.
  6. Activity row and lesson session row are created.
  7. Response returns session state and selected card ids.
- Alternate branches:
  - repeated start on same category is idempotent-ish and reuses active lesson
  - integrity race on unique active lesson index retries and may abandon conflicting row
- Failure branches:
  - `profile_id` mismatch returns 403
  - profile/category not found 404
  - category has no flashcards 400
  - repeated integrity issues on create
- Exit conditions:
  - active lesson session exists and response returned

### Flow: Create Explicit Lesson Session
- Trigger / entry point: `POST /api/lessons/sessions`
- Preconditions: authenticated user, `profile_id` matches auth user
- Step-by-step path:
  1. Request body is validated.
  2. `cards_correct <= cards_seen` enforced.
  3. Profile/category existence validated.
  4. Existing in-progress lesson may be abandoned if creating another in-progress session.
  5. Activity row and lesson session row are created.
- Alternate branches:
  - integrity race may reuse active same-category lesson
- Failure branches:
  - mismatch 403, missing profile/category 404, bad counters 400
- Exit conditions:
  - lesson session created or existing active session reused

### Flow: Resume / Fetch Lesson Session
- Trigger / entry point: `GET /api/lessons/in-progress`, `GET /api/lessons/sessions/{id}`, `GET /api/lessons/sessions/{id}/flashcards`
- Preconditions: authenticated user
- Step-by-step path:
  1. Lesson session is fetched and ownership is checked.
  2. If legacy session has no `card_ids`, service initializes progress from category flashcards.
  3. Session or ordered flashcards are returned.
- Alternate branches:
  - no in-progress lesson returns `null`
- Failure branches:
  - session not found / wrong owner 404
  - category has no flashcards when backfilling legacy session 400
- Exit conditions:
  - usable resume payload returned

### Flow: End Lesson
- Trigger / entry point: `POST /api/lessons/end`
- Preconditions: authenticated user, session exists and owned by user
- Step-by-step path:
  1. Profile and session are validated.
  2. Lesson status is changed to completed.
  3. End time and grade percent are computed.
  4. If misses occurred, `ensure_review_for_parent_session` runs.
  5. Updated session is returned.
- Alternate branches:
  - no misses means no review created
- Failure branches:
  - mismatch 403
  - profile/session not found 404
  - review creation can raise if no incorrect cards found due to race/attempt inconsistency
- Exit conditions:
  - completed lesson persisted, maybe with review created

### Flow: Create Flashcard Attempt
- Trigger / entry point: `POST /api/flashcard/attempt` or `POST /api/lessons/sessions/{session_id}/attempts`
- Preconditions: authenticated user, valid activity/session and flashcard
- Step-by-step path:
  1. Activity owner is resolved.
  2. Ownership and activity type are validated.
  3. Card existence and membership are validated.
  4. Attempt row is created.
  5. Activity owner counters update:
     - `cards_seen`
     - `cards_correct`
     - `current_index`
     - `ended_at`
  6. Best-effort SRS user-card-state update runs.
  7. Response returns updated counters and current index.
- Alternate branches:
  - generic activity endpoint can derive lesson activity from lesson session id
  - review attempts validate `flashcard_ids`
- Failure branches:
  - activity not found 404
  - flashcard not found 404
  - completed lesson 400
  - card/category mismatch 400
  - card not in activity 400
- Exit conditions:
  - attempt persisted and owner progress updated

### Flow: Update Flashcard Attempt
- Trigger / entry point: `PATCH /api/flashcard/attempt/{attempt_id}`
- Preconditions: attempt exists and belongs to caller’s activity
- Step-by-step path:
  1. Attempt is loaded.
  2. Activity owner and ownership are checked.
  3. Correctness/confidence fields update.
  4. Aggregate `cards_correct` is reconciled if answer flipped.
  5. Updated response returned.
- Alternate branches:
  - answer unchanged only updates confidence
- Failure branches:
  - attempt missing 404
  - ownership mismatch 404
- Exit conditions:
  - corrected attempt persisted

### Flow: Review Lifecycle
- Trigger / entry point: `POST /api/review`, `GET /api/review`, `PATCH /api/review/{id}/start`, `PATCH /api/review/{id}/complete`
- Preconditions: authenticated user; parent session exists for create
- Step-by-step path:
  1. Create review ignores caller-provided metadata beyond `parent_session_id`.
  2. Existing review by parent session is reused if present.
  3. Otherwise incorrect flashcard ids are derived from lesson attempts.
  4. Review activity and review row are created.
  5. `start` sets `started_at` and activity status.
  6. `complete` sets `ended_at` and activity status.
- Alternate branches:
  - `start` on already-started review preserves first start time
- Failure branches:
  - lesson/review not found 404
  - no incorrect cards 400
  - unique review-name collisions possible because review name has global uniqueness
- Exit conditions:
  - active or completed review persisted

### Flow: Create Aggregate Practice Session
- Trigger / entry point: `POST /api/sessions`
- Preconditions: authenticated user
- Step-by-step path:
  1. Practice session row is created.
  2. Profile streak is recalculated from `last_practiced_at`.
  3. Profile `last_practiced_at` updates to now.
  4. Transaction commits and session response returns.
- Alternate branches:
  - missing profile means session still created without streak update
- Failure branches:
  - invalid payload accepted more broadly than product may want because counters are unconstrained by schema
- Exit conditions:
  - session analytics row exists

### Flow: Generate Lesson
- Trigger / entry point: `POST /api/generate`
- Preconditions: authenticated user, AI client configured, valid language/topic
- Step-by-step path:
  1. Per-profile recent generation count is checked against rate limit.
  2. Language existence is validated.
  3. Topic hash is derived from topic/language/difficulty.
  4. Existing generated category is looked up by hash/language.
  5. If enough unseen cards exist, cached result returns and a `cached` generation request is logged.
  6. Otherwise topic moderation runs.
  7. Pending generation request audit row is created.
  8. LLM is called and output schema validated.
  9. Generated content is moderated.
  10. Category is reused or created.
  11. New flashcards are stored.
  12. Generation request is marked success.
  13. Response returns category, cards, and `cached` flag.
- Alternate branches:
  - cached pool path skips LLM
  - existing category pool can expand over time when user exhausts unseen cards
- Failure branches:
  - rate limit 429
  - language 404
  - prompt-injection-like topic 422 by schema validation
  - content moderation 422
  - AI not configured 503
  - invalid LLM schema 502
  - failed generation request should be marked `failed` best-effort
- Exit conditions:
  - cards returned from cache or fresh generation persisted

### Flow: Generate Replacements
- Trigger / entry point: `POST /api/generate/replace`
- Preconditions: authenticated user, valid language/topic
- Step-by-step path:
  1. Language existence validated.
  2. Topic hash lookup tries existing category pool.
  3. If enough unseen cards not in `exclude_ids` exist, they are returned.
  4. Otherwise fresh cards are generated.
  5. Existing or new category is used.
  6. New cards are persisted.
- Alternate branches:
  - no generation-request audit row or rate limit check on replacements
- Failure branches:
  - AI misconfiguration/schema failures
  - language not found 404
- Exit conditions:
  - replacement cards returned

### Flow: Review / SRS
- Trigger / entry point: `/api/review/srs/queue`
- Preconditions: authenticated user
- Step-by-step path:
  1. SRS queue returns due count and due cards from `user_card_state`.
- Exit conditions:
  - SRS payload returned

## C. QA Coverage Matrix

Legend:
- Priority: `P0` critical path, `P1` important, `P2` secondary/admin
- Automation candidate: `Yes` means deterministic enough for API/integration automation

| Endpoint / Component | Action | Expected Result | What to test | Edge cases | Negative cases | Platform / infra concerns | Priority | Automation candidate? |
|---|---|---|---|---|---|---|---|---|
| FastAPI startup | Boot service | App serves routes and logs DB info | Router registration, env parsing, migration behavior, startup failure semantics | `DB_ENV=local` vs `dev`, empty CORS envs | DB unavailable, bad migration SQL | Container restarts, ephemeral DB volumes | P0 | Yes |
| CORS middleware | Send cross-origin request | Allowed origins succeed, blocked origins fail | allow-origins parsing, regex override, credentials support | localhost dynamic ports | Missing origin, disallowed origin | Browser preflight behavior | P1 | Yes |
| Auth dependency | Request protected route with valid JWT | User UUID resolved | JWKS fetch, cache reuse, key rotation retry, issuer parsing, no-aud verification | First authenticated request after boot | Missing token, invalid token, wrong kid, malformed JWT | Network dependency on JWKS endpoint | P0 | Yes |
| Dev auth dependency | Request with `AUTH_ENABLED=false` | Dev UUID resolved | `X-Dev-User-Id` precedence over env, UUID parsing | Header present, env absent | Missing/invalid LOCAL_USER_ID returns 500 | Different deploy envs | P1 | Yes |
| `GET /api/health` | Call health check | Service alive response | status code, payload stability | Before/after startup | Dependency failures should not leak here | Load balancer health semantics | P2 | Yes |
| `GET /api/config` | Fetch config | `db_env` returned | env normalization, lowercase output | whitespace env | internal exception | Foreground refresh dependency for mobile badge | P2 | Yes |
| `GET /api/profile` | Fetch profile | Existing or newly created profile returned | lazy creation, default values, auth ownership | first request after signup | invalid auth | DB defaults vs ORM defaults | P0 | Yes |
| `PATCH /api/profile` | Update profile fields | Persisted profile returned | partial update, target-language validation, onboarding flag, notification fields, numeric fields | empty target-language array, null name | unknown language ids 422, missing profile 404, schema validation failures | timezone/time field serialization | P0 | Yes |
| `DELETE /api/profile` | Delete account | 204, profile removed | cascade behavior, idempotency when profile missing, external auth delete best-effort | missing service-role config | DB failure, external delete failure swallowed | Supabase admin API dependency | P0 | Partial |
| `GET /api/languages` | List languages | Ordered language list | sort order, UUID serialization | many languages, coming-soon naming conventions downstream | DB failure | None | P1 | Yes |
| `POST /api/languages` | Create language | New language returned | trim behavior, min/max length | duplicate human-readable names allowed | invalid schema | Admin exposure risk | P2 | Yes |
| `GET /api/lessons/categories` | List categories | Categories with distinct difficulties | category ordering, supported-difficulties derivation | categories with no cards | DB failure | None | P1 | Yes |
| `POST /api/lessons/categories` | Create category | Category created | trim, status 201 | duplicate names allowed | invalid schema | Admin exposure risk | P2 | Yes |
| `GET /api/lessons/flashcards` | List flashcards | Ordered flashcards | payload shape, ordering by created_at/id | large datasets | DB failure | response size/perf | P2 | Yes |
| `GET /api/lessons/{category_id}` | Get category flashcards | Random subset returned | `limit` bounds, difficulty filter, category 404, randomness expectations | no difficulty, huge limit, difficulty with zero cards | invalid UUID, missing category | determinism in tests | P1 | Yes |
| `POST /api/lessons/flashcards` | Create flashcard | Flashcard returned | category/language existence, trimming, difficulty persistence | null romanization/audio_url | category/language 404 | Admin exposure risk | P2 | Yes |
| `POST /api/lessons/flashcards/bulk` | Bulk insert flashcards | All flashcards returned | empty list returns empty, shared validation, missing category/language reporting | mixed category/language ids | invalid item schema | large batch performance | P2 | Yes |
| `POST /api/lessons/start` | Start lesson | Active lesson session returned | ownership 403, idempotent same-category reuse, auto-abandon different-category session, selected card ids, activity creation | concurrent start requests, optional card_count | category has no flashcards 400, profile/category 404 | unique partial index race handling | P0 | Yes |
| `POST /api/lessons/sessions` | Create explicit lesson session | Session created or reused | ownership 403, counter validation, explicit card_ids/current_index, activity row creation | creating completed/abandoned session directly | cards_correct > cards_seen 400 | race with active lesson uniqueness | P1 | Yes |
| `GET /api/lessons/in-progress` | Fetch active lesson | Latest in-progress lesson or null | ownership scope, progress backfill for legacy rows | no session, multiple historical abandoned sessions | category now has no cards | legacy migration compatibility | P0 | Yes |
| `GET /api/lessons/sessions/{id}` | Fetch lesson session | Owned session returned | ownership 404, progress initialization | current_index near end | session not found | None | P0 | Yes |
| `GET /api/lessons/sessions/{id}/flashcards` | Fetch lesson flashcards | Ordered flashcards matching session card_ids | ownership 404, order preservation, missing ids dropped behavior | stale/deleted flashcard ids | session not found | response ordering matters to mobile resume | P0 | Yes |
| `POST /api/lessons/end` | End lesson | Completed session returned, review maybe created | ownership 403, grade calc, status change, ended_at, idempotency expectations, auto review creation | all correct, all incorrect, zero cards seen | session/profile 404 | duplicate end requests | P0 | Yes |
| `POST /api/lessons/sessions/{id}/attempts` | Create lesson attempt | Attempt saved and current index advanced | lesson ownership, category/card membership, in-progress enforcement, shown/answered timestamps, current index logic | repeated answers on same card, answered_at null | wrong card/category, completed lesson | time skew from client clocks | P1 | Yes |
| `POST /api/flashcard/attempt` | Create activity attempt | Attempt saved for lesson or review activity | activity fallback from lesson id, review membership, cards_seen/cards_correct updates, SRS update side effect | lesson activity row missing, review pending/in-progress | activity/card not found, unsupported activity type | side effects on SRS state | P0 | Yes |
| `PATCH /api/flashcard/attempt/{id}` | Update attempt | Answer and counters reconciled | ownership, correct-count delta math, confidence update | flipping correct->incorrect and back | attempt not found | stale writes / repeated patches | P0 | Yes |
| `POST /api/review` | Create review from parent session | Existing or new review returned | ignores extra client fields, derives incorrect cards from attempts, review-name generation, idempotency by parent session | create after endLesson already created one | no incorrect cards 400, missing/wrong owner 404 | unique review-name constraint could collide | P1 | Yes |
| `GET /api/review` | List active reviews | Only unfinished reviews returned | ownership, order by created_at desc | many reviews | DB failure | mobile expects only active reviews | P1 | Yes |
| `PATCH /api/review/{id}/start` | Start review | started_at set and activity in_progress | repeated start preserves first time, ownership | already started review | review 404 | None | P1 | Yes |
| `PATCH /api/review/{id}/complete` | Complete review | ended_at set and activity completed | repeated complete semantics, ownership | complete before start sets started_at=ended_at | review 404 | None | P1 | Yes |
| `POST /api/sessions` | Create aggregate practice session | Session row created and streak updated | completed_at defaulting, streak rollover logic, profile absent behavior, category optionality | multiple sessions same day, timezone boundary | invalid payload ranges not strongly constrained | server timezone/date vs user timezone | P0 | Yes |
| `GET /api/sessions` | List practice sessions | Latest 100 sessions returned | ownership, order desc, null fields | >100 sessions truncation | auth failures | payload size/perf | P1 | Yes |
| `GET /api/sessions/stats` | Aggregate stats | totals + streak returned | sum accuracy, profile missing -> streak 0 | no sessions | auth failure | None | P1 | Yes |
| `GET /api/review/srs/queue` | Get due cards | due_count + due flashcards returned | count vs payload consistency, due-date ordering, limit 20 | no due cards, many due cards | auth failure | date-based flakiness around midnight | P0 | Yes |
| `POST /api/generate` | Generate lesson | Cached or fresh lesson returned | rate limit, sanitization, language existence, unseen-pool reuse, audit records, `cached` flag | repeated same topic/user/language/difficulty, pool exhaustion | 429, 404, 422, 503, 502 | external LLM latency and failure | P0 | Yes |
| `POST /api/generate/replace` | Generate replacement cards | Reuse unseen or generate fresh replacements | topic sanitization, exclude_ids handling, count 1-10 | no existing pool, insufficient unseen cards | 404, 422, 503, 502 | external LLM latency and failure | P1 | Yes |
| GenerationService moderation | Moderate topic/output | Flagged content blocked | fail-open vs fail-closed semantics, explicit flagged behavior | moderation API unavailable | false positives/negatives | external API dependency | P1 | Partial |
| DB migration layer | Apply pending migrations | New schema applied exactly once | tracking table behavior, duplicate-object fallback, ordered application | dirty DB with missing migration records | broken SQL stops startup | local-only startup behavior | P1 | Partial |

## D. Cross-Flow Test Areas

### Authentication / Authorization
- Protected-route coverage for every user-scoped endpoint.
- Ownership mismatch testing for profile, sessions, lesson sessions, attempts, reviews, and SRS.
- Dev auth fallback behavior and misconfiguration handling.
- JWKS cache invalidation after key rotation.

### Validation / Schema Boundaries
- UUID parsing failures on path/query/body fields.
- Pydantic min/max constraints:
  - generation topic length
  - generation counts
  - confidence ratings
  - session counters
  - lesson attempt timestamps
- Extra fields sent by frontend:
  - review create payload includes fields backend ignores
- Lack of stricter validation where business risk exists:
  - session `cards_correct` can exceed `cards_attempted`
  - profile numeric ranges are not constrained in schema

### State Machines And Consistency
- Lesson statuses: `in_progress`, `completed`, `abandoned`
- Review statuses via activities: `pending`, `in_progress`, `completed`
- Current-index progression for both create and update attempt paths
- Relationship between `lesson_sessions`, `activities`, `flashcard_attempts`, `reviews`, `user_card_state`, and `practice_sessions`
- Idempotency of:
  - review creation by parent session
  - same-category lesson start

### Data Integrity / Hidden Dependencies
- `POST /api/lessons/end` auto-creates review on misses, but mobile also calls `POST /api/review`.
- Flashcard attempt writes are what drive:
  - lesson/review progress
  - review creation eligibility
  - SRS scheduling
- Aggregate session endpoint separately drives streak and progress stats.
- SRS queue depends on attempts being recorded through activity-based endpoints, not just local completion.

### External Dependencies
- Supabase JWKS endpoint for auth verification.
- Supabase Admin API for user deletion.
- OpenAI-compatible LLM endpoint for generation.
- Moderation endpoint for topic/output moderation.
- PostgreSQL availability and transaction behavior.

### Performance / Scalability
- Random ordering queries on flashcards by category.
- Large flashcard pools for unseen-card selection.
- Generation audit table growth and rate-limit query efficiency.
- SRS queue queries around large `user_card_state` tables.

### Security / Privacy
- User isolation across all profile-scoped resources.
- Silent external-delete failure may leave auth account active after profile deletion.
- Prompt-injection sanitization on generation topics.
- Public route exposure for admin-like creation endpoints (`POST /languages`, `POST /lessons/categories`, flashcard create/bulk create`) if the API is internet-facing.
- CORS configuration too broad or too narrow.

### Crash-Prone / Fragile Areas
- Startup migrations on existing dirty databases.
- Unique review-name global constraint.
- Integrity races on active lesson unique index.
- Legacy lesson sessions with empty `card_ids`.
- Time-based streak logic using server local date rather than user-local date.
- Best-effort SRS update swallowing failures.

## Coverage Gaps And Risk Hotspots

### Missing Or Weakly Defined Backend Flows
- No explicit endpoint to fetch a single review by id.
- No explicit admin authorization on create-language/create-category/create-flashcard endpoints.
- No pagination on sessions, languages, categories, or flashcards lists.
- No explicit idempotency keys for generation or session completion.
- No explicit retry/recovery endpoint for failed generation request rows.

### Risky Assumptions
- Profile always exists before most user flows; only `GET /profile` lazily creates it.
- Review-name uniqueness across all reviews will not collide under same category/timestamp/session fragment patterns.
- Mobile-submitted aggregate session analytics are trustworthy.
- Server-local `date.today()` is acceptable for streak and SRS due calculations.
- Swallowed failures are acceptable for:
  - Supabase auth-user delete
  - SRS upsert after attempt
  - marking generation request failed

### Likely Untested Scenarios
- Concurrent `start lesson` requests from two devices.
- `end lesson` racing with manual `create review`.
- Updating a flashcard attempt after review/lesson is already completed.
- Generation when unseen pool partly satisfies request but not fully.
- Review start/complete called multiple times.
- Profile delete during active lesson or pending generation.
- Startup migrations on partially migrated databases with surviving volumes.

### Areas Where Regressions Are Likely
- Auth/JWKS verification path.
- Lesson lifecycle around active-session uniqueness.
- Review auto-creation logic.
- SRS scheduling from attempt writes.
- Generation cached-vs-fresh logic.
- Deletion cascades and account cleanup.

## E. Recommended Test Suite Structure

### Smoke Tests
- Service boots successfully with local DB.
- Protected route rejects unauthenticated request.
- `GET /profile` creates and returns profile.
- `POST /lessons/start` returns lesson session.
- `POST /flashcard/attempt` records attempt and advances progress.
- `POST /lessons/end` completes lesson.
- `POST /sessions` updates streak and stats.
- `POST /generate` returns cached or fresh lesson with valid schema.

### Regression Tests
- JWT auth success/failure and dev auth bypass.
- Profile update validation, especially target-language IDs.
- Lesson start/create/resume/end branches including ownership failures.
- Flashcard attempt creation/update across lesson and review activities.
- Review create/start/complete with idempotent parent-session behavior.
- Review queue and SRS queue derivation.
- Generation rate limiting, sanitization, moderation, cached pool reuse, replacement flow.
- Startup migration behavior and active-lesson unique index races.

### End-to-End / API Workflow Tests
- New user profile fetch -> onboarding-style profile patch -> lesson start -> attempts -> lesson end -> review create/list/start/complete -> aggregate session stats.
- Generate lesson -> start lesson -> attempts -> end -> SRS queue appears later.
- Delete account -> verify dependent resources are removed / access fails.

### Exploratory Tests
- Concurrency on start lesson and create review.
- Midnight boundary for streak and SRS due dates.
- Fault injection for LLM/moderation/JWKS/Supabase admin APIs.
- Dirty migration state / partially migrated DB restore.
- Abuse cases on public creation endpoints.

### Automation Priorities
- P0 API/integration automation first:
  - auth resolution
  - profile fetch/update
  - lesson lifecycle
  - attempt create/update
  - session stats/streak
  - generation happy/error paths
  - review queue and SRS queue
- P1 next:
  - review lifecycle
  - deletion flows
  - migration and startup checks
  - concurrency/race tests
- P2/manual:
  - performance profiling
  - abuse/security hardening
  - long-run data growth behavior
