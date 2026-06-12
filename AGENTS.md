# AGENTS.md

## Repo Role

This is the real Rally implementation repository. Use it for application code, Supabase backend files, tests, dependency changes, and runtime configuration.

The Newtype idea workspace at `C:\Users\Kareem\Newtype\04-ideas\habit-tracker-concept` remains the planning source of truth. Do not add app implementation code there.

## Working Rules

- Before implementation work that depends on product intent, review the relevant planning artifacts in `C:\Users\Kareem\Newtype\04-ideas\habit-tracker-concept`.
- Treat those Newtype artifacts as the source of truth for approved product, UX, architecture, data, API, backend, and frontend decisions.
- Do not rely only on memory, generated code, or this implementation repo when a change depends on approved requirements or decisions.
- Keep Expo React Native code in `src/` and route files under `src/app/`.
- Keep Supabase migrations, seeds, tests, and config under `supabase/`.
- Use `EXPO_PUBLIC_` variables only for values that can be exposed to the client.
- Never commit service-role keys, production secrets, signing keys, or local generated Supabase volumes.
- Update `README.md` and `LIFECYCLE.md` when setup or lifecycle boundaries change.
- If implementation files are accidentally created in the Newtype idea workspace, migrate them into this repo and remove the mistaken implementation copy after verification.

## Verification

Before handing off backend changes, run:

```powershell
npm run supabase:reset
npm run supabase:test
npm run supabase:lint
```

Before handing off frontend or dependency changes, run:

```powershell
npm run typecheck
npm run doctor
```
