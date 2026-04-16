-- ============================================================
-- 015: Global pool running total + tiebreaker support
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 1. Global pool totals — single-row running total updated by
--    trigger on group pool changes, replacing per-request sums.
-- ──────────────────────────────────────────────────────────────
create table public.global_pool_totals (
  id boolean primary key default true check (id = true),  -- single-row trick
  total_amount numeric(18,6) not null default 0,
  updated_at timestamptz not null default now()
);

-- Seed the single row
insert into public.global_pool_totals (total_amount)
select coalesce(sum(
  (pool_amount * global_allocation) / (100 - global_allocation)
), 0)
from public.groups
where is_paid = true and pool_amount > 0;

alter table public.global_pool_totals enable row level security;

create policy "Global pool totals are publicly readable"
  on public.global_pool_totals for select
  using (true);

-- Trigger: whenever a group's pool_amount changes, recompute the
-- global contribution delta and update the running total.
create or replace function public.handle_group_pool_change()
returns trigger as $$
declare
  old_global numeric;
  new_global numeric;
begin
  -- old contribution
  if old.pool_amount > 0 and old.global_allocation > 0 then
    old_global := (old.pool_amount * old.global_allocation) / (100 - old.global_allocation);
  else
    old_global := 0;
  end if;
  -- new contribution
  if new.pool_amount > 0 and new.global_allocation > 0 then
    new_global := (new.pool_amount * new.global_allocation) / (100 - new.global_allocation);
  else
    new_global := 0;
  end if;

  update public.global_pool_totals
  set total_amount = total_amount + (new_global - old_global),
      updated_at = now()
  where id = true;

  return new;
end;
$$ language plpgsql security definer;

create trigger on_group_pool_change
  after update of pool_amount on public.groups
  for each row execute function public.handle_group_pool_change();

-- Also handle new paid groups being inserted with a non-zero pool
create or replace function public.handle_group_pool_insert()
returns trigger as $$
declare
  contrib numeric;
begin
  if new.is_paid and new.pool_amount > 0 and new.global_allocation > 0 then
    contrib := (new.pool_amount * new.global_allocation) / (100 - new.global_allocation);
    update public.global_pool_totals
    set total_amount = total_amount + contrib,
        updated_at = now()
    where id = true;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_group_pool_insert
  after insert on public.groups
  for each row execute function public.handle_group_pool_insert();

-- ──────────────────────────────────────────────────────────────
-- 2. Tiebreaker column on global_leaderboard
--    User predicts total goals scored in the tournament.
--    NULL until they submit a prediction.
-- ──────────────────────────────────────────────────────────────
alter table public.global_leaderboard
  add column if not exists tiebreaker_goals integer;

-- ──────────────────────────────────────────────────────────────
-- 3. Rewrite refresh_global_leaderboard() to use tiebreaker
--    in ranking: ORDER BY total_points DESC, then
--    ABS(tiebreaker_goals - actual_total) ASC (NULL last).
--    actual_total_goals comes from summing completed match scores.
-- ──────────────────────────────────────────────────────────────
create or replace function public.refresh_global_leaderboard()
returns json as $$
declare
  v_total_users integer;
  v_actual_goals integer;
begin
  -- Calculate actual total goals from completed matches
  select coalesce(sum(coalesce(score_a, 0) + coalesce(score_b, 0)), 0)
  into v_actual_goals
  from public.matches
  where status = 'completed';

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

  -- Rank: primary = points DESC, secondary = tiebreaker closeness ASC (NULL last)
  update public.global_leaderboard gl
  set rank = sub.rnk
  from (
    select user_id,
      dense_rank() over (
        order by total_points desc,
        case when tiebreaker_goals is not null
             then abs(tiebreaker_goals - v_actual_goals)
             else 2147483647 end asc
      ) as rnk
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

  return json_build_object('users_ranked', v_total_users, 'actual_goals', v_actual_goals);
end;
$$ language plpgsql security definer;
