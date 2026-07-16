-- ============================================================================
-- CONQR · Migration 0004 · Core tables, constraints, indexes
-- ----------------------------------------------------------------------------
-- The complete product data model (LLD §1 + Extended Spec §5).
-- All money is INR DECIMAL(10,2) per LLD (pot gets 12,2 headroom).
-- RLS is ENABLED on every table here with ZERO policies: default-deny from
-- birth. Migration 0007 (F0.4) opens exactly the documented access paths.
-- Financial fields are only ever written by the service role (CRON/webhooks).
-- ============================================================================

-- ════════════════════════════════════════════════════════════════════════════
-- users — profile extension of auth.users (LLD §1.2)
-- ════════════════════════════════════════════════════════════════════════════
create table public.users (
  id                         uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  -- Nullable (LLD deviation): Google/Apple sign-ins have no phone at signup.
  -- Phone is mutable identity metadata; auth.users.id is the immutable identity.
  phone                      text,
  username                   text not null check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name               text not null check (char_length(display_name) between 2 and 61),
  avatar_url                 text,
  language_pref              text not null default 'en'
                             check (language_pref in ('en', 'hi', 'ta', 'te', 'mr', 'bn')),
  razorpay_customer_id       text,
  razorpay_fund_account_id   text,
  default_upi_id             text,
  -- Caches maintained by service role; ledgers are the source of truth.
  xp                         integer not null default 0 check (xp >= 0),
  level                      integer not null default 1 check (level >= 1),
  is_pro                     boolean not null default false,
  pro_expires_at             timestamptz,
  is_creator                 boolean not null default false,
  referral_code              text not null check (referral_code ~ '^[A-Z0-9]{8}$'),
  referred_by                uuid references public.users (id) on delete set null,
  timezone                   text not null default 'Asia/Kolkata',
  push_token                 text,
  lifetime_earned            numeric(10,2) not null default 0 check (lifetime_earned >= 0),
  lifetime_fined             numeric(10,2) not null default 0 check (lifetime_fined >= 0),
  -- Set when profile setup completes; null routes the app to onboarding.
  onboarded_at               timestamptz,
  -- Moderation state (moderation.user.suspend / admin.users.ban / false-reporter lock).
  suspended_until            timestamptz,
  banned_at                  timestamptz,
  reporting_suspended_until  timestamptz,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now(),
  deleted_at                 timestamptz  -- soft delete; hard delete after 30 days
);

create unique index users_username_key on public.users (username);
create unique index users_referral_code_key on public.users (referral_code);
create unique index users_phone_key on public.users (phone) where phone is not null;

comment on table public.users is 'Profile extension of auth.users. Created by trigger at signup; completed at onboarding.';
comment on column public.users.xp is 'Cache. Source of truth = SUM(xp_events.amount). Service-role writes only.';

-- ════════════════════════════════════════════════════════════════════════════
-- pools (LLD §1.3)
-- ════════════════════════════════════════════════════════════════════════════
create table public.pools (
  id                       uuid primary key default gen_random_uuid(),
  name                     text not null check (char_length(name) between 3 and 40),
  description              text check (char_length(description) <= 200),
  emoji                    text not null default '🔥',
  creator_id               uuid not null references public.users (id),
  challenge_type           public.challenge_type not null default 'custom',
  start_date               timestamptz not null,
  end_date                 timestamptz not null,
  check_in_deadline_utc    integer not null default 18 check (check_in_deadline_utc between 0 and 23),
  check_in_window_start    integer check (check_in_window_start between 0 and 23),
  timezone                 text not null default 'Asia/Kolkata',
  currency                 text not null default 'INR' check (currency = 'INR'),
  buy_in_amount            numeric(10,2) not null,
  fine_amount              numeric(10,2) not null,
  check_in_type            public.check_in_type not null default 'photo',
  status                   public.pool_status not null default 'pending',
  visibility               public.visibility not null default 'private',
  total_pot                numeric(12,2) not null default 0 check (total_pot >= 0),
  max_members              integer not null default 20 check (max_members between 2 and 50),
  elimination_threshold    integer check (elimination_threshold between 1 and 30),
  grace_tokens_per_member  integer not null default 1 check (grace_tokens_per_member between 0 and 3),
  payout_rule              public.payout_rule not null default 'winner_takes_all',
  platform_fee_pct         numeric(4,2) not null default 0.05 check (platform_fee_pct between 0 and 0.20),
  is_creator_pool          boolean not null default false,
  invite_code              text not null check (invite_code ~ '^[A-Z0-9]{6}$'),
  razorpay_order_id        text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),

  -- Stakes: ₹99–₹5,000 buy-in with ₹25–₹500 fine (fine ≤ buy-in), OR a free
  -- social pool (both zero — Extended Spec §10.1, no Razorpay, no payouts).
  constraint pools_stakes_check check (
    (buy_in_amount = 0 and fine_amount = 0)
    or (
      buy_in_amount between 99 and 5000
      and fine_amount between 25 and 500
      and fine_amount <= buy_in_amount
    )
  ),
  -- Minimum 7-day duration (FR-POOL-08). Start-date-in-future is enforced at
  -- the API layer: a CHECK against now() would break legitimate later updates.
  constraint pools_duration_check check (end_date >= start_date + interval '7 days')
);

create unique index pools_invite_code_key on public.pools (invite_code);
create index pools_creator_idx on public.pools (creator_id);
create index pools_activation_idx on public.pools (status, start_date);          -- activate-pools CRON
create index pools_deadline_idx on public.pools (status, check_in_deadline_utc); -- process-checkins CRON
create index pools_explore_idx on public.pools (visibility, status, created_at desc)
  where visibility = 'public';                                                    -- Explore tab

comment on column public.pools.total_pot is 'Cache. Source of truth = SUM(transactions). Recalculated (never incremented) by CRON only.';
comment on column public.pools.fine_amount is 'Immutable after creation (Extended Spec §8.5) — enforced in F0.4 policies.';

-- ════════════════════════════════════════════════════════════════════════════
-- pool_members (LLD §1.4)
-- ════════════════════════════════════════════════════════════════════════════
create table public.pool_members (
  user_id               uuid not null references public.users (id),
  pool_id               uuid not null references public.pools (id),
  status                public.member_status not null default 'pending',
  current_streak        integer not null default 0 check (current_streak >= 0),
  longest_streak        integer not null default 0 check (longest_streak >= 0),
  grace_tokens          integer not null default 1 check (grace_tokens >= 0),
  shield_active         boolean not null default false,
  streak_freeze_active  boolean not null default false,
  fines_paid            numeric(10,2) not null default 0 check (fines_paid >= 0),
  misses_count          integer not null default 0 check (misses_count >= 0),
  compliance_pct        numeric(5,2) not null default 100.0 check (compliance_pct between 0 and 100),
  razorpay_mandate_id   text,
  razorpay_token_id     text,
  joined_at             timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  primary key (user_id, pool_id)  -- same user can never join a pool twice
);

create index pool_members_cron_idx on public.pool_members (pool_id, status);  -- CRON + leaderboard
create index pool_members_user_idx on public.pool_members (user_id, status);  -- home dashboard

comment on table public.pool_members is 'Membership + per-pool competitive state. Financial/streak fields: service-role writes only.';
comment on column public.pool_members.razorpay_mandate_id is 'UPI Autopay e-mandate authorising fine debits. The most critical field in the system.';

-- ════════════════════════════════════════════════════════════════════════════
-- transactions — the financial ledger (LLD §1.5)
-- ════════════════════════════════════════════════════════════════════════════
create table public.transactions (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.users (id),
  pool_id               uuid references public.pools (id),
  amount                numeric(10,2) not null check (amount > 0),
  transaction_type      public.txn_type not null,
  status                public.txn_status not null default 'pending',
  failure_reason        text,
  retry_count           integer not null default 0 check (retry_count between 0 and 3),
  next_retry_at         timestamptz,  -- schedule slot for the retry CRON (6h/24h/72h)
  idempotency_key       text not null,
  razorpay_order_id     text,
  razorpay_payment_id   text,
  razorpay_transfer_id  text,
  utr_number            text,
  gst_amount            numeric(10,2) check (gst_amount >= 0),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  settled_at            timestamptz,

  -- Only Pro subscriptions are pool-less; every other rupee belongs to a pool.
  constraint transactions_pool_check check (
    transaction_type = 'subscription' or pool_id is not null
  )
);

-- THE double-charge guard (LLD §3.3): pool:user:date:type collides on retry.
create unique index transactions_idempotency_key on public.transactions (idempotency_key);
create index transactions_ledger_idx on public.transactions (user_id, created_at desc); -- wallet ledger
create index transactions_pot_idx on public.transactions (pool_id, status, transaction_type); -- pot SUM
create index transactions_retry_idx on public.transactions (next_retry_at)
  where status in ('failed', 'retry_scheduled');                                          -- retry CRON

comment on table public.transactions is 'Append-mostly financial ledger. INSERT/UPDATE via service role only. Pot/pool math always derives from SUM over this table.';
comment on column public.transactions.idempotency_key is 'pool_id:user_id:YYYY-MM-DD:type — the single most important column in the schema.';

-- ════════════════════════════════════════════════════════════════════════════
-- check_ins (LLD §1.6, FRS Module 3)
-- ════════════════════════════════════════════════════════════════════════════
create table public.check_ins (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null,
  pool_id             uuid not null,
  -- Storage object paths (bucket-relative); clients get short-lived signed URLs.
  image_path          text not null,
  thumbnail_path      text,
  caption             text check (char_length(caption) <= 200),
  liveness_prompt     text,  -- the random prompt shown, null if none triggered
  blur_score          numeric(3,2) check (blur_score between 0 and 1),
  is_verified         boolean not null default true,  -- flipped false at 3 reports
  reported_count      integer not null default 0 check (reported_count >= 0),
  -- Client capture timestamp — used for deadline validation (FR-CI-08:
  -- "upload starts 11:58 PM, finishes 12:01 AM" counts). Server clock is the
  -- source of truth for everything else.
  client_captured_at  timestamptz not null,
  -- The pool-local (IST) day this check-in counts for. Stored explicitly
  -- because DATE(created_at) is UTC and wrong for 5 hours around IST midnight.
  checkin_date        date not null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  -- Only actual pool members can ever have a check-in row.
  constraint check_ins_member_fk foreign key (user_id, pool_id)
    references public.pool_members (user_id, pool_id),
  -- One per member per pool per day. Replacement is an UPDATE (FR-CI-07).
  constraint check_ins_one_per_day unique (user_id, pool_id, checkin_date)
);

create index check_ins_feed_idx on public.check_ins (pool_id, checkin_date desc, created_at desc);
create index check_ins_flagged_idx on public.check_ins (is_verified) where is_verified = false;

-- ════════════════════════════════════════════════════════════════════════════
-- reactions (LLD §1.6)
-- ════════════════════════════════════════════════════════════════════════════
create table public.reactions (
  check_in_id    uuid not null references public.check_ins (id) on delete cascade,
  user_id        uuid not null references public.users (id) on delete cascade,
  reaction_type  public.reaction_type not null,
  created_at     timestamptz not null default now(),

  primary key (check_in_id, user_id)  -- one reaction per user per check-in; changing = upsert
);

-- ════════════════════════════════════════════════════════════════════════════
-- comments — threaded, max 3 levels (FR-FEED-05)
-- ════════════════════════════════════════════════════════════════════════════
create table public.comments (
  id              uuid primary key default gen_random_uuid(),
  check_in_id     uuid not null references public.check_ins (id) on delete cascade,
  user_id         uuid not null references public.users (id),
  parent_id       uuid references public.comments (id),
  depth           integer not null default 0 check (depth between 0 and 2),  -- 3 levels: 0,1,2
  body            text not null check (char_length(body) between 1 and 500),
  reported_count  integer not null default 0 check (reported_count >= 0),
  is_hidden       boolean not null default false,  -- flipped at 3 reports
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz  -- soft delete keeps thread structure intact
);

create index comments_thread_idx on public.comments (check_in_id, created_at);

-- ════════════════════════════════════════════════════════════════════════════
-- pool_events — Wall of Shame, milestones, lifecycle (LLD §1.6)
-- ════════════════════════════════════════════════════════════════════════════
create table public.pool_events (
  id          uuid primary key default gen_random_uuid(),
  pool_id     uuid not null references public.pools (id),
  user_id     uuid references public.users (id),  -- null for pool-level events
  event_type  public.event_type not null,
  -- IST day of the event — the CRON dedup unit (Extended Spec §6.1 step 7).
  event_date  date not null default ((now() at time zone 'Asia/Kolkata'))::date,
  metadata    jsonb not null default '{}',        -- amounts, streak counts, copy params
  created_at  timestamptz not null default now()
);

create index pool_events_feed_idx on public.pool_events (pool_id, created_at desc);
-- CRON idempotency: the same event can never be written twice for the same day.
create unique index pool_events_member_dedup on public.pool_events (pool_id, user_id, event_type, event_date)
  where user_id is not null;
create unique index pool_events_pool_dedup on public.pool_events (pool_id, event_type, event_date)
  where user_id is null;

-- ════════════════════════════════════════════════════════════════════════════
-- power_up_inventory (Extended Spec §3.4)
-- ════════════════════════════════════════════════════════════════════════════
create table public.power_up_inventory (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users (id),
  pool_id         uuid not null references public.pools (id),
  power_up_type   public.power_up_type not null,
  status          public.power_up_status not null default 'available',
  target_user_id  uuid references public.users (id),  -- alarm bomb recipient
  transaction_id  uuid references public.transactions (id),
  purchased_at    timestamptz not null default now(),
  activated_at    timestamptz,
  consumed_at     timestamptz,
  expires_at      timestamptz  -- spotlight/ghost are 24h-boxed
);

create index power_up_cron_idx on public.power_up_inventory (pool_id, user_id, status);

-- ════════════════════════════════════════════════════════════════════════════
-- badges catalog + user_badges (Extended Spec §4.2)
-- ════════════════════════════════════════════════════════════════════════════
create table public.badges (
  key          text primary key,
  name         text not null,
  description  text not null,
  emoji        text not null,
  rarity       public.badge_rarity not null,
  -- Machine-readable award rule consumed by the CRON/award engine.
  criteria     jsonb not null default '{}',
  created_at   timestamptz not null default now()
);

create table public.user_badges (
  user_id     uuid not null references public.users (id) on delete cascade,
  badge_key   text not null references public.badges (key),
  pool_id     uuid references public.pools (id),  -- context where earned, if any
  awarded_at  timestamptz not null default now(),

  primary key (user_id, badge_key)
);

-- ════════════════════════════════════════════════════════════════════════════
-- xp_events — XP ledger (LLD §3.5); users.xp is a derived cache
-- ════════════════════════════════════════════════════════════════════════════
create table public.xp_events (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references public.users (id) on delete cascade,
  amount       integer not null,
  reason       text not null,  -- 'check_in', 'streak_bonus', 'pool_win', 'referral', ...
  pool_id      uuid references public.pools (id),
  check_in_id  uuid references public.check_ins (id) on delete set null,
  created_at   timestamptz not null default now()
);

create index xp_events_user_idx on public.xp_events (user_id, created_at desc);

-- ════════════════════════════════════════════════════════════════════════════
-- notifications + per-type preferences (SRS FR-NOTIF)
-- ════════════════════════════════════════════════════════════════════════════
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users (id) on delete cascade,
  type        text not null,  -- open vocabulary: 'reminder_3h', 'fine_charged', 'pre_debit', ...
  channel     public.notification_channel not null,
  title       text not null,
  body        text not null,
  data        jsonb not null default '{}',  -- deep-link route, pool_id, amounts
  -- CRON dedup unit (Extended Spec §6.1 steps 8–9), e.g. 'pre_debit:pool:user:date'.
  dedup_key   text,
  status      public.notification_status not null default 'queued',
  sent_at     timestamptz,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create unique index notifications_dedup_key on public.notifications (dedup_key)
  where dedup_key is not null;
create index notifications_center_idx on public.notifications (user_id, created_at desc);
-- Daily caps (4 push + 2 WhatsApp) count rows per user/channel/day at send time.
create index notifications_cap_idx on public.notifications (user_id, channel, created_at);

create table public.notification_preferences (
  user_id            uuid not null references public.users (id) on delete cascade,
  notification_type  text not null,
  muted              boolean not null default true,
  updated_at         timestamptz not null default now(),

  primary key (user_id, notification_type)
);

-- ════════════════════════════════════════════════════════════════════════════
-- reports — check-in & comment flagging (UC-12, Extended Spec §8.1)
-- ════════════════════════════════════════════════════════════════════════════
create table public.reports (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid not null references public.users (id),
  check_in_id  uuid references public.check_ins (id) on delete cascade,
  comment_id   uuid references public.comments (id) on delete cascade,
  reason       public.report_reason not null,
  detail       text check (char_length(detail) <= 500),
  status       public.report_status not null default 'open',
  resolved_by  uuid references public.users (id),
  resolved_at  timestamptz,
  created_at   timestamptz not null default now(),

  -- Exactly one target.
  constraint reports_one_target check (
    (check_in_id is not null)::int + (comment_id is not null)::int = 1
  )
);

-- A user can report a given item once.
create unique index reports_checkin_once on public.reports (reporter_id, check_in_id)
  where check_in_id is not null;
create unique index reports_comment_once on public.reports (reporter_id, comment_id)
  where comment_id is not null;
create index reports_queue_idx on public.reports (status, created_at) where status = 'open';

-- ════════════════════════════════════════════════════════════════════════════
-- disputes — fine disputes, 24h window / 48h review (Extended Spec §8.1)
-- ════════════════════════════════════════════════════════════════════════════
create table public.disputes (
  id              uuid primary key default gen_random_uuid(),
  transaction_id  uuid not null references public.transactions (id),
  user_id         uuid not null references public.users (id),
  reason          text not null check (char_length(reason) between 1 and 1000),
  status          public.dispute_status not null default 'open',
  resolved_by     uuid references public.users (id),
  resolution_note text,
  resolved_at     timestamptz,
  created_at      timestamptz not null default now(),

  constraint disputes_one_per_txn unique (transaction_id)
);

create index disputes_queue_idx on public.disputes (status, created_at) where status = 'open';

-- ════════════════════════════════════════════════════════════════════════════
-- subscriptions — CONQR Pro (Extended Spec §3.3)
-- ════════════════════════════════════════════════════════════════════════════
create table public.subscriptions (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references public.users (id),
  razorpay_subscription_id  text not null unique,
  plan                      public.pro_plan not null,
  status                    public.subscription_status not null default 'created',
  current_period_end        timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index subscriptions_user_idx on public.subscriptions (user_id, status);

-- ════════════════════════════════════════════════════════════════════════════
-- pool_spectators — public-pool followers (Extended Spec §4.4)
-- ════════════════════════════════════════════════════════════════════════════
create table public.pool_spectators (
  pool_id     uuid not null references public.pools (id) on delete cascade,
  user_id     uuid not null references public.users (id) on delete cascade,
  started_at  timestamptz not null default now(),

  primary key (pool_id, user_id)
);

-- ════════════════════════════════════════════════════════════════════════════
-- cron_runs — CRON observability (Extended Spec §6.4)
-- ════════════════════════════════════════════════════════════════════════════
create table public.cron_runs (
  id                 uuid primary key default gen_random_uuid(),
  job_name           text not null,  -- 'process-checkins', 'process-retries', ...
  status             public.cron_run_status not null default 'running',
  started_at         timestamptz not null default now(),
  finished_at        timestamptz,
  pools_processed    integer not null default 0,
  members_processed  integer not null default 0,
  fines_issued       integer not null default 0,
  errors             jsonb not null default '[]'
);

create index cron_runs_health_idx on public.cron_runs (job_name, started_at desc);

-- ════════════════════════════════════════════════════════════════════════════
-- Row-Level Security: ON everywhere, no policies yet = default deny.
-- ════════════════════════════════════════════════════════════════════════════
alter table public.users enable row level security;
alter table public.pools enable row level security;
alter table public.pool_members enable row level security;
alter table public.transactions enable row level security;
alter table public.check_ins enable row level security;
alter table public.reactions enable row level security;
alter table public.comments enable row level security;
alter table public.pool_events enable row level security;
alter table public.power_up_inventory enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
alter table public.xp_events enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.reports enable row level security;
alter table public.disputes enable row level security;
alter table public.subscriptions enable row level security;
alter table public.pool_spectators enable row level security;
alter table public.cron_runs enable row level security;
