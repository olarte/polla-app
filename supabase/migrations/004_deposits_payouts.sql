-- ============================================================
-- Polla: Deposits, Payouts, Balance Transactions
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- DEPOSITS (on-chain → off-chain credit)
-- ──────────────────────────────────────────────────────────────
create table public.deposits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  chain text not null check (chain in ('celo', 'base', 'polygon', 'tron', 'ethereum')),
  token text not null check (token in ('USDC', 'USDT')),
  amount numeric(18,6) not null check (amount > 0),
  tx_hash text not null unique,
  from_address text not null,
  to_address text not null,
  blockradar_ref text, -- Blockradar webhook reference ID
  status text not null default 'confirmed'
    check (status in ('pending', 'confirmed', 'failed')),
  created_at timestamptz not null default now()
);

-- RLS: users can read own deposits
alter table public.deposits enable row level security;

create policy "Users can read own deposits"
  on public.deposits for select
  using (auth.uid() = user_id);

-- No insert/update from client — service role only (webhook handler)

-- ──────────────────────────────────────────────────────────────
-- PAYOUTS (off-chain → on-chain withdrawal)
-- ──────────────────────────────────────────────────────────────
create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  chain text not null check (chain in ('celo', 'base', 'polygon', 'tron', 'ethereum')),
  token text not null check (token in ('USDC', 'USDT')),
  amount numeric(18,6) not null check (amount > 0),
  to_address text not null,
  tx_hash text,
  blockradar_ref text,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed')),
  payout_type text not null default 'withdrawal'
    check (payout_type in ('withdrawal', 'prize', 'refund')),
  group_id uuid references public.groups(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- RLS: users can read own payouts
alter table public.payouts enable row level security;

create policy "Users can read own payouts"
  on public.payouts for select
  using (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────
-- BALANCE TRANSACTIONS (audit ledger)
-- ──────────────────────────────────────────────────────────────
create table public.balance_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null check (type in (
    'deposit', 'withdrawal', 'entry_fee', 'entry_refund',
    'prize', 'service_fee', 'global_allocation'
  )),
  amount numeric(18,6) not null, -- positive = credit, negative = debit
  balance_after numeric(18,6) not null,
  reference_id uuid, -- deposit_id, payout_id, or group_id
  description text,
  created_at timestamptz not null default now()
);

alter table public.balance_transactions enable row level security;

create policy "Users can read own transactions"
  on public.balance_transactions for select
  using (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────
-- FUNCTION: credit deposit to user balance (called by webhook)
-- ──────────────────────────────────────────────────────────────
create or replace function public.credit_deposit(
  p_user_id uuid,
  p_amount numeric,
  p_chain text,
  p_token text,
  p_tx_hash text,
  p_from_address text,
  p_to_address text,
  p_blockradar_ref text default null
)
returns uuid as $$
declare
  v_deposit_id uuid;
  v_new_available numeric;
begin
  -- Insert deposit record
  insert into public.deposits (user_id, chain, token, amount, tx_hash, from_address, to_address, blockradar_ref, status)
  values (p_user_id, p_chain, p_token, p_amount, p_tx_hash, p_from_address, p_to_address, p_blockradar_ref, 'confirmed')
  returning id into v_deposit_id;

  -- Credit available balance
  update public.balances
  set available = available + p_amount,
      total_deposited = total_deposited + p_amount,
      updated_at = now()
  where user_id = p_user_id
  returning available into v_new_available;

  -- Set deposit_chain if not yet set
  update public.users
  set deposit_chain = p_chain
  where id = p_user_id and deposit_chain is null;

  -- Audit trail
  insert into public.balance_transactions (user_id, type, amount, balance_after, reference_id, description)
  values (p_user_id, 'deposit', p_amount, v_new_available, v_deposit_id,
          'Deposit via ' || p_chain || ' (' || p_token || ')');

  return v_deposit_id;
end;
$$ language plpgsql security definer;

-- ──────────────────────────────────────────────────────────────
-- FUNCTION: deduct entry fee (join paid group)
-- ──────────────────────────────────────────────────────────────
create or replace function public.deduct_entry_fee(
  p_user_id uuid,
  p_group_id uuid,
  p_amount numeric
)
returns boolean as $$
declare
  v_available numeric;
  v_new_available numeric;
begin
  -- Lock the balance row
  select available into v_available
  from public.balances
  where user_id = p_user_id
  for update;

  if v_available < p_amount then
    return false;
  end if;

  -- Deduct from available, add to locked
  update public.balances
  set available = available - p_amount,
      locked = locked + p_amount,
      updated_at = now()
  where user_id = p_user_id
  returning available into v_new_available;

  -- Audit trail
  insert into public.balance_transactions (user_id, type, amount, balance_after, reference_id, description)
  values (p_user_id, 'entry_fee', -p_amount, v_new_available, p_group_id,
          'Entry fee for group');

  return true;
end;
$$ language plpgsql security definer;

-- ──────────────────────────────────────────────────────────────
-- FUNCTION: process group payouts
-- ──────────────────────────────────────────────────────────────
create or replace function public.process_group_payout(
  p_user_id uuid,
  p_group_id uuid,
  p_gross_amount numeric,
  p_service_fee numeric,
  p_global_amount numeric
)
returns void as $$
declare
  v_net_amount numeric;
  v_new_available numeric;
begin
  v_net_amount := p_gross_amount - p_service_fee - p_global_amount;

  -- Credit winnings to available, deduct from locked
  update public.balances
  set available = available + v_net_amount,
      locked = greatest(locked - p_gross_amount, 0),
      total_won = total_won + v_net_amount,
      updated_at = now()
  where user_id = p_user_id
  returning available into v_new_available;

  -- Audit trail
  insert into public.balance_transactions (user_id, type, amount, balance_after, reference_id, description)
  values (p_user_id, 'prize', v_net_amount, v_new_available, p_group_id,
          'Prize payout from group');
end;
$$ language plpgsql security definer;

-- ──────────────────────────────────────────────────────────────
-- FUNCTION: process withdrawal
-- ──────────────────────────────────────────────────────────────
create or replace function public.process_withdrawal(
  p_user_id uuid,
  p_amount numeric,
  p_chain text,
  p_token text,
  p_to_address text
)
returns uuid as $$
declare
  v_available numeric;
  v_payout_id uuid;
  v_new_available numeric;
begin
  -- Lock balance row
  select available into v_available
  from public.balances
  where user_id = p_user_id
  for update;

  if v_available < p_amount then
    raise exception 'Insufficient balance';
  end if;

  -- Deduct from available
  update public.balances
  set available = available - p_amount,
      total_withdrawn = total_withdrawn + p_amount,
      updated_at = now()
  where user_id = p_user_id
  returning available into v_new_available;

  -- Create payout record
  insert into public.payouts (user_id, chain, token, amount, to_address, payout_type, status)
  values (p_user_id, p_chain, p_token, p_amount, p_to_address, 'withdrawal', 'pending')
  returning id into v_payout_id;

  -- Audit trail
  insert into public.balance_transactions (user_id, type, amount, balance_after, reference_id, description)
  values (p_user_id, 'withdrawal', -p_amount, v_new_available, v_payout_id,
          'Withdrawal to ' || p_chain || ' (' || p_token || ')');

  return v_payout_id;
end;
$$ language plpgsql security definer;

-- ──────────────────────────────────────────────────────────────
-- FUNCTION: refund a failed withdrawal (re-credit available)
-- ──────────────────────────────────────────────────────────────
create or replace function public.refund_withdrawal(
  p_payout_id uuid
)
returns void as $$
declare
  v_user_id uuid;
  v_amount numeric;
  v_new_available numeric;
begin
  -- Get payout details and mark as failed
  update public.payouts
  set status = 'failed'
  where id = p_payout_id and status in ('pending', 'processing')
  returning user_id, amount into v_user_id, v_amount;

  if v_user_id is null then
    return; -- Already failed/completed or not found
  end if;

  -- Re-credit the balance
  update public.balances
  set available = available + v_amount,
      total_withdrawn = total_withdrawn - v_amount,
      updated_at = now()
  where user_id = v_user_id
  returning available into v_new_available;

  -- Audit trail
  insert into public.balance_transactions (user_id, type, amount, balance_after, reference_id, description)
  values (v_user_id, 'entry_refund', v_amount, v_new_available, p_payout_id,
          'Refund for failed withdrawal');
end;
$$ language plpgsql security definer;

-- ──────────────────────────────────────────────────────────────
-- INDEXES
-- ──────────────────────────────────────────────────────────────
create index idx_deposits_user on public.deposits(user_id);
create index idx_deposits_tx_hash on public.deposits(tx_hash);
create index idx_deposits_created on public.deposits(created_at desc);
create index idx_payouts_user on public.payouts(user_id);
create index idx_payouts_status on public.payouts(status);
create index idx_balance_tx_user on public.balance_transactions(user_id);
create index idx_balance_tx_created on public.balance_transactions(created_at desc);
