// import { useAuth } from '@/context/AuthContext'; // OLD: Custom OAuth
import { ProfileProvider } from '@/context/ProfileContext';
import { useSupabaseAuth } from '@/context/SupabaseAuthContext'; // NEW: Supabase Auth
import { UserCapacityProvider } from '@/context/UserCapacityContext';
import { Redirect, Slot } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
// import 'react-native-reanimated';

export default function ProtectedLayout() {
  // const authContext = useAuth() // OLD
  const authContext = useSupabaseAuth(); // NEW

  // Wait for both auth and database to be ready
  if (authContext?.loading || (authContext?.user && !authContext?.databaseReady)) {
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
  // These are only rendered after user is authenticated and database is ready
  return (
    <ProfileProvider>
      <UserCapacityProvider>
        <Slot />
      </UserCapacityProvider>
    </ProfileProvider>
  );
}
