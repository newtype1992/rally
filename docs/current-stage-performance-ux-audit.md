# Rally Current-Stage Performance and UI/UX Audit

## Audit status

- Date: 2026-06-29
- Stage: QA + Testing, in progress
- Build under test: Expo SDK 54 development build in Expo Go
- Backend: local Supabase CLI 2.67.1 on the LAN-local development stack
- Target device: physical iPhone; model, iOS version, and Expo Go version pending guided test
- Scope: findings only; no application fixes are included in this pass

## Release surface

In scope:

- Email/password sign-up and login
- Auth gating and session restoration
- Empty and populated habit dashboard
- Habit creation and draft-preserving dismissal
- Mark done and undo
- Weekly and all-time progress
- Archive and delete confirmations
- Loading, error, offline, recovery, accessibility, and 50-habit scale behavior

Deferred and not classified as defects:

- EAS and App Store distribution
- iOS bundle identifier and release metadata
- Analytics, notifications, reminders, social features, and native Apple integrations

## Verification completed

| Check | Result |
| --- | --- |
| TypeScript | Pass |
| Expo lint | Pass |
| Expo Doctor | Pass, 18/18 checks |
| Application command tests | Pass, 9/9 |
| Streak classification tests | Pass, 9/9 |
| Supabase pgTAP/RLS tests | Pass, 21/21 |
| Supabase schema lint | Pass |
| Integrated personal V1 Playwright flow | Pass, 1/1 |
| Expo module autolinking | Pass, 16 modules verified |
| iOS Expo export | Pass, 1,581 modules; 5.21 MB Hermes bundle |
| Generated Expo config | Pass for `rally` scheme and Expo Router plugin |
| Dashboard database benchmark | 2.48 ms locally with 55 active habits |
| Habit-detail database benchmark | 4.91 ms locally on the completion-heavy seed |
| Physical iPhone baseline | Pending |
| VoiceOver and Dynamic Type | Pending |
| Offline and reconnection behavior | Pending |

The web integration run emitted a React Native Web `props.pointerEvents` deprecation warning from framework code and two `Premature close` messages while Playwright stopped its temporary development server. The test itself passed, and no project source uses the deprecated prop.

## Findings

Severity definitions:

- High: blocks or materially compromises a core flow or accessibility path.
- Medium: creates substantial friction, misleading feedback, poor recovery, or credible scale risk.
- Low: polish or maintainability concern with limited immediate user impact.

### A11Y-01 — Habit cards contain nested interactive controls

- Severity: High
- Status: Code-confirmed; physical VoiceOver and tap behavior pending
- Evidence: `HabitCard` renders the whole card as a button while nesting `Mark done` or `Undo` buttons inside it.
- Impact: Screen readers receive an ambiguous nested-control hierarchy, and an inner action may also trigger card navigation depending on event handling.
- Reproduction: On the populated dashboard, focus a habit card and its action with VoiceOver, then activate `Mark done` or `Undo` and observe focus order and navigation.
- Recommendation: Separate the navigation target from the action zone instead of nesting pressable buttons.

### A11Y-02 — Form fields and validation feedback lack explicit accessibility relationships

- Severity: High
- Status: Code-confirmed; physical VoiceOver behavior pending
- Evidence: visible field labels are sibling text nodes, while `TextInput` receives no `accessibilityLabel`; helper and error text are not associated or announced as live feedback.
- Impact: VoiceOver may announce only placeholder/value information and may not announce validation errors after submission.
- Reproduction: Navigate Login, Sign up, and Create Habit using VoiceOver; submit invalid values and record each announcement.
- Recommendation: Explicitly label inputs and connect or announce helper/error content.

### PERF-01 — Dashboard renders every habit inside a `ScrollView`

- Severity: Medium
- Status: Code-confirmed; 50-habit device behavior pending
- Evidence: the dashboard maps every habit into a shared `ScrollView`; no virtualized list is used.
- Impact: render cost, memory use, and interaction latency grow with the complete habit count even when most cards are off-screen.
- Reproduction: Open a 50-habit account, scroll end to end, navigate into detail, return, and observe responsiveness.
- Recommendation: Use a virtualized list with stable keys and memoized card rows when scale testing confirms visible cost.

### UX-01 — One habit mutation puts every dashboard card into a busy state

- Severity: Medium
- Status: Code-confirmed; physical behavior pending
- Evidence: every card receives the same `markDone.isPending || undo.isPending` flag.
- Impact: a mutation on one habit replaces or disables actions across all cards, obscuring which habit is changing and preventing unrelated actions.
- Reproduction: On a multi-habit dashboard, mark one habit done and observe all action zones while the request is pending.
- Recommendation: Track the pending habit identifier and apply busy feedback only to the affected card.

### UX-02 — Offline writes can remain pending without recovery guidance

- Severity: Medium
- Status: Code-confirmed; physical airplane-mode behavior pending
- Evidence: React Query is connected to NetInfo, but the UI never consumes the available network-status hook or renders an offline/paused state.
- Impact: an offline mutation can show an indefinite loading control without explaining that the action is paused until connectivity returns.
- Reproduction: Disable connectivity, attempt mark/undo or create, wait 10 seconds, reconnect, and observe messaging and eventual state.
- Recommendation: Expose offline state, distinguish paused from submitting, and provide retry/recovery copy.

### UX-03 — Create Habit submit is enabled before the form is valid

- Severity: Medium
- Status: Confirmed design deviation
- Evidence: the approved wireframe requires disabled submit until both inputs are valid, but the button is disabled only while submitting.
- Impact: users discover basic requirements only after pressing the primary action.
- Reproduction: Open Create Habit with an empty name or invalid target and inspect the primary action before submission.
- Recommendation: Derive disabled state from form validity while retaining inline validation copy.

### A11Y-03 — Archive and delete text actions do not meet the shared control contract

- Severity: Medium
- Status: Code-confirmed; touch and VoiceOver verification pending
- Evidence: both actions use bare `Pressable` wrappers around supporting-size text with no button role, minimum height, or expanded hit target.
- Impact: the controls can be difficult to tap and may not be announced as buttons.
- Reproduction: On Habit Detail, inspect the VoiceOver role and tap the outer edges of each label.
- Recommendation: Use an accessible quiet/danger button treatment with at least a 44-point target.

### A11Y-04 — Several visual tokens miss contrast targets

- Severity: Medium
- Status: Confirmed by token calculation
- Evidence: muted placeholder text on the input background is 3.22:1, danger text on the input background is 4.14:1, and the default border against the input background is 1.36:1.
- Impact: placeholders, error text, and control boundaries may be difficult to perceive, especially at the 11–13 point sizes used by the UI.
- Reproduction: Inspect form and error states under reduced brightness and Increased Contrast.
- Recommendation: adjust muted/danger text and boundary tokens to meet WCAG text and non-text contrast requirements.

### A11Y-05 — The completion grid creates 84 separate VoiceOver stops

- Severity: Medium
- Status: Code-confirmed; physical navigation burden pending
- Evidence: each of the 84 date cells is individually accessible with a long generated label.
- Impact: reaching content after the grid requires excessive swiping and makes the detail screen impractical for screen-reader users.
- Reproduction: Starting at `Last 12 weeks`, swipe through the grid with VoiceOver and count the steps required to reach the legend or recent completions.
- Recommendation: provide a concise accessible summary and group or selectively expose detailed dates.

### REL-01 — Session bootstrap has no failure completion path

- Severity: Medium
- Status: Code-confirmed; failure injection pending
- Evidence: `supabase.auth.getSession()` sets `sessionInitialized` only in the fulfilled promise path and has no rejection handler.
- Impact: an AsyncStorage or auth-client failure can leave the app on the loading screen indefinitely.
- Reproduction: inject a rejected session read or unavailable storage adapter and relaunch.
- Recommendation: always complete initialization, retain the error, and show an actionable auth recovery state.

### REL-02 — Three mutation handlers can reject past the press event

- Severity: Medium
- Status: Code-confirmed; network-failure behavior pending
- Evidence: Create Habit, Archive, and Delete await `mutateAsync` without a local catch; React Query records the error, but the event promise can still reject.
- Impact: development builds may report unhandled promise rejections while the UI simultaneously renders an error state.
- Reproduction: interrupt each request and inspect the Expo console and on-screen recovery behavior.
- Recommendation: contain expected mutation failures at the event boundary while preserving React Query error state.

### UX-04 — The app exposes no sign-out control

- Severity: Medium
- Status: Confirmed implementation/documentation mismatch
- Evidence: a `signOut` API exists and README lists sign-out as a capability, but no route or control invokes it.
- Impact: users cannot switch accounts or deliberately remove the persisted session from the UI.
- Reproduction: Navigate every authenticated surface and attempt to sign out.
- Recommendation: either add an approved low-prominence sign-out path or correct the documented capability and explicitly defer it.

## Performance assessment so far

- The database is not the current bottleneck at tested scale. Existing composite completion and habit indexes support the core queries, and current local execution remains under 5 ms.
- The primary scale concern is client rendering because the complete dashboard list mounts at once.
- The 21-second Metro export time is build-tool time, not an app startup measurement, and is not classified as a runtime defect.
- Expo Go measurements will be reported as development responsiveness only and will not be used to claim App Store build performance.

## Guided iPhone checklist

Pending steps:

1. Capture device and software versions plus cold-start timing.
2. Verify auth switching, invalid login, successful login, and successful disposable sign-up.
3. Verify empty, populated, and 50-habit dashboard behavior.
4. Verify Create Habit sheet, keyboard, validation, draft retention, errors, and duplicate-submit protection.
5. Verify dashboard and detail mark/undo behavior, including offline/reconnect.
6. Verify detail scrolling, completion grid, archive, delete, and cancellation.
7. Repeat critical flows with Dynamic Type and VoiceOver.
8. Record screenshots, observed timings, unexpected navigation, clipping, jank, focus, and announcements.

## Readiness score

Pending physical-iPhone completion. Automated correctness and local database health are strong, but the current code-confirmed accessibility and recovery issues prevent a final readiness rating above “needs remediation.”

## Fixed issues

None. This is a findings-only audit.

## Audit limitations

- No iOS simulator is available in the Windows workspace.
- No EAS development or release build is in scope.
- The QA skill references `global-systems/checklists/QA-CHECKLIST.md`, but that checklist is not present in the installed skill files. The skill quality checklist and report template were used instead.

## Execution trace

- Skills: `qa-testing-skill`, `mobile-ux-design-skill`, `supabase`, `supabase-postgres-best-practices`
- Template: `QA-TEST-REPORT-TEMPLATE.md`
- Checklist: QA skill quality checklist; external QA checklist unavailable
