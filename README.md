# Rally

Rally is an Expo React Native app for shared habit accountability. The app lets people track personal routines, share individual habits with friends, and compare progress against each person's own planned days.

This repository is the real implementation repo. Planning and product source-of-truth documents remain in `C:\Users\Kareem\Newtype\04-ideas\habit-tracker-concept`.

## Stack

- Expo React Native
- TypeScript
- Expo Router
- TanStack Query for Supabase-backed reads and mutations
- Zustand for session-adjacent UI state, onboarding drafts, invite context, and pending check-ins
- React Hook Form and Zod for mobile form validation
- NetInfo-aware offline handling for queued check-ins
- Expo Notifications, Haptics, and Clipboard for reminder, feedback, and invite-copy flows
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
```

## Local Supabase

The local Supabase project id is `rally`. The config keeps the custom `553xx` ports from the original backend pass:

- API: `55321`
- DB: `55322`
- Studio: `55323`
- Inbucket: `55324`
- Shadow DB: `55320`
- Pooler, if enabled: `55329`
- Edge inspector: `55383`

Supabase Storage is disabled for the MVP because the approved architecture uses initials and defers avatar uploads/media storage.
Supabase Analytics is disabled locally because Rally will use PostHog later and the local Supabase Analytics sidecar is not needed for backend verification.

## Seed Logins

The local seed already includes usable email/password accounts:

- `avery.local@example.test` / `password123`
- `blair.local@example.test` / `password123`
- `casey.local@example.test` / `password123`
- `devon.local@example.test` / `password123`

These users are defined in `supabase/seed.sql` and are loaded when you run `npm run supabase:reset`.

```powershell
npm run supabase:start
supabase status
npm run supabase:reset
npm run supabase:test
npm run supabase:lint
```

## Backend Status

The Supabase foundation has been migrated from the Newtype idea workspace into this repo.

Included now:

- `supabase/config.toml`
- `supabase/migrations/20260612031926_rally_backend_foundation.sql`
- `supabase/seed.sql`
- `supabase/tests/rally_rls_test.sql`

Current backend coverage includes the core schema, RLS policies, grants, seed data, and pgTAP tests for direct table access, shared-habit visibility, idempotent check-ins, service-only jobs, and invite preview access.

Current frontend coverage includes:

- Auth screens for sign up and log in
- First habit setup, setup details, private confirmation, and permission-denied recovery
- Today, Habits, Shared, Progress, and Me tabs
- Invite preview and buddy target setup
- Share habit, invite-created, invite-copied, habit settings, nudge, and check-in retry surfaces
- Typed Supabase RPC wrappers for implemented backend functions
- Explicit backend-follow-up states for placeholder RPCs

Not included yet:

- Supabase Storage buckets or avatar uploads
- Hosted Supabase project linking
- Production secrets
- EAS builds or app store configuration
- PostHog integration
- Production Edge Function deployment
- Complete backend implementations for `get_weekly_view`, `get_calendar_view`, `get_shared_habit_detail`, and `update_reminder_preferences`

## Related Docs

- `LIFECYCLE.md` describes how this implementation repo relates to the Newtype planning workspace.
- `AGENTS.md` contains working rules for coding agents in this repo.
- Before implementation changes, review the relevant planning handoffs in `C:\Users\Kareem\Newtype\04-ideas\habit-tracker-concept`.
