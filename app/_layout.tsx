/**
 * Root layout — wraps everything in an Expo Router Stack.
 * The (tabs) group sits inside the stack; story & confirmation
 * are separate full-screen pages so tabs are hidden during those flows.
 */

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '@/constants/Colors';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Colors.surface },
          headerTintColor: Colors.text,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: Colors.background },
          animation: 'slide_from_right',
        }}
      >
        {/* Tab navigator — no header here since each tab has its own */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        {/* Confirmation screen after taking a photo */}
        <Stack.Screen
          name="confirmation"
          options={{
            title: 'Your Street',
            headerBackTitle: 'Camera',
          }}
        />

        {/* Full-screen story view — used for new and saved stories */}
        <Stack.Screen
          name="story"
          options={{
            title: 'Story',
            headerBackTitle: 'Back',
          }}
        />
      </Stack>
    </>
  );
}
