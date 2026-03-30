-- ============================================================
-- Polla: Matches, Predictions & Bonus Predictions
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- MATCHES
-- ──────────────────────────────────────────────────────────────
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  match_number integer not null unique,
  stage text not null check (stage in ('group','r32','r16','qf','sf','third','final')),
  group_letter text check (group_letter ~ '^[A-L]$'),
  team_a_name text not null,
  team_a_code text not null,
  team_a_flag text not null,
  team_b_name text not null,
  team_b_code text not null,
  team_b_flag text not null,
  kickoff timestamptz not null,
  venue text not null,
  city text not null,
  multiplier numeric(2,1) not null default 1.0,
  score_a integer,
  score_b integer,
  status text not null default 'scheduled' check (status in ('scheduled','live','completed')),
  created_at timestamptz not null default now()
);

-- Public read access (no RLS needed — matches are public data)
alter table public.matches enable row level security;

create policy "Matches are publicly readable"
  on public.matches for select
  using (true);

-- Only service role can insert/update matches
-- No insert/update policies for anon/authenticated

-- ──────────────────────────────────────────────────────────────
-- PREDICTIONS (user's score predictions per match)
-- ──────────────────────────────────────────────────────────────
create table public.predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  score_a integer not null check (score_a >= 0 and score_a <= 20),
  score_b integer not null check (score_b >= 0 and score_b <= 20),
  points integer, -- null until scored
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, match_id)
);

create trigger predictions_updated_at
  before update on public.predictions
  for each row execute function public.handle_updated_at();

alter table public.predictions enable row level security;

create policy "Users can read own predictions"
  on public.predictions for select
  using (auth.uid() = user_id);

create policy "Users can insert own predictions"
  on public.predictions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own predictions"
  on public.predictions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────
-- BONUS PREDICTIONS (champion, golden boot, group winners, etc.)
-- ──────────────────────────────────────────────────────────────
create table public.bonus_predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  prediction_type text not null check (prediction_type in (
    'champion', 'runner_up', 'third_place',
    'golden_boot', 'golden_ball',
    'group_winner_A', 'group_winner_B', 'group_winner_C',
    'group_winner_D', 'group_winner_E', 'group_winner_F',
    'group_winner_G', 'group_winner_H', 'group_winner_I',
    'group_winner_J', 'group_winner_K', 'group_winner_L'
  )),
  value text not null, -- team name or player name
  points integer, -- null until scored
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, prediction_type)
);

create trigger bonus_predictions_updated_at
  before update on public.bonus_predictions
  for each row execute function public.handle_updated_at();

alter table public.bonus_predictions enable row level security;

create policy "Users can read own bonus predictions"
  on public.bonus_predictions for select
  using (auth.uid() = user_id);

create policy "Users can insert own bonus predictions"
  on public.bonus_predictions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own bonus predictions"
  on public.bonus_predictions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────
-- INDEXES
-- ──────────────────────────────────────────────────────────────
create index idx_matches_stage on public.matches(stage);
create index idx_matches_group on public.matches(group_letter);
create index idx_matches_kickoff on public.matches(kickoff);
create index idx_predictions_user on public.predictions(user_id);
create index idx_predictions_match on public.predictions(match_id);
create index idx_bonus_predictions_user on public.bonus_predictions(user_id);
