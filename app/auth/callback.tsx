import { useAuth } from '@/context/AuthContext';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Text, View } from 'react-native';

export default function AuthCallback() {
  const { user } = useAuth() || {};

  useEffect(() => {
    // This route handles the OAuth callback
    // The actual auth processing happens in AuthContext
    // We just need to redirect to the appropriate screen
    
    if (user) {
      // User is authenticated, go to main app
      router.replace('/(tabs)');
    } else {
      // Auth failed or user not authenticated, go to login
      router.replace('/login');
    }
  }, [user]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Processing authentication...</Text>
    </View>
  );
} 