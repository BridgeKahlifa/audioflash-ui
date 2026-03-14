# AudioFlash Web

Next.js 15 marketing/sales landing page. Deployed to Vercel with root directory set to `web/`.

## Running

```bash
npm install
npm run dev     # http://localhost:3000
npm run build
```

## Structure

```
app/
├── page.tsx              # Landing page (single page)
├── layout.tsx            # Root layout + metadata + Inter font
├── globals.css           # Tailwind base styles
└── api/
    └── waitlist/
        └── route.ts      # POST /api/waitlist — saves email to Supabase
```

## Email capture

`POST /api/waitlist` accepts `{ email }` and inserts into the `waitlist` table in Supabase.

Before deploying, create the table:
```sql
create table waitlist (
  id uuid default gen_random_uuid() primary key,
  email text unique not null,
  created_at timestamptz default now()
);
```

## Environment

Copy `.env.example` to `.env.local` and fill in:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Vercel / serverless gotchas

- **Always `await` Resend calls** — do not use fire-and-forget (`.catch()` without `await`). Vercel shuts down the function immediately after the response is returned, so any unawaited async work is silently dropped.

## Conventions

- Brand colors are pulled from `packages/shared/src/colors.ts` and mirrored in `tailwind.config.ts` — keep them in sync
- Types from `@audioflash/shared` are available via the path alias in `tsconfig.json`
- This is a pure web project — no React Native imports
