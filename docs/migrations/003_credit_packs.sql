-- ============================================================
-- MIGRATION 003: CREDIT PACKS
-- Idempotent — safe to re-run
-- Adds: credit_packs, credit_purchases tables + 8 seed packs
-- ============================================================

-- ============================================================
-- 1. CREDIT PACKS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS credit_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_code TEXT NOT NULL,
  name TEXT NOT NULL,
  credits INTEGER NOT NULL CHECK (credits > 0),
  currency TEXT NOT NULL CHECK (currency IN ('NGN', 'USD')),
  amount BIGINT NOT NULL CHECK (amount > 0),   -- smallest unit
  price NUMERIC NOT NULL,                      -- display price
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (pack_code, currency)
);

CREATE INDEX IF NOT EXISTS credit_packs_currency_idx ON credit_packs (currency);
CREATE INDEX IF NOT EXISTS credit_packs_active_idx ON credit_packs (is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS credit_packs_sort_idx ON credit_packs (sort_order);

-- ============================================================
-- 2. CREDIT PURCHASES TABLE (idempotent ledger)
-- ============================================================
CREATE TABLE IF NOT EXISTS credit_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pack_id UUID REFERENCES credit_packs(id) ON DELETE SET NULL,
  pack_code TEXT NOT NULL,                     -- snapshot
  credits INTEGER NOT NULL CHECK (credits > 0),
  currency TEXT NOT NULL CHECK (currency IN ('NGN', 'USD')),
  amount BIGINT NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'success', 'failed', 'abandoned', 'reversed')),
  paystack_reference TEXT NOT NULL UNIQUE,     -- idempotency key
  paystack_transaction_id BIGINT,
  paystack_channel TEXT,
  paid_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS credit_purchases_user_idx ON credit_purchases (user_id);
CREATE INDEX IF NOT EXISTS credit_purchases_status_idx ON credit_purchases (status);
CREATE INDEX IF NOT EXISTS credit_purchases_reference_idx ON credit_purchases (paystack_reference);
CREATE INDEX IF NOT EXISTS credit_purchases_created_at_idx ON credit_purchases (created_at DESC);

-- ============================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE credit_packs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active credit packs" ON credit_packs;
CREATE POLICY "Anyone can read active credit packs"
  ON credit_packs FOR SELECT TO authenticated
  USING (is_active = true OR is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Admins manage credit packs" ON credit_packs;
CREATE POLICY "Admins manage credit packs"
  ON credit_packs FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

ALTER TABLE credit_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own credit purchases" ON credit_purchases;
CREATE POLICY "Users read own credit purchases"
  ON credit_purchases FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Admins manage credit purchases" ON credit_purchases;
CREATE POLICY "Admins manage credit purchases"
  ON credit_purchases FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

-- ============================================================
-- 4. updated_at triggers
-- ============================================================
DROP TRIGGER IF EXISTS credit_packs_set_updated_at ON credit_packs;
CREATE TRIGGER credit_packs_set_updated_at
  BEFORE UPDATE ON credit_packs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS credit_purchases_set_updated_at ON credit_purchases;
CREATE TRIGGER credit_purchases_set_updated_at
  BEFORE UPDATE ON credit_purchases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 5. SEED 8 CREDIT PACKS (4 NGN + 4 USD)
-- Amounts in smallest unit: kobo for NGN, cents for USD
-- ============================================================
DELETE FROM credit_packs
WHERE pack_code IN ('credits_50', 'credits_100', 'credits_500', 'credits_1000');

INSERT INTO credit_packs (pack_code, name, credits, currency, amount, price, is_active, sort_order)
VALUES
  -- NGN packs
  ('credits_50',   '50 Credits',    50,   'NGN', 50000,   500,   true, 1),
  ('credits_100',  '100 Credits',   100,  'NGN', 90000,   900,   true, 2),
  ('credits_500',  '500 Credits',   500,  'NGN', 400000,  4000,  true, 3),
  ('credits_1000', '1,000 Credits', 1000, 'NGN', 750000,  7500,  true, 4),
  -- USD packs
  ('credits_50',   '50 Credits',    50,   'USD', 99,      0.99,  true, 1),
  ('credits_100',  '100 Credits',   100,  'USD', 199,     1.99,  true, 2),
  ('credits_500',  '500 Credits',   500,  'USD', 899,     8.99,  true, 3),
  ('credits_1000', '1,000 Credits', 1000, 'USD', 1699,    16.99, true, 4);

-- ============================================================
-- 6. VERIFY
-- ============================================================
SELECT pack_code, name, credits, currency, amount, price, is_active
FROM credit_packs
ORDER BY currency, sort_order;
