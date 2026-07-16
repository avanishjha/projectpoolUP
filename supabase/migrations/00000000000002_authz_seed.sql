-- ============================================================================
-- CONQR · Migration 0002 · Authorization seed (GENERATED — DO NOT EDIT)
-- ----------------------------------------------------------------------------
-- Source of truth: packages/authz/src/{capabilities,personas}.ts
-- Regenerate with: pnpm gen:authz-seed
-- Idempotent: safe to re-run; removes stale grants, upserts current ones.
-- ============================================================================

insert into authz.roles (key, description) values
  ('user', 'Base persona for every authenticated account (implicit, never stored in user_roles)'),
  ('creator', 'Verified creator — runs branded public pools with revenue share'),
  ('moderator', 'Reviews flagged check-ins and comments, suspends abusive users'),
  ('support', 'Customer support — user lookup, read-only transactions, resend notifications'),
  ('finance', 'Financial operations — reconciliation, GST reports, payout retries'),
  ('operations', 'Platform operations — CRON monitoring, feature flags'),
  ('admin', 'Full administrative access (superset of moderation, support, finance, ops)')
on conflict (key) do update set description = excluded.description;

-- Reset grants to exactly match the catalog (removes stale rows).
delete from authz.role_capabilities;

insert into authz.role_capabilities (role_key, capability) values
  ('admin', 'admin.disputes.resolve'),
  ('admin', 'admin.finance.view'),
  ('admin', 'admin.roles.manage'),
  ('admin', 'admin.users.ban'),
  ('admin', 'admin.users.view'),
  ('admin', 'finance.payouts.retry'),
  ('admin', 'finance.reconciliation.view'),
  ('admin', 'finance.reports.gst'),
  ('admin', 'moderation.checkin.review'),
  ('admin', 'moderation.comment.review'),
  ('admin', 'moderation.queue.view'),
  ('admin', 'moderation.user.suspend'),
  ('admin', 'ops.cron.monitor'),
  ('admin', 'ops.flags.manage'),
  ('admin', 'support.notifications.resend'),
  ('admin', 'support.transactions.view'),
  ('admin', 'support.users.lookup'),
  ('creator', 'creator.dashboard.view'),
  ('creator', 'creator.pool.create'),
  ('finance', 'admin.finance.view'),
  ('finance', 'finance.payouts.retry'),
  ('finance', 'finance.reconciliation.view'),
  ('finance', 'finance.reports.gst'),
  ('moderator', 'moderation.checkin.review'),
  ('moderator', 'moderation.comment.review'),
  ('moderator', 'moderation.queue.view'),
  ('moderator', 'moderation.user.suspend'),
  ('operations', 'ops.cron.monitor'),
  ('operations', 'ops.flags.manage'),
  ('support', 'support.notifications.resend'),
  ('support', 'support.transactions.view'),
  ('support', 'support.users.lookup'),
  ('user', 'explore.view'),
  ('user', 'notification.manage_own'),
  ('user', 'payout.receive'),
  ('user', 'pool.create'),
  ('user', 'pool.join'),
  ('user', 'powerup.purchase'),
  ('user', 'pro.subscribe'),
  ('user', 'profile.delete_own'),
  ('user', 'profile.update_own'),
  ('user', 'profile.view'),
  ('user', 'referral.share'),
  ('user', 'spectate.react'),
  ('user', 'spectate.view'),
  ('user', 'transaction.view_own'),
  ('user', 'wallet.manage_methods_own'),
  ('user', 'wallet.view_own');
