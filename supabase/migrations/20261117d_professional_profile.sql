-- 20261117d_professional_profile.sql
-- CP7a: professional creator profile columns on profiles.
-- is_professional is the activation flag (free flip, no application/payment gate).
-- link_in_bio_url must be http(s) only — rendered as a clickable pill on the public profile.
-- social_links defaults to empty object so rendering is Object.entries(socialLinks ?? {}).

alter table public.profiles
  add column if not exists is_professional boolean not null default false,
  add column if not exists professional_since timestamptz,
  add column if not exists link_in_bio_url text,
  add column if not exists professional_category text,
  add column if not exists social_links jsonb not null default '{}'::jsonb;

alter table public.profiles
  add constraint profiles_link_in_bio_url_safe
  check (
    link_in_bio_url is null
    or link_in_bio_url ~ '^https?://'
  );

create index if not exists idx_profiles_is_professional
  on public.profiles(is_professional)
  where is_professional = true;
