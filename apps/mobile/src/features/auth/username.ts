/**
 * Username + name validation (FRS §1.2) and conflict suggestions (UC-01 9a).
 * Availability is checked against the public `profiles` view — the strict
 * `users` table is self-read-only by design.
 */
import { supabase } from '../../lib/supabase';

export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
export const NAME_RE = /^[A-Za-z ]{2,30}$/;

export function validateName(value: string): string | null {
  const v = value.trim();
  if (v.length < 2) return 'At least 2 characters';
  if (v.length > 30) return 'At most 30 characters';
  if (!NAME_RE.test(v)) return 'Letters and spaces only';
  return null;
}

export function validateUsername(value: string): string | null {
  if (value.length < 3) return 'At least 3 characters';
  if (value.length > 20) return 'At most 20 characters';
  if (!USERNAME_RE.test(value)) return 'Lowercase letters, numbers and _ only';
  return null;
}

export async function isUsernameTaken(username: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('username')
    .eq('username', username)
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}

/** Build candidate usernames from real names, return the available ones. */
export async function suggestUsernames(first: string, last: string): Promise<string[]> {
  const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const f = clean(first);
  const l = clean(last);
  const rand = () => String(Math.floor(10 + Math.random() * 90));

  const candidates = [
    ...new Set(
      [
        `${f}_${l}`.slice(0, 20),
        `${f}${l.slice(0, 1)}`.slice(0, 20),
        `${f}${rand()}`.slice(0, 20),
        `${f}_${rand()}`.slice(0, 20),
      ].filter((c) => USERNAME_RE.test(c)),
    ),
  ];
  if (candidates.length === 0) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('username')
    .in('username', candidates);
  if (error) return [];

  const taken = new Set((data ?? []).map((r) => r.username as string));
  return candidates.filter((c) => !taken.has(c)).slice(0, 3);
}
