-- ============================================================
-- MIGRATION 001: PAYSTACK SUBSCRIPTIONS
-- Idempotent — safe to re-run
-- Adds: payments, subscriptions, webhook_events, vip_plans extensions,
--       profiles.billing_currency
-- ============================================================

-- ============================================================
-- 1. Add billing_currency to profiles
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles'
      AND column_name = 'billing_currency'
  ) THEN
    ALTER TABLE profiles ADD COLUMN billing_currency TEXT
      CHECK (billing_currency IN ('NGN', 'USD'));
    COMMENT ON COLUMN profiles.billing_currency IS
      'User-selected VIP billing currency. NULL = never chosen. Not auto-changed by IP/location.';
  END IF;
END $$;

-- ============================================================
-- 2. Extend vip_plans for multi-currency + Paystack
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vip_plans' AND column_name = 'plan_code') THEN
    ALTER TABLE vip_plans ADD COLUMN plan_code TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vip_plans' AND column_name = 'billing_interval') THEN
    ALTER TABLE vip_plans ADD COLUMN billing_interval TEXT DEFAULT 'monthly';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vip_plans' AND column_name = 'amount') THEN
    -- amount is in smallest unit: kobo for NGN, cents for USD
    ALTER TABLE vip_plans ADD COLUMN amount BIGINT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vip_plans' AND column_name = 'paystack_plan_code') THEN
    ALTER TABLE vip_plans ADD COLUMN paystack_plan_code TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vip_plans' AND column_name = 'credits_included') THEN
    ALTER TABLE vip_plans ADD COLUMN credits_included INTEGER DEFAULT 0;
  END IF;
END $$;

-- Backfill amount from existing columns where possible (do not overwrite)
UPDATE vip_plans
SET amount = CASE
  WHEN currency = 'NGN' AND price_ngn IS NOT NULL THEN (price_ngn * 100)::BIGINT
  WHEN currency = 'USD' AND price IS NOT NULL THEN (price * 100)::BIGINT
  ELSE amount
END
WHERE amount IS NULL;

-- Backfill plan_code from name+currency (fallback)
UPDATE vip_plans
SET plan_code = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '_', 'g')) || '_' || lower(currency)
WHERE plan_code IS NULL;

-- Create a UNIQUE index on (plan_code, currency) — allows multiple currencies per plan_code
CREATE UNIQUE INDEX IF NOT EXISTS vip_plans_code_currency_uidx
  ON vip_plans (plan_code, currency)
  WHERE plan_code IS NOT NULL;

-- Paystack plan code should be unique when present
CREATE UNIQUE INDEX IF NOT EXISTS vip_plans_paystack_code_uidx
  ON vip_plans (paystack_plan_code)
  WHERE paystack_plan_code IS NOT NULL;

-- ============================================================
-- 3. PAYMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES vip_plans(id) ON DELETE SET NULL,
  plan_code TEXT,                              -- snapshot for audit
  currency TEXT NOT NULL CHECK (currency IN ('NGN', 'USD')),
  amount BIGINT NOT NULL CHECK (amount > 0),   -- smallest unit (kobo/cents)
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'success', 'failed', 'abandoned', 'reversed')),
  paystack_reference TEXT NOT NULL UNIQUE,     -- idempotency key from Paystack
  paystack_transaction_id BIGINT,              -- Paystack transaction id
  paystack_channel TEXT,                        -- card / bank_transfer / ussd / etc.
  paid_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS payments_user_idx ON payments (user_id);
CREATE INDEX IF NOT EXISTS payments_status_idx ON payments (status);
CREATE INDEX IF NOT EXISTS payments_created_at_idx ON payments (created_at DESC);
CREATE INDEX IF NOT EXISTS payments_reference_idx ON payments (paystack_reference);
CREATE INDEX IF NOT EXISTS payments_transaction_id_idx ON payments (paystack_transaction_id)
  WHERE paystack_transaction_id IS NOT NULL;

-- ============================================================
-- 4. SUBSCRIPTIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES vip_plans(id) ON DELETE RESTRICT,
  plan_code TEXT NOT NULL,                        -- snapshot
  provider TEXT NOT NULL DEFAULT 'paystack',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'failed', 'cancelled', 'expired', 'non_renewing')),

  -- LOCKED at creation. Never re-derived.
  currency TEXT NOT NULL CHECK (currency IN ('NGN', 'USD')),
  amount BIGINT NOT NULL,                          -- smallest unit

  -- Paystack identifiers
  paystack_subscription_code TEXT,
  paystack_email_token TEXT,
  paystack_customer_code TEXT,
  paystack_authorization_code TEXT,
  paystack_reference TEXT,                         -- initial transaction reference

  -- Lifecycle timestamps
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  next_payment_date TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS subscriptions_user_idx ON subscriptions (user_id);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON subscriptions (status);
CREATE INDEX IF NOT EXISTS subscriptions_plan_idx ON subscriptions (plan_id);
CREATE INDEX IF NOT EXISTS subscriptions_period_end_idx ON subscriptions (current_period_end)
  WHERE status = 'active';

-- Paystack subscription code unique when present (idempotency)
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_paystack_sub_uidx
  ON subscriptions (paystack_subscription_code)
  WHERE paystack_subscription_code IS NOT NULL;

-- A user can only have ONE active subscription at a time
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_one_active_per_user_uidx
  ON subscriptions (user_id)
  WHERE status IN ('active', 'pending', 'non_renewing');

-- ============================================================
-- 5. WEBHOOK EVENTS TABLE (idempotency)
-- ============================================================
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'paystack',
  event_type TEXT NOT NULL,
  event_id TEXT NOT NULL,                          -- unique id from provider
  reference TEXT,                                  -- Paystack reference if present
  payload JSONB NOT NULL,
  signature_valid BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  processing_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- ENFORCE idempotency: same provider + event_id can only exist once
  UNIQUE (provider, event_id)
);

CREATE INDEX IF NOT EXISTS webhook_events_reference_idx ON webhook_events (reference)
  WHERE reference IS NOT NULL;
CREATE INDEX IF NOT EXISTS webhook_events_type_idx ON webhook_events (event_type);
CREATE INDEX IF NOT EXISTS webhook_events_created_idx ON webhook_events (created_at DESC);
CREATE INDEX IF NOT EXISTS webhook_events_unprocessed_idx ON webhook_events (created_at)
  WHERE processed_at IS NULL;

-- ============================================================
-- 6. Link vip_accounts to subscriptions (nullable, non-breaking)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vip_accounts' AND column_name = 'active_subscription_id') THEN
    ALTER TABLE vip_accounts ADD COLUMN active_subscription_id UUID
      REFERENCES subscriptions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- 7. ROW LEVEL SECURITY
-- ============================================================

-- payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own payments" ON payments;
CREATE POLICY "Users read own payments"
  ON payments FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Admins manage payments" ON payments;
CREATE POLICY "Admins manage payments"
  ON payments FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

-- subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own subscriptions" ON subscriptions;
CREATE POLICY "Users read own subscriptions"
  ON subscriptions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Admins manage subscriptions" ON subscriptions;
CREATE POLICY "Admins manage subscriptions"
  ON subscriptions FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

-- webhook_events — admin read only, writes only via service role (Edge Functions)
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read webhook events" ON webhook_events;
CREATE POLICY "Admins read webhook events"
  ON webhook_events FOR SELECT TO authenticated
  USING (is_admin_user(auth.uid()));

-- vip_plans — public read of active plans, admin write
ALTER TABLE vip_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active vip plans" ON vip_plans;
CREATE POLICY "Anyone can read active vip plans"
  ON vip_plans FOR SELECT TO authenticated
  USING (is_active = true OR is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Admins manage vip plans" ON vip_plans;
CREATE POLICY "Admins manage vip plans"
  ON vip_plans FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

-- ============================================================
-- 8. updated_at triggers (safe, idempotent)
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS payments_set_updated_at ON payments;
CREATE TRIGGER payments_set_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS subscriptions_set_updated_at ON subscriptions;
CREATE TRIGGER subscriptions_set_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- END
-- ============================================================
