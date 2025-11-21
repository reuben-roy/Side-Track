import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Ensure we only include AsyncStorage on the client — the server build and
// bundling processes (like EAS export) run in node and don't have `window`.
let clientStorage: any | undefined = undefined;
if (typeof window !== 'undefined') {
  // Lazy require so the module is not loaded during server-side bundling.
  // Using require here avoids top-level ESM import evaluation in Node.
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
  clientStorage = require('@react-native-async-storage/async-storage').default;
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: clientStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Database types (we'll expand this later)
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          picture: string | null;
          provider: 'google' | 'apple';
          created_at: string;
          last_login: string;
        };
        Insert: {
          id: string;
          email: string;
          name?: string | null;
          picture?: string | null;
          provider: 'google' | 'apple';
          created_at?: string;
          last_login?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          picture?: string | null;
          provider?: 'google' | 'apple';
          created_at?: string;
          last_login?: string;
        };
      };
    };
  };
};
