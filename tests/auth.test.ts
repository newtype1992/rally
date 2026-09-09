import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getOAuthCode } from '../src/lib/oauth-callback';
import { hasCompletedOnboarding } from '../src/lib/onboarding';

test('onboarding is an explicit versioned account preference', () => {
  assert.equal(hasCompletedOnboarding(undefined), false);
  assert.equal(hasCompletedOnboarding({}), false);
  assert.equal(hasCompletedOnboarding({ rally_onboarding_version: '1' }), false);
  assert.equal(hasCompletedOnboarding({ rally_onboarding_version: 1 }), true);
});

test('OAuth callback accepts code only at exact web/native redirect', () => {
  assert.equal(getOAuthCode('rally://auth/callback?code=one-time', 'rally://auth/callback'), 'one-time');
  assert.equal(getOAuthCode('https://rally.example/auth/callback?code=code', 'https://rally.example/auth/callback'), 'code');
});

test('OAuth callback rejects unexpected destinations, token fragments and malformed/error callbacks', () => {
  const redirect = 'rally://auth/callback';
  for (const url of [
    'evil://auth/callback?code=x', 'rally://evil/callback?code=x', 'rally://auth/other?code=x',
    'rally://auth/callback', 'rally://auth/callback?code=', 'rally://auth/callback?code=a&code=b',
    'rally://auth/callback?error=access_denied&code=x', 'rally://auth/callback#access_token=a&refresh_token=b',
    'rally://auth/callback?code=x#error=access_denied',
  ]) assert.throws(() => getOAuthCode(url, redirect));
});
