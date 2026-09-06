import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, UserPlus, Check, BadgeCheck, MapPin, Heart as HeartIcon } from 'lucide-react';
import { supabase } from '@/config/supabase.client';
import styles from '../styles/ProfileShareCard.module.css';

interface ProfileShareCardProps {
  post: any;
  currentUserId: string;
  onProfileClick: (authorId: string) => void;
}

export const ProfileShareCard: React.FC<ProfileShareCardProps> = ({
  post,
  currentUserId,
  onProfileClick,
}) => {
  const [isFollowing, setIsFollowing] = useState(false);
  const [liked, setLiked] = useState(post.viewer?.liked || false);
  const [likeCount, setLikeCount] = useState(post.stats?.likes || 0);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    const checkFollow = async () => {
      const { data } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', currentUserId)
        .eq('following_id', post.author.id)
        .maybeSingle();
      setIsFollowing(Boolean(data));
    };
    checkFollow();
  }, [currentUserId, post.author.id]);

  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (followLoading) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await supabase.from('follows').delete().eq('follower_id', currentUserId).eq('following_id', post.author.id);
        setIsFollowing(false);
      } else {
        await supabase.from('follows').insert({ follower_id: currentUserId, following_id: post.author.id });
        setIsFollowing(true);
      }
    } catch (err) {
      console.error('Follow error:', err);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLiked((prev: boolean) => !prev);
    setLikeCount((prev: number) => liked ? prev - 1 : prev + 1);
    try {
      if (liked) {
        await supabase.from('post_likes').delete().eq('post_id', post.id).eq('user_id', currentUserId);
      } else {
        await supabase.from('post_likes').insert({ post_id: post.id, user_id: currentUserId });
      }
    } catch (err) {
      console.error('Like error:', err);
    }
  };

  const metadata = post.metadata || {};
  const displayName = metadata.displayName || post.author.name;
  const age = metadata.age;
  const location = metadata.location;
  const interests = metadata.interests || [];
  const relationshipIntent = metadata.relationshipIntent;

  return (
    <article className={styles.card}>
      <div className={styles.header}>
        <span className={styles.badge}>Profile Share</span>
        <span className={styles.timeAgo}>{new Date(post.createdAt).toLocaleDateString()}</span>
      </div>

      <div className={styles.profileSection} onClick={() => onProfileClick(post.author.id)}>
        <div className={styles.avatar}>
          {post.author.avatarUrl ? (
            <img src={post.author.avatarUrl} alt={displayName} />
          ) : (
            displayName.charAt(0).toUpperCase()
          )}
        </div>
        <div className={styles.profileInfo}>
          <div className={styles.nameRow}>
            <span className={styles.name}>{displayName}{age ? `, ${age}` : ''}</span>
            {post.author.verified && <BadgeCheck size={14} className={styles.verifiedIcon} />}
          </div>
          {location && (
            <div className={styles.location}>
              <MapPin size={11} />
              {location}
            </div>
          )}
          {relationshipIntent && (
            <div className={styles.lookingFor}>
              <HeartIcon size={11} />
              {relationshipIntent.replace(/_/g, ' ')}
            </div>
          )}
        </div>
      </div>

      {post.content && post.content !== 'Check out my profile!' && (
        <p className={styles.bio}>{post.content}</p>
      )}

      {interests.length > 0 && (
        <div className={styles.interests}>
          {interests.slice(0, 4).map((interest: string, index: number) => (
            <span key={index} className={styles.interestTag}>{interest}</span>
          ))}
        </div>
      )}

      <div className={styles.actions}>
        <button className={`${styles.actionButton} ${liked ? styles.actionButtonLiked : ''}`} onClick={handleLike}>
          <Heart size={18} fill={liked ? '#ef4444' : 'none'} />
          {likeCount > 0 && <span>{likeCount}</span>}
        </button>
        <button className={`${styles.actionButton} ${isFollowing ? styles.actionButtonFollowing : ''}`} onClick={handleFollow}>
          {isFollowing ? <Check size={16} /> : <UserPlus size={16} />}
          <span>{isFollowing ? 'Following' : 'Follow'}</span>
        </button>
        <button className={styles.viewButton} onClick={() => onProfileClick(post.author.id)}>
          View Profile
        </button>
      </div>
    </article>
  );
};
