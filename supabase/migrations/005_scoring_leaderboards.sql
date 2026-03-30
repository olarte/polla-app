-- ============================================================
-- Polla: Scoring, Leaderboards & Tier System
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- GLOBAL LEADERBOARD (materialized view-like table, refreshed on scoring)
-- ──────────────────────────────────────────────────────────────
create table public.global_leaderboard (
  user_id uuid primary key references public.users(id) on delete cascade,
  total_points integer not null default 0,
  matches_predicted integer not null default 0,
  exact_scores integer not null default 0,
  bonus_points integer not null default 0,
  rank integer,
  tier text not null default 'bronze'
    check (tier in ('mythic', 'diamond', 'platinum', 'gold', 'silver', 'bronze')),
  updated_at timestamptz not null default now()
);

alter table public.global_leaderboard enable row level security;

create policy "Global leaderboard is publicly readable"
  on public.global_leaderboard for select
  using (true);

create index idx_global_lb_rank on public.global_leaderboard(rank);
create index idx_global_lb_points on public.global_leaderboard(total_points desc);

-- ──────────────────────────────────────────────────────────────
-- XP EVENTS (tracks XP awards to prevent double-crediting)
-- ──────────────────────────────────────────────────────────────
create table public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  event_type text not null,
  xp_amount integer not null,
  reference_id uuid, -- match_id, prediction_id, etc.
  created_at timestamptz not null default now()
);

alter table public.xp_events enable row level security;

create policy "Users can read own xp events"
  on public.xp_events for select
  using (auth.uid() = user_id);

create index idx_xp_events_user on public.xp_events(user_id);
create index idx_xp_events_ref on public.xp_events(reference_id);

-- ──────────────────────────────────────────────────────────────
-- FUNCTION: Score all predictions for a completed match
-- Called by the scoring API after a match result is confirmed
-- ──────────────────────────────────────────────────────────────
create or replace function public.score_match_predictions(
  p_match_id uuid
)
returns json as $$
declare
  v_match record;
  v_pred record;
  v_points integer;
  v_scored integer := 0;
  v_result_a text; -- W/D/L for team A
  v_pred_result_a text;
  v_actual_gd integer;
  v_pred_gd integer;
begin
  -- Get match details
  select * into v_match from public.matches where id = p_match_id;

  if v_match is null then
    raise exception 'Match not found';
  end if;

  if v_match.status != 'completed' then
    raise exception 'Match not completed yet';
  end if;

  if v_match.score_a is null or v_match.score_b is null then
    raise exception 'Match scores not set';
  end if;

  -- Determine actual result
  if v_match.score_a > v_match.score_b then
    v_result_a := 'W';
  elsif v_match.score_a < v_match.score_b then
    v_result_a := 'L';
  else
    v_result_a := 'D';
  end if;

  v_actual_gd := v_match.score_a - v_match.score_b;

  -- Score each prediction for this match
  for v_pred in
    select * from public.predictions
    where match_id = p_match_id
    and points is null -- Only score unscored predictions
  loop
    -- Check lock: prediction must have been made before kickoff
    if v_pred.created_at > v_match.kickoff then
      -- Late prediction, 0 points
      update public.predictions set points = 0 where id = v_pred.id;
      continue;
    end if;

    -- Determine predicted result
    if v_pred.score_a > v_pred.score_b then
      v_pred_result_a := 'W';
    elsif v_pred.score_a < v_pred.score_b then
      v_pred_result_a := 'L';
    else
      v_pred_result_a := 'D';
    end if;

    v_pred_gd := v_pred.score_a - v_pred.score_b;

    -- Calculate points
    if v_pred.score_a = v_match.score_a and v_pred.score_b = v_match.score_b then
      -- Exact score: 5 points
      v_points := 5;
    elsif v_pred_result_a = v_result_a and v_pred_gd = v_actual_gd then
      -- Correct result + correct goal difference: 3 points
      v_points := 3;
    elsif v_pred_result_a = v_result_a then
      -- Correct result only: 2 points
      v_points := 2;
    else
      -- Wrong: 0 points
      v_points := 0;
    end if;

    -- Apply stage multiplier
    v_points := round(v_points * v_match.multiplier);

    -- Update prediction with points
    update public.predictions set points = v_points where id = v_pred.id;

    -- Award XP (5 for correct, 15 for exact)
    if v_points > 0 then
      declare
        v_xp integer;
      begin
        if v_pred.score_a = v_match.score_a and v_pred.score_b = v_match.score_b then
          v_xp := 15;
        else
          v_xp := 5;
        end if;

        -- Check for duplicate XP award
        if not exists (
          select 1 from public.xp_events
          where user_id = v_pred.user_id
          and reference_id = v_pred.id
          and event_type = 'polla_prediction'
        ) then
          insert into public.xp_events (user_id, event_type, xp_amount, reference_id)
          values (v_pred.user_id, 'polla_prediction', v_xp, v_pred.id);

          update public.users
          set total_xp = total_xp + v_xp
          where id = v_pred.user_id;
        end if;
      end;
    end if;

    v_scored := v_scored + 1;
  end loop;

  return json_build_object(
    'match_id', p_match_id,
    'match_number', v_match.match_number,
    'scored', v_scored
  );
end;
$$ language plpgsql security definer;

-- ──────────────────────────────────────────────────────────────
-- FUNCTION: Refresh group leaderboard for a specific group
-- Recalculates total_points and rank for all members
-- ──────────────────────────────────────────────────────────────
create or replace function public.refresh_group_leaderboard(
  p_group_id uuid
)
returns void as $$
begin
  -- Update total_points for each member
  update public.group_members gm
  set total_points = coalesce(sub.pts, 0)
  from (
    select p.user_id, sum(coalesce(p.points, 0)) as pts
    from public.predictions p
    where p.points is not null
    group by p.user_id
  ) sub
  where gm.group_id = p_group_id
  and gm.user_id = sub.user_id;

  -- Update ranks (dense rank by points desc)
  update public.group_members gm
  set rank = sub.rnk
  from (
    select user_id, dense_rank() over (order by total_points desc) as rnk
    from public.group_members
    where group_id = p_group_id
  ) sub
  where gm.group_id = p_group_id
  and gm.user_id = sub.user_id;
end;
$$ language plpgsql security definer;

-- ──────────────────────────────────────────────────────────────
-- FUNCTION: Refresh global leaderboard and assign tiers
-- ──────────────────────────────────────────────────────────────
create or replace function public.refresh_global_leaderboard()
returns json as $$
declare
  v_total_users integer;
begin
  -- Upsert leaderboard entries for all users who have predictions
  insert into public.global_leaderboard (user_id, total_points, matches_predicted, exact_scores, bonus_points, updated_at)
  select
    p.user_id,
    coalesce(sum(p.points), 0) as total_points,
    count(*) filter (where p.points is not null) as matches_predicted,
    count(*) filter (where p.points is not null and p.score_a = m.score_a and p.score_b = m.score_b) as exact_scores,
    coalesce(bp.bonus_pts, 0) as bonus_points,
    now()
  from public.predictions p
  join public.matches m on m.id = p.match_id
  left join (
    select user_id, sum(coalesce(points, 0)) as bonus_pts
    from public.bonus_predictions
    where points is not null
    group by user_id
  ) bp on bp.user_id = p.user_id
  group by p.user_id, bp.bonus_pts
  on conflict (user_id) do update set
    total_points = excluded.total_points,
    matches_predicted = excluded.matches_predicted,
    exact_scores = excluded.exact_scores,
    bonus_points = excluded.bonus_points,
    updated_at = now();

  -- Add bonus_points to total
  update public.global_leaderboard
  set total_points = total_points + bonus_points;

  -- Assign ranks
  update public.global_leaderboard gl
  set rank = sub.rnk
  from (
    select user_id, dense_rank() over (order by total_points desc) as rnk
    from public.global_leaderboard
  ) sub
  where gl.user_id = sub.user_id;

  -- Assign tiers based on percentile
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

-- ──────────────────────────────────────────────────────────────
-- FUNCTION: Score bonus predictions (called at tournament end)
-- ──────────────────────────────────────────────────────────────
create or replace function public.score_bonus_predictions(
  p_results json
  -- Expected: { "champion": "ARG", "runner_up": "FRA", "third_place": "CRO",
  --             "golden_boot": "Mbappe", "golden_ball": "Messi",
  --             "group_winner_A": "USA", ... }
)
returns json as $$
declare
  v_type text;
  v_actual text;
  v_pred record;
  v_points integer;
  v_scored integer := 0;
  v_points_map json := '{
    "champion": 20, "runner_up": 10, "third_place": 5,
    "golden_boot": 15, "golden_ball": 10
  }'::json;
begin
  -- Iterate over each result type
  for v_type, v_actual in
    select key, value #>> '{}' from json_each(p_results)
  loop
    -- Determine points for this prediction type
    v_points := coalesce((v_points_map ->> v_type)::integer, 5); -- 5 for group_winners

    -- Score all predictions of this type
    for v_pred in
      select * from public.bonus_predictions
      where prediction_type = v_type
      and points is null
    loop
      if lower(trim(v_pred.value)) = lower(trim(v_actual)) then
        update public.bonus_predictions set points = v_points where id = v_pred.id;
      else
        update public.bonus_predictions set points = 0 where id = v_pred.id;
      end if;
      v_scored := v_scored + 1;
    end loop;
  end loop;

  return json_build_object('scored', v_scored);
end;
$$ language plpgsql security definer;
