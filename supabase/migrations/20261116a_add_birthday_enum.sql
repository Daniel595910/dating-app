-- ============================================================
-- Add 'birthday' to notification_type enum.
-- Separate migration because Postgres cannot ADD VALUE and use it
-- in the same transaction.
-- Applied: 2026-11-16.
-- ============================================================
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'birthday';