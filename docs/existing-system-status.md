# Existing System Status — Phase 1 Inspection

Date: 2026-11-17 (end of session)
Purpose: Phase 1 of the Professional Creator / Advertising roadmap. Read-only inspection. No code changes.

## Phase 1A — Community Video / Modal / Duration

### File inventory (verified against handoff v2, all match)

| File | Lines |
|---|---|
| CommunityVideoModal.tsx | 546 |
| SimilarVideosSection.tsx | 115 |
| ReelCard.tsx | 137 |
| CommunityPostCard.tsx | 333 |
| PostMedia.v2.tsx | 250 |
| VideoPlayerControls.tsx | 268 |
| CommunityVideoModal.module.css | 662 |
| PostMedia.v2.module.css | 315 |

### Mount points

- CommunityVideoModal is mounted in exactly one place: apps/web/src/pages/community/CommunityPage.tsx:398 (import L18)
- SimilarVideosSection is mounted inside CommunityVideoModal at L501, as the last child of the contextPane div

### Duration model — CONFIRMED end-to-end

- DB field: PostMedia.durationSeconds?: number (community.types.ts L21)
- CommunityPost.metadata contains durationMs, videoThumbnails, videoDurations (L45-47)
- Upload: media.service.ts L196-247 reads video.duration, writes durationSeconds
- Post creation: community.service.ts L268-274 builds metadata.videoDurations keyed by URL
- Read-back: community.service.ts L889
- Display: PostMedia.v2.tsx L131-212 shows duration badge, falls back to live video metadata
- 10-minute cap: mediaValidation.ts L20 (MAX_VIDEO_DURATION_SECONDS = 10 * 60), enforced at upload L133, server fallback when duration unreadable L130-132

### Ads insertion points (Phase 6, not built yet)

1. CommunityVideoModal after L501 (SimilarVideosSection) — under Reels cards, inside contextPane div
2. Community feed — via CommunityPostCard sponsored-post injection (separate render path)
3. Video pane (pre-roll / mid-roll / post-roll) — needs a new continuous timeupdate listener; onTimeUpdate prop today only fires on close (L154)
4. atEnd state (L327-346) — "You're all caught up" overlay is a candidate for post-roll ad

### Known Phase 6 concerns

- Video pane tap toggles play/pause (handleVideoPaneTap, L196) — ad clicks need a distinct handler
- VideoPlayerControls has no ad-skip UI today — needs extension
- isMinimized behavior (L236-259) minimizes video on scroll; ads in contextPane participate in that flow automatically (good for visibility)

## Phase 1C — Profile System

### File inventory

| File | Lines |
|---|---|
| ProfilePage.tsx | 2041 |
| profile.service.ts | 302 |
| profile.types.ts | 52 |
| EditProfilePage.tsx | 297 |
| EditProfile.tsx | 78 |
| CommunityManagementPage.tsx | 818 |
| VipPage.tsx | 468 |
| PhotoManagement.tsx | 274 |
| VideoPreviewModal.tsx | 327 |
| AvatarCropper.tsx | 166 |

### Tabs

- ProfilePage.tsx:29 — const [activeTab, setActiveTab] = useState<'posts' | 'videos' | 'about'>('posts');
- Three tabs today. Adding 'studio' = type change + one render branch.
- Tab UI: L1426 (posts), L1433 (videos), L1440 (about)
- Stats modal state: L49 — for Posts / Followers / Following / Connections

### Items to move into Studio (Phase 2)

- My Communities button: ProfilePage.tsx:1354 (className myCommunitiesV2, label L1358)
- Gallery button: L1367
- Favorites button: L1374
- These are inline buttons in the normal profile, not separate pages
- Data for My Communities: CommunityManagementPage.tsx (818 lines)
- Data for Gallery: from posts with images (galleryGridV3 at L1468)
- Data for Favorites: not yet traced — needs lookup when Phase 3 Studio is built

### profiles table shape (Supabase)

Existing columns relevant to professional profile:
- display_name (varchar, NOT NULL)
- username (text, NOT NULL)
- bio (varchar, nullable) — exists, currently used for normal profile bio
- avatar_url (text, nullable)
- cover_photo_url (text, nullable)
- location (jsonb, nullable) + gps_city, gps_state, gps_country
- is_verified (boolean), verification_badge (enum)
- is_vip (boolean), vip_level (enum)
- role, is_admin

Missing columns for professional profile (Phase 2 migration):
- is_professional (boolean)
- professional_since (timestamptz)
- link_in_bio_url (text)
- professional_category (text)
- social_links (jsonb)

### Stats data sources — CONFIRMED

- Followers: count(*) from follows where following_id = X
- Following: count(*) from follows where follower_id = X
- Likes: sum(like_count) from posts where author_id = X (also comments.like_count, discover_videos.like_count)
- No profile_stats cache table exists. Normal profile already computes these; professional profile reuses the same load.

### Tables confirmed NOT to exist

- No profile_stats or stats/count table
- No professional_accounts table

## Phase 1D / 1E — NOT YET INSPECTED

- 1D: VIP / points / credits tables and services (needed for Phase 3 Studio wallet)
- 1E: Existing admin dashboard + full Supabase table inventory + Paystack integration (needed for Phase 4 payment / Phase 5 admin)

Deferred. Phase 2 can proceed without them.

## Working assumptions for Phase 2

- Professional account activation = FREE FLIP of is_professional = true (option (a)). No payment, no approval workflow. Gate monetization features separately in Phase 7.
- The professional profile transformation reuses existing data (display_name, username, bio, avatar, location, verification, stat counts). No new data plumbing beyond the 5 columns.

## Unknowns / open questions

- Where does the Favorites data live (which table/service feeds the Favorites button at ProfilePage L1374)?
- Does the normal profile's stat row already query followers/following counts, and if so where exactly?
- The exact Paystack payment flow for future promotions — deferred to Phase 1E.
- The exact VIP / points schema — deferred to Phase 1D.

---

## UPDATE — End of Phase 2 session (2026-11-17)

Phase 2 (Professional Profile Transformation) is COMPLETE and shipped. HEAD at close: 2adcc80.

### Commits shipped this session
- 320223a — CP7a: DB migration (is_professional, professional_since, link_in_bio_url, professional_category, social_links)
- 8f708f0 — CP7b: ProfileData type + service (activateProfessional, updateProfessionalProfile)
- 047d366 — CP7c: activation card + confirm modal (renders on own profile when !isProfessional)
- 2ebba60 — CP7d-1: ProfileStats.likes (sum of posts.like_count)
- a6dd2cc — CP7d-2: ProfessionalProfileHeader component + CSS (left avatar / right info, Pro Creator pill, Followers/Following/Likes, Edit Profile)
- 32ea7d3 — CP7d-3: wired ProfessionalProfileHeader into ProfilePage (ternary swap of topSectionV2)
- 0c9c06d — CP7f: six marketing shortcuts (Analytics / Promote / Monetization / Link in Bio / Rewards / Creator Tools)
- 9c8172d — CP7g: Professional Dashboard promotional banner
- 7ca7dcb — CP7j: polish (removed debug log, fixed ternary so own professional profile shows neither Edit nor Follow/Message rows, bio 3-line clamp + Read more, mobile breakpoints 420/340px)
- 2adcc80 — CP7k-3: pull info column up, enlarge stat numbers to 24px

### What works end to end
- Non-professional users see the unchanged normal profile
- "Become a Professional Creator" card shows on own profile when !isProfessional
- Click Activate -> confirm modal -> DB write (activateProfessional) -> profile refetches -> header swaps to professional layout
- Persists across hard refresh (is_professional=true in DB, mapping is correct)
- Professional header: left circular avatar with gradient ring + verified badge + Pro Creator crown pill; right info column with display name + verified + @username + location + bio (3-line clamp + Read more) + Link in Bio pill (if set)
- Stats row: Followers / Following / Likes (24px numbers, formatCount 1.2K/1.5M format) + Edit Profile pill (top-aligned to stat values)
- Six marketing shortcut icons in a horizontal scroll row on mobile, 6-column grid on desktop
- Gradient professional dashboard banner with inline SVG chart, "Open Studio ->" button
- No visitor actions (Follow/Message/Get to Know) on own professional profile
- Edit/My Communities/Gallery/Favorites row hidden on professional self-view
- Responsive breakpoints at 420px and 340px scale avatar/pro-badge/stat text/edit pill

### What is NOT built (Phase 3 opening)
- Studio modal (full-screen, 7 tabs: Overview/Content Manager/Promote/Advertisements/Analytics/Monetization/Wallet/Transactions/Link in Bio/Creator Tools/My Gallery & Favorites/My Communities/Settings)
- Feature moves: My Communities (currently at /profile/my-communities), Gallery (currently galleryGridV3 inside posts tab), Favorites (data source not yet traced - see open question in Phase 1C)
- 4th "Studio" tab on the profile (currently tabs are posts / videos / about)
- Shortcuts and banner currently open a "coming soon" toast instead of the modal

### Next session starts here
- CP7h: build ProfessionalStudioDashboard component + full-screen Modal shell with 7 tabs
- CP7i: add 'studio' to ProfilePage activeTab type, add 4th tab button, wire shortcuts + banner + tab to open the modal
- First thing to dump: ProfilePage.tsx around tabsV3 (L~1463 originally, shifted by later patches — use grep for 'tabsV3')
- Also dump: CommunityManagementPage.tsx (818 lines) - this is the current My Communities page to move into Studio
- Favorites data source: not yet traced. Search ProfilePage.tsx for the Favorites button's onClick to find where it navigates or what it queries.

### Known state at session close
- Admin tsc: 24 (baseline)
- Web tsc: 372 (baseline)
- Both builds green
- Tree clean
- origin/main = 2adcc80
