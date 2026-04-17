-- ============================================================
-- 017: Parlay settlement infrastructure (Session 17)
-- ============================================================
-- Adds state the settlement pipeline needs:
--   * manual_review status (auto-settlement gave up, needs human)
--   * settlement_attempts + last_settlement_error (exponential backoff
--     bookkeeping; we flip to manual_review after the 5th failure)
--   * tx_hash_create / tx_hash_settle for reconciliation
--   * onchain_market_id sequence so createMarket has a stable uint64
--   * cron_runs table backing /api/admin/parlay/health
--   * operator_gas_metrics table for the gas-balance dashboard
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- parlay_markets — add manual_review + settlement bookkeeping
-- ──────────────────────────────────────────────────────────────
alter table public.parlay_markets
  drop constraint parlay_markets_status_check;

alter table public.parlay_markets
  add constraint parlay_markets_status_check
  check (status in ('open','locked','settling','settled','voided','manual_review'));

alter table public.parlay_markets
  add column if not exists settlement_attempts integer not null default 0,
  add column if not exists last_settlement_error text,
  add column if not exists last_attempt_at timestamptz,
  add column if not exists tx_hash_create text,
  add column if not exists tx_hash_settle text,
  add column if not exists voided_reason text;

-- ──────────────────────────────────────────────────────────────
-- onchain_market_id sequence — monotonic bigint, surfaced as uint64
-- to the contract. A Postgres bigint is signed 64-bit so values stay
-- well within the uint256 arg; we just cap at 2^63-1 which is
-- effectively unbounded for our volume.
-- ──────────────────────────────────────────────────────────────
create sequence if not exists public.parlay_onchain_market_id_seq
  as bigint
  minvalue 1
  no maxvalue
  cache 1;

-- RPC wrapper so supabase-js can pull the next value without raw SQL.
create or replace function public.next_parlay_onchain_id()
returns bigint
language sql
security definer
set search_path = public
as $$
  select nextval('public.parlay_onchain_market_id_seq');
$$;

revoke all on function public.next_parlay_onchain_id() from public;
grant execute on function public.next_parlay_onchain_id() to service_role;

-- ──────────────────────────────────────────────────────────────
-- cron_runs — last-run tracking for health endpoint
-- ──────────────────────────────────────────────────────────────
create table if not exists public.cron_runs (
  id bigserial primary key,
  job_name text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  success boolean,
  details jsonb
);

create index if not exists cron_runs_job_recent
  on public.cron_runs (job_name, started_at desc);

alter table public.cron_runs enable row level security;
-- Only service_role reads/writes; no policies needed.

-- ──────────────────────────────────────────────────────────────
-- operator_gas_metrics — balance history for dashboard + the
-- block-settlement check. The settle job reads the latest row
-- to decide whether to proceed.
-- ──────────────────────────────────────────────────────────────
create table if not exists public.operator_gas_metrics (
  id bigserial primary key,
  recorded_at timestamptz not null default now(),
  balance_wei numeric(78,0) not null,
  alert_level text not null check (alert_level in ('ok','warn','block'))
);

create index if not exists operator_gas_metrics_recent
  on public.operator_gas_metrics (recorded_at desc);

alter table public.operator_gas_metrics enable row level security;

-- ──────────────────────────────────────────────────────────────
-- parlay_tickets — track onchain ticket id for reconciliation
-- and a refund flag for the void-market DB-only refund path
-- ──────────────────────────────────────────────────────────────
alter table public.parlay_tickets
  add column if not exists onchain_ticket_id bigint,
  add column if not exists refund_pending boolean not null default false;

create index if not exists parlay_tickets_refund_pending
  on public.parlay_tickets (parlay_market_id)
  where refund_pending = true;
