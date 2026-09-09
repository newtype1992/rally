# Create Habit blank sheet — September 9, 2026

Update: the subsequent approved Midnight implementation adds a fixed footer using an explicitly sized safe-area frame. The intrinsic root ScrollView fallback below remains for sheets without fixed footers. See `midnight-design.md`; the new sheet layout still requires physical-device verification.

## Report and diagnosis

The mobile tester reports a blank screen when opening Add habit. The configured
local backend health endpoint returns HTTP 200. Calling `create_habit` as the
seeded authenticated user succeeds inside a transaction that is then rolled
back; no diagnostic habit was retained. The browser create/draft/retry flows
also pass before the change. This points to native presentation rather than a
confirmed save failure.

The suspected cause is the `flex: 1` wrapper around the Create Habit ScrollView
inside a fixed-detent iOS form sheet. React Navigation documents
[intrinsic sizing limitations for this combination](https://reactnavigation.org/docs/native-stack-navigator/#platform-considerations).
No mobile debugger was attached when checked, so the exact native layout failure
could not be observed directly.

## Scoped adjustment

For scrollable iOS sheets only, `RallyScreen` now returns a root ScrollView with
an intrinsic (`auto`) flex basis instead of wrapping it in a zero-basis flex
container. Existing sheet detents, design, keyboard insets, validation, draft
preservation, and close/cancel behavior remain unchanged. Android and web retain
their existing layout. No database, dependency, or setup changes were made.

## Verification

- TypeScript and targeted ESLint checks passed.
- Expo Doctor passed all 21 checks.
- iOS production bundle export succeeded.
- All four mocked browser regression tests passed after the adjustment.
- Physical-device verification remains required: reload Expo Go, open Add habit,
  confirm fields render, type with the keyboard open, scroll to Create habit,
  cancel/reopen to verify the draft, then save and confirm the dashboard entry.
  Repeat at both sheet heights. Browser tests cannot verify native sheet sizing.
