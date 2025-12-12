// import { useAuth } from '@/context/AuthContext'; // OLD: Custom OAuth
import { ProfileProvider } from '@/context/ProfileContext';
import { useSupabaseAuth } from '@/context/SupabaseAuthContext'; // NEW: Supabase Auth
import { UserCapacityProvider } from '@/context/UserCapacityContext';
import { isOnboardingComplete } from '@/lib/onboarding';
import { Redirect, Stack, useRouter, useSegments } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
// import 'react-native-reanimated';

export default function ProtectedLayout() {
  // const authContext = useAuth() // OLD
  const authContext = useSupabaseAuth(); // NEW
  const router = useRouter();
  const segments = useSegments();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  // Check onboarding status once database is ready
  useEffect(() => {
    const checkOnboarding = async () => {
      if (authContext?.user && authContext?.databaseReady) {
        try {
          const completed = await isOnboardingComplete();
          setOnboardingComplete(completed);
        } catch (error) {
          console.error('Error checking onboarding:', error);
          // If check fails, assume not completed (safer to show onboarding)
          setOnboardingComplete(false);
        } finally {
          setCheckingOnboarding(false);
        }
      } else if (authContext?.user && !authContext?.databaseReady) {
        // If user exists but database not ready, wait a bit then check again
        // This handles the case where database initialization is slow
        const timeout = setTimeout(() => {
          if (!authContext?.databaseReady) {
            console.warn('Database not ready after timeout, assuming onboarding needed');
            setCheckingOnboarding(false);
            setOnboardingComplete(false);
          }
        }, 3000);
        return () => clearTimeout(timeout);
      } else if (!authContext?.user) {
        // No user, stop checking
        setCheckingOnboarding(false);
      }
    };

    checkOnboarding();
  }, [authContext?.user, authContext?.databaseReady]);

  // Re-check onboarding status when navigating (to catch completion)
  useEffect(() => {
    if (!checkingOnboarding && authContext?.user && authContext?.databaseReady) {
      const currentRoute = segments[segments.length - 1];
      
      // If we're on tabs, always verify onboarding is complete
      if (currentRoute === '(tabs)') {
        const verifyOnboarding = async () => {
          try {
            const completed = await isOnboardingComplete();
            if (completed) {
              setOnboardingComplete(true);
            } else {
              // Not complete, redirect to onboarding
              setOnboardingComplete(false);
              router.replace('/onboarding');
            }
          } catch (error) {
            console.error('Error verifying onboarding:', error);
          }
        };
        verifyOnboarding();
      }
      // If we're on onboarding, check if it's already complete (user might have completed it)
      else if (currentRoute === 'onboarding') {
        const checkIfComplete = async () => {
          try {
            const completed = await isOnboardingComplete();
            if (completed) {
              setOnboardingComplete(true);
              router.replace('/(protected)/(tabs)');
            }
          } catch (error) {
            // Ignore - user is on onboarding screen
          }
        };
        checkIfComplete();
      }
      // Otherwise, redirect to onboarding if not complete
      else if (!onboardingComplete && currentRoute !== 'onboarding') {
        router.replace('/onboarding');
      }
    }
  }, [checkingOnboarding, authContext?.user, authContext?.databaseReady, segments, router]);

  // Wait for both auth and database to be ready
  if (authContext?.loading || (authContext?.user && !authContext?.databaseReady) || checkingOnboarding) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size={'large'} />
      </View>
    )
  }
  
  if (!authContext?.user) {
    return <Redirect href='/login' />;
  }

  // Wrap with providers that need database access
  // These are rendered for both onboarding and main app
  return (
    <ProfileProvider>
      <UserCapacityProvider>
        <Stack>
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="workout/WorkoutScreen" options={{ headerShown: false }} />
          <Stack.Screen name="workout-history" options={{ headerShown: false }} />
          <Stack.Screen name="settings" options={{ headerShown: false }} />
        </Stack>
      </UserCapacityProvider>
    </ProfileProvider>
  );
}
