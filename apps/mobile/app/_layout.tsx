/**
 * Root layout: fonts → auth restore → theme → providers → guarded router →
 * global overlays. The splash stays up until BOTH fonts and the persisted
 * session are resolved, so users never flash through the wrong screen.
 */
import { useEffect, useState } from 'react';
import { useColorScheme, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  useFonts,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { ErrorBoundary } from '../src/app-shell/ErrorBoundary';
import { useProfile } from '../src/features/auth/useProfile';
import { queryClient } from '../src/lib/query';
import { useAuthStore } from '../src/stores/authStore';
import { useUiStore } from '../src/stores/uiStore';
import { darkTheme, lightTheme, ThemeProvider, useTheme } from '../src/ui';
import { OfflineBanner } from '../src/ui/components/OfflineBanner';
import { ToastHost } from '../src/ui/components/ToastHost';

SplashScreen.preventAutoHideAsync().catch(() => {});

function ThemedApp() {
  const theme = useTheme();
  const status = useAuthStore((s) => s.status);
  const segments = useSegments();
  const router = useRouter();
  const { data: profile, isPending: profilePending, isError: profileError } = useProfile();

  // Latches true once we've first resolved where to route a signed-in user.
  // After that the <Stack> stays mounted forever — a later profile refetch
  // must never unmount it (that resets the navigator to Home). Re-armed on
  // sign-out so the next login holds correctly.
  const [routeResolved, setRouteResolved] = useState(false);
  useEffect(() => {
    if (status === 'signedOut') {
      setRouteResolved(false);
    } else if (status === 'signedIn' && (!profilePending || profileError)) {
      setRouteResolved(true);
    }
  }, [status, profilePending, profileError]);

  // Three-state gate: signed out → (auth); signed in without a claimed
  // identity → (onboarding); onboarded → the app. On profile fetch errors we
  // fail open to the app (Profile tab surfaces the problem).
  useEffect(() => {
    if (status === 'restoring') return;
    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[0] === '(onboarding)';

    if (status === 'signedOut') {
      if (!inAuthGroup) router.replace('/phone');
      return;
    }
    if (profilePending && !profileError) return; // hold until we know onboarded state
    const needsOnboarding = !profileError && profile != null && profile.onboarded_at === null;
    if (needsOnboarding && !inOnboarding) {
      router.replace('/profile-setup');
    } else if (!needsOnboarding && (inAuthGroup || inOnboarding)) {
      router.replace('/');
    }
  }, [status, segments, router, profile, profilePending, profileError]);

  // Hold the canvas ONLY during the first resolution — never unmount the
  // navigator once the app is live.
  if (status === 'signedIn' && !routeResolved) {
    return <View style={{ flex: 1, backgroundColor: theme.canvas }} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }}>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.canvas },
        }}
      />
      <ToastHost />
      <OfflineBanner />
    </View>
  );
}

export default function RootLayout() {
  const systemScheme = useColorScheme();
  const preference = useUiStore((s) => s.themePreference);
  const scheme = preference === 'system' ? (systemScheme ?? 'dark') : preference;
  const theme = scheme === 'light' ? lightTheme : darkTheme;

  const initialize = useAuthStore((s) => s.initialize);
  const authStatus = useAuthStore((s) => s.status);

  const [fontsLoaded] = useFonts({
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    initialize();
  }, [initialize]);

  const ready = fontsLoaded && authStatus !== 'restoring';

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: theme.canvas }} />;
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <ErrorBoundary>
            <ThemedApp />
          </ErrorBoundary>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
