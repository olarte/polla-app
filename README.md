# Polla (polla.football)

A social prediction game for the FIFA World Cup 2026. Players predict match outcomes, compete in private groups ("pollas") and on a global leaderboard, and win prizes from shared pools.

## What it does

- **Predict matches** — Submit score predictions for all 104 World Cup matches. Earn points for correct winners, goal differences, and exact scores. Every match is worth the same.
- **Create or join pollas** — Organize private prediction groups with friends. Each group has its own leaderboard and prize pool with configurable payout models (winner-takes-all, podium split, or proportional).
- **Free and paid modes** — Free groups require only phone auth. Paid groups accept stablecoin deposits (USDC/USDT) across Celo, Base, Polygon, Tron, and Ethereum.
- **Global competition** — All paid-group players compete on a global leaderboard ("La Gran Polla") with a tiered prize ladder from Champion down to Top 500.
- **Daily engagement** — Daily mini-predictions on live matches earn XP, which unlocks collectible card booster packs (Panini-style album with 85 cards across 4 rarity tiers).

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, PWA |
| Backend | Supabase (Postgres + RLS + Auth + Edge Functions) |
| Auth | WhatsApp OTP (Twilio), Google, Apple, Email |
| Payments | Blockradar (wallet creation, deposit detection, payouts) |
| On-chain | viem + wagmi for MiniPay / wallet interactions |

## Getting started

```bash
npm install
npm run dev        # Start dev server on localhost:3000
npm run seed       # Seed database with sample data
npm run wipe       # Wipe seeded data
npm run build      # Production build
```

Requires a `.env.local` with Supabase and Blockradar credentials.

## Project structure

```
app/
  page.tsx              # Landing page (polla.football)
  app/                  # Authenticated app routes
  (auth)/               # Auth flow pages
  api/                  # API routes
  components/           # Shared UI components
  contexts/             # React context providers
  landing/              # Landing page components
contracts/              # Smart contract ABIs
lib/                    # Supabase client, utilities
scripts/                # Seed and wipe scripts
supabase/               # Migrations and edge functions
```

## Launch target

Before June 11, 2026 (World Cup kickoff).
