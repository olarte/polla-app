-- ============================================================
-- Polla: Groups & Group Members
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- GROUPS (pollas)
-- ──────────────────────────────────────────────────────────────
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 40),
  emoji text not null default '🐔',
  created_by uuid not null references public.users(id) on delete cascade,
  is_paid boolean not null default false,
  entry_fee numeric(18,6) not null default 0 check (entry_fee >= 0 and entry_fee <= 500),
  payout_model text not null default 'podium_split'
    check (payout_model in ('winner_takes_all', 'podium_split', 'proportional')),
  global_allocation integer not null default 15
    check (global_allocation >= 10 and global_allocation <= 30),
  invite_code text not null unique,
  member_count integer not null default 0,
  pool_amount numeric(18,6) not null default 0,
  status text not null default 'open'
    check (status in ('open', 'locked', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger groups_updated_at
  before update on public.groups
  for each row execute function public.handle_updated_at();

-- RLS (policies added after group_members table creation)
alter table public.groups enable row level security;

-- ──────────────────────────────────────────────────────────────
-- GROUP MEMBERS
-- ──────────────────────────────────────────────────────────────
create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  total_points integer not null default 0,
  rank integer,
  joined_at timestamptz not null default now(),
  unique(group_id, user_id)
);

alter table public.group_members enable row level security;

-- Members can read all members in their groups
create policy "Members can read group members"
  on public.group_members for select
  using (
    group_id in (
      select group_id from public.group_members gm where gm.user_id = auth.uid()
    )
  );

-- Users can insert themselves as members
create policy "Users can join groups"
  on public.group_members for insert
  with check (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────
-- GROUPS RLS POLICIES (after group_members exists)
-- ──────────────────────────────────────────────────────────────

-- Anyone authenticated can read groups they belong to
create policy "Members can read their groups"
  on public.groups for select
  using (
    id in (
      select group_id from public.group_members where user_id = auth.uid()
    )
  );

-- Anyone can read a group by invite_code (for join preview)
create policy "Anyone can read group by invite code"
  on public.groups for select
  using (true);

-- Creator can update their group (before locked)
create policy "Creator can update own group"
  on public.groups for update
  using (auth.uid() = created_by and status = 'open')
  with check (auth.uid() = created_by);

-- Authenticated users can create groups
create policy "Authenticated users can create groups"
  on public.groups for insert
  with check (auth.uid() = created_by);

-- ──────────────────────────────────────────────────────────────
-- FUNCTION: increment member_count on join
-- ──────────────────────────────────────────────────────────────
create or replace function public.handle_member_joined()
returns trigger as $$
begin
  update public.groups
  set member_count = member_count + 1
  where id = new.group_id;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_member_joined
  after insert on public.group_members
  for each row execute function public.handle_member_joined();

-- Decrement on leave
create or replace function public.handle_member_left()
returns trigger as $$
begin
  update public.groups
  set member_count = member_count - 1
  where id = old.group_id;
  return old;
end;
$$ language plpgsql security definer;

create trigger on_member_left
  after delete on public.group_members
  for each row execute function public.handle_member_left();

-- ──────────────────────────────────────────────────────────────
-- FUNCTION: generate unique invite code (6 alphanumeric chars)
-- ──────────────────────────────────────────────────────────────
create or replace function public.generate_invite_code()
returns text as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
begin
  for i in 1..6 loop
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return result;
end;
$$ language plpgsql;

-- ──────────────────────────────────────────────────────────────
-- INDEXES
-- ──────────────────────────────────────────────────────────────
create index idx_groups_invite_code on public.groups(invite_code);
create index idx_groups_created_by on public.groups(created_by);
create index idx_groups_status on public.groups(status);
create index idx_group_members_group on public.group_members(group_id);
create index idx_group_members_user on public.group_members(user_id);
create index idx_group_members_rank on public.group_members(group_id, rank);
