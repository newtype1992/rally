# Rally

Rally is a personal-only Expo React Native habit tracker for V1. The app lets one signed-in user create habits, mark today's habits complete, inspect weekly progress, and archive or delete habits.

This repository is the real implementation repo. Planning and product source-of-truth documents remain in `C:\Users\Kareem\Newtype\04-ideas\habit-tracker-concept`.

## Stack

- Expo React Native
- TypeScript
- Expo Router
- TanStack Query for Supabase-backed reads and mutations
- Zustand for auth/session-adjacent UI state
- React Hook Form and Zod for mobile form validation
- NetInfo-aware online state for React Query
- Supabase local development and migrations
- `@supabase/supabase-js` with React Native AsyncStorage session persistence

## Setup

```powershell
cd C:\Users\Kareem\Projects\rally
npm install
Copy-Item .env.example .env
```

After starting Supabase, copy the local anon key from `supabase status` into `.env` as `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
For a physical phone in Expo Go, set `EXPO_PUBLIC_SUPABASE_URL` to your computer's LAN IP, not `127.0.0.1`, so the device can reach local Supabase.

## App Commands

```powershell
npm run start
npm run android
npm run ios
npm run web
npm run typecheck
npm run lint
npm run doctor
npm run test:streaks
npm run test:e2e:habits
```

## Local Supabase

The local Supabase project id is `rally`. The config keeps custom `553xx` ports:

- API: `55321`
- DB: `55322`
- Studio: `55323`
- Inbucket: `55324`
- Shadow DB: `55320`
- Pooler, if enabled: `55329`
- Edge inspector: `55383`

Supabase Storage is disabled for V1 because the approved architecture uses initials and defers avatar uploads/media storage.
Supabase Analytics is disabled locally because Rally will use PostHog later and the local Supabase Analytics sidecar is not needed for backend verification.

## Seed Logins

The local seed includes usable email/password accounts:

- `avery.local@example.test` / `password123`
- `blair.local@example.test` / `password123`

These users are defined in `supabase/seed.sql` and are loaded when you run `npm run supabase:reset`.
The Avery account contains deterministic completion histories for visual and classifier testing: separate 1- and 2-day runs, repeated 3- and 7-day runs on one habit, an exact 30-day run, and an exact 90-day run.

```powershell
npm run supabase:start
supabase status
npm run supabase:reset
npm run supabase:test
npm run supabase:lint
```

## Backend Status

The current Supabase V1 backend lives in:

- `supabase/config.toml`
- `supabase/migrations/20260612031926_rally_backend_foundation.sql`
- `supabase/seed.sql`
- `supabase/tests/rally_rls_test.sql`

Current backend coverage includes profiles, personal habits, habit completions, active habit summaries, habit detail/history, weekly progress, archive/delete mutations, RLS policies, grants, seed data, and pgTAP access-control tests.

## Frontend Status

Current frontend coverage includes:

- Auth screens for sign up and log in
- Auth-gated personal habit dashboard at `src/app/(app)/habits/index.tsx`
- Create habit screen at `src/app/(app)/habits/new.tsx`
- Habit detail screen at `src/app/(app)/habits/[habitId].tsx`
- Archive and delete confirmation modals
- Ember-to-Violet completion tiers across the 12-week grid, calculated from each habit's complete completion history
- Typed Supabase RPC wrappers for implemented V1 backend functions
- Playwright coverage for the personal habit flow and pure streak classification

Not included in V1:

- Shared habits, invites, nudges, rankings, friend activity, or social check-ins
- Reminder notifications
- Supabase Storage buckets or avatar uploads
- Hosted Supabase project linking
- Production secrets
- EAS builds or app store configuration
- PostHog integration
- Production Edge Function deployment

## Related Docs

- `LIFECYCLE.md` describes how this implementation repo relates to the Newtype planning workspace.
- `AGENTS.md` contains working rules for coding agents in this repo.
- Before implementation changes, review the relevant planning handoffs in `C:\Users\Kareem\Newtype\04-ideas\habit-tracker-concept`.
