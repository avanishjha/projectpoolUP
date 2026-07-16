/**
 * The complete capability catalog — the single source of truth.
 *
 * `authz.role_capabilities` in Postgres is GENERATED from this file
 * (scripts/generate-sql-seed.ts). Never edit the SQL seed by hand.
 *
 * Naming: `<domain>.<action>`. Ownership ("own row") and pool context are
 * expressed by the resolver's context conditions, not by capability names.
 */

export const CAPABILITIES = [
  // ── Profile & account ────────────────────────────────────────────────
  'profile.view', // view any user profile
  'profile.update_own',
  'profile.delete_own', // account deletion (soft-delete flow)

  // ── Pools ────────────────────────────────────────────────────────────
  'pool.create',
  'pool.join',
  'pool.view', // pool detail, members, rules
  'pool.update_settings', // organiser, while pending
  'pool.cancel', // organiser, while pending (full refund path)
  'pool.invite', // share invite code / links, while pending

  // ── Check-ins ────────────────────────────────────────────────────────
  'checkin.create', // active member of an active pool
  'checkin.replace_own', // second same-day check-in replaces first
  'checkin.report',

  // ── Feed & social ────────────────────────────────────────────────────
  'feed.view',
  'reaction.add',
  'comment.create',
  'comment.report',
  'leaderboard.view',

  // ── Wallet & money (own scope) ──────────────────────────────────────
  'wallet.view_own',
  'wallet.manage_methods_own', // UPI ID, tokenised cards
  'transaction.view_own',
  'payout.receive',

  // ── Store & gamification ─────────────────────────────────────────────
  'powerup.purchase',
  'powerup.use', // active member of an active pool
  'pro.subscribe',

  // ── Growth ───────────────────────────────────────────────────────────
  'explore.view', // public pool discovery
  'spectate.view', // watch a public pool feed without membership
  'spectate.react', // spectators may react but never comment
  'referral.share',

  // ── Notifications ────────────────────────────────────────────────────
  'notification.manage_own', // mute types, preferences

  // ── Creator platform ─────────────────────────────────────────────────
  'creator.pool.create', // is_creator_pool = true pools
  'creator.dashboard.view',

  // ── Moderation ───────────────────────────────────────────────────────
  'moderation.queue.view',
  'moderation.checkin.review', // verify / reject flagged check-ins
  'moderation.comment.review',
  'moderation.user.suspend',

  // ── Support ──────────────────────────────────────────────────────────
  'support.users.lookup',
  'support.transactions.view', // read-only financial visibility
  'support.notifications.resend',

  // ── Finance ──────────────────────────────────────────────────────────
  'finance.reconciliation.view',
  'finance.reports.gst',
  'finance.payouts.retry',

  // ── Operations ───────────────────────────────────────────────────────
  'ops.cron.monitor',
  'ops.flags.manage',

  // ── Admin ────────────────────────────────────────────────────────────
  'admin.users.view',
  'admin.users.ban',
  'admin.disputes.resolve',
  'admin.roles.manage',
  'admin.finance.view',

  // ── System (service principals only — never grantable to humans) ────
  'system.financial.write', // total_pot, fines_paid, streaks, transactions
] as const;

export type Capability = (typeof CAPABILITIES)[number];

const CAPABILITY_SET: ReadonlySet<string> = new Set(CAPABILITIES);

export function isCapability(value: string): value is Capability {
  return CAPABILITY_SET.has(value);
}

/** Capabilities that must never be granted to a human role. */
export const SYSTEM_ONLY_CAPABILITIES: readonly Capability[] = ['system.financial.write'];
