# Rally redesign — September 2026

## Scope and design direction

The user approved a full visual rebuild of Rally using the current model. The existing personal-only habit workflow remains intact: login/sign-up, dashboard, create habit, detail/history, and archive/delete confirmations. No social, reminder, payment, or new backend features were added.

Planning references reviewed in `C:\Users\Kareem\Newtype\04-ideas\habit-tracker-concept`: product spec, information architecture, wireframes, high-fidelity UI design, and technical architecture. The previous [Figma design](https://www.figma.com/design/2vFTqyTGTkN6Pn8qWyoLSU?node-id=28-17) was inspected as a baseline. It is **not** an updated representation of this implementation. The implementation and rendered screenshots below record this redesign; a new editable Figma prototype remains outstanding.

The new direction uses warm charcoal/olive surfaces, amber actions, off-white type, generous spacing, rounded cards, a compact flag wordmark, and restrained decorative rhythm bars on authentication. Green identifies today's completed state; the completion-history grid retains the existing Ember-to-Violet streak tiers. Progress is always per habit, never a global score.

## Shared component specifications

- Screen content: 24 px horizontal spacing, safe-area padding, 480 px maximum content width (528 px including dashboard gutters); vertical scrolling and keyboard insets for forms.
- Type: 36/42 page headings, 21/28 section headings, 19/25 card headings, 15/23 body, 13/21 support text. System fonts; no new font or icon dependency.
- Surfaces: 20 px card radius, 14 px controls, 28 px sheets. Inputs have visible borders, focus/error states, labels, and helper text.
- Actions: 52 px primary controls, at least 48 px icon targets, 44 px card actions. Pending controls retain their label, show a spinner, and disable repeated submission.
- Navigation: login is the signed-out default. Login/sign-up tabs replace one another; neither has a back header or swipe-back gesture. Habit title and mark/undo targets are separate siblings.
- Forms: invalid values disable save; blur validation explains the correction. Failed submissions retain drafts. Fields lock during submission. No arbitrary frequency presets.
- Confirmations: name the habit, explain archive/delete consequences, provide a visible close and “Keep this habit” action, and block repeat submission/dismissal while saving.
- Detail/history: weekly progress, four wrapping metric cells, 12-week grid with all five tier labels, a grouped accessible summary, and expandable date details. Dates remain human-readable.

## Reliability and performance changes

- Virtualized dashboard with bounded initial rendering and isolated row mutations: completing one habit does not disable every other card.
- Cached data stays visible during refresh errors; loading, empty, offline, and retry states remain explicit.
- Auth-aware query keys, query-cache/draft clearing on account changes, and guarded session bootstrap prevent stale account state from leaking into a later session.
- Native foreground handling resumes auth refresh and refreshes queries; date context updates after resume and at minute boundaries.
- Mutation commands compute the current local date at action time. Offline actions fail explicitly instead of silently queuing a future write.
- Completion-history classification is memoized by the underlying dates. Parallel invalidation is awaited to keep actions pending until visible data refreshes.
- Shared link styles are flattened before Expo's `asChild` wrapper so linked buttons retain their dimensions and appearance on web.

These are structural improvements, not measured claims about device FPS or battery use.

## Verification

Run the isolated UI regression suite:

```powershell
$env:EXPO_OFFLINE='1' # Only if the registry/certificate environment prevents Expo's startup checks.
npx playwright test e2e/redesign.spec.ts
```

The suite mocks Supabase only inside Playwright. Production app code has no mock account or data fallback. It covers the auth switch, create/cancel/draft recovery, detail and confirmation navigation, independent writes, failure/retry, narrow empty states, large lists, and offline recovery. Screenshots are generated under `test-results/` and are intentionally not committed.

Other checks: `npm run typecheck`, `npm run lint`, `npm run test:commands`, `npm run test:streaks`, `npm run doctor`, and `npx expo export --platform ios --output-dir dist-redesign-ios`.

Recorded results on September 8, 2026: typecheck and lint passed; application-command tests passed 9/9; streak tests passed 9/9; redesigned browser flows passed 4/4; iOS export succeeded (5.23 MB Hermes bundle). Login, dashboard, create, detail, history, archive, delete, and 320 px empty-state screenshots were visually inspected. These results do not establish physical-device performance or live-backend integration.

Current limitations:

- Expo Doctor passed 16/18 checks; the Expo-schema and React Native Directory checks could not complete because of certificate/network failures. TLS validation was not disabled.
- Docker's Linux engine was unavailable, so real local-Supabase end-to-end verification was not completed for this redesign. No database reset or migration was performed.
- iOS bundle export is not a physical-device test. Keyboard avoidance, Dynamic Type, VoiceOver, Android back handling, and native sheet detents/gestures still need device checks.
- Editable Figma sync and its prototype QA remain incomplete; the UI design stage should not be represented as fully signed off.

## Mobile handoff

Start the real app with `npm start -- --lan` and scan its QR code from a compatible development client. For a local Supabase backend, Docker and Supabase must be running, and `EXPO_PUBLIC_SUPABASE_URL` must use this computer's reachable LAN address rather than localhost. The phone and computer must share a network. Do not use Playwright's mocked server as a mobile backend.

A visible “Rally - mobile preview” terminal was started on port 8081. The local ignored `.env` backend address was updated from the stale `192.168.2.79` address to the detected `192.168.2.16:55321`. The address may change again with DHCP. Metro's status endpoint responded successfully; the backend remains unavailable until Docker/Supabase starts.

No dependencies, database schema, or release/deployment boundaries changed.
