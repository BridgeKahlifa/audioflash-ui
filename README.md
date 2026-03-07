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

## Configuration

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_OPENROUTER_API_KEY` | Your [OpenRouter](https://openrouter.ai) API key |
| `EXPO_PUBLIC_AI_MODEL` | Model to use, e.g. `anthropic/claude-haiku-4-5` |

Swap models in `.env` any time — no code changes needed.

## Screens

| Route | Screen |
|---|---|
| `/` | Topic selection grid |
| `/lesson-ready/[topic]` | AI generation + loading state |
| `/practice/[topic]` | Swipeable flashcard loop |
| `/progress` | Streak, accuracy, session history |
