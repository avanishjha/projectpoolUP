import type { Capability } from './capabilities';
import {
  ACTIVE_MEMBERSHIP_CAPABILITIES,
  DELINQUENT_DENIED_CAPABILITIES,
  PENDING_POOL_ORGANISER_CAPABILITIES,
  PLATFORM_ROLE_GRANTS,
  POOL_PERSONA_GRANTS,
} from './personas';
import type { Decision, PlatformRole, PoolContext, PoolPersona, Subject } from './types';

/**
 * The Scope & Persona Resolver.
 *
 * Resolution algorithm (deny-by-default):
 *  1. Soft-deleted subject → deny everything.
 *  2. Union platform-role grants ('user' always included).
 *  3. If pool context given: derive personas (organiser / member / spectator)
 *     and union their grants, then apply context conditions:
 *       - active-membership capabilities need pool AND membership active
 *       - organiser controls need pool status 'pending'
 *       - spectator grants need visibility 'public'
 *       - pool.join needs pool status 'pending'
 *  4. Apply restrictions (delinquency). Deny wins over any grant.
 */
export function resolve(subject: Subject, pool?: PoolContext): CapabilitySet {
  if (subject.isSoftDeleted) {
    return new CapabilitySet(new Map(), ['denied:subject:soft_deleted']);
  }

  const grants = new Map<Capability, string>();

  const roles: PlatformRole[] = subject.platformRoles.includes('user')
    ? [...subject.platformRoles]
    : ['user', ...subject.platformRoles];

  for (const role of roles) {
    for (const cap of PLATFORM_ROLE_GRANTS[role]) {
      if (!grants.has(cap)) grants.set(cap, `granted:role:${role}`);
    }
  }

  if (pool) {
    for (const persona of derivePersonas(pool)) {
      for (const cap of POOL_PERSONA_GRANTS[persona]) {
        if (!grants.has(cap)) grants.set(cap, `granted:persona:${persona}`);
      }
    }
    applyPoolConditions(grants, pool);
  }

  if (subject.isDelinquent) {
    for (const cap of DELINQUENT_DENIED_CAPABILITIES) {
      grants.delete(cap);
    }
  }

  return new CapabilitySet(grants, subject.isDelinquent ? ['restriction:delinquent'] : []);
}

/** Derive every persona the subject holds inside this pool. */
export function derivePersonas(pool: PoolContext): Exclude<PoolPersona, 'none'>[] {
  const personas: Exclude<PoolPersona, 'none'>[] = [];
  if (pool.isOrganiser) personas.push('organiser');
  if (pool.membership) personas.push('member');
  if (!pool.membership && !pool.isOrganiser && pool.visibility === 'public') {
    personas.push('spectator');
  }
  return personas;
}

function applyPoolConditions(grants: Map<Capability, string>, pool: PoolContext): void {
  const membershipActive = pool.membership?.status === 'active';
  const poolActive = pool.poolStatus === 'active';
  const poolPending = pool.poolStatus === 'pending';

  if (!(poolActive && membershipActive)) {
    for (const cap of ACTIVE_MEMBERSHIP_CAPABILITIES) grants.delete(cap);
  }
  if (!poolPending) {
    for (const cap of PENDING_POOL_ORGANISER_CAPABILITIES) grants.delete(cap);
    grants.delete('pool.join');
  }
  // A subject already in the pool cannot join it again.
  if (pool.membership) grants.delete('pool.join');
}

/** Immutable result of a resolution: query with can()/decide(). */
export class CapabilitySet {
  constructor(
    private readonly grants: ReadonlyMap<Capability, string>,
    private readonly globalReasons: readonly string[],
  ) {}

  can(capability: Capability): boolean {
    return this.grants.has(capability);
  }

  /** Full decision with the reason chain — for audit logs and debugging. */
  decide(capability: Capability): Decision {
    const grantReason = this.grants.get(capability);
    if (grantReason) {
      return { allowed: true, reasons: [grantReason, ...this.globalReasons] };
    }
    return {
      allowed: false,
      reasons: [`denied:default:${capability}`, ...this.globalReasons],
    };
  }

  /** Sorted list of everything this subject can do — for debugging/UI. */
  list(): Capability[] {
    return [...this.grants.keys()].sort();
  }
}
