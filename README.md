# AudioFlash

Audio-first language learning app built with Expo (mobile) and Next.js (web).

## Building the mobile app

Builds are handled via [EAS Build](https://docs.expo.dev/build/introduction/). The GitHub Actions workflow (`.github/workflows/build.yml`) can be triggered manually from the Actions tab.

### Prerequisites

- [EAS CLI](https://docs.expo.dev/build/setup/): `npm install -g eas-cli`
- An `EXPO_TOKEN` with access to the Expo project (set as a repo secret for CI, or run `eas login` locally)

### Steps

```bash
cd mobile
npm install
npx expo install          # syncs Expo-compatible dependency versions
npx eas-cli build --platform all --profile preview --non-interactive --no-wait
```

The `--no-wait` flag submits the build and exits immediately; monitor progress at [expo.dev](https://expo.dev).

### Profiles

Build profiles are defined in `mobile/eas.json`. The CI workflow uses `preview`.
