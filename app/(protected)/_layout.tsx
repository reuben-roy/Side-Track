import { useAuth } from '@/context/AuthContext';
import { Redirect, Slot } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
// import 'react-native-reanimated';

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

  return <Slot />;
}
