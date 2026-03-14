# @audioflash/shared

Shared TypeScript types and brand tokens used by both `mobile/` and `web/`.

## Contents

- `src/types.ts` — domain interfaces (Flashcard, ProgressData, SessionHistoryItem, etc.)
- `src/colors.ts` — brand color tokens

## Rules

- **No platform-specific code.** No React Native imports, no browser APIs, no Expo. Pure TypeScript only.
- **No dependencies.** This package has no runtime deps — keep it that way.
- When adding a new type used in both projects, put it here. If it's only used in one project, keep it local to that project.

## Usage

Both projects resolve `@audioflash/shared` via a path alias — no build step needed:
- `mobile/`: configured in `tsconfig.json` + `metro.config.js`
- `web/`: configured in `tsconfig.json` + `next.config.ts`
