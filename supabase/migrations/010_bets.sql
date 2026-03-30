-- Pari-mutuel match bets (off-chain record of on-chain bets)
CREATE TABLE IF NOT EXISTS bets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  match_id uuid NOT NULL REFERENCES matches(id),
  market_type text NOT NULL CHECK (market_type IN ('result', 'goals')),
  market_id text NOT NULL, -- bytes32 hex string
  outcome smallint NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  tx_hash text, -- on-chain transaction hash
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'won', 'lost', 'refund')),
  payout numeric(12,2),
  claimed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_bets_user_id ON bets(user_id);
CREATE INDEX idx_bets_match_id ON bets(match_id);
CREATE INDEX idx_bets_market_id ON bets(market_id);

-- RLS
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;

-- Users can read their own bets
CREATE POLICY bets_select ON bets FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own bets
CREATE POLICY bets_insert ON bets FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role can update (for resolving bets)
CREATE POLICY bets_update ON bets FOR UPDATE USING (true);
