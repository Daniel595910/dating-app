-- ============================================================
-- Birthday notifications (Phase 1)
--   - Daily 09:00 UTC pg_cron job
--   - One in-app notification per user per year (idempotent)
--   - Respects per-user notification_preferences.enabled
--   - Respects global notification_type_settings.enabled
--   - Template-aware via custom_title_template / custom_body_template
--   - Notifies the birthday user only (match fan-out = future phase)
-- Applied: 2026-11-16. Proven idempotent (run1=1, run2=0).
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_birthday_per_year
  ON public.notifications (user_id, (data->>'year'))
  WHERE type = 'birthday';

CREATE OR REPLACE FUNCTION public.notify_birthdays_today()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted integer := 0;
  v_global_enabled boolean := true;
  v_title_tpl text;
  v_body_tpl text;
BEGIN
  SELECT enabled, custom_title_template, custom_body_template
    INTO v_global_enabled, v_title_tpl, v_body_tpl
  FROM public.notification_type_settings
  WHERE type = 'birthday';

  IF FOUND AND v_global_enabled = false THEN
    RAISE NOTICE 'notify_birthdays_today: globally disabled, skipping';
    RETURN 0;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, data, action_url, channels)
  SELECT
    p.user_id,
    'birthday'::public.notification_type,
    COALESCE(
      REPLACE(v_title_tpl, '{display_name}', p.display_name),
      'Happy birthday, ' || p.display_name || '! 🎂'
    ),
    COALESCE(
      REPLACE(v_body_tpl, '{display_name}', p.display_name),
      'Wishing you a wonderful birthday from all of us at Spensive.'
    ),
    jsonb_build_object('year', EXTRACT(YEAR FROM (now() AT TIME ZONE 'UTC'))::int),
    '/profile',
    ARRAY['in_app']
  FROM public.profiles p
  LEFT JOIN public.notification_preferences np
    ON np.user_id = p.user_id AND np.type = 'birthday'
  WHERE p.birth_date IS NOT NULL
    AND EXTRACT(MONTH FROM p.birth_date) = EXTRACT(MONTH FROM (now() AT TIME ZONE 'UTC'))
    AND EXTRACT(DAY   FROM p.birth_date) = EXTRACT(DAY   FROM (now() AT TIME ZONE 'UTC'))
    AND (np.enabled IS NULL OR np.enabled = true)
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RAISE NOTICE 'notify_birthdays_today: inserted % birthday notification(s)', v_inserted;
  RETURN v_inserted;
END;
$$;

COMMENT ON FUNCTION public.notify_birthdays_today() IS
  'Inserts one in-app birthday notification per user whose birth_date month/day matches today (UTC). Idempotent per year via uq_notifications_birthday_per_year. Respects notification_preferences and notification_type_settings.';

SELECT cron.schedule(
  'birthday-notifications',
  '0 9 * * *',
  $$ SELECT public.notify_birthdays_today(); $$
);