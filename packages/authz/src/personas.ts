import type { Capability } from './capabilities';
import type { PlatformRole, ServicePrincipal } from './types';

/**
 * Grant tables: which capabilities each platform role and pool persona holds.
 * Pool-persona grants are *potential* — the resolver still applies context
 * conditions (pool status, membership status, visibility) before allowing.
 */

const BASE_USER: readonly Capability[] = [
  'profile.view',
  'profile.update_own',
  'profile.delete_own',
  'pool.create',
  'pool.join',
  'explore.view',
  'spectate.view',
  'spectate.react',
  'wallet.view_own',
  'wallet.manage_methods_own',
  'transaction.view_own',
  'payout.receive',
  'powerup.purchase',
  'pro.subscribe',
  'referral.share',
  'notification.manage_own',
];

const MODERATOR: readonly Capability[] = [
  'moderation.queue.view',
  'moderation.checkin.review',
  'moderation.comment.review',
  'moderation.user.suspend',
];

const SUPPORT: readonly Capability[] = [
  'support.users.lookup',
  'support.transactions.view',
  'support.notifications.resend',
];

const FINANCE: readonly Capability[] = [
  'finance.reconciliation.view',
  'finance.reports.gst',
  'finance.payouts.retry',
  'admin.finance.view',
];

const OPERATIONS: readonly Capability[] = ['ops.cron.monitor', 'ops.flags.manage'];

const ADMIN: readonly Capability[] = [
  ...MODERATOR,
  ...SUPPORT,
  ...FINANCE,
  ...OPERATIONS,
  'admin.users.view',
  'admin.users.ban',
  'admin.disputes.resolve',
  'admin.roles.manage',
];

/**
 * Platform role → capability grants. Stored in Postgres as
 * `authz.role_capabilities` (generated seed) so RLS can consult the same map.
 */
export const PLATFORM_ROLE_GRANTS: Readonly<Record<PlatformRole, readonly Capability[]>> = {
  user: BASE_USER,
  creator: ['creator.pool.create', 'creator.dashboard.view'],
  moderator: MODERATOR,
  support: SUPPORT,
  finance: FINANCE,
  operations: OPERATIONS,
  admin: ADMIN,
};

/**
 * Pool persona → potential capability grants, refined by resolver conditions:
 *  - checkin.create / checkin.replace_own / powerup.use additionally require
 *    poolStatus === 'active' AND membership.status === 'active'.
 *  - organiser controls (update/cancel/invite) additionally require
 *    poolStatus === 'pending'.
 *  - spectator grants only apply when visibility === 'public'.
 */
export const POOL_PERSONA_GRANTS = {
  /** Any pool_members row, regardless of status — social access persists. */
  member: [
    'pool.view',
    'feed.view',
    'leaderboard.view',
    'reaction.add',
    'comment.create',
    'comment.report',
    'checkin.report',
    'checkin.create',
    'checkin.replace_own',
    'powerup.use',
  ],
  /** The pool creator. Usually also a member; grants are additive. */
  organiser: ['pool.view', 'feed.view', 'leaderboard.view', 'pool.update_settings', 'pool.cancel', 'pool.invite'],
  /** Non-member watching a public pool. React but never comment. */
  spectator: ['pool.view', 'feed.view', 'leaderboard.view', 'spectate.react'],
} as const satisfies Record<string, readonly Capability[]>;

/** Capabilities gated on BOTH pool active AND membership active. */
export const ACTIVE_MEMBERSHIP_CAPABILITIES: readonly Capability[] = [
  'checkin.create',
  'checkin.replace_own',
  'powerup.use',
];

/** Organiser controls valid only while the pool is still pending. */
export const PENDING_POOL_ORGANISER_CAPABILITIES: readonly Capability[] = [
  'pool.update_settings',
  'pool.cancel',
  'pool.invite',
];

/**
 * Platform-wide restrictions. Deny wins over any grant.
 * Delinquent members are locked out of new financial commitments (FR/UC-09).
 */
export const DELINQUENT_DENIED_CAPABILITIES: readonly Capability[] = [
  'pool.create',
  'pool.join',
  'powerup.purchase',
  'pro.subscribe',
];

/** Service principals — Edge Functions running with the service role key. */
export const SERVICE_PRINCIPAL_GRANTS: Readonly<Record<ServicePrincipal, readonly Capability[]>> = {
  cron_service: ['system.financial.write'],
  webhook_service: ['system.financial.write'],
};
