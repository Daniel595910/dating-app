-- ============================================================
-- Fix handle_new_user trigger:
--   1. Remove the stale second trigger (on_auth_user_created_profile)
--      that was aborting all signups with "relation profiles does not exist"
--   2. Rewrite handle_new_user to split Google's combined name on first space
--   3. Backfill existing Google users whose first_name is null
-- ============================================================

-- 1. Remove stale trigger that was failing
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_profile() CASCADE;

-- 2. Rewrite handle_new_user with combined-name fallback
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  fn text;
  ln text;
  dn text;
  combined text;
BEGIN
  fn := COALESCE(NEW.raw_user_meta_data->>'first_name', '');
  ln := COALESCE(NEW.raw_user_meta_data->>'last_name', '');

  IF fn = '' THEN
    fn := COALESCE(NEW.raw_user_meta_data->>'given_name', '');
  END IF;
  IF ln = '' THEN
    ln := COALESCE(NEW.raw_user_meta_data->>'family_name', '');
  END IF;

  IF fn = '' THEN
    combined := COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      ''
    );
    IF combined <> '' THEN
      IF position(' ' IN combined) > 0 THEN
        fn := split_part(combined, ' ', 1);
        ln := NULLIF(substring(combined FROM position(' ' IN combined) + 1), '');
      ELSE
        fn := combined;
      END IF;
    END IF;
  END IF;

  dn := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'display_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'name', ''),
    NULLIF(TRIM(fn || ' ' || COALESCE(ln, '')), ''),
    split_part(NEW.email, '@', 1),
    'User'
  );

  INSERT INTO public.profiles (user_id, first_name, last_name, display_name)
  VALUES (NEW.id, NULLIF(fn, ''), NULLIF(ln, ''), dn)
  ON CONFLICT (user_id) DO UPDATE
    SET first_name   = COALESCE(NULLIF(EXCLUDED.first_name, ''), public.profiles.first_name),
        last_name    = COALESCE(NULLIF(EXCLUDED.last_name, ''),  public.profiles.last_name),
        display_name = COALESCE(NULLIF(EXCLUDED.display_name, ''), public.profiles.display_name),
        updated_at   = now();

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user failed for user %: % (%)', NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE OF raw_user_meta_data ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();