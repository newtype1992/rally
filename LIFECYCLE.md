# Rally Lifecycle

## Current Phase

Rally has moved from Newtype planning into implementation. This repo is now the app repository for code, dependencies, Supabase migrations, tests, and runtime setup.

## Workspace Boundary

- Planning source of truth: `C:\Users\Kareem\Newtype\04-ideas\habit-tracker-concept`
- Implementation repo: `C:\Users\Kareem\Projects\rally`

Planning artifacts should stay under `Newtype\04-ideas`. Implementation code should live in this repo. If code is accidentally generated in the idea workspace, migrate it here and remove the mistaken implementation output after verification.

Before implementation changes, pull the needed planning artifacts from the Newtype idea workspace. The project repo contains the current implementation state, while `C:\Users\Kareem\Newtype\04-ideas\habit-tracker-concept` remains the planning source of truth for approved product, UX, architecture, data model, API, backend, and frontend decisions.

## Lifecycle Stages

1. Planning: product, UX, architecture, data model, and API decisions are documented in the Newtype idea workspace.
2. Implementation scaffold: the real app repo is created under `C:\Users\Kareem\Projects` with the approved stack.
3. Backend foundation: Supabase config, migrations, seeds, and tests live under this repo's `supabase/` directory.
4. Frontend implementation: Expo Router screens, state, forms, and Supabase data access are built in this repo. The first connected Rally frontend pass now exists with auth, onboarding, tabs, invite flows, sharing, settings shells, and recovery states.
5. Integration: frontend flows connect to local Supabase, then hosted services when approved.
6. Release preparation: EAS, hosted Supabase, analytics, secrets, and store configuration are added after the MVP implementation is stable.

## Current Backend Checkpoint

The migrated backend foundation contains one migration, one seed file, and one pgTAP RLS test suite. Verification commands are documented in `README.md` and should be run from this repo root.

## Deferred Work

Hosted Supabase, production environment variables, PostHog, EAS, production Edge Functions, production push configuration, and complete backend implementations for weekly, calendar, shared-detail, and reminder-preference RPCs remain later lifecycle steps.

Supabase Storage is also deferred for the MVP. The backend keeps `profiles.avatar_url` available for future use, but local Storage is disabled until uploads become part of scope.
