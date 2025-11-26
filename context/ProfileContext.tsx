import { sqliteStorage as AsyncStorage } from '@/lib/storage';
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
      const stored = await AsyncStorage.getItem('profile');
      if (stored) {
        setProfile(JSON.parse(stored));
      } else {
        const defaultProfile = {
          weight: FIELDS[0].default,
          height: FIELDS[1].default,
          calorieGoal: FIELDS[2].default,
          gender: FIELDS[3].default,
        };
        setProfile(defaultProfile);
        await AsyncStorage.setItem('profile', JSON.stringify(defaultProfile));
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
      await AsyncStorage.setItem('profile', JSON.stringify(updated));
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const updateFullProfile = async (newProfile: Profile) => {
    try {
      setProfile(newProfile);
      await AsyncStorage.setItem('profile', JSON.stringify(newProfile));
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
