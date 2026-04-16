-- ============================================================
-- RPC: get_tier_distribution
-- Returns tier counts from global_leaderboard via GROUP BY
-- instead of fetching all rows client-side.
-- ============================================================

create or replace function public.get_tier_distribution()
returns table(tier text, count bigint) as $$
  select gl.tier, count(*) as count
  from public.global_leaderboard gl
  group by gl.tier;
$$ language sql stable security definer;

-- Returns the total goals scored in completed matches (for tiebreaker display)
create or replace function public.get_actual_total_goals()
returns integer as $$
  select coalesce(sum(coalesce(score_a, 0) + coalesce(score_b, 0)), 0)::integer
  from public.matches
  where status = 'completed';
$$ language sql stable security definer;
