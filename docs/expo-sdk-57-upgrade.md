# Expo SDK 57 upgrade

## Reason and scope

The user's installed Expo Go supports SDK 57, while Rally used SDK 54. The user approved upgrading Rally. The migration was performed incrementally: Expo 55.0.26, then 56.0.21, then 57.0.21. Product flows and backend schema were preserved.

Official references: [upgrade walkthrough](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/), [SDK 55 notes](https://expo.dev/changelog/sdk-55), [SDK 56 notes](https://expo.dev/changelog/sdk-56), and [SDK 57 notes](https://expo.dev/changelog/sdk-57). Compatible module versions were taken from each installed Expo package's bundled native-module manifest and checked with Expo CLI.

## Final versions and implementation changes

- Expo 57.0.21; React Native 0.86.3; React/React DOM 19.2.3; Expo Router 57.0.20.
- Expo/native modules and lint configuration aligned to SDK 57; stale optional Reanimated/Worklets packages replaced with explicit compatible versions (4.5.1 / 0.10.1).
- TypeScript 6.0.3, explicit React/Node types, and a direct Node typings dependency for the existing test files.
- Expo Doctor pinned locally at 1.20.4 instead of downloading a potentially changing version through `npx`.
- React Hook Form subscriptions use `useWatch` to satisfy the newer React Compiler lint checks.
- Playwright launches Expo directly through Node, avoiding a separate npm launcher selecting another Node version.
- `.node-version` recommends Node 24. The Windows mobile launcher accepts an explicit Node executable and requires Node 24.3+ for its system-certificate option.

SDK 56 raises the minimum iOS version to 16.4; SDK 57 retains that requirement. No native directories, EAS builds, or backend migrations were generated.

## Certificate and runtime handling

The machine's global Node was v20.19.6, while the available bundled runtime was v24.19.0. npm's existing user configuration referenced a Norton CA file, causing registry download failures. Installation used a temporary isolated npm user configuration plus Node's trusted-system-CA support. That temporary configuration was removed afterward; global npm/certificate settings were not modified, and TLS validation was never disabled.

A PATH-based terminal launch still selected the global Node executable. `scripts/start-mobile.ps1` now invokes the selected Node executable explicitly. The current preview uses the bundled Node 24 executable and serves port 8081 on the LAN.

## Verification

- SDK 55: dependency compatibility and type checks passed.
- SDK 56: dependency compatibility and type checks passed after adding TypeScript 6's explicit test typings.
- SDK 57: `npm run typecheck` and `npm run lint` passed without lint warnings; `expo install --check` reported dependencies up to date.
- `npm run doctor`: **21/21 passed**.
- Application commands: **9/9 passed**. Streak classification: **9/9 passed**. Browser regression flows: **4/4 passed**, including the final `useWatch` change.
- iOS release bundle export succeeded on SDK 57 (approximately 5.1 MB Hermes bundle).
- The restarted server returned HTTP 200 for the iOS manifest, advertising SDK `57.0.0` and runtime `exposdk:57.0.0`.
- The LAN URL `192.168.2.16:8081` served both the manifest and final iOS development bundle with HTTP 200 (10,816,390 bundle bytes).

The exported release bundle preceded the final form-subscription cleanup; the final browser suite and live iOS development bundle verify those source changes. Physical-device interaction remains a user/device check.

## Remaining limits

- Real Supabase login and data operations still need the configured backend running. The browser regression suite uses isolated mocked responses; it is not a live-backend test.
- npm audit reports **18 transitive advisories: 14 moderate and 4 high**. High-severity package names are `@xmldom/xmldom`, `brace-expansion`, `js-yaml`, and `shell-quote`. No blind `npm audit fix --force` was applied. Expo compatibility checks passing does not establish a clean security audit; review and patch these dependency chains before release.
- A working manifest/bundle does not prove iPhone keyboard, accessibility, or sheet interactions. Scan the new SDK 57 QR code and test those on the phone.
- The earlier design notes' SDK 54-era verification results remain historical. This document supersedes their Expo Doctor certificate limitation for the verified Node 24 setup.
