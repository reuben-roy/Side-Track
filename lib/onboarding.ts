import { getPreference, setPreference } from './database';

const ONBOARDING_COMPLETE_KEY = 'onboarding_completed';

/**
 * Check if user has completed onboarding
 */
export async function isOnboardingComplete(): Promise<boolean> {
  try {
    const completed = await getPreference<boolean>(ONBOARDING_COMPLETE_KEY, false);
    return completed === true;
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return false;
  }
}

/**
 * Mark onboarding as complete
 */
export async function setOnboardingComplete(): Promise<void> {
  try {
    await setPreference(ONBOARDING_COMPLETE_KEY, true);
  } catch (error) {
    console.error('Error setting onboarding complete:', error);
  }
}

/**
 * Reset onboarding (for testing/debugging)
 */
export async function resetOnboarding(): Promise<void> {
  try {
    await setPreference(ONBOARDING_COMPLETE_KEY, false);
  } catch (error) {
    console.error('Error resetting onboarding:', error);
  }
}

