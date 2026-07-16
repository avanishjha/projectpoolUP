import type { Capability } from './capabilities';
import { resolve } from './resolver';
import type { PoolContext, Subject } from './types';

/** Thrown when an operation is attempted without the required capability. */
export class AuthorizationError extends Error {
  readonly capability: Capability;
  readonly reasons: readonly string[];

  constructor(capability: Capability, reasons: readonly string[]) {
    super(`Not authorized: ${capability}`);
    this.name = 'AuthorizationError';
    this.capability = capability;
    this.reasons = reasons;
  }
}

/** One-shot check for call sites that don't hold a CapabilitySet. */
export function can(subject: Subject, capability: Capability, pool?: PoolContext): boolean {
  return resolve(subject, pool).can(capability);
}

/** Assert-or-throw guard for Edge Functions and mutations. */
export function assertCan(subject: Subject, capability: Capability, pool?: PoolContext): void {
  const decision = resolve(subject, pool).decide(capability);
  if (!decision.allowed) {
    throw new AuthorizationError(capability, decision.reasons);
  }
}
