/** Accept only our exact callback destination; never trust a caller-supplied next URL. */
export function getOAuthCode(url: string, expectedRedirect: string): string {
  const actual = new URL(url);
  const expected = new URL(expectedRedirect);
  if (actual.protocol !== expected.protocol || actual.host !== expected.host || actual.pathname !== expected.pathname) {
    throw new Error('Unexpected sign-in callback. Please start again.');
  }
  if (actual.searchParams.has('error') || new URLSearchParams(actual.hash.slice(1)).has('error')) {
    throw new Error('Sign-in was not completed. Please try again.');
  }
  const codes = actual.searchParams.getAll('code');
  if (codes.length !== 1 || !codes[0] || codes[0].length > 4096) {
    throw new Error('This sign-in link is incomplete or expired. Please start again.');
  }
  return codes[0];
}
