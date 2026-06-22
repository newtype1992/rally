# Rally Lifecycle

## Current Phase

Rally has moved from Newtype planning into implementation. This repo is now the app repository for code, dependencies, Supabase migrations, tests, and runtime setup.

The current implementation target is personal-only V1: one signed-in user manages their own habits, completes today's habits, reviews weekly progress, and archives or deletes habits.

## Workspace Boundary

- Planning source of truth: `C:\Users\Kareem\Newtype\04-ideas\habit-tracker-concept`
- Implementation repo: `C:\Users\Kareem\Projects\rally`

Planning artifacts should stay under `Newtype\04-ideas`. Implementation code should live in this repo. If code is accidentally generated in the idea workspace, migrate it here and remove the mistaken implementation output after verification.

Before implementation changes, pull the needed planning artifacts from the Newtype idea workspace. The project repo contains the current implementation state, while `C:\Users\Kareem\Newtype\04-ideas\habit-tracker-concept` remains the planning source of truth for approved product, UX, architecture, data model, API, backend, and frontend decisions.

## Lifecycle Stages

1. Planning: product, UX, architecture, data model, and API decisions are documented in the Newtype idea workspace.
2. Implementation scaffold: the real app repo is created under `C:\Users\Kareem\Projects` with the approved stack.
3. Backend foundation: Supabase config, migrations, seeds, and tests live under this repo's `supabase/` directory.
4. Frontend implementation: Expo Router screens, state, forms, and Supabase data access are built in this repo. The current V1 frontend contains auth, the personal habits dashboard, habit creation, habit detail, and archive/delete modals.
5. Integration: frontend flows connect to local Supabase, then hosted services when approved.
6. Release preparation: EAS, hosted Supabase, analytics, secrets, and store configuration are added after the V1 implementation is stable.

## Current Backend Checkpoint

The backend foundation contains one migration, one seed file, and one pgTAP RLS test suite. Local backend coverage includes profiles, personal habits, habit completions, active habit summaries, habit detail/history, weekly progress, archive/delete mutations, RLS policies, grants, seed data, and access-control regression tests.

Verification commands should be run from this repo root:

```powershell
npm run supabase:reset
npm run supabase:test
npm run supabase:lint
```

## Current Frontend Checkpoint

The personal-only V1 frontend keeps the app surface intentionally narrow:

- `src/app/(auth)/log-in.tsx`
- `src/app/(auth)/sign-up.tsx`
- `src/app/(app)/habits/index.tsx`
- `src/app/(app)/habits/new.tsx`
- `src/app/(app)/habits/[habitId].tsx`
- `src/app/(modals)/archive-habit.tsx`
- `src/app/(modals)/delete-habit.tsx`

Shared habits, invites, nudges, reminders, rankings, onboarding tabs, social recovery states, and Expo starter screens are out of V1 scope and should not be reintroduced without a new product decision.

Habit Detail includes all-time metrics and a 12-week completion grid. Completed dates use the approved Ember-to-Violet semantic streak tiers: 1-2, 3-6, 7-29, 30-89, and 90+ consecutive days. Each contiguous run is colored from its final run length, including completions outside the visible 84-day window. The active Figma file and `high-fidelity-ui-design.md` in the Newtype workspace contain the matching design-system update.

Frontend verification commands:

```powershell
npm run typecheck
npm run lint
npm run doctor
npm run test:streaks
npm run test:e2e:habits
```

## Resume From Here

Checkpoint date: 2026-06-22.

The local personal-only V1 loop is implemented end to end: authentication, habit creation, today's completion and undo, weekly and all-time progress, archive, and delete. Supabase returns full completion history for tier classification. Seed data provides deterministic 1-, 2-, repeated 3-, repeated 7-, exact 30-, and exact 90-day streaks under the Avery test account.

Before starting the next implementation pass:

1. Review the relevant approved artifact in `C:\Users\Kareem\Newtype\04-ideas\habit-tracker-concept`.
2. Start local Supabase and reset it when deterministic streak fixtures are needed.
3. Run the backend and frontend verification commands documented above.
4. Keep green reserved for `Done today`; completion history uses only the semantic Ember-to-Violet palette.

The next product phase is not yet approved. Likely future work remains hosted Supabase configuration, production environment handling, analytics, EAS builds, and release preparation; do not begin those areas without confirming the next lifecycle decision.

## Deferred Work

Hosted Supabase, production environment variables, PostHog, EAS, production Edge Functions, production push configuration, reminders, and social habit flows remain later lifecycle steps.

Supabase Storage is also deferred for V1. The backend keeps `profiles.avatar_url` available for future use, but local Storage is disabled until uploads become part of scope.
