import { getProfile, saveProfile } from '@/lib/database';
import { syncBodyMetricsToHealth } from '@/lib/healthSyncHelper';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

export const FIELDS = [
  { key: 'weight', label: 'Weight', default: '170' },
  { key: 'height', label: 'Height', default: "5'9\"" },
  { key: 'calorieGoal', label: 'Calorie Goal', default: '360' },
  { key: 'gender', label: 'Gender', default: 'Male' },
] as const;

export type ProfileKeys = typeof FIELDS[number]['key'];
export type Profile = Record<ProfileKeys, string>;

interface ProfileContextType {
  profile: Profile;
  updateProfile: (key: ProfileKeys, value: string) => Promise<void>;
  updateFullProfile: (newProfile: Profile) => Promise<void>;
  isLoading: boolean;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};

interface ProfileProviderProps {
  children: ReactNode;
}

export const ProfileProvider: React.FC<ProfileProviderProps> = ({ children }) => {
  const [profile, setProfile] = useState<Profile>({
    weight: '',
    height: '',
    calorieGoal: '',
    gender: '',
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const stored = await getProfile();
      if (stored) {
        setProfile(stored);
      } else {
        const defaultProfile: Profile = {
          weight: FIELDS[0].default,
          height: FIELDS[1].default,
          calorieGoal: FIELDS[2].default,
          gender: FIELDS[3].default,
        };
        setProfile(defaultProfile);
        await saveProfile(defaultProfile);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (key: ProfileKeys, value: string) => {
    try {
      const updated = { ...profile, [key]: value };
      setProfile(updated);
      await saveProfile(updated);
      
      // Sync body metrics to health platform if weight or height changed
      if (key === 'weight' || key === 'height') {
        try {
          await syncBodyMetricsToHealth();
        } catch (healthError) {
          // Silently fail health sync - don't interrupt user flow
          console.error('Health sync error:', healthError);
        }
      }
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const updateFullProfile = async (newProfile: Profile) => {
    try {
      setProfile(newProfile);
      await saveProfile(newProfile);
      
      // Sync body metrics to health platform
      try {
        await syncBodyMetricsToHealth();
      } catch (healthError) {
        // Silently fail health sync - don't interrupt user flow
        console.error('Health sync error:', healthError);
      }
    } catch (error) {
      console.error('Error updating full profile:', error);
    }
  };

  return (
    <ProfileContext.Provider value={{ profile, updateProfile, updateFullProfile, isLoading }}>
      {children}
    </ProfileContext.Provider>
  );
};
