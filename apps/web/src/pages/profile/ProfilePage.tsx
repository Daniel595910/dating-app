import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/config/supabase.client';
import { profileService } from '../../features/profile/services/profile.service';
import { ProfileData, ProfileStats, UserPost } from '../../features/profile/types/profile.types';
import { PhotoViewer } from '../../features/profile/components/PhotoViewer';
import { ArrowLeft, Settings, BadgeCheck, MapPin, Heart, Grid, Menu, UserPlus, Check, Camera, MoreVertical, X } from 'lucide-react';
import styles from './ProfilePage.module.css';

export const ProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<ProfileStats>({ posts: 0, followers: 0, following: 0, connections: 0 });
  const [userPosts, setUserPosts] = useState<UserPost[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'about'>('posts');
  const [photoViewerIndex, setPhotoViewerIndex] = useState<number | null>(null);
  const [statsModal, setStatsModal] = useState<'posts' | 'followers' | 'following' | 'connections' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isOwnProfile = !userId || userId === user?.id;
  const targetUserId = userId || user?.id || '';

  useEffect(() => {
    const loadProfile = async () => {
      if (!targetUserId) return;
      setLoading(true);

      const profileData = await profileService.getProfileByUserId(targetUserId);
      const profileStats = await profileService.getProfileStats(targetUserId);
      const posts = await profileService.getUserPosts(targetUserId);

      setProfile(profileData);
      setStats(profileStats);
      setUserPosts(posts);

      if (user && targetUserId !== user.id) {
        const following = await profileService.isFollowing(user.id, targetUserId);
        setIsFollowing(following);
      }

      setLoading(false);
    };

    loadProfile();
  }, [targetUserId, user]);

  const handleFollow = async () => {
    if (!user) return;
    if (isFollowing) {
      await profileService.unfollowUser(user.id, targetUserId);
      setIsFollowing(false);
    } else {
      await profileService.followUser(user.id, targetUserId);
      setIsFollowing(true);
    }
  };

  const handlePhotoUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !user) return;
    const file = files[0];
    if (file.type.startsWith('image/')) {
      await profileService.uploadProfilePhoto(user.id, file);
      const profileData = await profileService.getProfileByUserId(user.id);
      setProfile(profileData);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <p>Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className={styles.errorContainer}>
        <p>Profile not found</p>
        <button onClick={() => navigate('/community')}>Go to Community</button>
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

      {/* Stats Modal */}
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
              ) : (
                <p className={styles.statsModalEmpty}>
                  {statsModal === 'followers' ? 'Followers list coming soon' : statsModal === 'following' ? 'Following list coming soon' : 'Connections list coming soon'}
                </p>
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
          <button className={styles.headerButton} onClick={() => navigate('/profile/edit')} aria-label="Edit profile">
            <Settings size={22} />
          </button>
        ) : (
          <button className={styles.headerButton} aria-label="More">
            <MoreVertical size={22} />
          </button>
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
          <button className={styles.statButton} onClick={() => setStatsModal('followers')}>
            <span className={styles.statValue}>{stats.followers}</span>
            <span className={styles.statLabel}>Followers</span>
          </button>
          <button className={styles.statButton} onClick={() => setStatsModal('following')}>
            <span className={styles.statValue}>{stats.following}</span>
            <span className={styles.statLabel}>Following</span>
          </button>
          <button className={styles.statButton} onClick={() => setStatsModal('connections')}>
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

        {isOwnProfile ? (
          <div className={styles.actionRow}>
            <button className={styles.primaryAction} onClick={() => navigate('/profile/edit')}>
              Edit Profile
            </button>
            <button className={styles.secondaryAction} onClick={() => fileInputRef.current?.click()}>
              <Camera size={18} />
              Add Photo
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => handlePhotoUpload(e.target.files)}
              style={{ display: 'none' }}
            />
          </div>
        ) : (
          <div className={styles.actionRow}>
            <button className={styles.primaryAction} onClick={() => navigate(`/chats/${targetUserId}`)}>
              Message
            </button>
            <button className={styles.secondaryAction} onClick={handleFollow}>
              {isFollowing ? <Check size={18} /> : <UserPlus size={18} />}
              {isFollowing ? 'Following' : 'Follow'}
            </button>
          </div>
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
          className={`${styles.tab} ${activeTab === 'about' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('about')}
        >
          <Menu size={18} />
          About
        </button>
      </div>

      {activeTab === 'posts' ? (
        <div className={styles.galleryGrid}>
          {postImages.length > 0 ? (
            postImages.map((image, index) => (
              <div
                key={index}
                className={styles.galleryItem}
                onClick={() => setPhotoViewerIndex(index)}
              >
                <img src={image} alt="" loading="lazy" className={styles.galleryImage} />
                <div className={styles.galleryOverlay}>
                  <Heart size={14} />
                </div>
              </div>
            ))
          ) : (
            <div className={styles.emptyPosts}>
              <Camera size={32} />
              <p>No photos yet</p>
              <p className={styles.emptySubtext}>Photos from community posts will appear here</p>
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
    </div>
  );
};
