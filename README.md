# Rally

Rally is a personal habit tracker built with Expo and React Native. Signed-in users can create habits, record or undo today's completion, review weekly progress and completion history, and archive or delete habits.

## Stack

- Expo, React Native, and Expo Router
- TypeScript
- Supabase Auth and PostgreSQL RPCs
- TanStack Query for server state
- Zustand for session-adjacent UI state
- React Hook Form and Zod for form validation
- AsyncStorage-backed Supabase sessions

## Prerequisites

- A supported Node.js and npm installation
- An Expo-compatible Android, iOS, or web development environment
- A hosted Supabase project with email/password authentication enabled
- A deployed Rally-compatible database schema and RPC contract

The backend must expose the RPCs used by `src/lib/rally-api.ts`: `create_habit`, `list_active_habits`, `mark_habit_done_today`, `undo_today_completion`, `get_weekly_progress`, `get_habit_detail`, `archive_habit`, and `delete_habit`. Each RPC accepts an `input` object and returns the application's typed result envelope.

## Setup

```powershell
git clone <repository-url>
cd rally
npm install
Copy-Item .env.example .env
```

Set these public client variables in `.env`:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-publishable-or-anon-key
```

Only values safe to expose in a client application should use the `EXPO_PUBLIC_` prefix. Never place a Supabase service-role key or another server secret in the app environment.

## Commands

```powershell
npm run start
npm run android
npm run ios
npm run web
npm run lint
npm run typecheck
npm run doctor
```

## App Capabilities

- Email/password sign-up, sign-in, persisted sessions, and sign-out
- Auth-gated personal habit dashboard
- Habit creation with validated input
- Today's completion and undo actions
- Weekly progress and a 12-week completion grid
- Habit detail and completion history
- Habit archive and permanent deletion flows
- Network-aware query behavior

The repository contains app source and build configuration only. Backend deployment source, local backend tooling, internal planning material, and end-to-end test infrastructure are maintained separately.

## Current Scope

Rally does not currently include shared habits, invites, nudges, rankings, social activity, reminder notifications, avatar uploads, analytics, or app-store deployment configuration.
