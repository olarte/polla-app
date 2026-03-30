-- ============================================================
-- Migration: Simplify auth — remove Blockradar/Twilio fields,
-- add MiniPay wallet fields, remove balance system
-- ============================================================

-- Drop old columns from users
ALTER TABLE public.users DROP COLUMN IF EXISTS is_minipay_user;
ALTER TABLE public.users DROP COLUMN IF EXISTS minipay_address;
ALTER TABLE public.users DROP COLUMN IF EXISTS wallet_celo;
ALTER TABLE public.users DROP COLUMN IF EXISTS wallet_base;
ALTER TABLE public.users DROP COLUMN IF EXISTS wallet_polygon;
ALTER TABLE public.users DROP COLUMN IF EXISTS wallet_tron;
ALTER TABLE public.users DROP COLUMN IF EXISTS wallet_ethereum;
ALTER TABLE public.users DROP COLUMN IF EXISTS deposit_chain;

-- Add new columns
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS wallet_address text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS wallet_connected boolean NOT NULL DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS auth_method text NOT NULL DEFAULT 'anonymous';

-- Make phone nullable (no longer required)
ALTER TABLE public.users ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_phone_key;

-- Update the handle_new_user trigger to not require phone or create balances
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id)
  VALUES (new.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop deprecated tables
DROP TABLE IF EXISTS public.otp_codes CASCADE;

-- Drop deprecated balance functions
DROP FUNCTION IF EXISTS public.credit_deposit(uuid, numeric, text, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.deduct_entry_fee(uuid, uuid, numeric);
DROP FUNCTION IF EXISTS public.process_group_payout(uuid, uuid, numeric, numeric, numeric);
DROP FUNCTION IF EXISTS public.process_withdrawal(uuid, numeric, text, text, text);
DROP FUNCTION IF EXISTS public.refund_withdrawal(uuid);
