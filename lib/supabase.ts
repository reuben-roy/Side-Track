import { createClient } from '@supabase/supabase-js';
import { sqliteStorage } from './storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: sqliteStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Database types for Supabase tables
export type Database = {
  public: {
    Tables: {
      user_strength: {
        Row: {
          id: string;
          user_id: string;
          username: string | null;
          total_score: number;
          wilks_score: number | null;
          bodyweight_lbs: number | null;
          gender: string | null;
          updated_at: string;
          squat_1rm: number | null;
          deadlift_1rm: number | null;
          bench_press_1rm: number | null;
          overhead_press_1rm: number | null;
          pull_up_1rm: number | null;
          barbell_row_1rm: number | null;
          dumbbell_lunge_1rm: number | null;
          push_up_1rm: number | null;
          triceps_dip_1rm: number | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          username?: string | null;
          total_score: number;
          wilks_score?: number | null;
          bodyweight_lbs?: number | null;
          gender?: string | null;
          updated_at?: string;
          squat_1rm?: number | null;
          deadlift_1rm?: number | null;
          bench_press_1rm?: number | null;
          overhead_press_1rm?: number | null;
          pull_up_1rm?: number | null;
          barbell_row_1rm?: number | null;
          dumbbell_lunge_1rm?: number | null;
          push_up_1rm?: number | null;
          triceps_dip_1rm?: number | null;
        };
        Update: {
          username?: string | null;
          total_score?: number;
          wilks_score?: number | null;
          bodyweight_lbs?: number | null;
          gender?: string | null;
          updated_at?: string;
          squat_1rm?: number | null;
          deadlift_1rm?: number | null;
          bench_press_1rm?: number | null;
          overhead_press_1rm?: number | null;
          pull_up_1rm?: number | null;
          barbell_row_1rm?: number | null;
          dumbbell_lunge_1rm?: number | null;
          push_up_1rm?: number | null;
          triceps_dip_1rm?: number | null;
        };
      };
    };
  };
};
