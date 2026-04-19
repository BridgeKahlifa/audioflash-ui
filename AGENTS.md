# AudioFlash Monorepo

## Structure

```
/
├── mobile/          # Expo / React Native app
├── web/             # Next.js marketing/sales landing page
└── packages/
    └── shared/      # Platform-agnostic TypeScript types and brand tokens
```

## Running projects

```bash
npm run dev:mobile        # Start Expo dev server
npm run dev:mobile:ios    # Open in iOS simulator
npm run dev:mobile:android
npm run dev:web           # Start Next.js dev server (http://localhost:3000)
npm run build:web         # Production build of landing page
```

## Key decisions

- `packages/shared` is the single source of truth for TypeScript types and brand colors — don't duplicate them in `mobile/` or `web/`
- `mobile/` and `web/` each have their own `package.json` and `node_modules`; install deps from within each directory
- Both projects use the same Supabase instance (different tables)
- Use npm for everything — no yarn
