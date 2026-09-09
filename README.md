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

- Node.js 24 LTS recommended (`.node-version`); Node 22.13+ is the project minimum, with a supported npm installation
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

## Expo Go compatibility

Rally uses **Expo SDK 57**. Use a matching SDK 57 Expo Go client; the SDK 54 preview is no longer compatible. The production URL scheme remains `rally`.

On Windows, `scripts/start-mobile.ps1` starts a LAN QR preview using an explicit Node 24.3+ runtime and system-trusted certificates:

```powershell
powershell -NoProfile -NoExit -File .\scripts\start-mobile.ps1 -NodePath C:\path\to\node.exe
```

The running Codex-created preview uses the bundled Node 24 runtime, without changing your global Node or npm settings. Future terminals must also use a supported runtime. See [SDK upgrade verification and known limits](docs/expo-sdk-57-upgrade.md).

## App Capabilities

- Email/password sign-up, sign-in, persisted sessions, and sign-out
- Auth-gated personal habit dashboard
- Habit creation with validated input
- Today's completion and undo actions
- Weekly progress and a 12-week completion grid
- Habit detail and completion history
- Habit archive and permanent deletion flows
- Network-aware query behavior

The repository contains app source and build configuration only. Approved product and implementation planning is maintained in the Newtype idea workspace at `C:\Users\Kareem\Newtype\04-ideas\habit-tracker-concept`; backend deployment source, local backend tooling, and end-to-end test infrastructure are maintained separately.

## Current Scope

The approved Midnight / Newtype design refreshes authentication, habit cards, create/detail screens, and confirmation sheets while preserving personal-only V1. See [Midnight implementation and verification limits](docs/midnight-design.md). Run `npx playwright test e2e/redesign.spec.ts` for isolated UI regressions; this is separate from live-backend verification. The in-app vector mark uses Expo-compatible `react-native-svg`.

Rally does not currently include shared habits, invites, nudges, rankings, social activity, reminder notifications, avatar uploads, analytics, or app-store deployment configuration.
