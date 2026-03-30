-- ============================================================
-- Polla: Cards, User Cards & Booster Packs
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- CARDS (master catalog — 85 collectible cards)
-- ──────────────────────────────────────────────────────────────
create table public.cards (
  id uuid primary key default gen_random_uuid(),
  card_number integer not null unique,
  name text not null,
  description text,
  rarity text not null check (rarity in ('common', 'rare', 'epic', 'legendary')),
  image_url text, -- placeholder, swap later
  category text not null, -- 'jersey', 'moment', 'costume', 'golden'
  country_code text, -- for jersey cards
  created_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────────────────────
-- USER CARDS (user's collection, duplicates allowed)
-- ──────────────────────────────────────────────────────────────
create table public.user_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  card_id uuid not null references public.cards(id) on delete cascade,
  pack_id uuid, -- which pack it came from
  obtained_at timestamptz not null default now()
);

alter table public.user_cards enable row level security;

create policy "Users can read own cards"
  on public.user_cards for select
  using (auth.uid() = user_id);

create policy "System can insert user cards"
  on public.user_cards for insert
  with check (auth.uid() = user_id);

create index idx_user_cards_user on public.user_cards(user_id);
create index idx_user_cards_card on public.user_cards(card_id);

-- ──────────────────────────────────────────────────────────────
-- BOOSTER PACKS (track earned & opened packs)
-- ──────────────────────────────────────────────────────────────
create table public.booster_packs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  pack_number integer not null, -- 1-8 for milestone packs
  milestone_xp integer, -- which XP milestone triggered this
  source text not null default 'xp_milestone', -- 'xp_milestone' | 'tournament'
  min_rarity text, -- null = any, 'rare' = rare+, 'epic' = epic+
  opened boolean not null default false,
  cards_awarded jsonb, -- array of card_ids after opening
  created_at timestamptz not null default now(),
  opened_at timestamptz
);

alter table public.booster_packs enable row level security;

create policy "Users can read own packs"
  on public.booster_packs for select
  using (auth.uid() = user_id);

create policy "Users can update own packs"
  on public.booster_packs for update
  using (auth.uid() = user_id);

create index idx_booster_packs_user on public.booster_packs(user_id);

-- ──────────────────────────────────────────────────────────────
-- Allow cards table to be read by everyone (catalog)
-- ──────────────────────────────────────────────────────────────
alter table public.cards enable row level security;

create policy "Cards catalog is public"
  on public.cards for select
  using (true);

-- ──────────────────────────────────────────────────────────────
-- FUNCTION: Open a booster pack
-- Selects 3 random cards with rarity weights
-- ──────────────────────────────────────────────────────────────
create or replace function public.open_booster_pack(
  p_user_id uuid,
  p_pack_id uuid
)
returns json as $$
declare
  v_pack record;
  v_card_ids uuid[] := '{}';
  v_card record;
  v_i integer;
  v_roll float;
  v_rarity text;
  v_min_rarity text;
begin
  -- Validate pack
  select * into v_pack from public.booster_packs
  where id = p_pack_id and user_id = p_user_id;

  if v_pack is null then raise exception 'Pack not found'; end if;
  if v_pack.opened then raise exception 'Pack already opened'; end if;

  v_min_rarity := v_pack.min_rarity;

  -- Draw 3 cards
  for v_i in 1..3 loop
    v_roll := random();

    -- Rarity weights: 70% common, 20% rare, 8% epic, 2% legendary
    if v_min_rarity = 'epic' then
      -- Epic+ pack: 75% epic, 25% legendary
      if v_roll < 0.25 then v_rarity := 'legendary';
      else v_rarity := 'epic';
      end if;
    elsif v_min_rarity = 'rare' then
      -- Rare+ pack: 60% rare, 30% epic, 10% legendary
      if v_roll < 0.10 then v_rarity := 'legendary';
      elsif v_roll < 0.40 then v_rarity := 'epic';
      else v_rarity := 'rare';
      end if;
    else
      -- Standard pack
      if v_roll < 0.02 then v_rarity := 'legendary';
      elsif v_roll < 0.10 then v_rarity := 'epic';
      elsif v_roll < 0.30 then v_rarity := 'rare';
      else v_rarity := 'common';
      end if;
    end if;

    -- Pick random card of that rarity
    select id into v_card from public.cards
    where rarity = v_rarity
    order by random()
    limit 1;

    if v_card.id is not null then
      v_card_ids := v_card_ids || v_card.id;

      insert into public.user_cards (user_id, card_id, pack_id)
      values (p_user_id, v_card.id, p_pack_id);
    end if;
  end loop;

  -- Mark pack as opened
  update public.booster_packs
  set opened = true, opened_at = now(), cards_awarded = to_jsonb(v_card_ids)
  where id = p_pack_id;

  -- Update user cards_collected (unique count)
  update public.users
  set cards_collected = (
    select count(distinct card_id) from public.user_cards where user_id = p_user_id
  )
  where id = p_user_id;

  -- Return awarded cards with details
  return (
    select json_agg(row_to_json(c))
    from public.cards c
    where c.id = any(v_card_ids)
  );
end;
$$ language plpgsql security definer;

-- ──────────────────────────────────────────────────────────────
-- Update check_xp_milestones to also create booster_pack rows
-- ──────────────────────────────────────────────────────────────
create or replace function public.check_xp_milestones(
  p_user_id uuid
)
returns json as $$
declare
  v_user record;
  v_milestones integer[] := array[100, 250, 500, 750, 1000, 1500, 2000, 3000];
  v_min_rarities text[] := array[null, null, null, null, null, null, 'rare', 'epic'];
  v_earned integer;
  v_new_packs integer := 0;
  v_i integer;
begin
  select * into v_user from public.users where id = p_user_id;
  if v_user is null then raise exception 'User not found'; end if;

  -- Count how many milestones user qualifies for
  v_earned := 0;
  for v_i in 1..array_length(v_milestones, 1) loop
    if v_user.total_xp >= v_milestones[v_i] then
      v_earned := v_earned + 1;
    end if;
  end loop;

  v_new_packs := v_earned - v_user.packs_earned;

  if v_new_packs > 0 then
    -- Create booster pack rows for each new milestone
    for v_i in (v_user.packs_earned + 1)..v_earned loop
      insert into public.booster_packs (user_id, pack_number, milestone_xp, source, min_rarity)
      values (p_user_id, v_i, v_milestones[v_i], 'xp_milestone', v_min_rarities[v_i]);
    end loop;

    update public.users
    set packs_earned = v_earned
    where id = p_user_id;
  end if;

  return json_build_object('new_packs', v_new_packs, 'total_packs', v_earned);
end;
$$ language plpgsql security definer;

-- ──────────────────────────────────────────────────────────────
-- SEED: 85 Cards
-- ──────────────────────────────────────────────────────────────

-- 48 Common Cards — Polla in each nation's jersey
insert into public.cards (card_number, name, description, rarity, category, country_code) values
(1, 'USA Jersey', 'Polla wearing the Stars & Stripes kit', 'common', 'jersey', 'USA'),
(2, 'Mexico Jersey', 'Polla in El Tri green', 'common', 'jersey', 'MEX'),
(3, 'Canada Jersey', 'Polla in the maple red', 'common', 'jersey', 'CAN'),
(4, 'Brazil Jersey', 'Polla in the famous yellow', 'common', 'jersey', 'BRA'),
(5, 'Argentina Jersey', 'Polla in albiceleste stripes', 'common', 'jersey', 'ARG'),
(6, 'Germany Jersey', 'Polla in Die Mannschaft white', 'common', 'jersey', 'GER'),
(7, 'France Jersey', 'Polla in Les Bleus blue', 'common', 'jersey', 'FRA'),
(8, 'England Jersey', 'Polla in Three Lions white', 'common', 'jersey', 'ENG'),
(9, 'Spain Jersey', 'Polla in La Roja red', 'common', 'jersey', 'ESP'),
(10, 'Italy Jersey', 'Polla in Azzurri blue', 'common', 'jersey', 'ITA'),
(11, 'Portugal Jersey', 'Polla in Portuguese crimson', 'common', 'jersey', 'POR'),
(12, 'Netherlands Jersey', 'Polla in Oranje orange', 'common', 'jersey', 'NED'),
(13, 'Belgium Jersey', 'Polla in Red Devils kit', 'common', 'jersey', 'BEL'),
(14, 'Croatia Jersey', 'Polla in checkered red & white', 'common', 'jersey', 'CRO'),
(15, 'Japan Jersey', 'Polla in Samurai Blue', 'common', 'jersey', 'JPN'),
(16, 'South Korea Jersey', 'Polla in Taegeuk Warriors red', 'common', 'jersey', 'KOR'),
(17, 'Australia Jersey', 'Polla in Socceroos gold', 'common', 'jersey', 'AUS'),
(18, 'Saudi Arabia Jersey', 'Polla in Green Falcons kit', 'common', 'jersey', 'KSA'),
(19, 'Qatar Jersey', 'Polla in maroon', 'common', 'jersey', 'QAT'),
(20, 'Iran Jersey', 'Polla in Team Melli white', 'common', 'jersey', 'IRN'),
(21, 'Morocco Jersey', 'Polla in Atlas Lions red', 'common', 'jersey', 'MAR'),
(22, 'Senegal Jersey', 'Polla in Lions of Teranga white', 'common', 'jersey', 'SEN'),
(23, 'Ghana Jersey', 'Polla in Black Stars white', 'common', 'jersey', 'GHA'),
(24, 'Cameroon Jersey', 'Polla in Indomitable Lions green', 'common', 'jersey', 'CMR'),
(25, 'Nigeria Jersey', 'Polla in Super Eagles green', 'common', 'jersey', 'NGA'),
(26, 'Egypt Jersey', 'Polla in Pharaohs red', 'common', 'jersey', 'EGY'),
(27, 'Tunisia Jersey', 'Polla in Eagles of Carthage red', 'common', 'jersey', 'TUN'),
(28, 'Colombia Jersey', 'Polla in Los Cafeteros yellow', 'common', 'jersey', 'COL'),
(29, 'Uruguay Jersey', 'Polla in La Celeste blue', 'common', 'jersey', 'URU'),
(30, 'Chile Jersey', 'Polla in La Roja red', 'common', 'jersey', 'CHI'),
(31, 'Ecuador Jersey', 'Polla in La Tri yellow', 'common', 'jersey', 'ECU'),
(32, 'Paraguay Jersey', 'Polla in Guaraníes stripes', 'common', 'jersey', 'PAR'),
(33, 'Peru Jersey', 'Polla in La Blanquirroja sash', 'common', 'jersey', 'PER'),
(34, 'Costa Rica Jersey', 'Polla in Los Ticos red', 'common', 'jersey', 'CRC'),
(35, 'Honduras Jersey', 'Polla in Los Catrachos white', 'common', 'jersey', 'HON'),
(36, 'Jamaica Jersey', 'Polla in Reggae Boyz gold', 'common', 'jersey', 'JAM'),
(37, 'Panama Jersey', 'Polla in Canaleros red', 'common', 'jersey', 'PAN'),
(38, 'Serbia Jersey', 'Polla in Eagles red', 'common', 'jersey', 'SRB'),
(39, 'Switzerland Jersey', 'Polla in Nati red', 'common', 'jersey', 'SUI'),
(40, 'Denmark Jersey', 'Polla in Danish Dynamite red', 'common', 'jersey', 'DEN'),
(41, 'Poland Jersey', 'Polla in Biało-Czerwoni white', 'common', 'jersey', 'POL'),
(42, 'Wales Jersey', 'Polla in Dragons red', 'common', 'jersey', 'WAL'),
(43, 'Scotland Jersey', 'Polla in Tartan Army navy', 'common', 'jersey', 'SCO'),
(44, 'Ukraine Jersey', 'Polla in Zbirna yellow', 'common', 'jersey', 'UKR'),
(45, 'Sweden Jersey', 'Polla in Blågult yellow', 'common', 'jersey', 'SWE'),
(46, 'Austria Jersey', 'Polla in Das Team red', 'common', 'jersey', 'AUT'),
(47, 'Turkey Jersey', 'Polla in Crescent Stars red', 'common', 'jersey', 'TUR'),
(48, 'Algeria Jersey', 'Polla in Desert Foxes green', 'common', 'jersey', 'ALG');

-- 20 Rare Cards — Football Moments
insert into public.cards (card_number, name, description, rarity, category) values
(49, 'Hand of God', 'Maradona''s infamous 1986 goal', 'rare', 'moment'),
(50, 'Zidane Headbutt', 'The 2006 Final moment that shocked the world', 'rare', 'moment'),
(51, 'Iniesta Winner', 'The goal that gave Spain its first World Cup', 'rare', 'moment'),
(52, 'Messi Lifts Trophy', 'Argentina''s captain finally claims glory in 2022', 'rare', 'moment'),
(53, 'Ronaldo Nazário 2002', 'The phenomenon''s redemption in Yokohama', 'rare', 'moment'),
(54, 'Pelé''s 1000th Goal', 'O Rei reaches the historic milestone', 'rare', 'moment'),
(55, 'Hurst Hat-trick', 'England''s 1966 Final hero', 'rare', 'moment'),
(56, 'Baggio Penalty Miss', 'Italy''s heartbreak in Pasadena 1994', 'rare', 'moment'),
(57, 'Maracanazo', 'Uruguay stuns Brazil in 1950', 'rare', 'moment'),
(58, 'Cruyff Turn', 'The move that changed football forever', 'rare', 'moment'),
(59, 'Bergkamp Touch', 'Dennis Bergkamp''s incredible control vs Argentina', 'rare', 'moment'),
(60, 'James Volley', 'James Rodríguez''s wonder goal vs Uruguay 2014', 'rare', 'moment'),
(61, 'Mbappé Hattrick', 'Kylian''s epic 2022 Final performance', 'rare', 'moment'),
(62, 'Tardelli Scream', 'Marco Tardelli''s iconic 1982 celebration', 'rare', 'moment'),
(63, 'Forlan''s Thunderbolt', 'Diego Forlán''s long-range rocket', 'rare', 'moment'),
(64, 'Tim Cahill Bicycle', 'Australia''s acrobatic stunner', 'rare', 'moment'),
(65, 'Saeed Al-Owairan', 'Saudi Arabia''s coast-to-coast solo goal 1994', 'rare', 'moment'),
(66, 'Archie Gemmill', 'Scotland''s magical goal vs Netherlands 1978', 'rare', 'moment'),
(67, 'Pak Doo-Ik', 'North Korea stuns Italy in 1966', 'rare', 'moment'),
(68, 'Dennis Oliech', 'Kenya''s star shines on the world stage', 'rare', 'moment');

-- 12 Epic Cards — Cultural Costumes
insert into public.cards (card_number, name, description, rarity, category) values
(69, 'Samba Polla', 'Polla in Brazilian carnival costume', 'epic', 'costume'),
(70, 'Samurai Polla', 'Polla in full samurai armor', 'epic', 'costume'),
(71, 'Mariachi Polla', 'Polla with sombrero and guitar', 'epic', 'costume'),
(72, 'Viking Polla', 'Polla with horned helmet and shield', 'epic', 'costume'),
(73, 'Pharaoh Polla', 'Polla as an Egyptian pharaoh', 'epic', 'costume'),
(74, 'Matador Polla', 'Polla in bullfighter traje de luces', 'epic', 'costume'),
(75, 'Cowboy Polla', 'Polla in American Wild West gear', 'epic', 'costume'),
(76, 'Mountie Polla', 'Polla in Canadian Mountie uniform', 'epic', 'costume'),
(77, 'Gondolier Polla', 'Polla rowing a Venetian gondola', 'epic', 'costume'),
(78, 'Maasai Polla', 'Polla in Maasai warrior beads', 'epic', 'costume'),
(79, 'Hanbok Polla', 'Polla in traditional Korean hanbok', 'epic', 'costume'),
(80, 'Gaucho Polla', 'Polla as an Argentine gaucho', 'epic', 'costume');

-- 5 Legendary Cards — Golden/Special
insert into public.cards (card_number, name, description, rarity, category) values
(81, 'Golden Polla', 'The ultimate golden Polla trophy card', 'legendary', 'golden'),
(82, 'World Cup Polla', 'Polla lifting the FIFA World Cup', 'legendary', 'golden'),
(83, 'Diamond Polla', 'Polla encrusted with diamonds', 'legendary', 'golden'),
(84, 'Holographic Polla', 'A shimmering holographic Polla', 'legendary', 'golden'),
(85, 'Polla of Champions', 'The rarest card — Polla crowned champion', 'legendary', 'golden');
