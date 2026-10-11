# Dating App — Complete Database Schema

> Auto-generated from Supabase. Save this file for reference.

## Full Schema Dump

See `docs/supabase-schema.json` for the complete JSON schema.

## Key Tables (58 total)

### Users & Profiles
- `profiles` — User profiles (role, is_admin, is_vip, is_banned, verification)
- `profile_photos` — User gallery photos
- `video_profiles` — Video introductions
- `match_preferences` — User match filters
- `push_subscriptions` — Web push notifications

### Social & Content
- `posts` — Community posts (with discover fields)
- `post_reactions`, `comments`, `comment_reactions`, `comment_mentions`, `comment_reports`
- `communities`, `community_members`, `community_requests`, `community_creation_requests`, `community_sponsorships`
- `follows`

### Matching & Discovery
- `matches` — Active matches (stage: getting_to_know → matched)
- `match_requests` — Connection requests (pending/accepted/declined/cancelled)
- `discover_swipes`, `daily_swipe_tracking`
- `discover_videos` — Short video feed

### Chat
- `conversations`, `conversation_participants`, `messages`
- `message_reactions`, `message_user_states`, `pinned_messages`
- `chat_preferences`, `chat_wallpapers`, `disappearing_message_settings`
- `call_sessions`

### Moderation & Safety
- `reports`, `moderation_actions`, `safety_events`, `safety_audit_log`, `audit_logs`, `blocks`

### VIP & Payments
- `vip_plans`, `vip_accounts`, `vip_transactions`, `point_transactions`

### Media & Gifts
- `gift_catalog`, `gift_transactions`, `gifts`, `gift_events`
- `stickers`, `sticker_packs`, `gifs`

### System
- `notifications`, `notification_preferences`
- `platform_settings`
- `presence`

## Row Counts (Current Data)
- messages: 61
- comments: 26
- notifications: 25
- call_sessions: 23
- platform_settings: 19
- posts: 10
- message_reactions: 9
- discover_videos: 8
- gift_catalog: 7
- post_reactions: 7
- comment_reactions: 6
- communities: 5, gifts: 5
- profiles: 3, vip_accounts: 3, profile_photos: 3
- matches: 2, match_requests: 2, conversations: 2
- Many tables empty (ready for use)

## Admin Users
- user_id: `324113e7-7485-473c-ae6d-7fc507435ab6` (role: super_admin)

## Test Users
- briannamorrisonsr@gmail.com / `Jesus556@#`
- test.user@datingapp.com / `Test@123456`

## Supabase
- URL: https://bngrqxtxppuhtrtqmlli.supabase.co
- Admin panel: http://localhost:3002
- Web app: http://localhost:3000
