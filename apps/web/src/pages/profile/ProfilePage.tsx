import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/config/supabase.client';
import { profileService } from '../../features/profile/services/profile.service';
import { ProfileData, ProfileStats, UserPost } from '../../features/profile/types/profile.types';
import { PhotoViewer } from '../../features/profile/components/PhotoViewer';
import { PhotoManagement } from '../../features/profile/components/PhotoManagement';
import { CommunityCreationSheet } from '../../features/community/components/CommunityCreationSheet';
import { ReportSheet } from '../../features/community/components/ReportSheet';
import { BlockConfirmSheet } from '../../features/community/components/BlockConfirmSheet';
import { ArrowLeft, Settings, BadgeCheck, MapPin, Heart, Grid, Menu, UserPlus, Check, Camera, MoreVertical, X, Star, MessageCircle, Crown, Users, Ban, Flag, Share2, Video, Eye, Play, Volume2, VolumeX, Trash2 } from 'lucide-react';
import styles from './ProfilePage.module.css';

export const ProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<ProfileStats>({ posts: 0, followers: 0, following: 0, connections: 0 });
  const [userPosts, setUserPosts] = useState<UserPost[]>([]);
  const [profilePhotos, setProfilePhotos] = useState<Array<{ id: string; url: string; order: number; isPrimary: boolean }>>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'videos' | 'about'>('posts');
  const [photoViewerIndex, setPhotoViewerIndex] = useState<number | null>(null);
  const [photoManagementOpen, setPhotoManagementOpen] = useState(false);
  const [communityCreationOpen, setCommunityCreationOpen] = useState(false);
  const [vipData, setVipData] = useState<{ level: string; credits: number; points: number; planExpiresAt: string | null }>({
    level: 'free',
    credits: 0,
    points: 0,
    planExpiresAt: null,
  });
  const [statsModal, setStatsModal] = useState<'posts' | 'followers' | 'following' | 'connections' | null>(null);
  const [followersList, setFollowersList] = useState<Array<{ userId: string; name: string; avatarUrl: string | null }>>([]);
  const [followingList, setFollowingList] = useState<Array<{ userId: string; name: string; avatarUrl: string | null }>>([]);
  const [connectionsList, setConnectionsList] = useState<Array<{ userId: string; name: string; avatarUrl: string | null }>>([]);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [reportSheetOpen, setReportSheetOpen] = useState(false);
  const [blockSheetOpen, setBlockSheetOpen] = useState(false);
  const [shareProfileOpen, setShareProfileOpen] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [hasShared, setHasShared] = useState(false);
  const [showUnshareConfirm, setShowUnshareConfirm] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [discoverVideos, setDiscoverVideos] = useState<any[]>([]);
  const [videoMenuOpen, setVideoMenuOpen] = useState<string | null>(null);
  const [postMenuOpen, setPostMenuOpen] = useState<string | null>(null);
  const [previewDiscoverVideo, setPreviewDiscoverVideo] = useState<any>(null);
  const [videoPrivacy, setVideoPrivacy] = useState<'public' | 'friends' | 'private'>('public');
  const [previewMuted, setPreviewMuted] = useState(true);
  const previewVideoElementRef = useRef<HTMLVideoElement>(null);

  const handleShareProfile = async () => {
    if (!user || !profile) return;
    if (hasShared) {
      setShowUnshareConfirm(true);
      return;
    }
    setShareLoading(true);
    try {
        // Share profile
        const { data: membership } = await supabase
          .from('community_members')
          .select('community_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!membership) return;

        const { error: insertError } = await supabase.from('posts').insert({
          community_id: membership.community_id,
          author_id: user.id,
          type: 'profile_share',
          content: profile.bio || 'Check out my profile!',
          status: 'published',
          images: profile.avatarUrl ? [profile.avatarUrl] : [],
          metadata: {
            profileShare: true,
            displayName: profile.displayName,
            age: profile.age || null,
            location: profile.location ? [profile.location.city, profile.location.state].filter(Boolean).join(', ') : null,
            interests: profile.interests || [],
            relationshipIntent: profile.relationship_intent || null,
          },
        });

        if (insertError) throw insertError;
        setHasShared(true);
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 4000);
    } catch (err) {
      console.error('Share/Unshare failed:', err);
    } finally {
      setShareLoading(false);
    }
  };

  const isOwnProfile = !userId || userId === 'undefined' || userId === user?.id;
  const targetUserId = userId || user?.id || '';

  useEffect(() => {
    const loadProfile = async () => {
      if (!targetUserId || targetUserId === 'undefined') return;
      setLoading(true);

      try {
        const profileData = await profileService.getProfileByUserId(targetUserId || '');
        const profileStats = await profileService.getProfileStats(targetUserId || '');
        const posts = await profileService.getUserPosts(targetUserId || '');
        const photos = await profileService.getProfilePhotos(targetUserId || '');

        setProfile(profileData);
        setStats(profileStats);
        setUserPosts(posts);
        setProfilePhotos(photos);

        if (user) {
          if (targetUserId === user.id) {
            // Check if already shared profile
            const { data: existingShare } = await supabase
              .from('posts')
              .select('id')
              .eq('author_id', user.id)
              .eq('type', 'profile_share')
              .eq('status', 'published')
              .maybeSingle();
            setHasShared(Boolean(existingShare));
          }
          if (targetUserId !== user.id) {
            const following = await profileService.isFollowing(user.id, targetUserId);
            setIsFollowing(following);
          } else {
            const { data: vipAccount } = await supabase
              .from('vip_accounts')
              .select('level, community_credits, points_balance, plan_expires_at')
              .eq('user_id', user.id)
              .maybeSingle();
            if (vipAccount) {
              setVipData({
                level: vipAccount.level,
                credits: vipAccount.community_credits || 0,
                points: vipAccount.points_balance || 0,
                planExpiresAt: vipAccount.plan_expires_at || null,
              });
            }
          }
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      }

      setLoading(false);
    };

    loadProfile();
  }, [targetUserId, user, isOwnProfile]);

  const loadDiscoverVideos = async () => {
    if (!targetUserId || targetUserId === 'undefined') return;
    const { data, error } = await supabase
      .from('discover_videos')
      .select('*')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Failed to load videos:', error);
      return;
    }
    
    setDiscoverVideos(data || []);
  };

  const handleDeleteVideo = async (videoId: string) => {
    await supabase.from('discover_videos').delete().eq('id', videoId).eq('user_id', targetUserId);
    await loadDiscoverVideos();
    setVideoMenuOpen(null);
  };

  const handleUpdateVideoPrivacy = async (videoId: string, privacy: string) => {
    await supabase
      .from('discover_videos')
      .update({ privacy: privacy })
      .eq('id', videoId)
      .eq('user_id', targetUserId);
    await loadDiscoverVideos();
  };

  const handleDeletePost = async (postId: string) => {
    await supabase.from('posts').delete().eq('id', postId).eq('author_id', targetUserId);
    const updatedPosts = await profileService.getUserPosts(targetUserId);
    setUserPosts(updatedPosts);
    setPostMenuOpen(null);
  };

  const handleToggleVideoVisibility = async (videoId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'removed' ? 'pending' : 'removed';
    await supabase.from('discover_videos').update({ status: newStatus }).eq('id', videoId).eq('user_id', targetUserId);
    await loadDiscoverVideos();
    setVideoMenuOpen(null);
  };

  const loadStatsLists = async (type: 'followers' | 'following' | 'connections') => {
    if (!targetUserId || targetUserId === 'undefined') return;

    try {
      if (type === 'followers') {
        const { data: followers } = await supabase
          .from('follows')
          .select('follower_id')
          .eq('following_id', targetUserId)
          .limit(20);

        if (followers && followers.length > 0) {
          const followerIds = followers.map((f: any) => f.follower_id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, display_name, avatar_url')
            .in('user_id', followerIds);
          setFollowersList((profiles || []).map((p: any) => ({
            userId: p.user_id,
            name: p.display_name || 'User',
            avatarUrl: p.avatar_url,
          })));
        } else {
          setFollowersList([]);
        }
      }

      if (type === 'following') {
        const { data: following } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', targetUserId)
          .limit(20);

        if (following && following.length > 0) {
          const followingIds = following.map((f: any) => f.following_id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, display_name, avatar_url')
            .in('user_id', followingIds);
          setFollowingList((profiles || []).map((p: any) => ({
            userId: p.user_id,
            name: p.display_name || 'User',
            avatarUrl: p.avatar_url,
          })));
        } else {
          setFollowingList([]);
        }
      }

      if (type === 'connections') {
        const { data: matches } = await supabase
          .from('matches')
          .select('user1_id, user2_id')
          .or('user1_id.eq.' + targetUserId + ',user2_id.eq.' + targetUserId)
          .in('status', ['active', 'completed'])
          .limit(20);

        if (matches && matches.length > 0) {
          const otherUserIds = matches.map((m: any) =>
            m.user1_id === targetUserId ? m.user2_id : m.user1_id
          );
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, display_name, avatar_url')
            .in('user_id', otherUserIds);
          setConnectionsList((profiles || []).map((p: any) => ({
            userId: p.user_id,
            name: p.display_name || 'User',
            avatarUrl: p.avatar_url,
          })));
        } else {
          setConnectionsList([]);
        }
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const handleFollow = async () => {
    if (!user) return;
    try {
      if (isFollowing) {
        await profileService.unfollowUser(user.id, targetUserId);
        setIsFollowing(false);
      } else {
        await profileService.followUser(user.id, targetUserId);
        setIsFollowing(true);
      }
    } catch (err) {
      console.error('Follow error:', err);
    }
  };

  const handleMessage = async () => {
    if (!user) return;

    try {
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .contains('participant_ids', [user.id, targetUserId])
        .limit(1)
        .maybeSingle();

      if (existingConv) {
        navigate('/chats/' + existingConv.id);
        return;
      }

      const { data: match } = await supabase
        .from('matches')
        .select('id')
        .or('user1_id.eq.' + user.id + ',user2_id.eq.' + user.id)
        .or('user1_id.eq.' + targetUserId + ',user2_id.eq.' + targetUserId)
        .limit(1)
        .maybeSingle();

      if (match) {
        const { data: convId, error: rpcError } = await supabase.rpc('get_or_create_conversation', {
          p_match_id: match.id,
        });
        if (rpcError) throw rpcError;
        if (convId) {
          navigate('/chats/' + convId);
        }
      } else {
        alert('You need to match with this user before messaging them.');
      }
    } catch (err) {
      console.error('Failed to open conversation:', err);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner} />
        <p>Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className={styles.errorContainer}>
        <p>Profile not found</p>
        <button className={styles.errorButton} onClick={() => navigate('/community')}>
          Go to Community
        </button>
      </div>
    );
  }

  const postImages = userPosts.flatMap((post) => post.images);

  return (
    <div className={styles.profilePage}>
      <PhotoViewer
        photos={postImages}
        currentIndex={photoViewerIndex}
        onClose={() => setPhotoViewerIndex(null)}
        onNext={() => setPhotoViewerIndex((prev) => prev === null ? null : Math.min(prev + 1, postImages.length - 1))}
        onPrev={() => setPhotoViewerIndex((prev) => prev === null ? null : Math.max(prev - 1, 0))}
      />

      <ReportSheet
        open={reportSheetOpen}
        onClose={() => setReportSheetOpen(false)}
        reporterId={user?.id || ''}
        targetType="user"
        targetId={targetUserId}
        reportedUserId={targetUserId}
      />

      <BlockConfirmSheet
        open={blockSheetOpen}
        onClose={() => setBlockSheetOpen(false)}
        blockerId={user?.id || ''}
        targetUserId={targetUserId}
        targetUserName={profile.displayName}
        onBlocked={() => navigate('/community')}
      />

      <CommunityCreationSheet
        open={communityCreationOpen}
        onClose={() => setCommunityCreationOpen(false)}
        userId={user?.id || ''}
        vipLevel={vipData.level}
        credits={vipData.credits}
        onSuccess={() => {}}
      />

      <PhotoManagement
        open={photoManagementOpen}
        onClose={() => setPhotoManagementOpen(false)}
        userId={user?.id || ''}
        photos={profilePhotos}
        onPhotosChanged={async () => {
          if (user) {
            const photos = await profileService.getProfilePhotos(user.id);
            setProfilePhotos(photos);
            const profileData = await profileService.getProfileByUserId(user.id);
            setProfile(profileData);
          }
        }}
      />

      {statsModal && (
        <div className={styles.statsModalOverlay} onClick={() => setStatsModal(null)}>
          <div className={styles.statsModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.statsModalHeader}>
              <h3 className={styles.statsModalTitle}>
                {statsModal === 'posts' ? 'Posts' : statsModal === 'followers' ? 'Followers' : statsModal === 'following' ? 'Following' : 'Connections'}
              </h3>
              <button className={styles.statsModalClose} onClick={() => setStatsModal(null)} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <div className={styles.statsModalContent}>
              {statsModal === 'posts' ? (
                userPosts.length > 0 ? (
                  userPosts.map((post) => (
                    <div key={post.id} className={styles.statsModalItem}>
                      <p className={styles.statsModalItemText}>
                        {post.content.length > 80 ? post.content.substring(0, 80) + '...' : post.content}
                      </p>
                      <span className={styles.statsModalItemMeta}>
                        {new Date(post.createdAt).toLocaleDateString()} • {post.likeCount} likes • {post.commentCount} comments
                      </span>
                    </div>
                  ))
                ) : (
                  <p className={styles.statsModalEmpty}>No posts yet</p>
                )
              ) : statsModal === 'followers' ? (
                followersList.length > 0 ? (
                  followersList.map((follower) => (
                    <button key={follower.userId} className={styles.statsModalUser} onClick={() => { setStatsModal(null); navigate('/profile/' + follower.userId); }}>
                      <div className={styles.statsModalAvatar}>
                        {follower.avatarUrl ? <img src={follower.avatarUrl} alt={follower.name} /> : follower.name.charAt(0).toUpperCase()}
                      </div>
                      <span className={styles.statsModalName}>{follower.name}</span>
                    </button>
                  ))
                ) : (
                  <p className={styles.statsModalEmpty}>No followers yet</p>
                )
              ) : statsModal === 'following' ? (
                followingList.length > 0 ? (
                  followingList.map((following) => (
                    <button key={following.userId} className={styles.statsModalUser} onClick={() => { setStatsModal(null); navigate('/profile/' + following.userId); }}>
                      <div className={styles.statsModalAvatar}>
                        {following.avatarUrl ? <img src={following.avatarUrl} alt={following.name} /> : following.name.charAt(0).toUpperCase()}
                      </div>
                      <span className={styles.statsModalName}>{following.name}</span>
                    </button>
                  ))
                ) : (
                  <p className={styles.statsModalEmpty}>Not following anyone yet</p>
                )
              ) : (
                connectionsList.length > 0 ? (
                  connectionsList.map((connection) => (
                    <button key={connection.userId} className={styles.statsModalUser} onClick={() => { setStatsModal(null); navigate('/profile/' + connection.userId); }}>
                      <div className={styles.statsModalAvatar}>
                        {connection.avatarUrl ? <img src={connection.avatarUrl} alt={connection.name} /> : connection.name.charAt(0).toUpperCase()}
                      </div>
                      <span className={styles.statsModalName}>{connection.name}</span>
                    </button>
                  ))
                ) : (
                  <p className={styles.statsModalEmpty}>No connections yet</p>
                )
              )}
            </div>
          </div>
        </div>
      )}

      <header className={styles.header}>
        <button className={styles.headerButton} onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <span className={styles.headerTitle}>{profile.displayName}</span>
        {isOwnProfile ? (
            <button className={styles.headerButton} onClick={() => navigate('/settings')} aria-label="Settings">
              <Settings size={22} />
            </button>
        ) : (
          <div style={{ position: 'relative' }}>
            <button
              className={styles.headerButton}
              onClick={() => setShowMoreMenu((prev) => !prev)}
              aria-label="More options"
            >
              <MoreVertical size={22} />
            </button>

            {showMoreMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  right: 0,
                  zIndex: 9999,
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                  border: '1px solid #e5e7eb',
                  minWidth: 200,
                  padding: '6px',
                }}
              >
                <button
                  onClick={() => { setShowMoreMenu(false); setBlockSheetOpen(true); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#374151', fontSize: '14px', borderRadius: '8px', textAlign: 'left' }}
                >
                  <Ban size={16} />
                  Block User
                </button>
                <button
                  onClick={() => { setShowMoreMenu(false); setReportSheetOpen(true); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '14px', borderRadius: '8px', textAlign: 'left' }}
                >
                  <Flag size={16} />
                  Report User
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      <div className={styles.hero}>
        <div className={styles.avatarContainer}>
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt={profile.displayName} className={styles.avatar} />
          ) : (
            <div className={styles.avatarFallback}>{profile.displayName.charAt(0).toUpperCase()}</div>
          )}
          {profile.isVerified && <BadgeCheck size={20} className={styles.verifiedBadge} />}
        </div>

        <div className={styles.statsRow}>
          <button className={styles.statButton} onClick={() => setStatsModal('posts')}>
            <span className={styles.statValue}>{stats.posts}</span>
            <span className={styles.statLabel}>Posts</span>
          </button>
          <button className={styles.statButton} onClick={() => { setStatsModal('followers'); loadStatsLists('followers'); }}>
            <span className={styles.statValue}>{stats.followers}</span>
            <span className={styles.statLabel}>Followers</span>
          </button>
          <button className={styles.statButton} onClick={() => { setStatsModal('following'); loadStatsLists('following'); }}>
            <span className={styles.statValue}>{stats.following}</span>
            <span className={styles.statLabel}>Following</span>
          </button>
          <button className={styles.statButton} onClick={() => { setStatsModal('connections'); loadStatsLists('connections'); }}>
            <span className={styles.statValue}>{stats.connections}</span>
            <span className={styles.statLabel}>Connections</span>
          </button>
        </div>

        <div className={styles.nameSection}>
          <h1 className={styles.displayName}>{profile.displayName}</h1>
          {profile.location && (
            <div className={styles.locationRow}>
              <MapPin size={14} />
              <span>
                {[profile.location.city, profile.location.state, profile.location.country]
                  .filter(Boolean)
                  .join(', ')}
              </span>
            </div>
          )}
        </div>

        {profile.bio && <p className={styles.bio}>{profile.bio}</p>}

        {isOwnProfile && vipData.level !== 'free' && (
          <button className={styles.vipBadge} onClick={() => navigate('/profile/vip')}>
            <Crown size={14} />
            <span>{vipData.level.toUpperCase()} Member</span>
            <span className={styles.creditsBadge}>{vipData.credits} credits</span>
          </button>
        )}

        {isOwnProfile ? (
          <div className={styles.actionRow}>
            <button className={styles.primaryAction} onClick={handleShareProfile}
              disabled={shareLoading}
              style={{
                cursor: shareLoading ? 'wait' : 'pointer',
                background: hasShared ? '#d1fae5' : '#fef2f2',
                color: hasShared ? '#10b981' : '#ef4444',
              }}>
              <Share2 size={18} />
              {shareLoading ? '...' : hasShared ? '' : ''}
            </button>
            <button className={styles.primaryAction} onClick={() => navigate('/profile/edit')}>
              Edit Profile
            </button>
            <button className={styles.secondaryAction} onClick={() => setPhotoManagementOpen(true)} aria-label="Manage Photos">
              <Camera size={18} />
            </button>
            <button className={styles.secondaryAction} onClick={() => navigate('/profile/preferences')} aria-label="Dating Preferences">
              <Heart size={18} />
            </button>
            <button className={styles.secondaryAction} onClick={() => navigate('/profile/vip')} aria-label="VIP and Credits">
              <Star size={18} />
            </button>
          </div>
        ) : (
          <div className={styles.actionRow}>
            <button className={styles.primaryAction} onClick={handleMessage}>
              <MessageCircle size={18} />
              Message
            </button>
            <button className={styles.secondaryAction} onClick={handleFollow}>
              {isFollowing ? <Check size={18} /> : <UserPlus size={18} />}
              {isFollowing ? 'Following' : 'Follow'}
            </button>
          </div>
        )}

        {isOwnProfile && (
          <button className={styles.createCommunityButton} onClick={() => navigate('/profile/my-communities')} style={{ background: 'none', border: '1px solid #e5e7eb', color: '#111827' }}>
            <Users size={16} />
            My Communities
          </button>
        )}

        {isOwnProfile && (
          <button className={styles.createCommunityButton} onClick={() => setCommunityCreationOpen(true)}>
            <Crown size={16} />
            Create Community
            <span className={styles.createCommunityCost}>100 credits</span>
          </button>
        )}
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'posts' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('posts')}
        >
          <Grid size={18} />
          Posts
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'videos' ? styles.tabActive : ''}`}
          onClick={() => { setActiveTab('videos'); loadDiscoverVideos(); }}
        >
          <Video size={18} />
          Videos
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'about' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('about')}
        >
          <Menu size={18} />
          About
        </button>
      </div>

      {activeTab === 'posts' ? (
        <div className={styles.galleryGrid}>
          {userPosts.length > 0 ? (
            userPosts.map((post, postIndex) => (
              post.images.map((image, imageIndex) => {
                const globalIndex = postIndex * 10 + imageIndex;
                return (
                  <div
                    key={`${post.id}-${imageIndex}`}
                    className={styles.galleryItem}
                    onClick={() => setPhotoViewerIndex(globalIndex)}
                  >
                    <img src={image} alt="" loading="lazy" className={styles.galleryImage} />
                    <div className={styles.galleryOverlay}>
                      <Heart size={14} />
                    </div>
                    
                    {isOwnProfile && (
                      <>
                        <button 
                          className={styles.galleryMenuButton}
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setPostMenuOpen(postMenuOpen === post.id ? null : post.id); 
                          }}
                        >
                          <MoreVertical size={14} />
                        </button>
                        
                        {postMenuOpen === post.id && (
                          <div className={styles.galleryDropdownMenu} onClick={(e) => e.stopPropagation()}>
                            <button 
                              className={styles.deletePostButton}
                              onClick={() => handleDeletePost(post.id)}
                            >
                              <Trash2 size={14} /> Delete Post
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })
            ))
          ) : (
            <div className={styles.emptyPosts}>
              <Camera size={32} />
              <p>No photos yet</p>
              <p className={styles.emptySubtext}>Photos from community posts will appear here</p>
            </div>
          )}
        </div>
      ) : activeTab === 'videos' ? (
        <div className={styles.videosSection}>
          {discoverVideos.length === 0 ? (
            <div className={styles.emptyPosts}>
              <Video size={32} />
              <p>No videos yet</p>
              <p className={styles.emptySubtext}>Upload videos from the Discover page</p>
            </div>
          ) : (
            <div className={styles.videosGrid}>
              {discoverVideos.map((video) => (
                <div key={video.id} className={styles.videoCard} onClick={() => setPreviewDiscoverVideo(video)}>
                  <video src={video.video_url} muted playsInline className={styles.videoThumbnail} />
                  <div className={styles.videoStats}>
                    <span><Heart size={10} /> {video.like_count || 0}</span>
                    <span><Eye size={10} /> {video.view_count || 0}</span>
                  </div>
                  <div className={styles.videoStatus}>
                    {video.status === 'approved' && <span className={styles.statusApproved}>Approved</span>}
                    {video.status === 'pending' && <span className={styles.statusPending}>Pending</span>}
                    {video.status === 'removed' && <span className={styles.statusRemoved}>Hidden</span>}
                  </div>
                  {isOwnProfile && (
                    <button 
                      className={styles.videoMenuButton} 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setVideoMenuOpen(videoMenuOpen === video.id ? null : video.id); 
                      }}
                    >
                      <MoreVertical size={16} />
                    </button>
                  )}
                  {videoMenuOpen === video.id && (
                    <div className={styles.videoDropdownMenu} onClick={(e) => e.stopPropagation()}>
                      <button onClick={(e) => { e.stopPropagation(); handleToggleVideoVisibility(video.id, video.status); }}>
                        {video.status === 'removed' ? 'Show in Discover' : 'Hide from Discover'}
                      </button>
                      <button className={styles.deleteVideoButton} onClick={(e) => { e.stopPropagation(); handleDeleteVideo(video.id); }}>
                        Delete Video
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className={styles.aboutSection}>
          <h3 className={styles.aboutTitle}>About</h3>
          <p className={styles.aboutText}>{profile.bio || 'No bio yet'}</p>

          {profile.interests.length > 0 && (
            <div className={styles.aboutBlock}>
              <h4 className={styles.aboutLabel}>Interests</h4>
              <div className={styles.interestTags}>
                {profile.interests.map((interest, index) => (
                  <span key={index} className={styles.interestTag}>{interest}</span>
                ))}
              </div>
            </div>
          )}

          {profile.relationshipIntent && (
            <div className={styles.aboutBlock}>
              <h4 className={styles.aboutLabel}>Looking For</h4>
              <p className={styles.aboutText}>{profile.relationshipIntent.replace(/_/g, ' ')}</p>
            </div>
          )}

          {profile.occupation && (
            <div className={styles.aboutBlock}>
              <h4 className={styles.aboutLabel}>Occupation</h4>
              <p className={styles.aboutText}>{profile.occupation}</p>
            </div>
          )}

          {profile.languages.length > 0 && (
            <div className={styles.aboutBlock}>
              <h4 className={styles.aboutLabel}>Languages</h4>
              <p className={styles.aboutText}>{profile.languages.join(', ')}</p>
            </div>
          )}
        </div>
      )}
    {shareSuccess && (
        <div className={styles.shareSuccessToast}>
          <div className={styles.shareSuccessIcon}>
            <Check size={20} />
          </div>
          <div className={styles.shareSuccessContent}>
            <p className={styles.shareSuccessTitle}>Profile Shared!</p>
            <p className={styles.shareSuccessText}>Your profile is now in the community Profiles tab.</p>
          </div>
          <button 
            onClick={() => navigate('/community?filter=profiles')}
            className={styles.shareSuccessButton}
          >
            View
          </button>
        </div>
      )}
    {showUnshareConfirm && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setShowUnshareConfirm(false)}>
          <div style={{ backgroundColor: '#fff', borderRadius: 20, padding: '28px 24px', maxWidth: 360, width: '100%', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', backgroundColor: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <Share2 size={24} style={{ color: '#ef4444' }} />
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 8px', color: '#111827' }}>Remove Profile Share?</h3>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 20px', lineHeight: 1.5 }}>
              Your profile will be removed from the Profiles tab in your community. You can share it again anytime.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button 
                onClick={async () => {
                  setShowUnshareConfirm(false);
                  setShareLoading(true);
                  try {
                    const { error: deleteError } = await supabase
                      .from('posts')
                      .delete()
                      .eq('author_id', user?.id)
                      .eq('type', 'profile_share');
                    if (deleteError) throw deleteError;
                    setHasShared(false);
                  } catch (err) {
                    console.error('Unshare failed:', err);
                  } finally {
                    setShareLoading(false);
                  }
                }}
                style={{ flex: 1, padding: 12, backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: 9999, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
              >
                Remove
              </button>
              <button 
                onClick={() => setShowUnshareConfirm(false)}
                style={{ flex: 1, padding: 12, background: 'none', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: 9999, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}
              >
                Keep
              </button>
            </div>
          </div>
        </div>
      )}
    {previewDiscoverVideo && (
        <div className={styles.videoPreviewOverlay} onClick={() => setPreviewDiscoverVideo(null)}>
          <div className={styles.videoPreviewModal} onClick={(e) => e.stopPropagation()}>
            {/* Close button */}
            <button className={styles.videoPreviewClose} onClick={() => setPreviewDiscoverVideo(null)}>
              <X size={20} />
            </button>

            {/* Video */}
            <video 
              ref={previewVideoElementRef}
              src={previewDiscoverVideo.video_url} 
              autoPlay 
              loop
              muted={previewMuted}
              playsInline 
              className={styles.videoPreviewPlayer}
              onClick={(e) => {
                const video = e.currentTarget;
                if (video.paused) video.play();
                else video.pause();
              }}
            />

            {/* Volume toggle */}
            <button 
              className={styles.videoPreviewVolumeButton}
              onClick={(e) => {
                e.stopPropagation();
                if (previewVideoElementRef.current) {
                  previewVideoElementRef.current.muted = !previewVideoElementRef.current.muted;
                  setPreviewMuted(previewVideoElementRef.current.muted);
                  
                  // If unmuting, try to play with sound
                  if (!previewVideoElementRef.current.muted) {
                    previewVideoElementRef.current.play().catch(() => {
                      // If autoplay with sound fails, keep muted
                      previewVideoElementRef.current!.muted = true;
                      setPreviewMuted(true);
                    });
                  }
                }
              }}
            >
              {previewMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>

            {/* Play/Pause overlay */}
            <button className={styles.videoPreviewPlayButton}>
              <Play size={28} />
            </button>

            {/* Bottom panel */}
            <div className={styles.videoPreviewBottom}>
              <div className={styles.videoPreviewStats}>
                <span className={styles.videoPreviewStat}>
                  <Heart size={14} fill="#ef4444" />
                  {previewDiscoverVideo.like_count || 0}
                </span>
                <span className={styles.videoPreviewStat}>
                  <Eye size={14} />
                  {previewDiscoverVideo.view_count || 0}
                </span>
              </div>

              <div className={styles.videoPreviewPrivacy}>
                <label className={styles.privacyLabel}>Visibility</label>
                <select 
                  value={previewDiscoverVideo.privacy || 'public'}
                  onChange={(e) => handleUpdateVideoPrivacy(previewDiscoverVideo.id, e.target.value)}
                  className={styles.privacySelect}
                >
                  <option value="public">Public</option>
                  <option value="friends">Friends Only</option>
                  <option value="private">Only Me</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};













































