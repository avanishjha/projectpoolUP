/**
 * The CONQR Supabase client — the app's single connection to the backend.
 *
 * Sessions persist in AsyncStorage and auto-refresh while the app is
 * foregrounded. In local dev on a physical device, "localhost" would point
 * at the PHONE — so when the URL env var is absent or localhost, we derive
 * the dev machine's LAN IP from Expo's own dev-server host.
 */
import 'react-native-url-polyfill/auto';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { createClient } from '@supabase/supabase-js';

function resolveSupabaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (fromEnv && !fromEnv.includes('localhost') && !fromEnv.includes('127.0.0.1')) {
    return fromEnv;
  }
  // Web talks to localhost directly; a device needs the dev machine's LAN IP,
  // which Expo already knows (it's serving the JS bundle from it).
  if (Platform.OS !== 'web') {
    const host = Constants.expoConfig?.hostUri?.split(':')[0];
    if (host) return `http://${host}:54321`;
  }
  return fromEnv ?? 'http://127.0.0.1:54321';
}

const url = resolveSupabaseUrl();
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!anonKey) {
  throw new Error(
    'EXPO_PUBLIC_SUPABASE_ANON_KEY is missing. Copy .env.example to apps/mobile/.env and fill it from `supabase status`.',
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Refresh tokens only while the app is actually in use (Supabase RN guidance).
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
