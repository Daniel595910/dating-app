-- ============================================================
-- MIGRATION 002: SEED VIP PLANS (NGN + USD)
-- Replace placeholder amounts with your real prices.
-- Amounts are in SMALLEST UNIT: kobo for NGN, cents for USD.
-- Example: ₦2,500 = 250000 ; $9.99 = 999
-- ============================================================

-- Delete existing seed rows for the 6 canonical plans (safe — only touches plans we created)
DELETE FROM vip_plans
WHERE plan_code IN (
  'basic_monthly', 'premium_monthly', 'vip_monthly'
);

-- NGN PLANS
INSERT INTO vip_plans
  (plan_code, name, description, level, currency, amount, price, duration_days,
   billing_interval, points_included, credits_included, features, status, is_active, sort_order)
VALUES
  ('basic_monthly', 'Basic Monthly', 'Get started with enhanced features', 'basic',
   'NGN', 250000, 2500, 30, 'monthly', 100, 20,
   ARRAY['Unlimited matches', 'See who liked you', 'Basic filters', '20 community credits'],
   'active', true, 1),

  ('premium_monthly', 'Premium Monthly', 'Our most popular plan', 'premium',
   'NGN', 500000, 5000, 30, 'monthly', 500, 100,
   ARRAY['Everything in Basic', 'Priority profile visibility', 'Advanced filters', '100 community credits', 'Create community'],
   'active', true, 2),

  ('vip_monthly', 'VIP Monthly', 'Maximum features and visibility', 'vip',
   'NGN', 1000000, 10000, 30, 'monthly', 1000, 500,
   ARRAY['Everything in Premium', 'VIP badge', 'Dedicated support', '500 community credits', 'Sponsor communities'],
   'active', true, 3);

-- USD PLANS
INSERT INTO vip_plans
  (plan_code, name, description, level, currency, amount, price, duration_days,
   billing_interval, points_included, credits_included, features, status, is_active, sort_order)
VALUES
  ('basic_monthly', 'Basic Monthly', 'Get started with enhanced features', 'basic',
   'USD', 999, 9.99, 30, 'monthly', 100, 20,
   ARRAY['Unlimited matches', 'See who liked you', 'Basic filters', '20 community credits'],
   'active', true, 1),

  ('premium_monthly', 'Premium Monthly', 'Our most popular plan', 'premium',
   'USD', 1999, 19.99, 30, 'monthly', 500, 100,
   ARRAY['Everything in Basic', 'Priority profile visibility', 'Advanced filters', '100 community credits', 'Create community'],
   'active', true, 2),

  ('vip_monthly', 'VIP Monthly', 'Maximum features and visibility', 'vip',
   'USD', 2999, 29.99, 30, 'monthly', 1000, 500,
   ARRAY['Everything in Premium', 'VIP badge', 'Dedicated support', '500 community credits', 'Sponsor communities'],
   'active', true, 3);

-- Verify
SELECT plan_code, name, currency, amount, price, level, is_active
FROM vip_plans
ORDER BY plan_code, currency;
