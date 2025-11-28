# Username Generation System

## Overview

The username generation system allows users to create custom usernames during onboarding, with automatic fallback generation if they exceed attempt limits. Usernames are displayed on the leaderboard and must be unique across all users.

## Features

- **Flexible Validation**: Users can create custom usernames (not limited to word-word-number format)
- **Uniqueness Checking**: Real-time validation against Supabase database
- **Security**: Rate limiting (max 5 attempts) prevents abuse
- **Auto-Generation**: Automatic unique username assignment after max attempts
- **Case-Insensitive**: Usernames are normalized to lowercase for consistency

## Username Format Rules

### Valid Usernames
- **Length**: 3-30 characters
- **Characters**: Alphanumeric (a-z, A-Z, 0-9), hyphens (-), and underscores (_)
- **Format**: Must start and end with alphanumeric characters
- **Case**: Stored as lowercase (case-insensitive uniqueness)

### Examples
✅ Valid:
- `john_doe`
- `Swift-Tiger-42`
- `user123`
- `my-username_2024`

❌ Invalid:
- `ab` (too short)
- `-username` (starts with hyphen)
- `user name` (contains space)
- `user@name` (invalid character)

## Functions Reference

### `isValidUsername(username: string): boolean`

Validates username format without checking uniqueness.

```typescript
import { isValidUsername } from '@/helper/username';

isValidUsername('john_doe'); // true
isValidUsername('ab'); // false (too short)
isValidUsername('-user'); // false (starts with hyphen)
```

### `isUsernameAvailable(username: string, currentUserId?: string | null): Promise<boolean>`

Checks if a username is available (not taken) in the database.

```typescript
import { isUsernameAvailable } from '@/helper/username';

const available = await isUsernameAvailable('john_doe', currentUserId);
if (available) {
  // Username is available
}
```

**Parameters:**
- `username`: The username to check
- `currentUserId`: Optional user ID to exclude from check (useful for updates)

**Returns:** `Promise<boolean>` - `true` if available, `false` if taken or invalid

### `generateUsername(): string`

Generates a random username in the format: `[adjective]-[noun]-[number]`

```typescript
import { generateUsername } from '@/helper/username';

const username = generateUsername(); // e.g., "Swift-Tiger-42"
```

**Word Lists:**
- **Adjectives**: ~38 options (Swift, Mighty, Brave, Noble, Bold, etc.)
- **Nouns**: ~40 options (Tiger, Eagle, Wolf, Lion, Bear, Warrior, Champion, etc.)
- **Numbers**: Random 10-999

**Total Combinations**: ~1,504,800 possible usernames

### `generateUsernameFromProfile(gender, bodyweightLbs, userId?): string`

Generates a username based on user profile data.

```typescript
import { generateUsernameFromProfile } from '@/helper/username';

const username = generateUsernameFromProfile(
  'male',      // gender: 'male' | 'female' | null
  180,         // bodyweightLbs: number | null
  userId       // userId: string | null (optional)
);
```

**Logic:**
- **Adjective**: Selected from gender-specific lists:
  - Male: Mighty, Bold, Strong, Brave, Noble, Fierce, Swift, Proud
  - Female: Swift, Bright, Bold, Strong, Brave, Noble, Fierce, Proud
  - Neutral: Swift, Bold, Strong, Brave, Noble, Fierce, Rapid, Proud
- **Noun**: Based on bodyweight ranges:
  - < 130 lbs → "Falcon"
  - 130-149 lbs → "Eagle"
  - 150-169 lbs → "Hawk"
  - 170-189 lbs → "Tiger"
  - 190-209 lbs → "Lion"
  - 210-229 lbs → "Bear"
  - 230+ lbs → "Rhino"
  - No weight → "Athlete"
- **Number**: Derived from bodyweight digits or user ID

**Total Combinations**: ~190,080 possible usernames (across all categories)

### `generateUniqueUsername(gender, bodyweightLbs, userId?, maxAttempts?): Promise<string>`

Generates a unique username that doesn't exist in the database.

```typescript
import { generateUniqueUsername } from '@/helper/username';

const username = await generateUniqueUsername(
  'male',      // gender
  180,         // bodyweightLbs
  userId,      // userId (optional)
  10           // maxAttempts (default: 10)
);
```

**Algorithm:**
1. Attempts profile-based generation (up to `maxAttempts` times)
2. If all fail, attempts random generation (up to `maxAttempts` times)
3. Last resort: Appends timestamp + user ID digits for guaranteed uniqueness

**Returns:** `Promise<string>` - A unique username

## Onboarding Flow

### Step 3: Username Selection

1. **Initial State**: 
   - Suggested username is auto-generated when entering step 3
   - Username field is pre-filled with suggestion
   - Attempt counter starts at 0

2. **User Actions**:
   - Can customize the suggested username
   - Can click "Use suggested" button
   - Can type their own username

3. **Validation on "Next"**:
   - Checks format validity
   - Checks database availability
   - If taken: Shows error, increments attempt counter
   - If available: Proceeds to next step

4. **Max Attempts Reached** (5 attempts):
   - Input field becomes disabled
   - Auto-generates unique username
   - Shows warning message
   - User can proceed (username is auto-assigned)

### Security Measures

- **Rate Limiting**: Maximum 5 attempts per user
- **Auto-Generation**: Prevents infinite retry loops
- **Case-Insensitive**: Prevents "JohnDoe" and "johndoe" as separate usernames
- **Database Validation**: All checks query Supabase for real-time accuracy

## Database Requirements

### Schema

The `user_strength` table includes a `username` column:

```sql
username TEXT  -- Stored as lowercase for consistency
```

### Index

For performance, create an index on the username column:

```sql
CREATE INDEX IF NOT EXISTS idx_user_strength_username 
  ON user_strength(username) 
  WHERE username IS NOT NULL;
```

### Uniqueness

Usernames are checked for uniqueness using case-insensitive comparison:
- Query uses `.ilike()` for case-insensitive matching
- Usernames are normalized to lowercase before storage
- No database-level unique constraint (handled in application logic)

## Usage Examples

### In Onboarding Screen

```typescript
import { 
  generateUniqueUsername, 
  isUsernameAvailable, 
  isValidUsername 
} from '@/helper/username';

// Generate suggested username
const suggested = await generateUniqueUsername(
  gender.toLowerCase(),
  bodyweight,
  user?.id
);

// Check if user's custom username is available
const isAvailable = await isUsernameAvailable(
  customUsername.trim(),
  user?.id
);

// Validate format
if (!isValidUsername(customUsername)) {
  // Show error
}
```

### In UserCapacityContext (Auto-Generation)

```typescript
import { generateUniqueUsername } from '@/helper/username';

// Generate username for existing users who don't have one
if (!username) {
  username = await generateUniqueUsername(
    validGender,
    bodyweight,
    user.id
  );
  await setPreference('username', username);
}
```

## Error Handling

### Common Errors

1. **Invalid Format**: Username doesn't meet format requirements
   - Solution: Show validation error message

2. **Username Taken**: Username already exists in database
   - Solution: Show error, increment attempt counter, suggest alternatives

3. **Database Error**: Supabase query fails
   - Solution: Assume unavailable (fail-safe), show error message

4. **Max Attempts Reached**: User exceeded 5 attempts
   - Solution: Auto-generate unique username, disable input field

## Performance Considerations

- **Database Queries**: Each availability check requires a Supabase query
- **Caching**: Not implemented (real-time accuracy is prioritized)
- **Index**: Database index on username column improves query performance
- **Rate Limiting**: Prevents excessive database queries from abuse

## Future Improvements

Potential enhancements:
- [ ] Username change functionality (with uniqueness check)
- [ ] Username suggestions based on partial input
- [ ] Caching for common username checks
- [ ] Database-level unique constraint (with proper error handling)
- [ ] Username history/audit log
- [ ] Reserved username list (admin, support, etc.)

## Related Files

- `helper/username.ts` - Core username generation logic
- `app/(protected)/onboarding.tsx` - Onboarding UI and flow
- `context/UserCapacityContext.tsx` - Auto-generation for existing users
- `docs/SUPABASE_LEADERBOARD_SCHEMA.sql` - Database schema

## Testing

To test username generation:

1. **Format Validation**: Test various username formats
2. **Uniqueness**: Create multiple users with same username (should fail)
3. **Max Attempts**: Try 5+ invalid usernames (should auto-generate)
4. **Case Sensitivity**: Try "JohnDoe" and "johndoe" (should be treated as same)

## Notes

- Usernames are stored in lowercase for consistency
- The system prioritizes user choice but ensures uniqueness
- Auto-generation only occurs after max attempts (security measure)
- Profile-based generation creates more personalized usernames

