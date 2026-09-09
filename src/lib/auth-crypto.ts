import * as ExpoCrypto from 'expo-crypto';
import { Platform } from 'react-native';

// Auth JS requires getRandomValues + subtle.digest for S256 PKCE. Hermes may
// lack WebCrypto; never silently fall back to a plain-text code challenge.
if (Platform.OS !== 'web') {
  const runtime = globalThis as unknown as { crypto?: { getRandomValues?: unknown; subtle?: unknown } };
  runtime.crypto ??= {};
  runtime.crypto.getRandomValues ??= ExpoCrypto.getRandomValues;
  runtime.crypto.subtle ??= {
    digest: async (algorithm: string | { name: string }, data: BufferSource) => {
      const name = typeof algorithm === 'string' ? algorithm : algorithm.name;
      if (name.toUpperCase() !== 'SHA-256') throw new Error('Unsupported authentication digest.');
      return ExpoCrypto.digest(ExpoCrypto.CryptoDigestAlgorithm.SHA256, data);
    },
  };
}
