import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import { makeRedirectUri } from 'expo-auth-session';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

type SupabaseAuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
};

const SupabaseAuthContext = createContext<SupabaseAuthContextType>({
  user: null,
  session: null,
  loading: true,
  error: null,
  signInWithGoogle: async () => {},
  signInWithApple: async () => {},
  signOut: async () => {},
});

export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Navigate based on auth state
      if (session) {
        router.replace('/(protected)/(tabs)');
      } else {
        router.replace('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use Supabase OAuth for all platforms
      // Flow: Your App -> Supabase -> Google -> Supabase -> Your App
      const isWeb = Platform.OS === 'web';
      const redirectTo = isWeb
        ? window.location.origin
        : makeRedirectUri({ scheme: 'sidetrack', path: 'auth/callback' });

      // Debug removed. Use setError to show fatal issues to the user.

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          // Only skip browser redirect for native; on web, a direct redirect is preferred
          skipBrowserRedirect: !isWeb,
          // Always prompt the account selector so users can choose an account
          queryParams: {
            prompt: 'select_account',
            access_type: 'offline',
            include_granted_scopes: 'true',
          },
        },
      });
      
      if (error) throw error;
      
      // On native, manually open the browser with the OAuth URL
      if (!isWeb && data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

        // If we receive a URL with a code or token back, try to complete the flow here too
        if (result?.type === 'success' && result?.url) {
          try {
            const returnedUrl = result.url;
            const urlObj = new URL(returnedUrl);
            const code = urlObj.searchParams.get('code');
            if (code) {
              const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
              if (sessionError) {
                setError('Failed to complete sign in (code exchange).');
              }
            } else if (returnedUrl.includes('#')) {
              const fragment = returnedUrl.split('#')[1];
              const fragmentParams: Record<string, string> = {};
              fragment?.split('&').forEach((pair) => {
                const [k, v] = pair.split('=');
                if (k && v) fragmentParams[k] = decodeURIComponent(v);
              });
              if (fragmentParams['access_token']) {
                const { error: setSessionError } = await supabase.auth.setSession({
                  access_token: fragmentParams['access_token'],
                  refresh_token: fragmentParams['refresh_token'] ?? undefined,
                });
                if (setSessionError) {
                  setError('Failed to set session from redirect token.');
                }
              }
            }
          } catch (e) {
            console.error('Error processing returned URL from openAuthSessionAsync', e);
            setError('Unexpected error while processing returned OAuth URL.');
          }
        }
      }
    } catch (error) {
      console.error('Google sign in error:', error);
      const msg = error instanceof Error ? error.message : 'Failed to sign in with Google';
      setError(msg);
      alert(msg);
    } finally {
      setLoading(false);
    }
  };


  const signInWithApple = async () => {
    try {
      setLoading(true);
      
      if (Platform.OS === 'ios') {
        // Native Apple Sign In
        const credential = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
        });

        if (credential.identityToken) {
          const { error } = await supabase.auth.signInWithIdToken({
            provider: 'apple',
            token: credential.identityToken,
          });

          if (error) throw error;
        }
      } else if (Platform.OS === 'web') {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'apple',
          options: {
            redirectTo: window.location.origin,
          },
        });
        
        if (error) throw error;
      } else {
        alert('Apple Sign In is only available on iOS and web');
      }
    } catch (error) {
      console.error('Apple sign in error:', error);
      const msg = error instanceof Error ? error.message : 'Failed to sign in with Apple';
      setError(msg);
      if (error instanceof Error && error.message !== 'ERR_REQUEST_CANCELED') {
        alert(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Sign out error:', error);
      const msg = error instanceof Error ? error.message : 'Failed to sign out';
      setError(msg);
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SupabaseAuthContext.Provider value={{ user, session, loading, error, signInWithGoogle, signInWithApple, signOut }}>
      {children}
    </SupabaseAuthContext.Provider>
  );
}

export const useSupabaseAuth = () => {
  const context = useContext(SupabaseAuthContext);
  if (!context) {
    throw new Error('useSupabaseAuth must be used within a SupabaseAuthProvider');
  }
  return context;
};
