import { AuthProvider, useAuth } from '@/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import 'react-native-reanimated';

function AppLayout() {
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const { user } = useAuth() || {};

  useEffect(() => {
    (async () => {
      const seen = await AsyncStorage.getItem('onboardingComplete');
      setShowOnboarding(seen !== 'true');
    })();
  }, []);

  if (showOnboarding === null) {
    return null;
  }

  return (
    <ThemeProvider value={DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        {showOnboarding ? (
          // Show onboarding flow
          <>
            <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="signup" options={{ headerShown: false }} />
          </>
        ) : user ? (
          // Onboarding complete and user is authenticated
          <>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="signup" options={{ headerShown: false }} />
          </>
        ) : (
          // Onboarding complete but user is not authenticated
          <>
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="signup" options={{ headerShown: false }} />
          </>
        )}
        <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppLayout />
    </AuthProvider>
  );
}
