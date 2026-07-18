import type { PlatformRole } from '@conqr/authz';

/** Staff roles in descending significance; the top one becomes the profile badge. */
const BADGES: { role: PlatformRole; label: string; emoji: string }[] = [
  { role: 'admin', label: 'Admin', emoji: '🛡️' },
  { role: 'operations', label: 'Ops', emoji: '⚙️' },
  { role: 'finance', label: 'Finance', emoji: '💰' },
  { role: 'support', label: 'Support', emoji: '🎧' },
  { role: 'moderator', label: 'Mod', emoji: '🔨' },
  { role: 'creator', label: 'Creator', emoji: '⭐' },
];

export function topRoleBadge(
  roles: readonly PlatformRole[],
): { label: string; emoji: string } | null {
  return BADGES.find((b) => roles.includes(b.role)) ?? null;
}
