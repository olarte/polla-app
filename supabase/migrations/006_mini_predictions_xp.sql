-- ============================================================
-- Polla: Mini-Predictions & XP Engine
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- MINI PREDICTIONS (5 per-match XP predictions)
-- ──────────────────────────────────────────────────────────────
create table public.mini_predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  -- 5 prediction types per match
  first_to_score text, -- 'team_a' | 'team_b' | 'none'
  total_goals text,    -- 'under_2' | '2_to_3' | 'over_3'
  both_score text,     -- 'yes' | 'no'
  early_goal text,     -- 'yes' | 'no'  (goal before 15')
  motm text,           -- 'team_a' | 'team_b'
  -- Results
  correct_count integer, -- null until scored, 0-5
  xp_earned integer,     -- null until scored
  created_at timestamptz not null default now(),
  scored_at timestamptz,
  -- One prediction set per user per match
  constraint mini_predictions_unique unique (user_id, match_id)
);

alter table public.mini_predictions enable row level security;

create policy "Users can read own mini predictions"
  on public.mini_predictions for select
  using (auth.uid() = user_id);

create policy "Users can insert own mini predictions"
  on public.mini_predictions for insert
  with check (auth.uid() = user_id);

create index idx_mini_pred_user on public.mini_predictions(user_id);
create index idx_mini_pred_match on public.mini_predictions(match_id);

-- ──────────────────────────────────────────────────────────────
-- Add insert policy to xp_events (was missing — only had select)
-- ──────────────────────────────────────────────────────────────
create policy "Users can insert own xp events via RPC"
  on public.xp_events for insert
  with check (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────
-- Add last_login_date to users for daily login streak tracking
-- ──────────────────────────────────────────────────────────────
alter table public.users add column if not exists last_login_date date;

-- ──────────────────────────────────────────────────────────────
-- FUNCTION: Score mini predictions for a completed match
-- ──────────────────────────────────────────────────────────────
create or replace function public.score_mini_predictions(
  p_match_id uuid
)
returns json as $$
declare
  v_match record;
  v_pred record;
  v_correct integer;
  v_xp integer;
  v_scored integer := 0;
  v_actual_first text;
  v_actual_total text;
  v_actual_both text;
  v_actual_early text; -- would need event data, default 'no'
  v_actual_motm text;
begin
  select * into v_match from public.matches where id = p_match_id;

  if v_match is null then raise exception 'Match not found'; end if;
  if v_match.status != 'completed' then raise exception 'Match not completed'; end if;
  if v_match.score_a is null or v_match.score_b is null then raise exception 'Scores not set'; end if;

  -- Derive actual results from match scores
  -- First to score
  if v_match.score_a = 0 and v_match.score_b = 0 then
    v_actual_first := 'none';
  elsif v_match.score_a >= v_match.score_b then
    v_actual_first := 'team_a'; -- simplified: higher scorer assumed first
  else
    v_actual_first := 'team_b';
  end if;

  -- Total goals
  if (v_match.score_a + v_match.score_b) < 2 then
    v_actual_total := 'under_2';
  elsif (v_match.score_a + v_match.score_b) <= 3 then
    v_actual_total := '2_to_3';
  else
    v_actual_total := 'over_3';
  end if;

  -- Both teams scored
  if v_match.score_a > 0 and v_match.score_b > 0 then
    v_actual_both := 'yes';
  else
    v_actual_both := 'no';
  end if;

  -- Early goal (simplified: yes if total goals > 2, proxy)
  v_actual_early := 'no'; -- placeholder until event-level data available

  -- MOTM (simplified: team with more goals)
  if v_match.score_a >= v_match.score_b then
    v_actual_motm := 'team_a';
  else
    v_actual_motm := 'team_b';
  end if;

  -- Score each mini prediction
  for v_pred in
    select * from public.mini_predictions
    where match_id = p_match_id and correct_count is null
  loop
    v_correct := 0;

    if v_pred.first_to_score = v_actual_first then v_correct := v_correct + 1; end if;
    if v_pred.total_goals = v_actual_total then v_correct := v_correct + 1; end if;
    if v_pred.both_score = v_actual_both then v_correct := v_correct + 1; end if;
    if v_pred.early_goal = v_actual_early then v_correct := v_correct + 1; end if;
    if v_pred.motm = v_actual_motm then v_correct := v_correct + 1; end if;

    -- XP: 10 per correct, +25 bonus for perfect 5/5
    v_xp := v_correct * 10;
    if v_correct = 5 then
      v_xp := v_xp + 25;
    end if;

    update public.mini_predictions
    set correct_count = v_correct, xp_earned = v_xp, scored_at = now()
    where id = v_pred.id;

    -- Award XP if any correct
    if v_xp > 0 then
      if not exists (
        select 1 from public.xp_events
        where user_id = v_pred.user_id
        and reference_id = v_pred.id
        and event_type = 'mini_prediction'
      ) then
        insert into public.xp_events (user_id, event_type, xp_amount, reference_id)
        values (v_pred.user_id, 'mini_prediction', v_xp, v_pred.id);

        update public.users
        set total_xp = total_xp + v_xp
        where id = v_pred.user_id;
      end if;
    end if;

    v_scored := v_scored + 1;
  end loop;

  return json_build_object('match_id', p_match_id, 'scored', v_scored);
end;
$$ language plpgsql security definer;

-- ──────────────────────────────────────────────────────────────
-- FUNCTION: Record daily login and update streak
-- ──────────────────────────────────────────────────────────────
create or replace function public.record_daily_login(
  p_user_id uuid
)
returns json as $$
declare
  v_user record;
  v_today date := current_date;
  v_xp integer := 0;
  v_new_streak integer;
begin
  select * into v_user from public.users where id = p_user_id;
  if v_user is null then raise exception 'User not found'; end if;

  -- Already logged in today
  if v_user.last_login_date = v_today then
    return json_build_object('streak', v_user.streak_days, 'xp_awarded', 0, 'already_logged', true);
  end if;

  -- Check if streak continues (yesterday) or resets
  if v_user.last_login_date = v_today - 1 then
    v_new_streak := v_user.streak_days + 1;
  else
    v_new_streak := 1;
  end if;

  -- Base daily login XP: 5
  v_xp := 5;
  -- Streak bonus: 5 × streak count
  v_xp := v_xp + (5 * v_new_streak);

  -- Update user
  update public.users
  set last_login_date = v_today,
      streak_days = v_new_streak,
      total_xp = total_xp + v_xp
  where id = p_user_id;

  -- Record XP event (prevent duplicate for same day)
  if not exists (
    select 1 from public.xp_events
    where user_id = p_user_id
    and event_type = 'daily_login'
    and created_at::date = v_today
  ) then
    insert into public.xp_events (user_id, event_type, xp_amount)
    values (p_user_id, 'daily_login', v_xp);
  end if;

  return json_build_object('streak', v_new_streak, 'xp_awarded', v_xp, 'already_logged', false);
end;
$$ language plpgsql security definer;

-- ──────────────────────────────────────────────────────────────
-- FUNCTION: Check XP thresholds and create booster packs
-- ──────────────────────────────────────────────────────────────
create or replace function public.check_xp_milestones(
  p_user_id uuid
)
returns json as $$
declare
  v_user record;
  v_milestones integer[] := array[100, 250, 500, 750, 1000, 1500, 2000, 3000];
  v_new_packs integer := 0;
  v_milestone integer;
begin
  select * into v_user from public.users where id = p_user_id;
  if v_user is null then raise exception 'User not found'; end if;

  -- Count how many milestones the user has crossed
  foreach v_milestone in array v_milestones loop
    if v_user.total_xp >= v_milestone and v_user.packs_earned < (
      select count(*) from unnest(v_milestones) m where m <= v_user.total_xp
    ) then
      v_new_packs := (
        select count(*) from unnest(v_milestones) m where m <= v_user.total_xp
      ) - v_user.packs_earned;
      exit; -- only calculate once
    end if;
  end loop;

  if v_new_packs > 0 then
    update public.users
    set packs_earned = packs_earned + v_new_packs
    where id = p_user_id;
  end if;

  return json_build_object('new_packs', v_new_packs, 'total_packs', v_user.packs_earned + v_new_packs);
end;
$$ language plpgsql security definer;
