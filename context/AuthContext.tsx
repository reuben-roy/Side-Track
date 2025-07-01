import * as AppleAuthentication from 'expo-apple-authentication';
import { makeRedirectUri } from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Text, View } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

type AuthUser = {
  id: string;
  name?: string;
  email?: string;
  photoUrl?: string;
  provider: 'google' | 'apple';
};

type AuthContextType = {
  user: AuthUser | null;
  loginWithGoogle: () => Promise<void>;
  loginWithApple: () => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(false);

  // Google AuthSession setup
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: '897139169717-gaofu293j0te8rkc3jb414ad1ljl3qra.apps.googleusercontent.com', // TODO: Replace with your iOS client ID
    androidClientId: '897139169717-a6o7mdomn8hat59v64t3hq5rjlt1m385.apps.googleusercontent.com', // TODO: Replace with your Android client ID
    clientId: '897139169717-nvsgi01c5qlb1l1iahdbbanifig0tali.apps.googleusercontent.com', // Web client ID for localhost testing
    redirectUri: makeRedirectUri({
      scheme: 'sidetrack'
    }),
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${authentication?.accessToken}` },
      })
        .then(res => res.json())
        .then(data => {
          setUser({
            id: data.sub,
            name: data.name,
            email: data.email,
            photoUrl: data.picture,
            provider: 'google',
          });
          router.replace('/(tabs)');
        });
    }
  }, [response]);

  const loginWithGoogle = async () => {
    await promptAsync({ showInRecents: true });
  };

  const loginWithApple = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      setUser({
        id: credential.user,
        name: credential.fullName ? `${credential.fullName.givenName ?? ''} ${credential.fullName.familyName ?? ''}`.trim() : undefined,
        email: credential.email ?? undefined,
        provider: 'apple',
      });
      router.replace('/(tabs)');
    } catch (e: any) {
      if (e.code === 'ERR_CANCELED') {
        // User cancelled the sign-in
        return;
      }
      alert('Apple Sign-In failed');
    }
  };

  const logout = () => {
    setUser(null);
    router.replace('/login');
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loginWithGoogle, loginWithApple, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
