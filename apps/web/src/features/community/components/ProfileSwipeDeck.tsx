import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Heart, X, MapPin, BadgeCheck, Users, Crown, Star } from 'lucide-react';
import { supabase } from '@/config/supabase.client';
import styles from '../styles/ProfileSwipeDeck.module.css';

interface ProfileSwipeDeckProps {
  userId: string;
  communityId: string;
}

interface ProfileCard {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  age: number | null;
  location: string | null;
  bio: string | null;
  interests: string[];
  relationshipIntent: string | null;
  verified: boolean;
  communityName: string | null;
  communityId: string | null;
  distanceKm: number | null;
}

export const ProfileSwipeDeck: React.FC<ProfileSwipeDeckProps> = ({ userId, communityId }) => {
  const [profiles, setProfiles] = useState<ProfileCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [swipe, setSwipe] = useState({ isDragging: false, startX: 0, deltaX: 0 });
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [likedProfiles, setLikedProfiles] = useState<Set<string>>(new Set());
  const [matchScores, setMatchScores] = useState<Map<string, { total: number; reasons: string[] }>>(new Map());
  const [passedProfiles, setPassedProfiles] = useState<Set<string>>(new Set());
  const cardRef = useRef<HTMLDivElement>(null);

  const fetchProfileShares = useCallback(async () => {
    setLoading(true);
    try {
      const { data: posts } = await supabase
        .from('posts')
        .select('*')
        .eq('community_id', communityId)
        .eq('type', 'profile_share')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(30);

      if (!posts || posts.length === 0) {
        setProfiles([]);
        return;
      }

      const authorIds = [...new Set(posts.map((p: any) => p.author_id))];
      
      // Get profiles
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', authorIds);

      // Get user's communities
      const { data: memberships } = await supabase
        .from('community_members')
        .select('community_id, communities:communities(name, id)')
        .in('user_id', authorIds);

      const profileMap = new Map();
      (profilesData || []).forEach((p: any) => {
        profileMap.set(p.user_id, p);
      });

      const communityMap = new Map();
      (memberships || []).forEach((m: any) => {
        if (m.communities) {
          communityMap.set(m.user_id, m.communities);
        }
      });

      const cards: ProfileCard[] = posts
        .filter((p: any) => p.author_id !== userId)
        .map((p: any) => {
          const prof = profileMap.get(p.author_id);
          const comm = communityMap.get(p.author_id);
          const metadata = p.metadata || {};
          return {
            id: p.id,
            userId: p.author_id,
            displayName: prof?.display_name || metadata.displayName || 'User',
            avatarUrl: prof?.avatar_url || p.images?.[0] || null,
            age: prof?.birth_date ? calculateAge(prof.birth_date) : metadata.age || null,
            location: prof?.location ? [prof.location.city, prof.location.state].filter(Boolean).join(', ') : metadata.location || null,
            bio: prof?.bio || p.content || null,
            interests: prof?.interests || metadata.interests || [],
            relationshipIntent: prof?.relationship_intent || metadata.relationshipIntent || null,
            verified: prof?.is_verified || false,
            communityName: comm?.name || null,
            communityId: comm?.id || null,
            distanceKm: null,
          };
        });

      setProfiles(cards);

      // Calculate match scores
      const scores = new Map();
      for (const card of cards) {
        if (card.userId === userId) continue;
        const { data: scoreData } = await supabase.rpc('calculate_match_score', {
          p_user1_id: userId,
          p_user2_id: card.userId,
        });
        if (scoreData && scoreData.total_score !== undefined) {
          scores.set(card.userId, {
            total: scoreData.total_score,
            reasons: scoreData.reasons || [],
          });
        }
      }
      setMatchScores(scores);
    } catch (err) {
      console.error('Failed to fetch profile shares:', err);
    } finally {
      setLoading(false);
    }
  }, [communityId, userId]);

  useEffect(() => {
    fetchProfileShares();
  }, [fetchProfileShares]);

  const calculateAge = (birthDate: string): number | null => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setSwipe({ isDragging: true, startX: e.touches[0].clientX, deltaX: 0 });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swipe.isDragging) return;
    const deltaX = e.touches[0].clientX - swipe.startX;
    setSwipe((prev) => ({ ...prev, deltaX }));
    if (Math.abs(deltaX) > 30) {
      setSwipeDirection(deltaX > 0 ? 'right' : 'left');
    }
  };

  const handleTouchEnd = async () => {
    if (!swipe.isDragging) return;
    const threshold = 100;

    if (swipe.deltaX < -threshold) {
      // Pass
      const current = profiles[currentIndex];
      if (current) {
        setPassedProfiles((prev) => new Set(prev).add(current.userId));
        setCurrentIndex((prev) => prev + 1);
      }
    } else if (swipe.deltaX > threshold) {
      // Like
      const current = profiles[currentIndex];
      if (current) {
        setLikedProfiles((prev) => new Set(prev).add(current.userId));
        // Create like in DB
        await supabase.from('post_likes').insert({
          post_id: current.id,
          user_id: userId,
        });
        setCurrentIndex((prev) => prev + 1);
      }
    }

    setSwipe({ isDragging: false, startX: 0, deltaX: 0 });
    setSwipeDirection(null);
  };

  const handlePass = async () => {
    const current = profiles[currentIndex];
    if (!current) return;
    setPassedProfiles((prev) => new Set(prev).add(current.userId));
    setCurrentIndex((prev) => prev + 1);
  };

  const handleLike = async () => {
    const current = profiles[currentIndex];
    if (!current) return;
    setLikedProfiles((prev) => new Set(prev).add(current.userId));
    await supabase.from('post_likes').insert({
      post_id: current.id,
      user_id: userId,
    });
    setCurrentIndex((prev) => prev + 1);
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p>Loading profiles...</p>
      </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <div className={styles.empty}>
        <Users size={48} className={styles.emptyIcon} />
        <p className={styles.emptyTitle}>No profiles shared yet</p>
        <p className={styles.emptyText}>Be the first to share your profile!</p>
      </div>
    );
  }

  if (currentIndex >= profiles.length) {
    return (
      <div className={styles.empty}>
        <Heart size={48} className={styles.emptyIcon} />
        <p className={styles.emptyTitle}>You're all caught up!</p>
        <p className={styles.emptyText}>Check back later for new profiles</p>
      </div>
    );
  }

  const current = profiles[currentIndex];

  return (
    <div 
      className={styles.deck}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        ref={cardRef}
        className={styles.card}
        style={{
          transform: `translateX(${swipe.deltaX}px) rotate(${swipe.deltaX * 0.05}deg)`,
          transition: swipe.isDragging ? 'none' : 'transform 0.3s ease',
        }}
      >
        {/* Large profile photo */}
        <div className={styles.photoContainer}>
          {current.avatarUrl ? (
            <img src={current.avatarUrl} alt={current.displayName} className={styles.photo} />
          ) : (
            <div className={styles.photoFallback}>
              {current.displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Compatibility Score */}
        {matchScores.has(current.userId) && (
          <div className={styles.matchScoreBadge}>
            <span className={styles.matchScoreValue}>
              {matchScores.get(current.userId)!.total}%
            </span>
            <span className={styles.matchScoreLabel}>Match</span>
          </div>
        )}

        {/* Profile info overlay */}
        <div className={styles.infoOverlay}>
          <div className={styles.nameRow}>
            <span className={styles.name}>{current.displayName}{current.age ? `, ${current.age}` : ''}</span>
            {current.verified && <BadgeCheck size={18} className={styles.verifiedIcon} />}
          </div>

          {current.location && (
            <div className={styles.location}>
              <MapPin size={12} />
              {current.location}
            </div>
          )}

          {current.bio && current.bio !== 'Check out my profile!' && (
            <p className={styles.bio}>{current.bio}</p>
          )}

          {current.interests.length > 0 && (
            <div className={styles.interests}>
              {current.interests.slice(0, 3).map((interest, index) => (
                <span key={index} className={styles.interestTag}>{interest}</span>
              ))}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className={styles.actionButtons}>
          <button className={styles.passButton} onClick={handlePass} aria-label="Pass">
            <X size={28} />
          </button>
          <button className={styles.likeButton} onClick={handleLike} aria-label="Like">
            <Heart size={28} />
          </button>
        </div>

        {/* Join Community */}
        {current.communityName && (
          <button className={styles.joinCommunityButton}>
            <Crown size={14} />
            Join {current.communityName}
          </button>
        )}

        {/* Swipe indicator */}
        {swipeDirection && Math.abs(swipe.deltaX) > 30 && (
          <div className={`${styles.swipeIndicator} ${swipeDirection === 'left' ? styles.swipeLeft : styles.swipeRight}`}>
            {swipeDirection === 'left' ? 'Pass' : 'Like'}
          </div>
        )}
      </div>
    </div>
  );
};





