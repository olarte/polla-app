# CLAUDE.md — Polla (polla.football) Production MVP

## Project Overview
Polla is a social prediction game for the FIFA World Cup 2026. Players predict match outcomes, compete in private groups and on a global leaderboard, earn XP through daily match predictions, and collect cards via booster packs. The platform accepts stablecoin deposits (USDC/USDT) across multiple chains and maintains an off-chain balance system. Free play serves as the primary acquisition channel.

**Domain:** polla.football
**Launch:** Before June 11, 2026 (World Cup kickoff)
**Stack:** Next.js 14 (App Router) + TypeScript + Tailwind CSS + Supabase + Blockradar + Twilio WhatsApp API

---

## Locked Design Decisions

These are intentional, debated choices. Do not relitigate without a deliberate re-discussion.

1. **One user, one set of predictions.** Predictions are keyed on `(user_id, match_id)` in the schema and apply to every pool the user has joined, including the global leaderboard. Joining more pools never creates more shots at a prize — the same bracket is scored everywhere. This is the guardrail that makes "no minimum entry fee" defensible, closes the spam-pool gaming vector, and keeps the mental model simple (March Madness analogue, not fantasy football).

2. **No minimum entry fee for global-pool eligibility.** Any paid pool — even $1 — qualifies a user for La Gran Polla. Free pools compete on their group leaderboard only (they don't contribute financially to the global pool). The underdog narrative ("$5 entry, $15k win") is the most valuable marketing asset a skill-based contest has, and the 80/20 group-to-global split structurally insulates whales — most of their money stays in their private group where they compete against peers.

3. **No stage multipliers.** Every match is worth the same, regardless of stage. The Final and a Group A opener both max out at 10 pts. Multipliers let late-tournament variance overwrite careful group-stage work, and the 80/20 pool split already gives knockout results outsized prize impact through the shared pool.

4. **No tournament-wide bonus predictions.** No champion/runner-up/top-scorer/golden-ball side markets. All scoring comes from match-level grading. The `bonus_predictions` table and `score_bonus_predictions()` function are dropped in migration 008.

5. **Flat global prize ladder, no reserved stage-bonus pool.** The 15/20/25/25/15 ladder sums to 100%. The ladder is the only global-pool payout mechanism — no knockout-performance side pool, no perfect-bracket jackpot, no held-back stage bonuses.

---

## Product Model
Polla is a **skill-based prize pool competition** — not a prediction market, not pari-mutuel betting, and not a sportsbook. Everyone pays a fixed entry fee, makes predictions, and is scored on accuracy. The prize pool is distributed to the top scorers based on a predetermined structure.

**Key distinctions (regulatory positioning):**
- No odds set by the platform (not a sportsbook)
- No trading of positions or price discovery (not a prediction market)
- No outcome-based pool splitting (not pari-mutuel)
- Pool distributed by performance ranking in a skill-based contest

**User-facing language:** Use "entry fee" (not bet/wager), "predictions" (not bets), "prize pool" (not pot), "service fee" (not rake), "contest" (not game of chance).

---

## App Structure & Navigation

### Bottom Nav (4 tabs)
| Tab | Icon | Screen | Purpose |
|-----|------|--------|---------|
| Home | ⚽ | Home | Global pool, XP summary, Predict CTA, group list, next match |
| Pollas | 🐔 | My Pollas | List of user's groups → tap for group detail |
| Daily | 🎯 | Daily Predictions | Today's matches, XP game, card album, packs |
| Global | 🌍 | Global | Prize ladder, tier distribution |

### Additional Screens (not in nav)
| Screen | Access | Purpose |
|--------|--------|---------|
| Profile | Tap avatar/balance on Home header | Balance, funds, deposit, withdraw, claim, predict CTA, activity, FAQ |
| Predict Modal | CTA on Home or Profile | Full-screen prediction experience with match intelligence |
| Match Detail | "Details" on any match in Predict Modal | Team stats, form, H2H, qualifiers |
| Polla Detail | Tap polla card in My Pollas | Group stats, payout, announcements, standings |
| Mini-Predictions | Tap match in Daily | 5 per-match XP predictions |
| Card Album | 🃏 button in Daily header | Collection grid, Panini-style |
| Pack Opening | 🎁 button in Card Album | XP milestone progress, pack opening |
| FAQ | Collapsible in Profile | How Polla works, 11 Q&A items |

### Screen State Adaptations
**Polla cards on My Pollas page:**
- Pre-tournament: Progress bar (completion %), member status, entry fee
- Tournament live: Rank, points, top 3 mini podium, prize pool
- Post-tournament: Final position, payout earned

**"Predict the World Cup" CTA on Home:**
- Pre-tournament, incomplete: Prominent gradient card, progress %, launches Predict Modal
- Pre-tournament, complete: Success state "✓ Complete"
- Tournament started: Disappears

---

## Core Product Concepts

### Two Group Modes
- **Free Groups:** No wallet needed. Phone auth only. Full experience. Group-leaderboard-only — **free pools do not qualify for La Gran Polla** since they don't contribute financially to it. Primary acquisition channel.
- **Paid Groups:** Stablecoin entry fee (any positive amount — no minimum). 5% service fee. 20% of the net group pool flows to the global pool. **Any paid entry — even $1 — grants La Gran Polla eligibility.** One user = one global-pool leaderboard entry, regardless of how many groups they join (predictions are keyed per user, not per group, so joining more pools does not create more shots at the global prize).

This is deliberate: a low-stake player topping the global leaderboard is the most valuable marketing story the product can tell ("$5 entry, $15k win"), and the 80/20 split already insulates high-stake players — most of their money stays in their private group where they compete against peers of similar stake, with only 20% flowing to the shared global pool.

### Two Currencies
- **Points:** Main polla predictions. Group leaderboard, global ranking, tier, payouts.
- **XP:** Engagement (daily mini-predictions, polla predictions, logins, shares, streaks). Unlocks booster packs. Works for free AND paid users.

### Three Payout Models (immutable after first prediction)
- **Winner Takes All:** 100% to 1st. Small groups (3-5).
- **Podium Split:** 60/25/15 to top 3. Medium groups (6-15).
- **Proportional:** Pro-rata by points. Large groups (15+).

### Global Prize Ladder (La Gran Polla)
| Position | % of Pool | Players |
|----------|-----------|---------|
| 🏆 Champion | 15% | 1 |
| 💎 Top 5 | 20% | 4 |
| ⭐ Top 20 | 25% | 15 |
| 🥇 Top 100 | 25% | 80 |
| 🥈 Top 500 | 15% | 400 |

Show user's current position on ladder with prize they'd earn now. Ladder sums to 100% — flat distribution, no reserved stage-bonus or knockout-performance pool. The prize ladder is the only global-pool payout mechanism.

### Tier System (percentile-based)
| Tier | Percentile | Badge |
|------|-----------|-------|
| Mythic | Top 0.1% | 🏆 |
| Diamond | Top 1% | 💎 |
| Platinum | Top 5% | ⭐ |
| Gold | Top 15% | 🥇 |
| Silver | Top 40% | 🥈 |
| Bronze | Everyone else | 🥉 |

Global screen shows tier distribution as stacked bar + breakdown table, not individual player list.

---

## Design System

### Colors
```
bg: #0A0A12
accent: #E94560
accentDark: #c73550
secondary: #0F3460
secondaryDeep: #1A1A4E
light: #16213E
success: #27AE60
warning: #F39C12
whatsapp: #25D366
gold: #FFD700
silver: #C0C0C0
bronze: #CD7F32
card: rgba(255,255,255,0.03)
cardBorder: rgba(255,255,255,0.06)
text100: #FFFFFF
text70: rgba(255,255,255,0.7)
text40: rgba(255,255,255,0.4)
text35: rgba(255,255,255,0.35)
text25: rgba(255,255,255,0.25)
rarity-common: text40
rarity-rare: #4FC3F7
rarity-epic: #CE93D8
rarity-legendary: #FFD700
```

### Typography
```
font-family: 'SF Pro Rounded', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif
```
Numbers: weight 800. Labels: 9-10px uppercase, letter-spacing 1.5. Monospace: wallet addresses only.

### Components
- Cards: card bg + cardBorder, 12-16px radius
- Glow cards: gradient(secondary → secondaryDeep → light), accent border
- Buttons primary: gradient(accent → accentDark)
- Buttons secondary: card bg + cardBorder
- WhatsApp buttons: whatsapp at 15% bg + 33% border
- Labels: 10px uppercase text35
- Collapsibles: ▾ arrow, borderTop separator
- FAQ: Accordion pattern per item

### Profile Avatar
- User selects any emoji via native emoji keyboard
- Accent gradient circle (38px Home, 56px Profile)
- ✏️ edit badge on Profile, hidden input triggers keyboard

---

## Technical Architecture

### Frontend
Next.js 14 App Router, TypeScript, Tailwind CSS, PWA installable

### Backend
Supabase: Postgres + RLS + Auth + Edge Functions + Realtime

### Auth
WhatsApp OTP via Twilio (primary). Google, Apple, Email (fallback). MiniPay auto-detect.

### Wallet Infrastructure (Blockradar)
Wallet creation, deposit detection, auto-sweep, payouts. Master wallets per chain. Non-MiniPay users get Blockradar addresses. MiniPay users use existing Celo address.

### Chains & Tokens
| Chain | Token |
|-------|-------|
| Celo | USDC |
| Base | USDC |
| Polygon | USDC |
| Tron | USDT |
| Ethereum | USDC |

### Balance System
Fully off-chain in Supabase. 1 USDC = 1 USDT = $1. Track deposit chain for payout routing.

### Fund Flow
```
Entry fees → 5% service fee → Net pool → 20% to global → Group pool → Payout model
```

---

## Scoring System

### Match Predictions
Tiered, exclusive. Pick the highest tier the prediction satisfies.

- **Exact score:** 10 pts.
- **Goal difference + winner:** 5 pts.
- **Winner + one team's goal count:** 3 pts.
- **Winner only:** 2 pts.
- **Wrong winner:** 0 pts.

Note: the "winner + one team's goals" tier can only fire when GD is wrong — if both GD and a team's goal count match, the exact score is reached by arithmetic. See `lib/scoring.ts` → `gradePrediction()`.

**No stage multipliers.** Every match is worth the same — the Final and a Group A opener both max out at 10 pts. Multipliers were dropped because they let late-tournament variance overwrite careful group-stage work, and the 80/20 group-to-global pool split already gives knockout results outsized prize impact through the shared pool.

**No tournament-wide bonus predictions.** Champion, runner-up, top scorer, golden ball, group winners — all removed. All scoring comes from match-level grading above. `bonus_predictions` table and `score_bonus_predictions()` function are dropped in migration 008.

---

## XP & Engagement System

### XP Sources
| Action | XP |
|--------|-----|
| Correct mini-prediction | 10 |
| Perfect Match (5/5) | 25 bonus |
| Correct polla prediction | 5 |
| Exact score in polla | 15 |
| Daily login | 5 |
| WhatsApp share | 10 (max 3/day) |
| Invite friend | 50 |
| Complete prediction sheet | 100 |
| Day streak | 5 × streak count |

### Booster Pack Milestones
Pack 1: 100 XP. Pack 2: 250. Pack 3: 500. Pack 4: 750. Pack 5: 1000. Pack 6: 1500. Pack 7 (Rare+): 2000. Pack 8 (Epic+): 3000. Plus tournament milestone packs.

### Cards
85 total: 48 Common (national jerseys), 20 Rare (football moments), 12 Epic (cultural costumes), 5 Legendary. Panini album grid. All in Supabase, no blockchain.

---

## Predict the World Cup (Immersive Modal)

Launched from Home CTA or Profile CTA. Full-screen with group tabs (A-L) + KO tab, match cards with score inputs + "Details ↗" button. Match Detail shows: prediction input, recent form (W/D/L), qualification stats, recent matches, head-to-head history. Free value for all users.

---

## Database Schema
See tables: users, groups, group_members, matches, predictions, mini_predictions, scores, group_leaderboards, global_leaderboard, pools, payouts, deposits, balances, cards, user_cards, booster_packs, xp_events. User table includes avatar_emoji, total_xp, packs_earned, cards_collected, streak_days.

---

## Economic Model
5% service fee. Conservative: 5K groups, 60K users, 1.2M volume, 60K revenue. Optimistic: 20K groups, 240K users, 4.8M volume, 240K revenue.

---

## Tournament
48 teams, 12 groups, 104 matches. June 11 – July 19, 2026. Hosts: USA, Canada, Mexico.

---

## Landing Page (polla.football)

The landing page is a single-page marketing site that explains the product and drives signups. It follows a **Clash of Clans / Supercell** visual aesthetic matching the Polla logo (cartoon hen with footballs, wooden/golden textures, earth backdrop).

Reference `polla-landing.jsx` for the exact implementation. The production landing page should be built from this reference.

### Visual Identity (Landing Page Only — different from app)
The landing page has its own palette derived from the logo, distinct from the dark app UI:
- **Base:** Deep forest green (#0a1a08), not the app's #0A0A12 black
- **Gold:** #FFD700 primary accent for headings, prizes, CTAs
- **Gold dark:** #B8960F for text-shadow depth (embossed metal look)
- **Green buttons:** Gradient #4CAF50 → #1B5E20 with 3D press effect (6px bottom shadow)
- **Wood brown:** #5D4037 / #8D6E63 for secondary buttons and dividers
- **Cream:** #FFF8E1 for feature card titles
- **Text:** White at 100%, 70%, 45% opacity hierarchy

### Typography (Landing Page)
- **Display:** Lilita One (Google Fonts) — chunky, cartoonish uppercase. Used for all headings, section titles, button text, prize amounts.
- **Body:** Nunito (Google Fonts) — rounded, warm, weight 600-900. Used for descriptions, labels, body text.
- Both imported via Google Fonts CDN.

### Sections (top to bottom)
1. **Hero:** Full-viewport. Logo with float animation + golden drop-shadow. "PREDICT THE WORLD CUP 2026" in gold Lilita One. Subtitle. Two CoC-style 3D buttons (green primary "Start Predicting — Free", wood secondary "See Prizes"). Live countdown to June 11. Floating emoji particles (⚽🐔🏆⭐🥇🎯🃏) drift upward in background.
2. **Flag Marquee:** Infinite horizontal scroll of 20 national flag emojis.
3. **How It Works:** 4 step cards (Sign Up → Predict → Create Polla → Win). Each card has ghosted step number, large emoji, gold title, muted description. Cards lift on hover.
4. **Features:** 8 feature cards in 2-column grid. Shield-style icon box + title + description. Covers: Free to Play, Real Prize Pools, Global Competition, Daily Predictions, Collect Cards, Match Intelligence, WhatsApp Sharing, Multi-Chain Deposits.
5. **La Gran Polla (Global Prize Pool):** Glowing gold-bordered card showing "$228,456" in massive Lilita One. Prize tier table below (Champion → Top 500) with icons, labels, player counts, and gold amounts.
6. **Collect Them All:** 5 showcase cards (2 common, 1 rare, 1 epic, 1 legendary) with rarity-colored borders and glow effects. Legendary card pulses. Wooden divider. "XP Unlocks Everything" explainer text.
7. **Final CTA:** Host country flags (🇺🇸🇲🇽🇨🇦). "THE WORLD CUP ONLY HAPPENS EVERY 4 YEARS". Large green CTA button.
8. **Footer:** Polla hen emoji, "POLLA.FOOTBALL" in gold Lilita One, tagline, Terms/Privacy/FAQ links, copyright disclaimer.

### Component Patterns
- **GameBtn:** 3D press-effect button with gradient fill, white inner border, dark bottom shadow. Shadow compresses on mousedown for tactile feel. Colors: green (primary), wood (secondary), gold (accent), red (danger).
- **WoodDivider:** Horizontal wooden plank gradient (transparent → wood → transparent) with inner highlight and bottom shadow.
- **SectionTitle:** Gold Lilita One text with dark text-shadow, optional subtitle in Nunito muted.
- **FeatureCard:** Glass card with gold border hint, icon box left, text right. Lifts on hover.
- **ShowcaseCard:** 100×140px card with rarity-specific gradient background, colored border, glow shadow. Legendary animates glow.
- **PrizeTier:** Row layout — icon, label, player count, gold amount. Bottom border separator.
- **FlagMarquee:** Doubled flag array with CSS translateX animation for seamless infinite scroll.
- **Particles:** 18 emoji particles with randomized position, size, duration, delay. Float upward with rotation and fade.

### Responsive Behavior
- All sections use max-width containers (700-1000px) with auto margins
- Grid columns use `repeat(auto-fit, minmax(220-290px, 1fr))` for automatic mobile adaptation
- Font sizes use `clamp()` for fluid scaling
- Buttons stack vertically on mobile via `flex-wrap: wrap`
- Logo scales down to 180px on small screens
