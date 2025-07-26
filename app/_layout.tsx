import { AuthProvider } from "@/context/AuthContext";
import { ProfileProvider } from "@/context/ProfileContext";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";

export default function RootLayout() {
    return (
        <AuthProvider>
            <ProfileProvider>
                <StatusBar style="auto" />
                <Stack>
                    <Stack.Screen
                        name='(protected)' 
                        options={{
                            headerShown: false,
                            animation: "none"}}
                    />
                    <Stack.Screen
                        name="login"
                        options={{
                            headerShown: false,
                            animation: "none"
                        }}
                    />
                    <Stack.Screen
                        name="+not-found"
                        options={{
                            headerShown: false
                        }}
                    />
                </Stack>
            </ProfileProvider>
        </AuthProvider>
    )
}