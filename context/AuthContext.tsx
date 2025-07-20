import { BASE_URL, GOOGLE_CLIENT_SECRET, TOKEN_KEY_NAME } from '@/constants/GlobalConstants';
import { tokenCache } from '@/helper/cache';
import { AuthError, AuthRequestConfig, DiscoveryDocument, exchangeCodeAsync, makeRedirectUri, useAuthRequest } from 'expo-auth-session';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as jose from 'jose';
import React, { createContext, useContext, useState } from 'react';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

type AuthUser = {
  id: string;
  name?: string;
  email?: string;
  photoUrl?: string;
  givenName?: string;
  familyName?: string;
  emailVerified?: boolean;
  exp?: number;
  cookieExpiration?: number;
  provider: 'google' | 'apple';
  accessToken?: string;
};

const AuthContext = createContext({
  user: null as AuthUser | null,
  loading: true,
  loginWithGoogle: () => { },
  loginWithApple: () => { },
  logout: () => { },
  fetchWithAuth: async (url: string, option?: RequestInit) => Promise.resolve(new Response()),
  error: null as AuthError | null,
});

const config: AuthRequestConfig = {
  clientId: "google",
  scopes: ["openid", "profile", "email"],
  redirectUri: makeRedirectUri(),
};

const appleConfig: AuthRequestConfig = {
  clientId: "apple",
  scopes: ["name", "email"],
  redirectUri: makeRedirectUri(),
};

const discovery: DiscoveryDocument = {
  authorizationEndpoint: `${BASE_URL}/api/auth/authorize`,
  tokenEndpoint: `${BASE_URL}/api/auth/token`,
};

const appleDiscovery: DiscoveryDocument = {
  authorizationEndpoint: `${BASE_URL}/api/auth/apple/authorize`,
  tokenEndpoint: `${BASE_URL}/api/auth/apple/token`,
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [request, response, promptAsync] = useAuthRequest(config, discovery);
  const isWeb = Platform.OS === "web";

  React.useEffect(() => {
    handleResponse();
  }, [response])

  async function handleResponse() {
    if (response?.type === "success") {
      try {
        setLoading(true);
        const { code } = response.params;

        if (isWeb) {
          // Send the code to your backend to handle the token exchange server-side
          const tokenExchangeResponse = await fetch(`${BASE_URL}/api/auth/token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              code,
              redirectUri: makeRedirectUri(),
              platform: Platform.OS,
            }),
          });

          if (!tokenExchangeResponse.ok) {
            throw new Error(`Token exchange failed: ${tokenExchangeResponse.status}`);
          }

          const tokenData = await tokenExchangeResponse.json();
          console.log('token response', tokenData);


          // todo: what are we doing with the token data after we retrieve it?
          // could be nothing, then this could be a major issue right here.
        } else {
          // For native platforms, use the standard expo-auth-session flow
          const tokenResponse = await exchangeCodeAsync(
            {
              code: code,
              extraParams: {
                Platform: Platform.OS,
                // code_verifier: request?.codeVerifier as string,
              },
              clientId: "google",
              clientSecret: GOOGLE_CLIENT_SECRET,
              redirectUri: makeRedirectUri(),
            },
            discovery
          )

          console.log('token response', tokenResponse)

          if (isWeb) {
            const sessionResponse = await fetch(`${BASE_URL}/api/auth/session`, {
              method: 'GET',
              credentials: 'include',
            });
            console.log('sessionResponse', sessionResponse)

            if (sessionResponse.ok) {
              const sessionData = await sessionResponse.json();
              setUser(sessionData as AuthUser);
            }
          } else {
            const accessToken = tokenResponse.accessToken;
            if (!accessToken) {
              console.log("Didn't get an access token");
              return;
            }
            setAccessToken(accessToken);
            console.log('access token', accessToken);

            tokenCache?.saveToken(TOKEN_KEY_NAME, accessToken);

            const decoded = jose.decodeJwt(accessToken);
            setUser(decoded as AuthUser);
            // await AsyncStorage.setItem('onboardingComplete', 'true');
            router.replace('/(protected)/(tabs)');
          }
        }
      } catch (e) {
        console.error("Error handling auth response:", e);
      } finally {
        setLoading(false);
      }
    } else if (response?.type === "cancel") {
      alert("Sign in cancelled");
    } else if (response?.type === "error") {
      setError(response?.error as AuthError);
    }
  }

    const loginWithGoogle = async () => {
      console.log("signIn");
      try {
        if (!request) {
          console.log("No request");
          return;
        }

        // Use specific options for web to handle COOP issues
        if (isWeb) {
          await promptAsync({ windowFeatures: { popup: true } });
        } else {
          await promptAsync();
        }
      } catch (e) {
        console.error("Login error:", e);
        alert(`Login failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
    };

    const loginWithApple = async () => { };

    const logout = async () => {
      setLoading(true);
      tokenCache?.deleteToken(TOKEN_KEY_NAME);
      setUser(null);
      router.replace('/login');
      setLoading(false);
    };

    const fetchWithAuth = async (input: RequestInfo, init: RequestInit = {}) => {
      let token = user?.accessToken;
      if (!token && user) {
        const userData = await tokenCache?.getToken(TOKEN_KEY_NAME)
        if (userData) {
          const storedUser = JSON.parse(userData);
          token = storedUser.accessToken;
        }
      }
      if (!token) {
        throw new Error('No access token available');
      }
      const headers = {
        ...(init.headers || {}),
        Authorization: `Bearer ${token}`,
      };
      return fetch(input, { ...init, headers });
    };

    return (
      <AuthContext.Provider value={{ user, loading, loginWithGoogle, loginWithApple, logout, fetchWithAuth, error: null }}>
        {children}
      </AuthContext.Provider>
    );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};