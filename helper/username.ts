/**
 * Username Generation Utility
 * 
 * Generates unique, friendly usernames for users during onboarding.
 * Format: [adjective]-[noun]-[number]
 * Example: "Swift-Tiger-42"
 * 
 * Users can also create custom usernames with flexible validation.
 */

import { supabase } from '@/lib/supabase';

const ADJECTIVES = [
  'Swift', 'Mighty', 'Brave', 'Noble', 'Bold', 'Fierce', 'Rapid', 'Strong',
  'Wild', 'Proud', 'Swift', 'Sharp', 'Bright', 'Calm', 'Cool', 'Fast',
  'Great', 'Hard', 'High', 'Hot', 'Huge', 'Kind', 'Large', 'Light',
  'Long', 'Loud', 'New', 'Old', 'Quick', 'Quiet', 'Right', 'Small',
  'Smart', 'Smooth', 'Soft', 'Solid', 'Steady', 'Still', 'Strange',
  'Strict', 'Strong', 'Sweet', 'Tall', 'Tough', 'True', 'Warm', 'Wise'
];

const NOUNS = [
  'Tiger', 'Eagle', 'Wolf', 'Lion', 'Bear', 'Hawk', 'Falcon', 'Panther',
  'Shark', 'Rhino', 'Bison', 'Stallion', 'Stallion', 'Phoenix', 'Dragon',
  'Warrior', 'Champion', 'Gladiator', 'Spartan', 'Viking', 'Samurai',
  'Fighter', 'Guardian', 'Defender', 'Hunter', 'Ranger', 'Scout', 'Rider',
  'Runner', 'Jumper', 'Lifter', 'Athlete', 'Competitor', 'Contender',
  'Challenger', 'Hero', 'Legend', 'Master', 'Elite', 'Ace', 'Star', 'Pro'
];

/**
 * Generate a random username
 * Format: [adjective]-[noun]-[random 2-3 digit number]
 * 
 * @returns A randomly generated username
 */
export function generateUsername(): string {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const number = Math.floor(Math.random() * 900) + 10; // 10-999
  
  return `${adjective}-${noun}-${number}`;
}

/**
 * Generate a username based on user profile data
 * Uses gender and bodyweight to create a personalized username
 * 
 * @param gender - User's gender ('male' or 'female')
 * @param bodyweightLbs - User's bodyweight in pounds
 * @param userId - Optional user ID to use as fallback
 * @returns A username generated from profile data
 */
export function generateUsernameFromProfile(
  gender: string | null,
  bodyweightLbs: number | null,
  userId?: string | null
): string {
  // Gender-based adjectives
  const maleAdjectives = ['Mighty', 'Bold', 'Strong', 'Brave', 'Noble', 'Fierce', 'Swift', 'Proud'];
  const femaleAdjectives = ['Swift', 'Bright', 'Bold', 'Strong', 'Brave', 'Noble', 'Fierce', 'Proud'];
  const neutralAdjectives = ['Swift', 'Bold', 'Strong', 'Brave', 'Noble', 'Fierce', 'Rapid', 'Proud'];
  
  // Weight-based noun selection (categorize by weight ranges)
  const getWeightCategory = (weight: number | null): string => {
    if (!weight) return 'Athlete';
    if (weight < 130) return 'Falcon';
    if (weight < 150) return 'Eagle';
    if (weight < 170) return 'Hawk';
    if (weight < 190) return 'Tiger';
    if (weight < 210) return 'Lion';
    if (weight < 230) return 'Bear';
    return 'Rhino';
  };
  
  // Select adjective based on gender
  let adjective: string;
  if (gender === 'male') {
    adjective = maleAdjectives[Math.floor(Math.random() * maleAdjectives.length)];
  } else if (gender === 'female') {
    adjective = femaleAdjectives[Math.floor(Math.random() * femaleAdjectives.length)];
  } else {
    adjective = neutralAdjectives[Math.floor(Math.random() * neutralAdjectives.length)];
  }
  
  // Get noun based on weight category
  const noun = getWeightCategory(bodyweightLbs);
  
  // Generate number from bodyweight or user ID
  let number: number;
  if (bodyweightLbs) {
    // Use last 2-3 digits of bodyweight, ensuring it's 2-3 digits
    const weightStr = Math.round(bodyweightLbs).toString();
    const lastDigits = weightStr.slice(-3);
    number = parseInt(lastDigits) || Math.floor(Math.random() * 900) + 10;
    // Ensure it's between 10-999
    if (number < 10) number = number + 10;
    if (number > 999) number = parseInt(number.toString().slice(-3));
  } else if (userId) {
    // Use last few characters of user ID as number
    const idDigits = userId.replace(/[^0-9]/g, '').slice(-3);
    number = parseInt(idDigits) || Math.floor(Math.random() * 900) + 10;
    if (number < 10) number = number + 10;
    if (number > 999) number = parseInt(number.toString().slice(-3));
  } else {
    number = Math.floor(Math.random() * 900) + 10;
  }
  
  return `${adjective}-${noun}-${number}`;
}

/**
 * Validate username format
 * Flexible validation: allows alphanumeric, hyphens, underscores
 * Length: 3-30 characters
 * Must start and end with alphanumeric
 * 
 * @param username - The username to validate
 * @returns true if valid, false otherwise
 */
export function isValidUsername(username: string): boolean {
  if (!username || typeof username !== 'string') return false;
  
  const trimmed = username.trim();
  
  // Length check: 3-30 characters
  if (trimmed.length < 3 || trimmed.length > 30) return false;
  
  // Only allow alphanumeric, hyphens, and underscores
  // Must start and end with alphanumeric
  const pattern = /^[a-zA-Z0-9]([a-zA-Z0-9_-]*[a-zA-Z0-9])?$/;
  
  return pattern.test(trimmed);
}

/**
 * Check if a username is available (not taken)
 * Queries Supabase to see if username already exists
 * 
 * @param username - The username to check
 * @param currentUserId - Optional current user ID to exclude from check (for updates)
 * @returns Promise<boolean> - true if available, false if taken
 */
export async function isUsernameAvailable(
  username: string,
  currentUserId?: string | null
): Promise<boolean> {
  if (!isValidUsername(username)) {
    return false;
  }

  try {
    // Normalize username to lowercase for case-insensitive comparison
    const normalizedUsername = username.trim().toLowerCase();
    
    let query = supabase
      .from('user_strength')
      .select('username, user_id')
      .ilike('username', normalizedUsername) // Case-insensitive comparison
      .limit(1);

    const { data, error } = await query;

    if (error) {
      console.error('Error checking username availability:', error);
      // On error, assume unavailable to be safe
      return false;
    }

    // If no results, username is available
    if (!data || data.length === 0) {
      return true;
    }

    // If checking for current user, allow if it's their own username
    if (currentUserId && data[0].user_id === currentUserId) {
      return true;
    }

    // Username is taken
    return false;
  } catch (error) {
    console.error('Exception checking username availability:', error);
    return false;
  }
}

/**
 * Generate a unique username by trying multiple times
 * Attempts to generate a username that doesn't exist in the database
 * 
 * @param gender - User's gender ('male' or 'female')
 * @param bodyweightLbs - User's bodyweight in pounds
 * @param userId - Optional user ID
 * @param maxAttempts - Maximum number of generation attempts (default: 10)
 * @returns Promise<string> - A unique username
 */
export async function generateUniqueUsername(
  gender: string | null,
  bodyweightLbs: number | null,
  userId?: string | null,
  maxAttempts: number = 10
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = generateUsernameFromProfile(gender, bodyweightLbs, userId);
    const isAvailable = await isUsernameAvailable(candidate, userId);
    
    if (isAvailable) {
      return candidate;
    }
  }

  // If all attempts failed, try random generation
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = generateUsername();
    const isAvailable = await isUsernameAvailable(candidate, userId);
    
    if (isAvailable) {
      return candidate;
    }
  }

  // Last resort: append timestamp to ensure uniqueness
  const base = generateUsernameFromProfile(gender, bodyweightLbs, userId);
  const timestamp = Date.now().toString().slice(-6); // Last 6 digits
  const fallback = `${base}-${timestamp}`;
  
  // One final check, but if it's taken, we'll use it anyway (very unlikely with timestamp)
  const isAvailable = await isUsernameAvailable(fallback, userId);
  if (!isAvailable) {
    // Add user ID digits as additional uniqueness
    const userIdDigits = userId ? userId.replace(/[^0-9]/g, '').slice(-4) : '';
    return `${base}-${timestamp}${userIdDigits ? '-' + userIdDigits : ''}`;
  }
  
  return fallback;
}

