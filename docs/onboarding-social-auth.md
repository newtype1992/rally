# Onboarding and Google / Apple authentication

## Scope and state

Requested by the user September 9, 2026. Extends the approved Midnight UI; does not add reminders, social habits, extra personal questions or new habit data fields.

Current decision: the user has deferred provider activation and signed iOS build setup. Keep Google/Apple availability flags off; retain the implementation for later. Email authentication and onboarding remain available for current testing.

Implementation includes a two-step, skippable introduction after authentication. It explains weekly targets, once-per-day completion/Undo and history, then opens the existing habit form. Completion/skip writes `rally_onboarding_version: 1` to the signed-in user's Supabase Auth metadata. The flag is a UI preference, never used for authorization/RLS. Every account without the flag sees the introduction once, including existing accounts. Returning accounts with the flag go straight to their habits. Failed saving keeps the current step; offline writes are disabled. Cancelling the habit form returns to the dashboard; setup does not automatically create a habit or record a completion.

Google and Apple buttons are available on login and sign-up; the provider determines whether the account is new. They are disabled with an explanatory message until each provider's public availability flag is enabled. No credentials are bundled. Existing email/password remains available.

## Authentication architecture

- Browser-based Google on mobile and web, browser-based Apple on Android/web, native Apple on supported iOS.
- Supabase OAuth uses PKCE with an exact callback destination and S256 challenges. The native crypto adapter supplies secure randomness and SHA-256 through Expo Crypto when Hermes lacks WebCrypto. The service rejects a plain challenge before navigating.
- Native Apple uses a fresh random state and nonce; Apple receives SHA-256(nonce), and Supabase receives the original nonce with the identity token. No client-side token decoding is trusted as authentication.
- Only a verified Supabase session unlocks protected routes. Provider errors/cancellation remain recoverable through email sign-in. Callback codes are not logged; the callback route is replaced after verification or failure, removing query strings from the current history entry. Native router/browser duplicate delivery shares one short-lived exchange promise.
- No arbitrary `next` URL, implicit token-fragment login, automatic custom account merging, extra provider scopes, or backend/RLS schema changes. Supabase manages identity linking; confirm intended account behaviour with real provider tests.
- Email confirmation links now target the same callback using PKCE. The verifier must exist on the original device/browser. A confirmed user can still return to email/password login if the callback cannot be exchanged on another device.

## Required setup — not completed by app code

1. Choose the final Rally iOS bundle identifier (and Android package for builds). No identifier has been invented here. Build/signing account setup remains user-owned.
2. In the target Supabase project's Auth redirect allowlist, add **exact** callbacks:
   - Development/standalone native: `rally://auth/callback`.
   - Local web: `http://localhost:8081/auth/callback` (and `http://127.0.0.1:8081/auth/callback` if used).
   - Test web server: `http://localhost:8082/auth/callback` only when using live providers there.
   - Production: the actual HTTPS web origin plus `/auth/callback`.
3. Google: configure the consent screen and a Web OAuth client in Google Cloud. Put the **Supabase** callback (`https://<project-ref>.supabase.co/auth/v1/callback`) in Google's authorized redirect URIs, not the Rally native callback. Store the client ID and secret in Supabase's Google provider settings. Enable the provider, then set `EXPO_PUBLIC_GOOGLE_AUTH_ENABLED=true` in the app build environment.
4. Apple: enable Sign in with Apple for Rally's App ID. Configure its Services ID and the Supabase HTTPS callback for browser login. Configure the provider's allowed client IDs with **Services ID first**, followed by the native bundle ID. Store the signing-key/client-secret configuration in Supabase, never in client environment variables. Apple's browser client secret requires renewal before expiry (maximum six months). Enable the provider, then set `EXPO_PUBLIC_APPLE_AUTH_ENABLED=true`.
5. Restart/rebuild after environment/native entitlement changes. `expo-apple-authentication` and `ios.usesAppleSignIn` are configured, but signing and provider activation still require the above setup.

Local Supabase provider settings are currently disabled and its redirect URLs still need configuration if used for real social auth. This implementation does not enable providers with missing secrets or reset/restart the user's database. Use a hosted HTTPS Supabase endpoint for Apple browser testing; Apple web return URLs do not support a plain localhost endpoint.

**Expo Go is not an end-to-end Google OAuth test environment.** Use a Rally development build with the registered scheme. Expo Go native Apple testing uses different app identifiers; a signed Rally build is required to validate the actual account setup. Local email login/onboarding can still be tested in Expo Go.

## Verification boundary

September 9 verification: TypeScript and ESLint passed; Expo Doctor passed all 21 checks using the Windows trusted certificate store; the iOS production JavaScript bundle exported successfully. All 13 unit tests and all 10 Midnight/browser regression tests passed. Screenshots were inspected for the login and both onboarding steps; narrow-screen coverage includes 320px width. This is not a signed native build or physical-device test.

Tests use mocked provider responses to verify our app's redirects, S256/verifier transport, session handling, onboarding, skip, save recovery and first-habit creation. They cannot verify Google consent, Apple entitlement/audience, provider secrets, callback allowlists, mail delivery, identity linking, or physical-device cancellation. Real-provider activation and tests remain outstanding until configuration is supplied.

## Sources

- [Supabase Google configuration](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Supabase Apple configuration](https://supabase.com/docs/guides/auth/social-login/auth-apple)
- [Supabase PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow)
- [Expo authentication and development-build requirement](https://docs.expo.dev/guides/authentication/)
- [Expo native Apple authentication](https://docs.expo.dev/versions/latest/sdk/apple-authentication/)
- [Google button branding](https://developers.google.com/identity/branding-guidelines) — the bundled `assets/google-g.png` is Google's official logo asset, not generated artwork.
