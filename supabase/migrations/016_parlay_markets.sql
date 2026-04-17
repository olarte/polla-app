-- ============================================================
-- 016: Parlay Markets — daily 5-leg pari-mutuel parlay tickets
-- ============================================================
-- A new market type that coexists with match-winner / bracket flows.
-- match_id is uuid (public.matches.id is uuid, not text as written in
-- the session brief).
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- PARLAY MARKETS
-- One market per football-data.org match; tracks pool accounting
-- and the on-chain market id (populated in a later session).
-- ──────────────────────────────────────────────────────────────
create table public.parlay_markets (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  football_data_match_id integer not null unique,
  status text not null check (status in ('open','locked','settling','settled','voided')),
  opens_at timestamptz not null,
  locks_at timestamptz not null,
  settled_at timestamptz,
  gross_pool_usdc numeric(18,6) not null default 0,
  net_pool_usdc numeric(18,6) not null default 0,
  platform_rake_usdc numeric(18,6) not null default 0,
  onchain_market_id bigint,
  created_at timestamptz not null default now()
);

alter table public.parlay_markets enable row level security;

create policy "Parlay markets are publicly readable"
  on public.parlay_markets for select
  using (true);

-- ──────────────────────────────────────────────────────────────
-- PARLAY QUESTIONS
-- Exactly 5 per market, slots 1..5. Populated at seed time.
-- ──────────────────────────────────────────────────────────────
create table public.parlay_questions (
  id uuid primary key default gen_random_uuid(),
  parlay_market_id uuid not null references public.parlay_markets(id) on delete cascade,
  slot integer not null check (slot between 1 and 5),
  question_type text not null,
  prompt text not null,
  option_a_label text not null,
  option_b_label text not null,
  resolution text check (resolution in ('A','B','void')),
  resolved_at timestamptz,
  oracle_source text,
  unique (parlay_market_id, slot)
);

alter table public.parlay_questions enable row level security;

create policy "Parlay questions are publicly readable"
  on public.parlay_questions for select
  using (true);

-- ──────────────────────────────────────────────────────────────
-- PARLAY TICKETS
-- One ticket per user per market, 5 A/B picks.
-- ──────────────────────────────────────────────────────────────
create table public.parlay_tickets (
  id uuid primary key default gen_random_uuid(),
  parlay_market_id uuid not null references public.parlay_markets(id),
  user_id uuid not null references public.users(id),
  stake_usdc numeric(18,6) not null check (stake_usdc > 0),
  pick_q1 text not null check (pick_q1 in ('A','B')),
  pick_q2 text not null check (pick_q2 in ('A','B')),
  pick_q3 text not null check (pick_q3 in ('A','B')),
  pick_q4 text not null check (pick_q4 in ('A','B')),
  pick_q5 text not null check (pick_q5 in ('A','B')),
  score integer,
  payout_usdc numeric(18,6),
  tx_hash_bet text,
  tx_hash_payout text,
  created_at timestamptz not null default now()
);

alter table public.parlay_tickets enable row level security;

-- Users always see their own tickets.
create policy "Users can read own parlay tickets"
  on public.parlay_tickets for select
  using (auth.uid() = user_id);

-- Other users' tickets become visible only after the parent market settles.
-- Separate permissive policy so own-ticket reads don't pay the markets lookup.
create policy "Users can read other tickets after settlement"
  on public.parlay_tickets for select
  using (
    exists (
      select 1
      from public.parlay_markets m
      where m.id = parlay_tickets.parlay_market_id
        and m.status = 'settled'
    )
  );

-- Insert allowed only while market is open and only for self.
create policy "Users can insert own tickets when market open"
  on public.parlay_tickets for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.parlay_markets m
      where m.id = parlay_market_id
        and m.status = 'open'
    )
  );

-- No update/delete policy for end users — grading and payout writes
-- go through service_role, which bypasses RLS.

-- ──────────────────────────────────────────────────────────────
-- INDEXES
-- ──────────────────────────────────────────────────────────────
create index on public.parlay_tickets (parlay_market_id);
create index on public.parlay_tickets (user_id, created_at desc);
create index on public.parlay_markets (status, locks_at);
