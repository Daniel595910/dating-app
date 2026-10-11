# Dating App — Database Reference

Complete schema and functions for the StealGat dating app.

## Files

- **`complete-schema.sql`** — All 58 tables, 29 enums, indexes, default data
- **`complete-functions.sql`** — All 60+ RPC functions
- **`supabase-schema.json`** — Machine-readable schema dump

## Quick Reference

### Tables by Category

**Users & Profiles (5)**
- `profiles`, `profile_photos`, `video_profiles`, `match_preferences`, `push_subscriptions`

**Communities (5)**
- `communities`, `community_members`, `community_requests`, `community_creation_requests`, `community_sponsorships`

**Posts & Comments (7)**
- `posts`, `post_reactions`, `comments`, `comment_reactions`, `comment_mentions`, `comment_reports`, `follows`

**Matching & Discovery (5)**
- `matches`, `match_requests`, `discover_swipes`, `daily_swipe_tracking`, `discover_videos`

**Chat (11)**
- `conversations`, `conversation_participants`, `messages`, `message_reactions`, `message_user_states`, `pinned_messages`, `chat_preferences`, `chat_wallpapers`, `disappearing_message_settings`, `call_sessions`, `presence`

**Moderation & Safety (6)**
- `reports`, `moderation_actions`, `safety_events`, `safety_audit_log`, `audit_logs`, `blocks`

**VIP & Payments (4)**
- `vip_plans`, `vip_accounts`, `vip_transactions`, `point_transactions`

**Gifts, Stickers, GIFs (7)**
- `gift_catalog`, `gifts`, `gift_events`, `gift_transactions`, `sticker_packs`, `stickers`, `gifs`

**Notifications (3)**
- `notifications`, `notification_preferences`, `push_subscriptions`

**System (1)**
- `platform_settings`

### Enums (29)

- `user_role`, `user_status`, `gender`, `relationship_intent`, `education_level`, `occupation_status`, `verification_badge`, `verification_status`
- `post_type`, `post_status`, `comment_status`, `reaction_type`
- `community_type`, `community_status`
- `match_stage`, `match_status`
- `message_type`, `message_status`
- `notification_type`, `notification_status`
- `report_type`, `report_status`, `report_severity`, `report_reason`
- `transaction_type`, `transaction_status`
- `vip_level`, `vip_plan_status`

### Key RPC Functions

**Admin:**
- `is_admin_user(user_id)` — Check if user is admin
- `grant_admin_role(user_id, role)` — Promote to admin
- `log_audit_entry(...)` — Log admin action

**Chat:**
- `send_chat_message(...)` — Send a message
- `edit_chat_message(...)` — Edit message
- `delete_message_for_everyone(...)` — Delete for all
- `add_message_reaction(...)` — Add reaction
- `pin_chat_message(...)` — Pin message
- `set_chat_wallpaper(...)` — Set wallpaper
- `set_disappearing_messages(...)` — Toggle disappearing
- `mark_conversation_read(...)` — Mark as read

**Matching:**
- `send_connection_request(target_id, message)` — Send request
- `accept_connection_request(request_id)` — Accept
- `decline_connection_request(request_id)` — Decline
- `cancel_connection_request(request_id)` — Cancel
- `get_or_create_conversation(match_id)` — Get/create chat

**Discovery:**
- `discover_swipe(target_id, action)` — Swipe on user
- `submit_discover_video(url, caption, thumbnail)` — Submit video
- `track_video_view(video_id)` — Track view

**Presence:**
- `update_presence(is_online)` — Update online status
- `format_last_seen(timestamp)` — Format last seen

**Search:**
- `search_people(query, current_user_id, limit)`
- `search_communities(query, limit)`
- `get_nearby_posts(...)`

**Calls:**
- `start_voice_call(target_user_id)` — Start call
- `end_voice_call(call_id, reason)` — End call
- `update_call_status(call_id, status)` — Update status

**Safety:**
- `block_user(user_id)` — Block user
- `unblock_user(user_id)` — Unblock

**Communities:**
- `request_community_creation(...)` — Submit request
- `assign_user_to_community(user_id, community_id)` — Add to community

### Admin Credentials

- **User ID:** `324113e7-7485-473c-ae6d-7fc507435ab6`
- **Role:** `super_admin`

### Test Users

- **Brianna:** briannamorrisonsr@gmail.com / `Jesus556@#`
- **Test:** test.user@datingapp.com / `Test@123456`

## Setup

If rebuilding the database from scratch:

1. Create Supabase project
2. Run `complete-schema.sql` in SQL Editor (creates all tables)
3. Run `complete-functions.sql` (adds all RPC functions)
4. Add RLS policies (see Supabase dashboard)
5. Insert default VIP plans (included in schema.sql)

## Admin Panel

- URL: http://localhost:3002
- Framework: React + Vite + TypeScript
- Supabase URL: https://bngrqxtxppuhtrtqmlli.supabase.co

## Web App

- URL: http://localhost:3000
- Framework: React + Vite + TypeScript (PWA)
- Supabase URL: https://bngrqxtxppuhtrtqmlli.supabase.co
