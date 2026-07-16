/**
 * Core authorization types for CONQR.
 *
 * The model has three layers:
 *  1. Platform roles  — stored in `authz.user_roles`, global to the account.
 *  2. Pool personas   — derived at resolve time from pool context (never stored).
 *  3. Capabilities    — fine-grained verbs; the only thing code ever checks.
 *
 * Screens, APIs, Edge Functions and RLS policies ask "does this subject have
 * capability X in context Y" — never "is this user an admin".
 */

/** Platform-level roles. `user` is implicit for every authenticated account. */
export const PLATFORM_ROLES = [
  'user',
  'creator',
  'moderator',
  'support',
  'finance',
  'operations',
  'admin',
] as const;
export type PlatformRole = (typeof PLATFORM_ROLES)[number];

/**
 * Service principals — non-human actors running with the Supabase service
 * role. Modelled here so Edge Functions can self-check with the same engine.
 */
export const SERVICE_PRINCIPALS = ['cron_service', 'webhook_service'] as const;
export type ServicePrincipal = (typeof SERVICE_PRINCIPALS)[number];

/** Personas a subject can hold inside a specific pool. Derived, never stored. */
export type PoolPersona = 'organiser' | 'member' | 'spectator' | 'none';

export type PoolStatus = 'pending' | 'active' | 'completed' | 'cancelled';
export type MemberStatus = 'pending' | 'active' | 'eliminated' | 'completed' | 'delinquent';
export type PoolVisibility = 'private' | 'friends' | 'public';

/** Everything the resolver needs to know about a pool interaction. */
export interface PoolContext {
  poolId: string;
  poolStatus: PoolStatus;
  visibility: PoolVisibility;
  /** True when the subject created this pool. */
  isOrganiser: boolean;
  /** Present when the subject has a pool_members row. */
  membership?: {
    status: MemberStatus;
  };
  isCreatorPool?: boolean;
}

/** The acting identity, as known from the session + users row. */
export interface Subject {
  userId: string;
  /** Roles from authz.user_roles. 'user' is implied and may be omitted. */
  platformRoles: readonly PlatformRole[];
  isPro?: boolean;
  /** True when ANY membership is delinquent — platform-wide restriction. */
  isDelinquent?: boolean;
  /** Soft-deleted accounts lose every capability. */
  isSoftDeleted?: boolean;
}

/** Why a capability was allowed or denied — for logs, audits and debugging. */
export interface Decision {
  allowed: boolean;
  /**
   * Machine-readable reason chain, most specific first, e.g.
   * ['granted:persona:member'] or ['denied:restriction:delinquent'].
   */
  reasons: readonly string[];
}
