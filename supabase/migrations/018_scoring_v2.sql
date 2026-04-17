-- ============================================================
-- Polla: Scoring v2
-- Tiered exclusive scoring for match predictions.
--
--   EXACT              Both scores match exactly.              10
--   GD_WINNER          Winner + signed goal difference match.   5
--   WINNER_TEAM_GOALS  Winner right + one team's goal count    3
--                      matches (but not both, else EXACT).
--   WINNER             Winner right, goals miss on both sides.  2
--   NONE               Wrong winner.                            0
--
-- Stage multipliers have been removed — every match is worth the
-- same points regardless of stage. The matches.multiplier column is
-- kept in the schema for back-compat but is no longer consulted.
--
-- Also strips XP writes from score_match_predictions (XP has been
-- removed from the product). xp_events / users.total_xp rows are
-- no longer updated from this path.
-- ============================================================

create or replace function public.score_match_predictions(
  p_match_id uuid
)
returns json as $$
declare
  v_match record;
  v_pred record;
  v_points integer;
  v_scored integer := 0;
  v_actual_winner text;
  v_pred_winner text;
  v_actual_gd integer;
  v_pred_gd integer;
  v_team_goal_match boolean;
begin
  select * into v_match from public.matches where id = p_match_id;
  if v_match is null then raise exception 'Match not found'; end if;
  if v_match.status != 'completed' then
    raise exception 'Match not completed yet';
  end if;
  if v_match.score_a is null or v_match.score_b is null then
    raise exception 'Match scores not set';
  end if;

  if v_match.score_a > v_match.score_b then
    v_actual_winner := 'A';
  elsif v_match.score_a < v_match.score_b then
    v_actual_winner := 'B';
  else
    v_actual_winner := 'D';
  end if;
  v_actual_gd := v_match.score_a - v_match.score_b;

  for v_pred in
    select * from public.predictions
    where match_id = p_match_id
      and points is null
  loop
    -- Late predictions score zero.
    if v_pred.created_at > v_match.kickoff then
      update public.predictions set points = 0 where id = v_pred.id;
      v_scored := v_scored + 1;
      continue;
    end if;

    if v_pred.score_a > v_pred.score_b then
      v_pred_winner := 'A';
    elsif v_pred.score_a < v_pred.score_b then
      v_pred_winner := 'B';
    else
      v_pred_winner := 'D';
    end if;
    v_pred_gd := v_pred.score_a - v_pred.score_b;

    if v_pred.score_a = v_match.score_a
       and v_pred.score_b = v_match.score_b then
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
