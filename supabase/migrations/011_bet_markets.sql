-- ============================================================
-- 011: Bet Markets — maps matches to on-chain market IDs
-- ============================================================

CREATE TABLE IF NOT EXISTS bet_markets (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id    UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  market_type TEXT NOT NULL CHECK (market_type IN ('result', 'goals')),
  contract_market_id TEXT NOT NULL,  -- bytes32 hex from contract
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'open', 'resolved', 'cancelled')),
  winning_outcome SMALLINT,          -- set on resolution
  tx_hash_create  TEXT,              -- createMarket tx hash
  tx_hash_resolve TEXT,              -- resolve/cancel tx hash
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (match_id, market_type)
);

-- Index for cron lookups
CREATE INDEX idx_bet_markets_status ON bet_markets(status);
CREATE INDEX idx_bet_markets_match ON bet_markets(match_id);

-- Enable RLS (read-only for authenticated users)
ALTER TABLE bet_markets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read bet_markets"
  ON bet_markets FOR SELECT
  USING (true);

-- Update bets table: add index on market_id for resolution queries
CREATE INDEX IF NOT EXISTS idx_bets_market_id ON bets(market_id);
CREATE INDEX IF NOT EXISTS idx_bets_status ON bets(status);
