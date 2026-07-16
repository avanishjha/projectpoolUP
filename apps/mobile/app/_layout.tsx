/**
 * Root layout: fonts → theme (system preference + manual override) →
 * providers (SafeArea, React Query) → error boundary → router stack →
 * global overlays (toasts, offline banner).
 */
import { useEffect } from 'react';
import { useColorScheme, View } from 'react-native';
import { Stack } from 'expo-router';
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
import { queryClient } from '../src/lib/query';
import { useUiStore } from '../src/stores/uiStore';
import { darkTheme, lightTheme, ThemeProvider, useTheme } from '../src/ui';
import { OfflineBanner } from '../src/ui/components/OfflineBanner';
import { ToastHost } from '../src/ui/components/ToastHost';

SplashScreen.preventAutoHideAsync().catch(() => {});

function ThemedApp() {
  const theme = useTheme();
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

  const [fontsLoaded] = useFonts({
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!fontsLoaded) {
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
