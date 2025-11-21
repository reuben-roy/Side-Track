import { supabase } from '@/lib/supabase';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

/**
 * OAuth Callback Handler
 * This route handles the redirect from OAuth providers (Google, Apple via web)
 * URL format: sidetrack://auth/callback?code=...&state=...
 */
export default function AuthCallback() {
  const params = useLocalSearchParams();

  useEffect(() => {
    handleOAuthCallback();
  }, []);

  const handleOAuthCallback = async () => {
    try {
      // Extract the full URL from params
      const { code, error, error_description } = params;
      // Also capture initial URL to detect hash fragments (if present)
      const initialUrl = await Linking.getInitialURL();

      if (error) {
        console.error('OAuth error:', error, error_description);
        alert(`Authentication failed: ${error_description || error}`);
        router.replace('/login');
        return;
      }

      if (code) {
        // Exchange the code for a session
        const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(String(code));

        if (sessionError) {
          console.error('Session exchange error:', sessionError);
          alert('Failed to complete sign in. Please try again.');
          router.replace('/login');
          return;
        }

        // Success! User is now authenticated
        // OAuth authentication successful and session persisted
        router.replace('/(protected)/(tabs)');
      } else {
        // If no code, attempt to parse access_token from the fragment (hash)
        if (initialUrl && initialUrl.includes('#')) {
          const fragment = initialUrl.split('#')[1];
          const paramsFromFragment: Record<string, string> = {};
          fragment?.split('&').forEach((pair) => {
            const [k, v] = pair.split('=');
            if (k && v) paramsFromFragment[k] = decodeURIComponent(v);
          });

            if (paramsFromFragment['access_token']) {
            const access_token = paramsFromFragment['access_token'];
            const refresh_token = paramsFromFragment['refresh_token'] ?? undefined;
            const { data, error: setSessionError } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
              if (setSessionError) {
                console.error('Set session from fragment error:', setSessionError);
                alert('Failed to set session from redirect.');
                router.replace('/login');
                return;
              }
            router.replace('/(protected)/(tabs)');
            return;
          }
        }
        // No code or access token found in callback; fail gracefully
        alert('We could not complete the sign-in flow. Please try again.');
        router.replace('/login');
      }
    } catch (error) {
      console.error('OAuth callback error:', error);
      alert('An error occurred during sign in');
      router.replace('/login');
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
      <Text style={{ marginTop: 16 }}>Completing sign in...</Text>
    </View>
  );
}
