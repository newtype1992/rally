import { makeRedirectUri } from 'expo-auth-session';

export function getAuthRedirectUrl() {
  return makeRedirectUri({ scheme: 'rally', path: 'auth/callback', native: 'rally://auth/callback' });
}
