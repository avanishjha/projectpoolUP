/**
 * Builds the @conqr/authz Subject for the signed-in user from:
 *   - platform roles: the `app_roles` JWT claim (migration 0009 hook)
 *   - isPro: the profile row
 * so the client answers authorization the same way the DB and Edge Functions
 * do. RLS is still the real boundary — this drives UI, not access.
 */
import { useMemo } from 'react';
import { PLATFORM_ROLES, type PlatformRole, type Subject } from '@conqr/authz';
import { useAuthStore } from '../../stores/authStore';
import { useProfile } from './useProfile';

const VALID_ROLES = new Set<string>(PLATFORM_ROLES);

/** Decode a JWT payload without verifying (claims were server-signed). */
function decodeClaims(token: string): Record<string, unknown> {
  try {
    const payload = token.split('.')[1];
    if (!payload) return {};
    let b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    b64 = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '=');
    return JSON.parse(atob(b64)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function extractRoles(token: string | undefined): PlatformRole[] {
  if (!token) return [];
  const raw = decodeClaims(token).app_roles;
  if (!Array.isArray(raw)) return [];
  return raw.filter((r): r is PlatformRole => typeof r === 'string' && VALID_ROLES.has(r));
}

/** The current Subject, or null when signed out. */
export function useSubject(): Subject | null {
  const session = useAuthStore((s) => s.session);
  const { data: profile } = useProfile();

  const accessToken = session?.access_token;
  const userId = session?.user.id;

  return useMemo(() => {
    if (!userId) return null;
    return {
      userId,
      platformRoles: extractRoles(accessToken),
      isPro: profile?.is_pro ?? false,
      // isDelinquent / isSoftDeleted are filled once membership data exists;
      // absent = false, and RLS enforces the truth regardless.
    };
  }, [userId, accessToken, profile?.is_pro]);
}
