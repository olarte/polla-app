-- ============================================================
-- Polla: Drop tournament-bonus predictions entirely
--
-- The "bonus predictions" concept (champion, runner-up, third
-- place, golden boot/ball, group winners) has been removed from
-- the product. Scoring is now purely the tiered match-grading
-- rules in migration 007. Global-pool stage bonuses are TBD and
-- will be redesigned separately.
--
-- This migration:
--   1. Drops the score_bonus_predictions() function.
--   2. Drops the bonus_predictions table (cascades to any stray FKs).
--   3. Rewrites refresh_global_leaderboard() so it no longer reads
--      the table or sums bonus_points.
--   4. Drops global_leaderboard.bonus_points column.
-- ============================================================

drop function if exists public.score_bonus_predictions(json);

drop table if exists public.bonus_predictions cascade;

create or replace function public.refresh_global_leaderboard()
returns json as $$
declare
  v_total_users integer;
begin
  insert into public.global_leaderboard (
    user_id,
    total_points,
    matches_predicted,
    exact_scores,
    updated_at
  )
  select
    p.user_id,
    coalesce(sum(p.points), 0) as total_points,
    count(*) filter (where p.points is not null) as matches_predicted,
    count(*) filter (
      where p.points is not null
        and p.score_a = m.score_a
        and p.score_b = m.score_b
    ) as exact_scores,
    now()
  from public.predictions p
  join public.matches m on m.id = p.match_id
  group by p.user_id
  on conflict (user_id) do update set
    total_points      = excluded.total_points,
    matches_predicted = excluded.matches_predicted,
    exact_scores      = excluded.exact_scores,
    updated_at        = now();

  update public.global_leaderboard gl
  set rank = sub.rnk
  from (
    select user_id, dense_rank() over (order by total_points desc) as rnk
    from public.global_leaderboard
  ) sub
  where gl.user_id = sub.user_id;

  select count(*) into v_total_users from public.global_leaderboard;

  if v_total_users > 0 then
    update public.global_leaderboard gl
    set tier = case
      when sub.pct <= 0.001 then 'mythic'
      when sub.pct <= 0.01  then 'diamond'
      when sub.pct <= 0.05  then 'platinum'
      when sub.pct <= 0.15  then 'gold'
      when sub.pct <= 0.40  then 'silver'
      else 'bronze'
    end
    from (
      select user_id,
        (rank::numeric - 1) / v_total_users::numeric as pct
      from public.global_leaderboard
    ) sub
    where gl.user_id = sub.user_id;
  end if;

  return json_build_object('users_ranked', v_total_users);
end;
$$ language plpgsql security definer;

alter table public.global_leaderboard drop column if exists bonus_points;
