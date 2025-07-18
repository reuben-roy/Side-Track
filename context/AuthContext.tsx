import { BASE_URL, TOKEN_KEY_NAME } from '@/constants/GlobalConstants';
import { tokenCache } from '@/helper/cache';
import { AuthError, AuthRequestConfig, DiscoveryDocument, exchangeCodeAsync, makeRedirectUri, useAuthRequest } from 'expo-auth-session';
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
  usePKCE: true,
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

        // For web, handle the COOP issue by using a different approach
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
        } else {
          // For native platforms, use the standard expo-auth-session flow
          const tokenResponse = await exchangeCodeAsync(
            {
              code: code,
              extraParams: {
                Platform: Platform.OS,
              },
              clientId: "google",
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
            console.log(1)
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

    // // Google AuthSession setup
    // const [request, response, promptAsync] = Google.useAuthRequest({
    //   iosClientId: '897139169717-gaofu293j0te8rkc3jb414ad1ljl3qra.apps.googleusercontent.com', // TODO: Replace with your iOS client ID
    //   androidClientId: '897139169717-a6o7mdomn8hat59v64t3hq5rjlt1m385.apps.googleusercontent.com', // TODO: Replace with your Android client ID
    //   clientId: '897139169717-nvsgi01c5qlb1l1iahdbbanifig0tali.apps.googleusercontent.com', // Web client ID for localhost testing
    //   redirectUri: Platform.OS === 'web' 
    //     ? 'https://sidetrack.explosion.fun/auth/callback'
    //     : makeRedirectUri({
    //         scheme: 'sidetrack',
    //         path: 'auth/callback'
    //       }),
    //   scopes: ['openid', 'profile', 'email'],
    // });

    // useEffect(() => {
    //   console.log('Auth response received:', response);

    //   if (response?.type === 'success') {
    //     const { authentication } = response;
    //     console.log('Authentication object:', authentication);

    //     if (authentication?.accessToken) {
    //       fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    //         headers: { Authorization: `Bearer ${authentication.accessToken}` },
    //       })
    //         .then(res => {
    //           console.log('Userinfo response status:', res.status);
    //           return res.json();
    //         })
    //         .then(async data => {
    //           console.log('User data received:', data);
    //           const userObj: AuthUser = {
    //             id: data.sub,
    //             name: data.name,
    //             email: data.email,
    //             photoUrl: data.picture,
    //             provider: 'google',
    //             accessToken: authentication.accessToken,
    //           };
    //           setUser(userObj);
    //           await SecureStore.setItemAsync(USER_KEY, JSON.stringify(userObj));
    //           // Don't navigate here - let the callback route handle it
    //         })
    //         .catch(error => {
    //           console.error('Error fetching user info:', error);
    //           alert('Failed to fetch user information');
    //         });
    //     } else {
    //       console.error('No access token in response');
    //       alert('Authentication failed: No access token received');
    //     }
    //   } else if (response?.type === 'error') {
    //     console.error('Auth error:', response.error);
    //     alert(`Authentication failed: ${response.error?.message || 'Unknown error'}`);
    //   }
    // }, [response]);

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

    // const loginWithGoogle = async () => {
    //   try {
    //     console.log('Starting Google login...');
    //     const result = await promptAsync({ 
    //       showInRecents: true
    //     });
    //     console.log('Google login result:', result);
    //   } catch (error) {
    //     console.error('Google login error:', error);
    //     alert('Failed to start Google authentication');
    //   }
    // };

    const loginWithApple = async () => { };

    const logout = async () => { }
    //   setUser(null);
    //   await SecureStore.deleteItemAsync(USER_KEY);
    //   router.replace('/login');
    // };

    const fetchWithAuth = async (input: RequestInfo, init: RequestInit = {}) => { }
    //   let token = user?.accessToken;
    //   if (!token && user) {
    //     // Try to restore from SecureStore if not in memory
    //     const userData = await SecureStore.getItemAsync(USER_KEY);
    //     if (userData) {
    //       const storedUser = JSON.parse(userData);
    //       token = storedUser.accessToken;
    //     }
    //   }
    //   if (!token) {
    //     throw new Error('No access token available');
    //   }
    //   const headers = {
    //     ...(init.headers || {}),
    //     Authorization: `Bearer ${token}`,
    //   };
    //   return fetch(input, { ...init, headers });
    // };

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