-- ============================================================
-- Polla: Users + Balances tables with RLS
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ──────────────────────────────────────────────────────────────
-- USERS
-- ──────────────────────────────────────────────────────────────
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text unique,
  display_name text not null default '',
  avatar_emoji text not null default '⚽',
  country_code text not null default 'CO',
  total_xp integer not null default 0,
  packs_earned integer not null default 0,
  cards_collected integer not null default 0,
  streak_days integer not null default 0,
  is_minipay_user boolean not null default false,
  minipay_address text,
  -- Blockradar wallet addresses per chain
  wallet_celo text,
  wallet_base text,
  wallet_polygon text,
  wallet_tron text,
  wallet_ethereum text,
  deposit_chain text, -- preferred chain for payouts
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-update updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger users_updated_at
  before update on public.users
  for each row execute function public.handle_updated_at();

-- RLS: users can read/write only their own row
alter table public.users enable row level security;

create policy "Users can read own data"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update own data"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can insert own data"
  on public.users for insert
  with check (auth.uid() = id);

-- ──────────────────────────────────────────────────────────────
-- BALANCES (off-chain ledger, 1 USDC = 1 USDT = $1)
-- ──────────────────────────────────────────────────────────────
create table public.balances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  available numeric(18,6) not null default 0,
  locked numeric(18,6) not null default 0, -- funds committed to active pollas
  total_deposited numeric(18,6) not null default 0,
  total_withdrawn numeric(18,6) not null default 0,
  total_won numeric(18,6) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

create trigger balances_updated_at
  before update on public.balances
  for each row execute function public.handle_updated_at();

-- RLS: users can only read their own balance
alter table public.balances enable row level security;

create policy "Users can read own balance"
  on public.balances for select
  using (auth.uid() = user_id);

-- Inserts/updates to balances are done via service role (server-side only)
-- No direct user insert/update policies — all mutations go through API routes

-- ──────────────────────────────────────────────────────────────
-- Function: create user profile + balance on signup
-- ──────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, phone)
  values (new.id, new.phone);

  insert into public.balances (user_id)
  values (new.id);

  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ──────────────────────────────────────────────────────────────
-- OTP CODES (temporary, server-managed)
-- ──────────────────────────────────────────────────────────────
create table public.otp_codes (
  phone text primary key,
  code text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- No RLS — accessed only via service role
alter table public.otp_codes enable row level security;
-- No policies = no client access (service role bypasses RLS)
