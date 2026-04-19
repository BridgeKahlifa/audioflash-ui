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

## Manual GitHub Build Workflow

The repo includes a manual GitHub Actions workflow at
[`/.github/workflows/build.yml`](../.github/workflows/build.yml) named `Build Mobile App`.
It does not run on push. You trigger it manually with `workflow_dispatch`.

What it does:

- checks out the repo on `ubuntu-latest`
- installs Node 20
- installs `eas-cli`
- installs dependencies in `mobile/`
- runs `npx expo install` to sync Expo-compatible packages
- starts an EAS build for both iOS and Android with:
  `npx eas-cli build --platform all --profile preview --non-interactive --no-wait`

Before using it:

- add the repository secret `EXPO_TOKEN` in GitHub
- make sure the Expo account tied to that token has access to this project
- confirm the `preview` EAS build profile is valid in [`mobile/eas.json`](./eas.json)

How to run it in GitHub:

1. Open the repository on GitHub.
2. Go to `Actions`.
3. Select the `Build Mobile App` workflow.
4. Click `Run workflow`.
5. Choose the branch you want to build.
6. Click the green `Run workflow` button to start the job.

What to expect after triggering it:

- GitHub Actions will only kick off the EAS build job.
- Because the workflow uses `--no-wait`, the GitHub job finishes before the native builds finish.
- Check the EAS dashboard or Expo build logs to monitor completion and download the artifacts.

If you prefer the GitHub CLI:

```bash
gh workflow run build.yml --ref <branch-name>
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
