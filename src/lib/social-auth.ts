import type { Session } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { getAuthRedirectUrl } from '@/lib/auth-redirect';
import { getOAuthCode } from '@/lib/oauth-callback';
import { supabase } from '@/lib/supabase';

export type SocialProvider = 'google' | 'apple';
const exchanges = new Map<string, Promise<Session>>();
let signInPending = false;

export async function completeSocialRedirect(url: string): Promise<Session> {
  const code = getOAuthCode(url, getAuthRedirectUrl());
  const existing = exchanges.get(code);
  if (existing) return existing;
  const exchange = (async () => {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.session) throw new Error('This sign-in link expired or could not be verified. Please start again.');
    return data.session;
  })();
  exchanges.set(code, exchange);
  // Router and the auth browser can deliver the same callback concurrently.
  // Bound both lifetime and size without logging codes or session tokens.
  void exchange.finally(() => setTimeout(() => exchanges.delete(code), 30_000)).catch(() => {});
  if (exchanges.size > 8) exchanges.delete(exchanges.keys().next().value!);
  return exchange;
}

export function isSocialProviderEnabled(provider: SocialProvider) {
  return provider === 'google'
    ? process.env.EXPO_PUBLIC_GOOGLE_AUTH_ENABLED === 'true'
    : process.env.EXPO_PUBLIC_APPLE_AUTH_ENABLED === 'true';
}

export async function signInWithSocialProvider(provider: SocialProvider): Promise<Session | null> {
  if (signInPending) return null;
  if (!isSocialProviderEnabled(provider)) {
    throw new Error(`${provider === 'google' ? 'Google' : 'Apple'} sign-in is not configured yet. You can continue with email.`);
  }
  signInPending = true;
  try {
    if (provider === 'apple' && Platform.OS === 'ios') {
      if (!await AppleAuthentication.isAvailableAsync()) throw new Error('Apple sign-in is unavailable on this device. Please use email.');
      const nonce = Crypto.randomUUID();
      const state = Crypto.randomUUID();
      const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, nonce);
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL], nonce: hashedNonce, state,
      });
      if (!credential.identityToken || credential.state !== state) throw new Error('Apple sign-in could not be verified. Please try again.');
      const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'apple', token: credential.identityToken, nonce });
      if (error || !data.session) throw new Error('We could not finish Apple sign-in. Please try again or use email.');
      return data.session;
    }
    if (Platform.OS !== 'web' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
      throw new Error('Social sign-in needs a Rally development build. Use email while testing in Expo Go.');
    }
    const redirectTo = getAuthRedirectUrl();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider, options: { redirectTo, skipBrowserRedirect: true, ...(provider === 'google' ? { queryParams: { prompt: 'select_account' } } : {}) },
    });
    if (error || !data.url) throw new Error('We could not start sign-in. Please try again or use email.');
    if (new URL(data.url).searchParams.get('code_challenge_method') !== 's256') {
      throw new Error('Secure sign-in is unavailable in this runtime. Use a Rally development build or a secure browser.');
    }
    if (Platform.OS === 'web') {
      // Same-tab navigation avoids popup blocking; callback exchanges the code.
      window.location.assign(data.url);
      return null;
    }
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success') return null;
    return await completeSocialRedirect(result.url);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ERR_REQUEST_CANCELED') return null;
    throw error;
  } finally {
    signInPending = false;
  }
}
