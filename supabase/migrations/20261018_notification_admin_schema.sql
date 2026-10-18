-- ============================================================
-- Admin notification system: schema for per-type settings,
-- global settings, and broadcast announcements.
--
-- Tables exist in the live DB as of this session. This migration
-- captures them so they're reproducible via `supabase db push`
-- or fresh environments.
--
-- No UI or enforcement yet — see next migration/session for:
--   - notification-sender checks these tables before sending
--   - notify_on_* triggers respect per-type `enabled` flag
--   - admin UI at /admin/notifications reads/writes these tables
-- ============================================================

-- Per-type settings (match, message, connection, comment, like, etc.)
CREATE TABLE IF NOT EXISTS public.notification_type_settings (
  type public.notification_type PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT true,
  in_app_enabled BOOLEAN NOT NULL DEFAULT true,
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  email_enabled BOOLEAN NOT NULL DEFAULT false,
  custom_title_template TEXT,
  custom_body_template TEXT,
  custom_icon_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Global settings (single row, id=1)
CREATE TABLE IF NOT EXISTS public.notification_global_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  push_master_enabled BOOLEAN NOT NULL DEFAULT true,
  app_icon_url TEXT,
  app_name TEXT NOT NULL DEFAULT 'Dating App',
  default_avatar_url TEXT,
  quiet_hours_start INT,
  quiet_hours_end INT,
  rate_limit_per_hour INT NOT NULL DEFAULT 30,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Broadcast announcements
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  action_url TEXT,
  icon_url TEXT,
  target JSONB NOT NULL DEFAULT '{"type":"all"}'::jsonb,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','scheduled','sending','sent','failed')),
  recipient_count INT,
  delivered_count INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Seed global settings row if missing
INSERT INTO public.notification_global_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- RLS: admin-only for writes, public read for global (client might read app_name/icon)
ALTER TABLE public.notification_type_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_global_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- (RLS policies deferred to next migration/session — admin auth not wired yet)