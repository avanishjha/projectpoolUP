/**
 * Push token registration (F8.1).
 *
 * Registers an Expo push token against the signed-in user so the server's
 * dispatcher has somewhere to send to. Without this the whole notification
 * pipeline queues rows and marks them failed for want of a token.
 *
 * WHERE THIS ACTUALLY WORKS: a development build or a store build. Expo Go
 * dropped remote push on iOS from SDK 53, and the web has no Expo token at
 * all — so on those targets this is a deliberate no-op rather than an error.
 * The server side is unaffected and fully testable today.
 */
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';

/** Foreground behaviour: show it, this app's notifications are time-critical. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function getToken(): Promise<string | null> {
  // A simulator has no push service, and the web has no Expo token.
  if (!Device.isDevice || Platform.OS === 'web') return null;

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const asked = await Notifications.requestPermissionsAsync();
    status = asked.status;
  }
  if (status !== 'granted') return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return null; // not a dev/store build — nothing to register

  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data ?? null;
}

/**
 * Registers once per signed-in session and wires notification taps to routes.
 * Mount high in the tree, below the auth provider.
 */
export function usePushRegistration() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const registeredFor = useRef<string | null>(null);

  useEffect(() => {
    if (!userId || registeredFor.current === userId) return;

    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (cancelled || !token) return;
        const { error } = await supabase.rpc('register_push_token', { p_token: token });
        if (!error) registeredFor.current = userId;
      } catch {
        // Never let notification setup break app start.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Deep-link routing: every notification carries `data.route`.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const route = response.notification.request.content.data?.route;
      if (typeof route === 'string' && route.startsWith('/')) {
        router.push(route as never);
      }
    });
    return () => sub.remove();
  }, []);
}
