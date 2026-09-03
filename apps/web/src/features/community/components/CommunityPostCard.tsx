import React, { useState } from 'react';
import { Heart, MessageCircle, Share2, MapPin, BadgeCheck, Crown, MoreVertical, Handshake, MessageCircle as ChatIcon } from 'lucide-react';
import { CommunityPost } from '../../types/community.types';
import { PostActionMenu } from './PostActionMenu';
import { ReportSheet } from './ReportSheet';

interface CommunityPostCardProps {
  post: CommunityPost;
  currentUserId: string;
  onLike: (postId: string) => void;
  onComment: (postId: string) => void;
  onShare: (postId: string) => void;
  onProfileClick: (authorId: string) => void;
}

const getLookingForIcon = (type: string) => {
  switch (type) {
    case 'marriage':
      return Crown;
    case 'relationship':
      return Heart;
    case 'friendship':
      return Handshake;
    case 'conversation':
      return ChatIcon;
    default:
      return Heart;
  }
};

const getLookingForColor = (type: string) => {
  switch (type) {
    case 'marriage':
      return { color: '#f59e0b', bg: '#fef3c7' };
    case 'relationship':
      return { color: '#ef4444', bg: '#fee2e2' };
    case 'friendship':
      return { color: '#10b981', bg: '#d1fae5' };
    case 'conversation':
      return { color: '#3b82f6', bg: '#dbeafe' };
    default:
      return { color: '#ef4444', bg: '#fee2e2' };
  }
};

export const CommunityPostCard: React.FC<CommunityPostCardProps> = ({
  post,
  currentUserId,
  onLike,
  onComment,
  onShare,
  onProfileClick,
}) => {
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [reportSheetOpen, setReportSheetOpen] = useState(false);

  const isOwnPost = post.author.id === currentUserId;
  const LookingForIcon = post.lookingFor ? getLookingForIcon(post.lookingFor.type) : null;
  const lookingForColors = post.lookingFor ? getLookingForColor(post.lookingFor.type) : null;

  return (
    <article
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '1rem',
        padding: '1rem',
        marginBottom: '0.75rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      {/* Author Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '0.75rem',
        }}
      >
        <div
          onClick={() => onProfileClick(post.author.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            cursor: 'pointer',
            flex: 1,
            minWidth: 0,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              backgroundColor: '#f3f4f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
              color: '#6b7280',
              fontSize: '1rem',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            {post.author.avatarUrl ? (
              <img
                src={post.author.avatarUrl}
                alt={post.author.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              post.author.name.charAt(0).toUpperCase()
            )}
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: '#111827' }}>
                {post.author.name}
              </span>
              {post.author.verified && (
                <BadgeCheck size={16} style={{ color: '#3b82f6', flexShrink: 0 }} />
              )}
            </div>
            {post.author.location && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.125rem',
                  fontSize: '0.75rem',
                  color: '#6b7280',
                }}
              >
                <MapPin size={10} />
                <span>{post.author.location}</span>
              </div>
            )}
          </div>
        </div>

        {/* More Button */}
        <button
          onClick={() => setActionMenuOpen(true)}
          aria-label="More options"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#9ca3af',
            padding: '0.5rem',
            borderRadius: '9999px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 44,
            minHeight: 44,
            flexShrink: 0,
          }}
        >
          <MoreVertical size={20} />
        </button>
      </div>

      {/* Looking For Badge */}
      {post.lookingFor && LookingForIcon && lookingForColors && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '0.25rem 0.625rem',
            borderRadius: '9999px',
            backgroundColor: lookingForColors.bg,
            color: lookingForColors.color,
            fontSize: '0.75rem',
            fontWeight: 600,
            marginBottom: '0.5rem',
          }}
        >
          <LookingForIcon size={12} />
          <span>Looking for {post.lookingFor.label}</span>
        </div>
      )}

      {/* Content */}
      <p
        style={{
          margin: '0 0 0.75rem',
          fontSize: '0.9375rem',
          lineHeight: 1.5,
          color: '#374151',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {post.content}
      </p>

      {/* Media */}
      {post.media && post.media.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            marginBottom: '0.75rem',
            overflowX: 'auto',
          }}
        >
          {post.media.map((media, index) => (
            <img
              key={media.id || index}
              src={media.thumbnailUrl || media.url}
              alt=""
              loading="lazy"
              style={{
                width: 120,
                height: 120,
                objectFit: 'cover',
                borderRadius: '0.75rem',
                flexShrink: 0,
              }}
            />
          ))}
        </div>
      )}

      {/* Actions */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem',
          paddingTop: '0.75rem',
          borderTop: '1px solid #f9fafb',
        }}
      >
        <button
          onClick={() => onLike(post.id)}
          aria-label={post.viewer.liked ? 'Unlike' : 'Like'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: post.viewer.liked ? '#ef4444' : '#6b7280',
            fontSize: '0.875rem',
            padding: '0.25rem',
            borderRadius: '0.5rem',
            minHeight: 44,
          }}
        >
          <Heart size={18} fill={post.viewer.liked ? '#ef4444' : 'none'} />
          <span>{post.stats.likes}</span>
        </button>

        <button
          onClick={() => onComment(post.id)}
          aria-label="Comments"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#6b7280',
            fontSize: '0.875rem',
            padding: '0.25rem',
            borderRadius: '0.5rem',
            minHeight: 44,
          }}
        >
          <MessageCircle size={18} />
          <span>{post.stats.comments}</span>
        </button>

        <button
          onClick={() => onShare(post.id)}
          aria-label="Share"
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#6b7280',
            padding: '0.25rem',
            borderRadius: '0.5rem',
            marginLeft: 'auto',
            minWidth: 44,
            minHeight: 44,
            justifyContent: 'center',
          }}
        >
          <Share2 size={18} />
        </button>
      </div>

      {/* Action Menu */}
      <PostActionMenu
        open={actionMenuOpen}
        onClose={() => setActionMenuOpen(false)}
        isOwnPost={isOwnPost}
        onReport={() => {
          setActionMenuOpen(false);
          setReportSheetOpen(true);
        }}
        onBlock={() => {
          setActionMenuOpen(false);
          console.log('Block user:', post.author.id);
        }}
        onMute={() => {
          setActionMenuOpen(false);
          console.log('Mute user:', post.author.id);
        }}
      />

      {/* Report Sheet */}
      <ReportSheet
        open={reportSheetOpen}
        onClose={() => setReportSheetOpen(false)}
        reporterId={currentUserId}
        targetType="post"
        targetId={post.id}
        reportedUserId={post.author.id}
      />
    </article>
  );
};
