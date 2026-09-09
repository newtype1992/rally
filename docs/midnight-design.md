# Midnight / Newtype implementation

Approved September 9, 2026: the user approved the Midnight palette, reviewed local revision 02, and requested implementation. The local review was explicitly accepted as a substitute while Figma was unavailable. Figma has not been changed.

Reference: `C:/Users/Kareem/.codex/visualizations/2026/06/29/019f1396-8aac-73c1-83ac-2db02508351a/rally-visual-board.html` (revision 02). Product, data and navigation constraints remain governed by `C:/Users/Kareem/Newtype/04-ideas/habit-tracker-concept`.

## Design

- Midnight background `#111827`, surface `#1B2537`, periwinkle actions `#91ABFF`, mint completion `#7CD6AF`, text `#F2F5FA`, secondary text `#AAB6C9`.
- Original geometric Rally R, lowercase wordmark and entry-only Made by Newtype signature. This is the approved new product signature, not a pre-existing Newtype identity.
- Platform system fonts, 18px habit names, 16px inputs, 44–48px minimum action regions, 18px cards, 12px controls and 22px horizontal screen padding.
- Dashboard: week range, compact cards, separate navigation and today actions, quiet top add/logout controls, no decorative copy or global score.
- Create: two fields, preserved draft, scrollable body and fixed actions. An explicitly sized safe-area frame avoids relying solely on intrinsic flex sizing inside the native sheet. Keyboard avoidance is enabled on iOS; Android uses window resize. Both detents require physical-device verification.
- Detail: weekly progress and today's action, 2×2 all-time metrics, existing Ember-to-Violet history, accessible date disclosure and quiet management actions.
- Login remains default, no auth back button, direct sign-up switching; loading, offline, validation, failed-save and destructive confirmation states remain real states, not mock controls.

## Deliberate differences from sample-only mock data

- Preserve the actual six-character password minimum; no auth policy change.
- Delete remains the existing soft-delete command, so confirmation does not falsely promise physical erasure of completion history. Archive copy explains that restoration is not available in V1.
- Real dates/counts replace illustrative data. Recent dates are available through the history disclosure instead of a second duplicate list.
- Web uses the actual route's full-height form layout; native retains its form-sheet presentation.
- App-store icon assets are unchanged. The approved in-app wordmark is not automatically a release-ready icon asset set.

## Verification

- TypeScript and ESLint: passed on final code.
- Expo Doctor: 21/21 checks passed after adding the Expo-compatible vector package.
- Expo public configuration: `rally` scheme, dark appearance and router/splash plugins confirmed.
- iOS production export: passed on final code (1,896 modules).
- Mocked browser UI suite: 5/5 passed, including core navigation/auth/creation, failed-create recovery, empty state, offline controls, isolated pending writes, bounded 50-habit rendering, 320/393/430px widths, long names, positive integer validation and fixed-footer bounds at a short viewport height.
- Streak classification: 9/9 passed. Application commands: 9/9 passed.
- Visually reviewed actual app screenshots for login, dashboard, create, detail and confirmation. A web SVG accessibility-prop warning found in the first pass was fixed, and the final core flow also checks browser console errors.
- npm audit reports 18 dependency advisories (14 moderate, 4 high, 0 critical). No unrelated automatic dependency upgrades or audit fixes were applied. This is not a security/release sign-off.

Native follow-up: open and resize Create Habit at both sheet detents, type with the keyboard visible, reach both actions, dismiss/reopen the draft, save, and check large text and screen-reader navigation. Browser verification and an iOS bundle build are not a substitute for physical-device testing. Backend schema/commands were unchanged; live-backend integration tests were not rerun for this visual pass.

The earlier `docs/create-habit-blank-sheet.md` describes the previous intrinsic-scroll workaround. Fixed-footer sheets now use the bounded layout described here; sheets without footers retain that workaround.

## Mobile week-label compatibility fix

The mobile dashboard reported `TypeError: undefined is not a function` at the new `Intl.DateTimeFormat.formatRange` call. Replaced it with `formatWeekRange`, which uses supported individual date formatting and UTC calendar arithmetic. The compact label is preserved, including month/year boundaries. No polyfill, data or dependency change is needed.

`npm run test:dates` explicitly removes `formatRange` while checking ordinary weeks, cross-month/year weeks, leap years and a daylight-saving transition week. The browser core-flow regression now removes that method before the app loads, so desktop support cannot hide this failure again. Physical-device reload remains the final native confirmation.
