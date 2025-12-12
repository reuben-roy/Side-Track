import { Stack } from 'expo-router';
import React from 'react';

export default function SettingsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="general" />
      <Stack.Screen name="fatigue" />
      <Stack.Screen name="recovery" />
      <Stack.Screen name="limits" />
      <Stack.Screen name="backup" />
      <Stack.Screen name="data" />
    </Stack>
  );
}

