import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
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
