-- ============================================================
-- DATING APP — COMPLETE DATABASE SCHEMA
-- Project: StealGat
-- Supabase URL: https://bngrqxtxppuhtrtqmlli.supabase.co
-- Generated: For full project reference
-- ============================================================

-- ============================================================
-- SECTION 1: ENUMS
-- ============================================================

CREATE TYPE comment_status AS ENUM ('published', 'hidden', 'flagged', 'deleted');
CREATE TYPE community_status AS ENUM ('active', 'inactive', 'archived', 'locked');
CREATE TYPE community_type AS ENUM ('country', 'state', 'city', 'region');
CREATE TYPE conversation_status AS ENUM ('active', 'archived', 'deleted');
CREATE TYPE education_level AS ENUM ('high_school', 'diploma', 'bachelors', 'masters', 'doctorate', 'other');
CREATE TYPE gender AS ENUM ('male', 'female', 'non_binary', 'other', 'prefer_not_to_say');
CREATE TYPE match_stage AS ENUM ('getting_to_know', 'compatibility_check', 'matched', 'rejected', 'expired');
CREATE TYPE match_status AS ENUM ('active', 'completed', 'cancelled', 'expired');
CREATE TYPE message_status AS ENUM ('sent', 'delivered', 'read', 'failed', 'delivering');
CREATE TYPE message_type AS ENUM ('text', 'image', 'emoji', 'system', 'voice', 'gift');
CREATE TYPE notification_status AS ENUM ('unread', 'read', 'archived');
CREATE TYPE notification_type AS ENUM ('match', 'message', 'like', 'comment', 'mention', 'system', 'verification', 'vip', 'report', 'community');
CREATE TYPE occupation_status AS ENUM ('employed', 'self_employed', 'student', 'unemployed', 'retired', 'other');
CREATE TYPE post_status AS ENUM ('published', 'hidden', 'flagged', 'deleted', 'pending_review', 'under_review');
CREATE TYPE post_type AS ENUM ('introduction', 'looking_for', 'discussion', 'question', 'event', 'other', 'photo', 'profile_share');
CREATE TYPE reaction_type AS ENUM ('like', 'love', 'haha', 'wow', 'sad', 'angry');
CREATE TYPE relationship_intent AS ENUM ('serious_relationship', 'marriage', 'casual_dating', 'friendship', 'long_term', 'unsure');
CREATE TYPE report_reason AS ENUM ('harassment', 'spam', 'inappropriate_content', 'fake_profile', 'scam', 'underage', 'violence', 'hate_speech', 'other');
CREATE TYPE report_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE report_status AS ENUM ('pending', 'under_review', 'resolved', 'dismissed', 'escalated');
CREATE TYPE report_type AS ENUM ('user', 'post', 'comment', 'message', 'photo');
CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed', 'cancelled');
CREATE TYPE transaction_type AS ENUM ('purchase', 'consumption', 'refund', 'bonus', 'adjustment');
CREATE TYPE user_role AS ENUM ('user', 'moderator', 'admin', 'super_admin');
CREATE TYPE user_status AS ENUM ('active', 'suspended', 'banned', 'deleted', 'pending_verification');
CREATE TYPE verification_badge AS ENUM ('none', 'basic', 'premium', 'vip');
CREATE TYPE verification_status AS ENUM ('unverified', 'pending', 'verified', 'rejected');
CREATE TYPE vip_level AS ENUM ('free', 'basic', 'premium', 'vip');
CREATE TYPE vip_plan_status AS ENUM ('active', 'inactive', 'archived');

-- ============================================================
-- SECTION 2: CORE TABLES
-- ============================================================

-- USERS & PROFILES
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name VARCHAR NOT NULL,
  bio VARCHAR,
  avatar_url TEXT,
  cover_photo_url TEXT,
  gender gender,
  birth_date DATE,
  location JSONB,
  interests TEXT[] DEFAULT '{}',
  relationship_intent relationship_intent,
  education_level education_level,
  occupation VARCHAR,
  occupation_status occupation_status,
  height_cm INTEGER,
  languages TEXT[] DEFAULT '{}',
  is_verified BOOLEAN NOT NULL DEFAULT false,
  verification_badge verification_badge NOT NULL DEFAULT 'none',
  role TEXT DEFAULT 'user',
  is_admin BOOLEAN DEFAULT false,
  is_vip BOOLEAN DEFAULT false,
  is_banned BOOLEAN DEFAULT false,
  ban_reason TEXT,
  banned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TABLE profile_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE video_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE match_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  age_range JSONB NOT NULL DEFAULT '{"min": 18, "max": 100}',
  distance_radius INTEGER NOT NULL DEFAULT 100,
  relationship_intent TEXT[] DEFAULT '{}',
  deal_breakers TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PRESENCE
CREATE TABLE presence (
  user_id UUID PRIMARY KEY,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_online BOOLEAN NOT NULL DEFAULT false
);

-- COMMUNITIES
CREATE TABLE communities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR NOT NULL,
  slug VARCHAR NOT NULL UNIQUE,
  type community_type NOT NULL DEFAULT 'country',
  status community_status NOT NULL DEFAULT 'active',
  description TEXT,
  country VARCHAR NOT NULL,
  country_code VARCHAR NOT NULL,
  state VARCHAR,
  city VARCHAR,
  parent_id UUID REFERENCES communities(id) ON DELETE SET NULL,
  member_count INTEGER NOT NULL DEFAULT 0,
  post_count INTEGER NOT NULL DEFAULT 0,
  moderators UUID[] DEFAULT '{}',
  rules TEXT[] DEFAULT '{}',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_private BOOLEAN DEFAULT false,
  cover_url TEXT,
  avatar_url TEXT,
  created_by UUID,
  region_type TEXT DEFAULT 'city',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE community_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role VARCHAR NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_muted BOOLEAN NOT NULL DEFAULT false,
  muted_until TIMESTAMPTZ,
  is_banned BOOLEAN NOT NULL DEFAULT false,
  banned_reason TEXT
);

CREATE TABLE community_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  country TEXT NOT NULL,
  state TEXT,
  city TEXT,
  region_type TEXT DEFAULT 'city',
  is_private BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending',
  requested_by UUID,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE community_creation_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  country TEXT NOT NULL,
  state TEXT,
  city TEXT,
  region_type TEXT DEFAULT 'city',
  is_private BOOLEAN DEFAULT false,
  allow_join_requests BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE community_sponsorships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  sponsor_id UUID NOT NULL,
  amount_paid INTEGER NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- POSTS & COMMENTS
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  type post_type NOT NULL DEFAULT 'discussion',
  content TEXT NOT NULL,
  status post_status NOT NULL DEFAULT 'published',
  images TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  like_count INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  report_count INTEGER NOT NULL DEFAULT 0,
  is_edited BOOLEAN NOT NULL DEFAULT false,
  edited_at TIMESTAMPTZ,
  metadata JSONB,
  is_discover_eligible BOOLEAN DEFAULT false,
  discover_status TEXT,
  discover_submitted_at TIMESTAMPTZ,
  discover_reviewed_at TIMESTAMPTZ,
  discover_reviewed_by UUID,
  discover_rejection_reason TEXT,
  is_hidden BOOLEAN DEFAULT false,
  hidden_at TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE post_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reaction_type VARCHAR NOT NULL DEFAULT 'like',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  root_id UUID,
  content TEXT NOT NULL,
  status comment_status NOT NULL DEFAULT 'published',
  content_type TEXT NOT NULL DEFAULT 'text',
  media_url TEXT,
  media_id UUID,
  metadata JSONB DEFAULT '{}',
  like_count INTEGER NOT NULL DEFAULT 0,
  report_count INTEGER NOT NULL DEFAULT 0,
  is_edited BOOLEAN NOT NULL DEFAULT false,
  edited_at TIMESTAMPTZ,
  is_hidden BOOLEAN DEFAULT false,
  hidden_at TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE comment_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reaction_type VARCHAR NOT NULL DEFAULT 'like',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE comment_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE comment_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL,
  reason TEXT NOT NULL DEFAULT 'inappropriate',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID
);

-- FOLLOWS
CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID NOT NULL,
  following_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

-- ============================================================
-- SECTION 3: MATCHING & DISCOVERY
-- ============================================================

CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user1_id UUID NOT NULL,
  user2_id UUID NOT NULL,
  stage match_stage NOT NULL DEFAULT 'getting_to_know',
  status match_status NOT NULL DEFAULT 'active',
  match_score INTEGER,
  compatibility_answers JSONB,
  user1_interest BOOLEAN NOT NULL DEFAULT false,
  user2_interest BOOLEAN NOT NULL DEFAULT false,
  matched_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE match_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID NOT NULL,
  target_id UUID NOT NULL,
  message TEXT,
  status VARCHAR NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE discover_swipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  swiper_id UUID NOT NULL,
  target_id UUID NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE daily_swipe_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  swipe_date DATE NOT NULL DEFAULT CURRENT_DATE,
  swipe_count INTEGER NOT NULL DEFAULT 0,
  last_swipe_at TIMESTAMPTZ,
  UNIQUE(user_id, swipe_date)
);

CREATE TABLE discover_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  privacy TEXT NOT NULL DEFAULT 'public',
  view_count INTEGER NOT NULL DEFAULT 0,
  like_count INTEGER NOT NULL DEFAULT 0,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SECTION 4: CHAT / MESSAGING
-- ============================================================

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  participant_ids UUID[] NOT NULL,
  status conversation_status NOT NULL DEFAULT 'active',
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  unread_counts JSONB NOT NULL DEFAULT '{}',
  disappearing_enabled BOOLEAN DEFAULT false,
  disappearing_duration_hours INTEGER DEFAULT 24,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE conversation_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  is_muted BOOLEAN NOT NULL DEFAULT false,
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  last_read_at TIMESTAMPTZ
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  type message_type NOT NULL DEFAULT 'text',
  content TEXT NOT NULL,
  status message_status NOT NULL DEFAULT 'sent',
  media_url TEXT,
  reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  client_message_id UUID,
  metadata JSONB,
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  deleted_for_everyone BOOLEAN DEFAULT false,
  deleted_for_users UUID[] DEFAULT ARRAY[]::uuid[],
  is_pinned BOOLEAN DEFAULT false,
  forwarded_from TEXT,
  disappearing BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  deleted_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reaction TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE message_user_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  deleted_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE pinned_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  pinned_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE chat_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  wallpaper_url TEXT,
  wallpaper_color TEXT DEFAULT '#f0f2f5',
  theme TEXT DEFAULT 'light',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE chat_wallpapers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  wallpaper_url TEXT,
  wallpaper_color TEXT DEFAULT '#f0f2f5',
  set_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE disappearing_message_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  enabled BOOLEAN DEFAULT false,
  duration_hours INTEGER DEFAULT 24,
  set_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE call_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id),
  caller_id UUID NOT NULL,
  callee_id UUID NOT NULL,
  call_type TEXT NOT NULL DEFAULT 'voice',
  status TEXT NOT NULL DEFAULT 'calling',
  answered_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  ended_by UUID,
  end_reason TEXT,
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SECTION 5: MODERATION, SAFETY & REPORTS
-- ============================================================

CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL,
  reported_user_id UUID,
  type report_type NOT NULL,
  reason report_reason NOT NULL,
  description TEXT NOT NULL,
  status report_status NOT NULL DEFAULT 'pending',
  severity report_severity NOT NULL DEFAULT 'low',
  target_id UUID NOT NULL,
  target_type TEXT,
  evidence_urls TEXT[] DEFAULT '{}',
  assigned_to UUID,
  resolution TEXT,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  action_taken TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE moderation_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  moderator_id UUID NOT NULL,
  target_type report_type NOT NULL,
  target_id UUID NOT NULL,
  action VARCHAR NOT NULL,
  reason TEXT NOT NULL,
  duration INTEGER,
  report_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE safety_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  risk_category TEXT,
  risk_level TEXT,
  action_taken TEXT,
  review_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE safety_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL,
  user_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  action VARCHAR NOT NULL,
  resource_type VARCHAR NOT NULL,
  resource_id UUID NOT NULL,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_id UUID NOT NULL,
  blocked_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

-- ============================================================
-- SECTION 6: VIP & PAYMENTS
-- ============================================================

CREATE TABLE vip_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR NOT NULL,
  level vip_level NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  currency VARCHAR NOT NULL DEFAULT 'USD',
  price_ngn NUMERIC DEFAULT 0,
  duration_days INTEGER NOT NULL,
  points_included INTEGER NOT NULL DEFAULT 0,
  features TEXT[] DEFAULT '{}',
  status vip_plan_status NOT NULL DEFAULT 'active',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  tier TEXT DEFAULT 'silver',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE vip_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE,
  level vip_level NOT NULL DEFAULT 'free',
  points_balance INTEGER NOT NULL DEFAULT 0,
  total_points_earned INTEGER NOT NULL DEFAULT 0,
  total_points_spent INTEGER NOT NULL DEFAULT 0,
  plan_id UUID,
  plan_expires_at TIMESTAMPTZ,
  community_credits INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE vip_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  type transaction_type NOT NULL,
  amount INTEGER NOT NULL,
  status transaction_status NOT NULL DEFAULT 'pending',
  points_before INTEGER NOT NULL,
  points_after INTEGER NOT NULL,
  description TEXT,
  reference_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  reason TEXT NOT NULL,
  reference_id UUID,
  reference_type TEXT,
  performed_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SECTION 7: GIFTS, STICKERS & GIFS
-- ============================================================

CREATE TABLE gift_catalog (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL,
  animation TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  price_units INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT NOT NULL,
  animation_url TEXT,
  price INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'coins',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE gift_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  gift_id UUID REFERENCES gift_catalog(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE gift_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  gift_id UUID NOT NULL REFERENCES gifts(id),
  post_id UUID,
  comment_id UUID REFERENCES comments(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price INTEGER NOT NULL,
  total_price INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sticker_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE stickers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID NOT NULL REFERENCES sticker_packs(id) ON DELETE CASCADE,
  name TEXT,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  mime_type TEXT NOT NULL DEFAULT 'image/webp',
  width INTEGER,
  height INTEGER,
  is_animated BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE gifs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  title TEXT,
  preview_url TEXT,
  gif_url TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SECTION 8: NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  type notification_type NOT NULL,
  title VARCHAR NOT NULL,
  body TEXT NOT NULL,
  status notification_status NOT NULL DEFAULT 'unread',
  data JSONB,
  action_url TEXT,
  channels TEXT[] DEFAULT '{in_app}',
  read_at TIMESTAMPTZ,
  dedup_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  type notification_type NOT NULL,
  channels TEXT[] DEFAULT '{in_app}',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SECTION 9: SYSTEM
-- ============================================================

CREATE TABLE platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  label TEXT NOT NULL,
  description TEXT,
  updated_by UUID,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SECTION 10: INDEXES
-- ============================================================

CREATE INDEX profiles_user_id_idx ON profiles(user_id);
CREATE INDEX profiles_is_admin_idx ON profiles(is_admin) WHERE is_admin = true;
CREATE INDEX profiles_is_vip_idx ON profiles(is_vip) WHERE is_vip = true;
CREATE INDEX profiles_is_banned_idx ON profiles(is_banned) WHERE is_banned = true;
CREATE INDEX profiles_display_name_idx ON profiles(display_name);
CREATE INDEX profiles_created_at_idx ON profiles(created_at DESC);

CREATE INDEX posts_community_id_idx ON posts(community_id);
CREATE INDEX posts_author_id_idx ON posts(author_id);
CREATE INDEX posts_created_at_idx ON posts(created_at DESC);
CREATE INDEX posts_status_idx ON posts(status);

CREATE INDEX comments_post_id_idx ON comments(post_id);
CREATE INDEX comments_author_id_idx ON comments(author_id);
CREATE INDEX comments_root_id_idx ON comments(root_id);
CREATE INDEX comments_created_at_idx ON comments(created_at DESC);

CREATE INDEX communities_slug_idx ON communities(slug);
CREATE INDEX communities_country_idx ON communities(country);
CREATE INDEX communities_is_active_idx ON communities(is_active);
CREATE INDEX communities_is_private_idx ON communities(is_private) WHERE is_private = true;
CREATE INDEX communities_is_featured_idx ON communities(is_featured) WHERE is_featured = true;

CREATE INDEX matches_user1_idx ON matches(user1_id);
CREATE INDEX matches_user2_idx ON matches(user2_id);
CREATE INDEX matches_stage_idx ON matches(stage);
CREATE INDEX matches_status_idx ON matches(status);

CREATE INDEX match_requests_requester_idx ON match_requests(requester_id);
CREATE INDEX match_requests_target_idx ON match_requests(target_id);
CREATE INDEX match_requests_status_idx ON match_requests(status);

CREATE INDEX messages_conversation_idx ON messages(conversation_id);
CREATE INDEX messages_sender_idx ON messages(sender_id);
CREATE INDEX messages_created_at_idx ON messages(created_at DESC);

CREATE INDEX reports_status_idx ON reports(status);
CREATE INDEX reports_severity_idx ON reports(severity);
CREATE INDEX reports_created_at_idx ON reports(created_at DESC);
CREATE INDEX reports_type_idx ON reports(type);
CREATE INDEX reports_assigned_to_idx ON reports(assigned_to);

CREATE INDEX audit_logs_user_idx ON audit_logs(user_id);
CREATE INDEX audit_logs_action_idx ON audit_logs(action);
CREATE INDEX audit_logs_resource_idx ON audit_logs(resource_type, resource_id);
CREATE INDEX audit_logs_created_at_idx ON audit_logs(created_at DESC);

CREATE INDEX vip_accounts_level_idx ON vip_accounts(level);
CREATE INDEX vip_accounts_expires_idx ON vip_accounts(plan_expires_at);
CREATE INDEX vip_transactions_user_idx ON vip_transactions(user_id);
CREATE INDEX vip_transactions_status_idx ON vip_transactions(status);

CREATE INDEX notifications_user_idx ON notifications(user_id);
CREATE INDEX notifications_status_idx ON notifications(status);
CREATE INDEX notifications_created_at_idx ON notifications(created_at DESC);

CREATE INDEX discover_videos_status_idx ON discover_videos(status);
CREATE INDEX discover_videos_user_idx ON discover_videos(user_id);

CREATE INDEX blocks_blocker_idx ON blocks(blocker_id);
CREATE INDEX blocks_blocked_idx ON blocks(blocked_id);

-- ============================================================
-- SECTION 11: DEFAULT DATA
-- ============================================================

-- Default VIP plans
INSERT INTO vip_plans (name, level, description, price, price_ngn, duration_days, points_included, features, status, is_active, sort_order) VALUES
  ('Basic Monthly', 'basic', 'Basic VIP benefits for 30 days', 5, 2500, 30, 500, ARRAY['Unlimited likes','See who liked you','1 boost per week'], 'active', true, 1),
  ('Premium Monthly', 'premium', 'Premium VIP benefits for 30 days', 10, 5000, 30, 1200, ARRAY['Everything in Basic','Priority matching','5 super likes per week','Advanced filters'], 'active', true, 2),
  ('VIP Monthly', 'vip', 'VIP experience for 30 days', 20, 10000, 30, 3000, ARRAY['Everything in Premium','Profile boost daily','Unlimited super likes','Incognito mode'], 'active', true, 3),
  ('VIP Diamond', 'vip', 'Ultimate VIP membership', 50, 25000, 90, 8000, ARRAY['Everything in VIP','VIP badge','Priority support','Featured profile'], 'active', true, 4)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SECTION 12: ADMIN FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION is_admin_user(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = p_user_id 
    AND (is_admin = true OR role IN ('admin', 'super_admin', 'moderator'))
  );
END;
$$;

CREATE OR REPLACE FUNCTION log_audit_entry(
  p_user_id UUID,
  p_action VARCHAR,
  p_resource_type VARCHAR,
  p_resource_id UUID DEFAULT NULL,
  p_changes JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO audit_logs (user_id, action, resource_type, resource_id, changes, ip_address, user_agent)
  VALUES (p_user_id, p_action, p_resource_type, p_resource_id, p_changes, p_ip_address, p_user_agent)
  RETURNING id INTO v_log_id;
  RETURN v_log_id;
END;
$$;

-- ============================================================
-- END OF SCHEMA
-- ============================================================
-- Notes:
-- 1. Run this in Supabase SQL Editor if rebuilding from scratch
-- 2. RLS policies need to be added separately (see Supabase dashboard)
-- 3. RPC functions are in a separate file (see docs/functions.sql)
-- 4. This is a REFERENCE file — the actual DB is already deployed
-- ============================================================
