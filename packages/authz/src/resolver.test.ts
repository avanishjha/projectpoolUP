import { describe, expect, it } from 'vitest';
import { AuthorizationError, assertCan, can } from './guards';
import { derivePersonas, resolve } from './resolver';
import type { PoolContext, Subject } from './types';

const user = (overrides: Partial<Subject> = {}): Subject => ({
  userId: 'u-1',
  platformRoles: ['user'],
  ...overrides,
});

const pool = (overrides: Partial<PoolContext> = {}): PoolContext => ({
  poolId: 'p-1',
  poolStatus: 'active',
  visibility: 'private',
  isOrganiser: false,
  ...overrides,
});

describe('deny by default', () => {
  it('denies unknown-context capabilities to a base user', () => {
    const caps = resolve(user());
    expect(caps.can('moderation.queue.view')).toBe(false);
    expect(caps.can('admin.users.ban')).toBe(false);
    expect(caps.can('system.financial.write')).toBe(false);
  });

  it('denies pool capabilities without pool context', () => {
    const caps = resolve(user());
    expect(caps.can('checkin.create')).toBe(false);
    expect(caps.can('feed.view')).toBe(false);
  });

  it('soft-deleted subjects lose everything', () => {
    const caps = resolve(user({ isSoftDeleted: true }));
    expect(caps.list()).toEqual([]);
    expect(caps.decide('profile.view').reasons).toContain('denied:default:profile.view');
  });
});

describe('base user grants', () => {
  it('can create pools, view own wallet, manage profile', () => {
    const caps = resolve(user());
    expect(caps.can('pool.create')).toBe(true);
    expect(caps.can('wallet.view_own')).toBe(true);
    expect(caps.can('profile.update_own')).toBe(true);
    expect(caps.can('explore.view')).toBe(true);
  });

  it("implies 'user' role even when omitted from platformRoles", () => {
    const caps = resolve({ userId: 'u-2', platformRoles: [] });
    expect(caps.can('pool.create')).toBe(true);
  });
});

describe('pool personas', () => {
  it('derives organiser + member for an organiser who is also a member', () => {
    const personas = derivePersonas(pool({ isOrganiser: true, membership: { status: 'active' } }));
    expect(personas).toEqual(['organiser', 'member']);
  });

  it('derives spectator only for non-members of public pools', () => {
    expect(derivePersonas(pool({ visibility: 'public' }))).toEqual(['spectator']);
    expect(derivePersonas(pool({ visibility: 'private' }))).toEqual([]);
    expect(derivePersonas(pool({ visibility: 'public', membership: { status: 'active' } }))).toEqual(['member']);
  });

  it('active member of active pool can check in, react, comment', () => {
    const caps = resolve(user(), pool({ membership: { status: 'active' } }));
    expect(caps.can('checkin.create')).toBe(true);
    expect(caps.can('reaction.add')).toBe(true);
    expect(caps.can('comment.create')).toBe(true);
    expect(caps.can('powerup.use')).toBe(true);
  });

  it('eliminated member keeps social access but cannot check in or use power-ups', () => {
    const caps = resolve(user(), pool({ membership: { status: 'eliminated' } }));
    expect(caps.can('feed.view')).toBe(true);
    expect(caps.can('reaction.add')).toBe(true);
    expect(caps.can('comment.create')).toBe(true);
    expect(caps.can('checkin.create')).toBe(false);
    expect(caps.can('powerup.use')).toBe(false);
  });

  it('member of a pending pool cannot check in yet', () => {
    const caps = resolve(user(), pool({ poolStatus: 'pending', membership: { status: 'active' } }));
    expect(caps.can('checkin.create')).toBe(false);
    expect(caps.can('feed.view')).toBe(true);
  });

  it('member of a completed pool cannot check in', () => {
    const caps = resolve(user(), pool({ poolStatus: 'completed', membership: { status: 'completed' } }));
    expect(caps.can('checkin.create')).toBe(false);
    expect(caps.can('leaderboard.view')).toBe(true);
  });

  it('spectator on a public pool can view and react but never comment', () => {
    const caps = resolve(user(), pool({ visibility: 'public' }));
    expect(caps.can('feed.view')).toBe(true);
    expect(caps.can('spectate.react')).toBe(true);
    expect(caps.can('comment.create')).toBe(false);
    expect(caps.can('checkin.create')).toBe(false);
  });

  it('non-member gets nothing on a private pool', () => {
    const caps = resolve(user(), pool({ visibility: 'private' }));
    expect(caps.can('pool.view')).toBe(false);
    expect(caps.can('feed.view')).toBe(false);
  });
});

describe('organiser controls', () => {
  it('organiser can update, cancel and invite while pool is pending', () => {
    const caps = resolve(user(), pool({ poolStatus: 'pending', isOrganiser: true }));
    expect(caps.can('pool.update_settings')).toBe(true);
    expect(caps.can('pool.cancel')).toBe(true);
    expect(caps.can('pool.invite')).toBe(true);
  });

  it('organiser loses those controls once the pool is active', () => {
    const caps = resolve(user(), pool({ poolStatus: 'active', isOrganiser: true }));
    expect(caps.can('pool.update_settings')).toBe(false);
    expect(caps.can('pool.cancel')).toBe(false);
    expect(caps.can('pool.invite')).toBe(false);
    expect(caps.can('pool.view')).toBe(true);
  });
});

describe('joining rules', () => {
  it('can join a pending pool, not an active/completed one', () => {
    expect(resolve(user(), pool({ poolStatus: 'pending', visibility: 'public' })).can('pool.join')).toBe(true);
    expect(resolve(user(), pool({ poolStatus: 'active', visibility: 'public' })).can('pool.join')).toBe(false);
    expect(resolve(user(), pool({ poolStatus: 'completed', visibility: 'public' })).can('pool.join')).toBe(false);
  });

  it('an existing member cannot join again', () => {
    const caps = resolve(user(), pool({ poolStatus: 'pending', membership: { status: 'pending' } }));
    expect(caps.can('pool.join')).toBe(false);
  });
});

describe('delinquency restriction', () => {
  it('delinquent users cannot create or join pools nor make purchases', () => {
    const caps = resolve(user({ isDelinquent: true }));
    expect(caps.can('pool.create')).toBe(false);
    expect(caps.can('pool.join')).toBe(false);
    expect(caps.can('powerup.purchase')).toBe(false);
    expect(caps.can('pro.subscribe')).toBe(false);
  });

  it('delinquent users keep social + wallet visibility', () => {
    const caps = resolve(user({ isDelinquent: true }), pool({ membership: { status: 'delinquent' } }));
    expect(caps.can('wallet.view_own')).toBe(true);
    expect(caps.can('feed.view')).toBe(true);
    expect(caps.can('checkin.create')).toBe(false);
  });

  it('deny wins over any grant, even for admins', () => {
    const caps = resolve(user({ platformRoles: ['user', 'admin'], isDelinquent: true }));
    expect(caps.can('pool.create')).toBe(false);
    expect(caps.can('admin.users.ban')).toBe(true);
  });
});

describe('platform roles', () => {
  it('creator gets creator surface', () => {
    const caps = resolve(user({ platformRoles: ['user', 'creator'] }));
    expect(caps.can('creator.pool.create')).toBe(true);
    expect(caps.can('creator.dashboard.view')).toBe(true);
  });

  it('moderator gets moderation but not finance', () => {
    const caps = resolve(user({ platformRoles: ['user', 'moderator'] }));
    expect(caps.can('moderation.checkin.review')).toBe(true);
    expect(caps.can('finance.reconciliation.view')).toBe(false);
  });

  it('admin is a superset of moderation, support, finance, ops', () => {
    const caps = resolve(user({ platformRoles: ['user', 'admin'] }));
    expect(caps.can('moderation.queue.view')).toBe(true);
    expect(caps.can('support.users.lookup')).toBe(true);
    expect(caps.can('finance.reports.gst')).toBe(true);
    expect(caps.can('ops.cron.monitor')).toBe(true);
    expect(caps.can('admin.roles.manage')).toBe(true);
  });

  it('no human role ever holds system.financial.write', () => {
    const everyRole = resolve(
      user({ platformRoles: ['user', 'creator', 'moderator', 'support', 'finance', 'operations', 'admin'] }),
    );
    expect(everyRole.can('system.financial.write')).toBe(false);
  });
});

describe('guards', () => {
  it('can() mirrors resolve().can()', () => {
    expect(can(user(), 'pool.create')).toBe(true);
    expect(can(user(), 'admin.users.ban')).toBe(false);
  });

  it('assertCan throws AuthorizationError with a reason chain', () => {
    expect(() => assertCan(user(), 'admin.users.ban')).toThrowError(AuthorizationError);
    try {
      assertCan(user({ isDelinquent: true }), 'pool.create');
    } catch (e) {
      const err = e as AuthorizationError;
      expect(err.capability).toBe('pool.create');
      expect(err.reasons).toContain('restriction:delinquent');
    }
  });
});

describe('decisions are explainable', () => {
  it('reports the granting source', () => {
    const caps = resolve(user(), pool({ membership: { status: 'active' } }));
    expect(caps.decide('checkin.create').reasons[0]).toBe('granted:persona:member');
    expect(caps.decide('pool.create').reasons[0]).toBe('granted:role:user');
  });
});
