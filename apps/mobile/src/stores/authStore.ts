/**
 * Session lifecycle for CONQR. Zustand holds the session (client state);
 * profile data stays in React Query (server state) — per HLD §3.1.
 */
import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export type AuthStatus = 'restoring' | 'signedOut' | 'signedIn';

interface AuthState {
  status: AuthStatus;
  session: Session | null;
  /** Wire up session restore + change listener. Call exactly once, at root. */
  initialize: () => void;
  requestOtp: (e164: string) => Promise<{ error?: string }>;
  verifyOtp: (e164: string, token: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

let initialized = false;

export const useAuthStore = create<AuthState>((set) => ({
  status: 'restoring',
  session: null,

  initialize: () => {
    if (initialized) return;
    initialized = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        set({ session: data.session, status: data.session ? 'signedIn' : 'signedOut' });
      })
      .catch(() => set({ session: null, status: 'signedOut' }));

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, status: session ? 'signedIn' : 'signedOut' });
    });
  },

  requestOtp: async (e164) => {
    const { error } = await supabase.auth.signInWithOtp({ phone: e164 });
    if (error) {
      // Never leak raw backend errors to the UI; log code only (NFR-SEC-08).
      console.warn('[auth] requestOtp failed:', error.status, error.code);
      if (error.status === 429) {
        return { error: 'Too many attempts. Please wait a moment and try again.' };
      }
      return { error: 'Could not send the OTP. Check the number and try again.' };
    }
    return {};
  },

  verifyOtp: async (e164, token) => {
    const { error } = await supabase.auth.verifyOtp({ phone: e164, token, type: 'sms' });
    if (error) {
      console.warn('[auth] verifyOtp failed:', error.status, error.code);
      // GoTrue uses otp_expired for both wrong and stale codes.
      if (error.code === 'otp_expired') {
        return { error: 'Invalid or expired code. Try again or resend.' };
      }
      return { error: 'Invalid OTP. Please try again.' };
    }
    return {};
  },

  signOut: async () => {
    await supabase.auth.signOut();
  },
}));
