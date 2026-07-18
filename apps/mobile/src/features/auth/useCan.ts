/**
 * Client capability check — the app's single question for "should this UI
 * show / this action be allowed?". Mirrors the server: same @conqr/authz
 * resolver, same catalog. Never the security boundary (that's RLS); this
 * hides what the user can't do so they don't hit a wall.
 */
import { useMemo } from 'react';
import { can, type Capability, type PoolContext } from '@conqr/authz';
import { useSubject } from './useSubject';

export function useCan(capability: Capability, pool?: PoolContext): boolean {
  const subject = useSubject();
  return useMemo(
    () => (subject ? can(subject, capability, pool) : false),
    [subject, capability, pool],
  );
}
