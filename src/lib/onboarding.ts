export const ONBOARDING_VERSION = 1;

// This is a UI preference, never an authorization or access-control claim.
export function hasCompletedOnboarding(metadata: Record<string, unknown> | undefined) {
  return metadata?.rally_onboarding_version === ONBOARDING_VERSION;
}
