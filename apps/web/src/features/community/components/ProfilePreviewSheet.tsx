import React, { useState, useEffect, useCallback } from 'react';
import { X, MapPin, Heart, BadgeCheck, MessageCircle, Handshake, Crown, UserPlus, Check } from 'lucide-react';
import { supabase } from '@/config/supabase.client';
import styles from '../styles/ProfilePreviewSheet.module.css';

interface ProfilePreviewSheetProps {
  open: boolean;
  onClose: () => void;
  authorId: string | null;
  onGetToKnow: (authorId: string) => void;
  onViewFullProfile: (authorId: string) => void;
  currentUserId?: string;
}

interface PreviewProfile {
  id: string;
  name: string;
  avatarUrl: string | null;
  verified: boolean;
  age?: number;
  location?: string;
  bio?: string;
  interests: string[];
  relationshipIntent?: string;
}

export const ProfilePreviewSheet: React.FC<ProfilePreviewSheetProps> = ({
  open,
  onClose,
  authorId,
  onGetToKnow,
  onViewFullProfile,
  currentUserId,
}) => {
  const [profile, setProfile] = useState<PreviewProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    if (!open || !authorId) return;

    const fetchProfile = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', authorId)
          .single();

        if (error) throw error;

        if (data) {
          setProfile({
            id: data.user_id,
            name: data.display_name || 'User',
            avatarUrl: data.avatar_url || null,
            verified: data.is_verified || false,
            age: data.age || undefined,
            location: data.location?.city || data.location?.state || undefined,
            bio: data.bio || undefined,
            interests: data.interests || [],
            relationshipIntent: data.relationship_intent || undefined,
          });
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [open, authorId]);

  useEffect(() => {
    if (!open || !authorId || !currentUserId) return;

    const checkFollowStatus = async () => {
      const { data } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', currentUserId)
        .eq('following_id', authorId)
        .maybeSingle();
      
      setIsFollowing(Boolean(data));
    };

    checkFollowStatus();
  }, [open, authorId, currentUserId]);

  const handleFollow = async () => {
    if (!currentUserId || !authorId || followLoading) return;
    setFollowLoading(true);

    try {
      if (isFollowing) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('following_id', authorId);
        if (!error) setIsFollowing(false);
      } else {
        const { error } = await supabase
          .from('follows')
          .insert({ follower_id: currentUserId, following_id: authorId });
        if (!error) setIsFollowing(true);
      }
    } catch (err) {
      console.error('Follow error:', err);
    } finally {
      setFollowLoading(false);
    }
  };

  const getLookingForIcon = (intent?: string) => {
    if (!intent) return null;
    if (intent.includes('marriage')) return Crown;
    if (intent.includes('serious') || intent.includes('relationship')) return Heart;
    if (intent.includes('friend')) return Handshake;
    return MessageCircle;
  };

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.dragHandle} />

        <button onClick={onClose} aria-label="Close" className={styles.closeButton}>
          <X size={20} />
        </button>

        {loading ? (
          <div className={styles.loading}>Loading profile...</div>
        ) : !profile ? (
          <div className={styles.error}>Profile not found</div>
        ) : (
          <>
            <div className={styles.photoContainer}>
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt={profile.name} className={styles.photo} />
              ) : (
                <div className={styles.photoFallback}>
                  {profile.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className={styles.nameRow}>
              <h2 className={styles.name}>
                {profile.name}
                {profile.age ? `, ${profile.age}` : ''}
              </h2>
              {profile.verified && <BadgeCheck size={18} className={styles.verifiedIcon} />}
            </div>

            {profile.location && (
              <div className={styles.locationRow}>
                <MapPin size={14} />
                <span>{profile.location}</span>
              </div>
            )}

            {profile.relationshipIntent && (
              <div className={styles.lookingFor}>
                {(() => {
                  const Icon = getLookingForIcon(profile.relationshipIntent);
                  return Icon ? <Icon size={14} /> : null;
                })()}
                <span>
                  Looking for {profile.relationshipIntent.replace(/_/g, ' ')}
                </span>
              </div>
            )}

            {profile.bio && <p className={styles.bio}>{profile.bio}</p>}

            {profile.interests.length > 0 && (
              <div className={styles.interests}>
                {profile.interests.slice(0, 5).map((interest, index) => (
                  <span key={index} className={styles.interestTag}>
                    {interest}
                  </span>
                ))}
              </div>
            )}

            <div className={styles.actions}>
              <button
                className={styles.getToKnowButton}
                onClick={() => onGetToKnow(profile.id)}
              >
                Get to Know
              </button>
              <button
                className={`${styles.followButton} ${isFollowing ? styles.followButtonActive : ''}`}
                onClick={handleFollow}
                disabled={followLoading}
              >
                {isFollowing ? <Check size={16} /> : <UserPlus size={16} />}
                {isFollowing ? 'Following' : 'Follow'}
              </button>
              <button
                className={styles.viewProfileButton}
                onClick={() => onViewFullProfile(profile.id)}
              >
                View Full Profile
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
