# AudioFlash

A mobile flashcard app for learning Chinese (Mandarin). Pick a topic, get AI-generated phrases, hear them spoken aloud, and track your progress over time.

## Features

- AI-generated flashcard sets via OpenRouter (swap any model via `.env`)
- On-device Chinese TTS audio using `expo-speech`
- Swipe left/right to navigate cards
- "I Knew It / Didn't Know" scoring with session tracking
- Streak + accuracy stats on a progress dashboard
- Offline fallback cards for all 8 topics

## Tech Stack

- [Expo](https://expo.dev) SDK 54 + Expo Router v6
- React 19, React Native 0.81
- NativeWind v4 (Tailwind CSS for React Native)
- AsyncStorage for local persistence
- OpenRouter as AI gateway

## Getting Started

**Requirements:** Node 22, Expo Go app on your phone

```bash
nvm use 22
cp .env.example .env   # add your OpenRouter API key
npm install
npx expo start         # scan QR with Expo Go
```

## Docker

Docker support is set up for the Expo web target and for a reproducible Expo dev environment.
It does not build native iOS or Android binaries; keep using Expo Go or EAS for that.

```bash
# Expo dev server in Docker
cp .env.example .env
docker compose up app
```

The Expo web dev server is exposed on `http://localhost:8081`.

```bash
# Production-style static web build
cp .env.example .env
docker compose up --build web
```

The exported web app is served on `http://localhost:8080`.

If you prefer plain Docker commands:

```bash
docker build --target dev -t audioflash-dev .
docker run --rm -p 8081:8081 --env-file .env audioflash-dev

docker build \
  --target production \
  --build-arg EXPO_PUBLIC_OPENROUTER_API_KEY=your_key \
  --build-arg EXPO_PUBLIC_AI_MODEL=anthropic/claude-haiku-4-5 \
  --build-arg EXPO_PUBLIC_SUPABASE_URL=your_url \
  --build-arg EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key \
  -t audioflash-web .
docker run --rm -p 8080:80 audioflash-web
```

## EAS Builds & OTA Updates

AudioFlash uses [EAS Build](https://docs.expo.dev/build/introduction/) to produce native binaries and [EAS Update](https://docs.expo.dev/eas-update/introduction/) to push JS/UI changes to installed apps without a new APK or IPA.

### Build profiles

| Profile | Output | Use for |
|---|---|---|
| `preview` | APK (Android) / IPA (iOS), internal | Sharing with testers |
| `production` | AAB (Android) / IPA (iOS), store-ready | Play Store / App Store |

### Build commands

Run from the repo root or from `mobile/`:

```bash
# Both platforms at once (recommended for the initial OTA-enabled build)
npm run build:preview

# Individual platforms
npm run build:android:preview
npm run build:ios:preview

# Production builds
npm run build:android
npm run build:ios
```

EAS builds in the cloud and provides a download link when done.

### OTA updates (push JS changes without a new build)

Once a device has an app built with the OTA config baked in, you can push UI and logic changes instantly:

```bash
npm run update:preview   # → preview channel (testers)
npm run update:prod      # → production channel (all users)
```

The app checks for an update on launch, downloads it in the background, and runs the new code on the next open.

These commands must publish with the matching EAS environment so the bundle gets the right
`EXPO_PUBLIC_*` values baked in. Without that, an OTA update can ship a broken config even if the
installed native build is fine.

**What OTA can update:** all React Native / JS code, screens, styles, assets.

**What still requires a new build:** native module changes, new permissions, Expo SDK upgrades, or any change to native fields in `app.json`.

### First-time setup

If you haven't used EAS Update before on this project:

1. Log in: `npx eas-cli login`
2. Run a build: `npm run build:preview` — this bakes the update URL and channel into the binary
3. Install the resulting APK/IPA on your devices
4. From now on, `npm run update:preview` is all you need for UI changes

Make sure the EAS `preview` environment contains the same client-visible values your preview build
expects, especially `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and
`EXPO_PUBLIC_API_BASE_URL`.

### How versioning works

`runtimeVersion` in `app.json` is set to `"policy": "appVersion"`, meaning the app version (e.g. `1.0.3`) is the compatibility key. An OTA update only lands on devices built at the same app version. When you ship a new native build, you must manually bump `version` in `app.json` — this does not happen automatically. Bumping the version starts a fresh update slot so old and new binaries never receive each other's OTA updates.

Follow standard semantic versioning (`major.minor.patch`):

| Change | What to bump | Example |
|---|---|---|
| New native module, permission, or Expo SDK upgrade | **minor** | `1.0.3` → `1.1.0` |
| Major new feature or breaking change | **major** | `1.0.3` → `2.0.0` |

Bump **patch** only for the manual `build.yml` workflow, which auto-increments it for you as part of the job. Never bump patch manually — let the workflow handle it.

Also remember to bump `versionCode` (Android) in `app.json` whenever you cut a new build for the Play Store, as the store requires it to be strictly increasing. `autoIncrement: true` in `eas.json` handles this automatically during EAS builds so you don't need to touch it by hand.

## CI / CD

Three GitHub Actions workflows handle all deployment automation.

### Required secret

All three workflows need `EXPO_TOKEN` set as a GitHub repository secret (Settings → Secrets and variables → Actions → New repository secret).

Get the token from **expo.dev** → **User settings** → **Access tokens** → **Create token**. Make sure the Expo account has access to this project.

---

### 1. Auto-deploy on merge (`mobile-deploy.yml`)

Triggers automatically on every push to `main` that touches `mobile/` or `packages/`. Detects what kind of change it is and routes accordingly:

| What changed | What happens |
|---|---|
| JS/UI only (version unchanged) | OTA update pushed to `preview` channel — testers get it on next app open |
| Version bumped in `app.json` | EAS native build triggered for all platforms on the `preview` profile |

**The version bump is always manual — it never happens automatically in this workflow.** If your PR adds a native module, changes permissions, or upgrades the Expo SDK, you must bump `version` in `mobile/app.json` yourself before merging. The CI reads the version to decide what to do; if the version hasn't changed it assumes the change is JS-only and pushes an OTA update. Forgetting to bump when you've changed native code means the OTA update will land on devices that don't have the new native code, which will cause a crash. Everything else (screens, styles, logic) can merge without a version bump and will ship automatically via OTA.

---

### 2. Promote to production (`mobile-promote.yml`)

OTA updates from the auto-deploy land on the `preview` channel (testers only). When you're happy with what's been tested, promote it to production manually:

1. Go to GitHub → **Actions** → **Promote Mobile to Production**
2. Click **Run workflow**
3. Optionally add a release note
4. Click the green **Run workflow** button

This bundles the current `main` and pushes it to the `production` channel. All production users get the update on their next app open.

---

### 3. Manual build (`build.yml`)

For one-off native builds outside the normal flow — useful for cutting a specific version or targeting a single platform. Does not run automatically.

1. Go to GitHub → **Actions** → **Build Mobile App** → **Run workflow**
2. Choose branch, platform (`ios`, `android`, `all platforms`), and EAS profile
3. Optionally enter a full semantic version (e.g. `1.4.0`); leave blank to auto-bump the patch version

The workflow writes the resolved version back to `app.json`, `package.json`, and `package-lock.json` and commits it to the branch before building. The GitHub job finishes quickly because EAS builds run in the cloud (`--no-wait`); check the EAS dashboard for build status and artifact download links.

```bash
# Trigger via GitHub CLI
gh workflow run build.yml --ref main
```

## Configuration

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_OPENROUTER_API_KEY` | Your [OpenRouter](https://openrouter.ai) API key |
| `EXPO_PUBLIC_AI_MODEL` | Model to use, e.g. `anthropic/claude-haiku-4-5` |
| `EXPO_PUBLIC_AUTH_MODE` | `supabase` by default, or `dev` to bypass frontend login and rely on the API dev auth path |
| `EXPO_PUBLIC_DEV_USER_ID` | Optional fallback dev user id for UI state |
| `EXPO_PUBLIC_DEV_USER_EMAIL` | Optional label shown in the UI during dev auth mode |
| `EXPO_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Your Supabase publishable/anon key |
| `EXPO_PUBLIC_API_BASE_URL` | Base URL for the backend API used by the app |

Swap models in `.env` any time — no code changes needed.

For a local mobile UI talking to a dev-backed API, set `EXPO_PUBLIC_AUTH_MODE=dev`
and point `EXPO_PUBLIC_API_BASE_URL` at that API. The app will skip the Supabase
sign-in screens, fetch `/profile` without a bearer token, and rely on the
API's existing `AUTH_MODE=dev` behavior.

## Screens

| Route | Screen |
|---|---|
| `/` | Topic selection grid |
| `/lesson-ready/[topic]` | AI generation + loading state |
| `/practice/[topic]` | Swipeable flashcard loop |
| `/progress` | Streak, accuracy, session history |
