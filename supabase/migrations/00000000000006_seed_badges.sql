-- ============================================================================
-- CONQR · Migration 0006 · Badge catalog seed (Extended Spec §4.2)
-- ----------------------------------------------------------------------------
-- Criteria are machine-readable specs consumed by the award engine (F9.2).
-- Idempotent upsert: rerunning refreshes copy without duplicating rows.
-- ============================================================================

insert into public.badges (key, name, description, emoji, rarity, criteria) values
  ('pehla_kadam', 'Pehla Kadam', 'Complete your first pool', '👣', 'common',
   '{"type": "pools_completed", "count": 1}'),
  ('iron_will', 'Iron Will', 'Hit a 30-day streak', '🦾', 'uncommon',
   '{"type": "streak", "days": 30}'),
  ('diamond_hands', 'Diamond Hands', 'Complete a pool without missing a single day', '💎', 'rare',
   '{"type": "pool_compliance", "pct": 100, "count": 1}'),
  ('pot_raja', 'Pot Raja', 'Win 3 or more pools', '🤑', 'rare',
   '{"type": "pools_won", "count": 3}'),
  ('untouchable', 'Untouchable', 'Complete 5 pools with 100% compliance', '👑', 'epic',
   '{"type": "pool_compliance", "pct": 100, "count": 5}'),
  ('centurion', 'Centurion', 'Reach a 100-day streak across any pools', '🏆', 'legendary',
   '{"type": "streak", "days": 100, "scope": "global"}'),
  ('lakhpati', 'Lakhpati', 'Earn ₹1 lakh+ lifetime from pools', '💰', 'legendary',
   '{"type": "lifetime_earned", "amount": 100000}'),
  ('social_butterfly', 'Social Butterfly', 'React to 100+ check-ins', '🦋', 'common',
   '{"type": "reactions_given", "count": 100}'),
  ('early_bird', 'Early Bird', 'Check in before 6am IST for 7 consecutive days', '🐦', 'uncommon',
   '{"type": "early_checkins", "before_hour_ist": 6, "consecutive_days": 7}'),
  ('ipl_survivor', 'IPL Survivor', 'Complete a pool during IPL season without missing', '🏏', 'seasonal',
   '{"type": "pool_compliance", "pct": 100, "count": 1, "season_window": "ipl"}')
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description,
  emoji = excluded.emoji,
  rarity = excluded.rarity,
  criteria = excluded.criteria;
