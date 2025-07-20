import { useAuth } from '@/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect, Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';

export default function ProtectedLayout() {
  const authContext = useAuth()

  if (authContext?.loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size={'large'} />
      </View>
    )
  }
  if (!authContext?.user) {
    return <Redirect href='/login' />;
  }
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const seen = await AsyncStorage.getItem('onboardingComplete');
      setShowOnboarding(seen !== 'true');
    })();
  }, []);

  if (showOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <Stack>
      <Stack.Screen name='(tabs)' options={{ headerShown: false}} />
      {showOnboarding ? (
        // Show onboarding flow
        <>
          <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="signup" options={{ headerShown: false }} />
        </>
      ) : authContext.user? (
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
  );
}
