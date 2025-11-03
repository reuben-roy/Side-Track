import { BASE_URL, GOOGLE_CLIENT_SECRET } from '@/constants/GlobalConstants';
import { tokenCache } from '@/helper/cache';
import * as AppleAuthentication from 'expo-apple-authentication';
import { AuthError, AuthRequestConfig, DiscoveryDocument, exchangeCodeAsync, makeRedirectUri, useAuthRequest } from 'expo-auth-session';
import { randomUUID } from 'expo-crypto';
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
  signInWithApple: () => { },
  signInWithAppleWebBrowser: () => { },
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
   const [appleRequest, appleResponse, promptAppleAsync] = useAuthRequest(
    appleConfig,
    appleDiscovery
  );

  React.useEffect(() => {
    handleResponse();
  }, [response])

  React.useEffect(() => {
    handleAppleResponse();
  }, [appleResponse]);

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

          console.log('stored token', storedAccessToken);

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
              else {
                await tokenCache?.deleteToken("accessToken");
                await tokenCache?.deleteToken("refreshToken");
              }
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

  const handleNativeTokens = async (tokens: {
    accessToken: string;
    refreshToken: string;
  }) => {
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
      tokens;

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
  };

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

        console.log('token response', tokenResponse)


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
          // Removed router.replace from here
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

  // Add a useEffect to handle web redirect after user is set
  React.useEffect(() => {
    if (isWeb && user) {
      router.replace('/(protected)/(tabs)');
    }
  }, [isWeb, user]);

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

  const handleAppleResponse = async () => {
    if (appleResponse?.type === "success") {
      try {
        const { code } = appleResponse.params;
        const response = await exchangeCodeAsync(
          {
            clientId: "apple",
            code,
            redirectUri: makeRedirectUri(),
            extraParams: {
              platform: Platform.OS,
            },
          },
          appleDiscovery
        );
        console.log("response", response);
        if (isWeb) {
          // For web: The server sets the tokens in HTTP-only cookies
          // We just need to get the user data from the response
          const sessionResponse = await fetch(`${BASE_URL}/api/auth/session`, {
            method: "GET",
            credentials: "include",
          });

          if (sessionResponse.ok) {
            const sessionData = await sessionResponse.json();
            setUser(sessionData as AuthUser);
          }
        } else {
          // For native: The server returns both tokens in the response
          // We need to store these tokens securely and decode the user data
          await handleNativeTokens({
            accessToken: response.accessToken,
            refreshToken: response.refreshToken!,
          });
        }
      } catch (e) {
        console.log("Error exchanging code:", e);
      }
    } else if (appleResponse?.type === "cancel") {
      console.log("appleResponse cancelled");
    } else if (appleResponse?.type === "error") {
      console.log("appleResponse error");
    }
  };

  const signInWithApple = async () => { 
    try {
      const rawNonce = randomUUID();
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: rawNonce,
      });

      // console.log("🍎 credential", JSON.stringify(credential, null, 2));

      if (credential.fullName?.givenName && credential.email) {
        // This is the first sign in
        // This is our only chance to get the user's name and email
        // We need to store this info in our database
        // You can handle this on the server side as well, just keep in mind that
        // Apple only provides name and email on the first sign in
        // On subsequent sign ins, these fields will be null
        console.log("🍎 first sign in");
      }

      // Send both the identity token and authorization code to server
      const appleResponse = await fetch(
        `${BASE_URL}/api/auth/apple/apple-native`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            identityToken: credential.identityToken,
            rawNonce, // Use the rawNonce we generated and passed to Apple

            // IMPORTANT:
            // Apple only provides name and email on the first sign in
            // On subsequent sign ins, these fields will be null
            // We need to store the user info from the first sign in in our database
            // And retrieve it on subsequent sign ins using the stable user ID
            givenName: credential.fullName?.givenName,
            familyName: credential.fullName?.familyName,
            email: credential.email,
          }),
        }
      );

      const responseText = await appleResponse.text();
      
      if (!appleResponse.ok) {
        console.error("🍎 Apple auth failed:", appleResponse.status, responseText);
        throw new Error(`Authentication failed: ${responseText.substring(0, 100)}`);
      }
      
      const tokens = JSON.parse(responseText);
      await handleNativeTokens(tokens);
      
      // Navigate to the protected route after successful authentication
      router.replace('/(protected)/(tabs)');
    } catch (e) {
      console.log(e);
      // handleAppleAuthError(e);
    }
  };

  const signInWithAppleWebBrowser = async () => {
    try {
      if (!appleRequest) {
        console.log("No appleRequest");
        return;
      }
      await promptAppleAsync();
    } catch (e) {
      console.log(e);
    }
  };

  const logout = async () => {
    if (isWeb) {
      // For web: Call logout endpoint to clear the cookie
      try {
        await fetch(`${BASE_URL}/api/auth/logout`, {
          method: "POST",
          credentials: "include",
        });
      } catch (error) {
        console.error("Error during web logout:", error);
      }
    } else {
      // For native: Clear both tokens from cache
      await tokenCache?.deleteToken("accessToken");
      await tokenCache?.deleteToken("refreshToken");
      console.log("token cache cleared");
    }

    // Clear state
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);

    //////
    router.replace('/login');
  };

  const fetchWithAuth = async (url: string, options?: RequestInit) => {
    if (isWeb) {
      // For web: Include credentials to send cookies
      const response = await fetch(url, {
        ...(options || {}),
        credentials: "include",
      });

      // If the response indicates an authentication error, try to refresh the token
      if (response.status === 401) {
        console.log("API request failed with 401, attempting to refresh token");

        // // Try to refresh the token
        // await refreshAccessToken();

        // If we still have a user after refresh, retry the request
        if (user) {
          return fetch(url, {
            ...(options || {}),
            credentials: "include",
          });
        }
      }

      return response;
    } else {
      // For native: Use token in Authorization header
      const response = await fetch(url, {
        ...(options || {}),
        headers: {
          ...(options?.headers || {}),
          Authorization: `Bearer ${accessToken}`,
        },
      });

      // If the response indicates an authentication error, try to refresh the token
      if (response.status === 401) {
        console.log("API request failed with 401, attempting to refresh token");

        // // Try to refresh the token and get the new token directly
        // const newToken = await refreshAccessToken();

        // If we got a new token, retry the request with it
        // if (newToken) {
        //   return fetch(url, {
        //     ...(options || {}),
        //     headers: {
        //       ...(options?.headers || {}),
        //       Authorization: `Bearer ${newToken}`,
        //     },
        //   });
        // }
      }

      return response;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, signInWithApple, signInWithAppleWebBrowser, logout, fetchWithAuth, error: null }}>
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