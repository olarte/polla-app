-- ============================================================
-- Polla: Knockout penalty winners
--
-- Knockout matches can end tied in regulation time. When that
-- happens, the match is decided on penalties. For prediction
-- purposes we only care about WHO wins the shootout, not the
-- penalty goal count.
--
-- This migration:
--   1. Adds predictions.penalty_winner ('a' | 'b' | null) for the
--      user's pick when their predicted regulation score is tied.
--   2. Adds matches.penalty_winner for the actual result.
--   3. Replaces score_match_predictions to factor penalty winners
--      into the "effective winner" used by the scoring tiers.
--
-- Supersedes the penalty-winner-unaware version of
-- score_match_predictions from migration 007.
-- ============================================================

alter table public.predictions
  add column if not exists penalty_winner text
    check (penalty_winner in ('a', 'b'));

alter table public.matches
  add column if not exists penalty_winner text
    check (penalty_winner in ('a', 'b'));

comment on column public.predictions.penalty_winner is
  'For knockout matches where the predicted regulation score is tied, the user''s pick for who wins on penalties. NULL for group matches or non-tied regulation predictions.';

comment on column public.matches.penalty_winner is
  'For completed knockout matches that ended in a regulation tie, the actual winner on penalties. NULL otherwise.';

create or replace function public.score_match_predictions(
  p_match_id uuid
) returns json as $$
declare
  v_match record;
  v_pred record;
  v_points integer;
  v_scored integer := 0;
  v_is_knockout boolean;
  v_actual_winner text;
  v_pred_winner text;
  v_actual_gd integer;
  v_pred_gd integer;
  v_team_goal_match boolean;
  v_scores_exact boolean;
  v_pen_match boolean;
begin
  select * into v_match from public.matches where id = p_match_id;
  if v_match is null then raise exception 'Match not found'; end if;
  if v_match.status != 'completed' then
    raise exception 'Match not completed yet';
  end if;
  if v_match.score_a is null or v_match.score_b is null then
    raise exception 'Match scores not set';
  end if;

  v_is_knockout := v_match.stage != 'group';

  -- Effective winner: regulation first, penalty fallback on tied knockouts.
  if v_match.score_a > v_match.score_b then
    v_actual_winner := 'A';
  elsif v_match.score_a < v_match.score_b then
    v_actual_winner := 'B';
  elsif v_is_knockout and v_match.penalty_winner = 'a' then
    v_actual_winner := 'A';
  elsif v_is_knockout and v_match.penalty_winner = 'b' then
    v_actual_winner := 'B';
  else
    v_actual_winner := 'D'; -- regulation draw (group match)
  end if;
  v_actual_gd := v_match.score_a - v_match.score_b;

  for v_pred in
    select * from public.predictions
    where match_id = p_match_id
      and points is null
  loop
    if v_pred.created_at > v_match.kickoff then
      update public.predictions set points = 0 where id = v_pred.id;
      v_scored := v_scored + 1;
      continue;
    end if;

    if v_pred.score_a > v_pred.score_b then
      v_pred_winner := 'A';
    elsif v_pred.score_a < v_pred.score_b then
      v_pred_winner := 'B';
    elsif v_is_knockout and v_pred.penalty_winner = 'a' then
      v_pred_winner := 'A';
    elsif v_is_knockout and v_pred.penalty_winner = 'b' then
      v_pred_winner := 'B';
    else
      v_pred_winner := 'D';
    end if;
    v_pred_gd := v_pred.score_a - v_pred.score_b;

    v_scores_exact :=
      v_pred.score_a = v_match.score_a
      and v_pred.score_b = v_match.score_b;

    -- For tied knockouts, EXACT also requires the penalty winners to match.
    v_pen_match :=
      v_pred.score_a <> v_pred.score_b
      or not v_is_knockout
      or coalesce(v_pred.penalty_winner, '') = coalesce(v_match.penalty_winner, '');

    if v_scores_exact and v_pen_match then
      v_points := 10; -- EXACT
    elsif v_pred_winner != v_actual_winner then
      v_points := 0; -- NONE
    elsif v_pred_gd = v_actual_gd then
      v_points := 5; -- GD_WINNER
    else
      v_team_goal_match :=
        (v_pred.score_a = v_match.score_a)
        or (v_pred.score_b = v_match.score_b);
      if v_team_goal_match then
        v_points := 3; -- WINNER_TEAM_GOALS
      else
        v_points := 2; -- WINNER
      end if;
    end if;

    update public.predictions set points = v_points where id = v_pred.id;
    v_scored := v_scored + 1;
  end loop;

  return json_build_object(
    'match_id', p_match_id,
    'match_number', v_match.match_number,
    'scored', v_scored
  );
end;
$$ language plpgsql security definer;
