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
  sub: string;
  name?: string;
  email?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
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

  React.useEffect(() => {
    const restoreSession = async () => {
      setLoading(true);
      try {
        if (isWeb) {
          // For web: Check if we have a session cookie by making a request to a session endpoint
          const sessionResponse = await fetch(`${BASE_URL}/api/auth/session`, {
            method: "GET",
            credentials: "include", // Important: This includes cookies in the request
          });

          if (sessionResponse.ok) {
            const userData = await sessionResponse.json();
            setUser(userData as AuthUser);
          } else {
            console.log("No active web session found");

            // Try to refresh the token using the refresh cookie
            // try {
            //   await refreshAccessToken();
            // } catch (e) {
            //   console.log("Failed to refresh token on startup");
            // }
          }
        } else {
          // For native: Try to use the stored access token first
          const storedAccessToken = await tokenCache?.getToken("accessToken");
          const storedRefreshToken = await tokenCache?.getToken("refreshToken");

          console.log(
            "Restoring session - Access token:",
            storedAccessToken ? "exists" : "missing"
          );
          console.log(
            "Restoring session - Refresh token:",
            storedRefreshToken ? "exists" : "missing"
          );

          if (storedAccessToken) {
            try {
              // Check if the access token is still valid
              const decoded = jose.decodeJwt(storedAccessToken);
              const exp = (decoded as any).exp;
              const now = Math.floor(Date.now() / 1000);

              if (exp && exp > now) {
                // Access token is still valid
                console.log("Access token is still valid, using it");
                setAccessToken(storedAccessToken);

                if (storedRefreshToken) {
                  setRefreshToken(storedRefreshToken);
                }

                setUser(decoded as AuthUser);
              }
              // else if (storedRefreshToken) {
              //   // Access token expired, but we have a refresh token
              //   console.log("Access token expired, using refresh token");
              //   setRefreshToken(storedRefreshToken);
              //   await refreshAccessToken(storedRefreshToken);
              // }
            } catch (e) {
              console.error("Error decoding stored token:", e);

              // Try to refresh using the refresh token
              // if (storedRefreshToken) {
              //   console.log("Error with access token, trying refresh token");
              //   setRefreshToken(storedRefreshToken);
              //   await refreshAccessToken(storedRefreshToken);
              // }
            }
          }
          // else if (storedRefreshToken) {
          //   // No access token, but we have a refresh token
          //   console.log("No access token, using refresh token");
          //   setRefreshToken(storedRefreshToken);
          //   await refreshAccessToken(storedRefreshToken);
          // }
          else {
            console.log("User is not authenticated");
          }
        }
      } catch (error) {
        console.error("Error restoring session:", error);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, [isWeb]);

  async function handleResponse() {
    if (response?.type === "success") {
      try {
        setLoading(true);
        const { code } = response.params;

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
        );


        if (isWeb) {
          // Send the code to your backend to handle the token exchange server-side
          const user = jose.decodeJwt(tokenResponse.accessToken) as AuthUser;
          setUser(user);

          const sessionResponse = await fetch(`${BASE_URL}/api/auth/session`, {
            method: "GET",
            credentials: "include",
          });

          if (sessionResponse.ok) {
            const sessionData = await sessionResponse.json();
            setUser(sessionData as AuthUser);
          }
          
          router.replace('/(protected)/(tabs)');
        } else {
          // For native platforms, use the standard expo-auth-session flow
          const newAccessToken = tokenResponse.accessToken;
          const newRefreshToken = tokenResponse.refreshToken;

          console.log(
            "Received initial access token:",
            newAccessToken ? "exists" : "missing"
          );
          console.log(
            "Received initial refresh token:",
            newRefreshToken ? "exists" : "missing"
          );
          // Store tokens in state
          if (newAccessToken) setAccessToken(newAccessToken);
          if (newRefreshToken) setRefreshToken(newRefreshToken);
          // Save tokens to secure storage for persistence
          if (newAccessToken)
            await tokenCache?.saveToken("accessToken", newAccessToken);
          if (newRefreshToken)
            await tokenCache?.saveToken("refreshToken", newRefreshToken);
          // Decode the JWT access token to get user information
          if (newAccessToken) {
            const decoded = jose.decodeJwt(newAccessToken);
            setUser(decoded as AuthUser);
          }
          router.replace('/(protected)/(tabs)');
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