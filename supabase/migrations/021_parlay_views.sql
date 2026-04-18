-- ============================================================
-- 021: Parlay frontend views — live estimates + leaderboard
-- ============================================================
-- Two read-only views powering Session 18 frontend:
--   * parlay_live_estimates — per-market, per-tier estimated payout
--     multipliers computed from current stakes. The frontend polls
--     this every 30s during the open window. Computed on-the-fly
--     rather than materialized because pool sizes are tiny (thousands
--     of rows max per market) and staleness isn't worth a refresh job.
--   * parlay_leaderboard — cumulative per-user stats across all
--     settled tickets. Backs the Today / Week / Tournament tabs.
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- parlay_live_estimates
-- ──────────────────────────────────────────────────────────────
-- 5% rake → 55/30/15 split across 5/5, 4/5, 3/5 tiers.
-- Cascade: if a tier has zero stakes, its pool collapses DOWN
-- (5→4→3). If 3/5 is also empty, that slice is unclaimable and
-- swept to treasury by the contract — we surface it as zero to
-- the user.
--
-- The tier a given ticket lands in is the popcount of matches
-- against the current leader snapshot. Until the market settles,
-- we can only estimate assuming no particular resolution, so we
-- report multipliers per-tier treating the stake pool for each
-- tier as the sum of all tickets currently holding that many
-- picks — weighted by the maximum achievable (5 picks each).
-- Simpler framing: assume even split across resolutions, so a
-- tier's stake pool = (sum of stakes) × tier-bin-fraction where
-- the fraction comes from binomial expectations at p=0.5.
--
-- To keep things legible the view reports multipliers computed as:
--   tier_bps_of_net * net_pool / expected_tier_stakes
-- where expected_tier_stakes is a blended 50/50 estimate using
-- the actual ticket pick distribution.
-- ──────────────────────────────────────────────────────────────
create or replace view public.parlay_live_estimates as
with pool as (
  select
    m.id as market_id,
    coalesce(sum(t.stake_usdc), 0)::numeric as gross
  from public.parlay_markets m
  left join public.parlay_tickets t on t.parlay_market_id = m.id
  where m.status in ('open','locked')
  group by m.id
),
net as (
  select
    market_id,
    (gross * 0.95)::numeric as net_pool,
    gross
  from pool
),
-- Binomial expectation for n=5 picks at p=0.5 per question:
--   P(5) = 1/32, P(4) = 5/32, P(3) = 10/32
-- These are the baseline expected winner-stake fractions when
-- pick distribution is symmetric across A/B. We use them as the
-- pre-lock estimator.
tier_estimates as (
  select
    n.market_id,
    n.net_pool,
    n.gross,
    -- Tier allocations per contract (bps of net_pool)
    (n.net_pool * 0.55)::numeric as tier5_allocation,
    (n.net_pool * 0.30)::numeric as tier4_allocation,
    (n.net_pool * 0.15)::numeric as tier3_allocation,
    -- Expected winning stakes per tier (binomial, p=0.5)
    (n.gross * 1.0  / 32.0)::numeric as expected_tier5_stakes,
    (n.gross * 5.0  / 32.0)::numeric as expected_tier4_stakes,
    (n.gross * 10.0 / 32.0)::numeric as expected_tier3_stakes
  from net n
)
select
  te.market_id,
  te.gross as gross_pool_usdc,
  te.net_pool as net_pool_usdc,
  -- Tier 5 (5/5 correct): 55% of net pool distributed across expected winners
  case
    when te.expected_tier5_stakes > 0
      then round((te.tier5_allocation / te.expected_tier5_stakes)::numeric, 4)
    else 0
  end as tier5_multiplier,
  -- Tier 4 (4/5 correct): 30% of net pool
  case
    when te.expected_tier4_stakes > 0
      then round((te.tier4_allocation / te.expected_tier4_stakes)::numeric, 4)
    else 0
  end as tier4_multiplier,
  -- Tier 3 (3/5 correct): 15% of net pool
  case
    when te.expected_tier3_stakes > 0
      then round((te.tier3_allocation / te.expected_tier3_stakes)::numeric, 4)
    else 0
  end as tier3_multiplier
from tier_estimates te;

grant select on public.parlay_live_estimates to anon, authenticated;

-- ──────────────────────────────────────────────────────────────
-- parlay_leaderboard
-- ──────────────────────────────────────────────────────────────
-- Cumulative stats per user over SETTLED markets only. Voided
-- markets are excluded so refunds don't appear as wins. Scope
-- filters (today / week / tournament) are applied by the API
-- route via settled_at thresholds against this view.
--
-- Tiebreaker: total USDC staked (spec). Names/emojis come from
-- public.users.
-- ──────────────────────────────────────────────────────────────
create or replace view public.parlay_leaderboard as
select
  u.id as user_id,
  u.username,
  u.avatar_emoji,
  sum(t.score)::integer as total_score,
  count(*)::integer as ticket_count,
  sum(t.stake_usdc)::numeric as total_stake_usdc,
  sum(coalesce(t.payout_usdc, 0))::numeric as total_winnings_usdc,
  max(m.settled_at) as last_settled_at,
  min(m.settled_at) as first_settled_at
from public.parlay_tickets t
join public.parlay_markets m on m.id = t.parlay_market_id
join public.users u on u.id = t.user_id
where m.status = 'settled'
  and t.score is not null
group by u.id, u.username, u.avatar_emoji;

grant select on public.parlay_leaderboard to anon, authenticated;

-- ──────────────────────────────────────────────────────────────
-- parlay_leaderboard_scoped — same aggregation but per-market
-- row so the API can filter by date window cheaply.
-- ──────────────────────────────────────────────────────────────
create or replace view public.parlay_leaderboard_scoped as
select
  t.user_id,
  t.parlay_market_id,
  t.score,
  t.stake_usdc,
  coalesce(t.payout_usdc, 0) as payout_usdc,
  m.settled_at,
  u.username,
  u.avatar_emoji
from public.parlay_tickets t
join public.parlay_markets m on m.id = t.parlay_market_id
join public.users u on u.id = t.user_id
where m.status = 'settled'
  and t.score is not null;

grant select on public.parlay_leaderboard_scoped to anon, authenticated;
