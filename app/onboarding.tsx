import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import OnboardingCarousel from '@/components/OnboardingCarousel';

export default function OnboardingScreen() {
  const handleOnboardingComplete = async () => {
    await AsyncStorage.setItem('onboardingComplete', 'true');
    router.replace('/(protected)/(tabs)');
  };

  return (
    <View style={{ flex: 1 }}>
      <OnboardingCarousel onComplete={handleOnboardingComplete} />
    </View>
  );
} 