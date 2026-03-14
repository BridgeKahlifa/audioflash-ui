# AudioFlash Mobile

Expo / React Native app using Expo Router for file-based navigation.

## Running

```bash
npm start           # Expo dev server
npm run ios         # iOS simulator
npm run android     # Android emulator
```

## Key libraries

- **Expo Router** — file-based routing under `app/`. Route groups: `(auth)` and `(tabs)`
- **NativeWind** — Tailwind CSS for React Native. Use `className` props, not `StyleSheet`
- **Supabase** — auth + database client in `lib/supabase.ts`
- **expo-speech** — audio playback for flashcards

## Conventions

- Styles: NativeWind `className` first; only use inline `style` for dynamic values (shadows, percentages) that Tailwind can't express
- Brand colors are defined in `packages/shared/src/colors.ts` and mirrored in `tailwind.config.js` — don't hardcode hex values
- Types come from `@audioflash/shared` (path alias resolves to `../packages/shared/src/index.ts`)
- Metro is configured in `metro.config.js` to watch `../packages/shared` so changes there hot-reload

## Auth flow

Unauthenticated users are redirected to `/(auth)/sign-in` in `app/_layout.tsx`. All protected screens live under `(tabs)`.

## Environment

Secrets live in `.env`. See `.env.example` for required keys:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
