import React, { useState } from 'react';
import { Heart, MessageCircle, MapPin, BadgeCheck, Share2 } from 'lucide-react';
import { CommunityPost } from '../../types/community.types';
import { ReportSheet } from './ReportSheet';
import { BlockConfirmSheet } from './BlockConfirmSheet';
import { ShareSheet } from './ShareSheet';
import { LookingForBadge } from './LookingForBadge';
import { PostMedia } from './PostMedia';
import { PostActions } from './PostActions';
import { ImagePreviewModal } from './ImagePreviewModal';

interface CommunityPostCardProps {
  post: CommunityPost;
  currentUserId: string;
  onLike: (postId: string) => void;
  onComment: (postId: string) => void;
  onShare: (postId: string) => void;
  onProfileClick: (authorId: string) => void;
}

export const CommunityPostCard: React.FC<CommunityPostCardProps> = ({
  post,
  currentUserId,
  onLike,
  onComment,
  onShare,
  onProfileClick,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const isOwnPost = post.author.id === currentUserId;
  const mediaUrls = post.media.map((m) => m.url);

  return (
    <article style={{ backgroundColor: '#ffffff', borderRadius: '20px', marginBottom: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #f3f4f6' }}>
      {/* Author Row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px 8px' }}>
        <button onClick={() => onProfileClick(post.author.id)} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', flex: 1, minWidth: 0, background: 'none', border: 'none', padding: 0 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #fef3c7, #fde68a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#92400e', fontSize: '18px', flexShrink: 0 }}>
            {post.author.avatarUrl ? (
              <img src={post.author.avatarUrl} alt={post.author.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              post.author.name.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontWeight: 700, fontSize: '15px', color: '#111827' }}>{post.author.name}</span>
              {post.author.verified && <BadgeCheck size={16} color="#3b82f6" />}
            </div>
            {post.author.location && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '12px', color: '#9ca3af' }}>
                <MapPin size={10} />
                <span>{post.author.location}</span>
              </div>
            )}
          </div>
        </button>
      </div>

      {/* Looking For Badge */}
      {post.lookingFor && <LookingForBadge lookingFor={post.lookingFor} />}

      {/* Content */}
      {post.content && (
        <p style={{ margin: 0, padding: '0 16px 12px', fontSize: '15px', lineHeight: 1.6, color: '#374151', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {post.content}
        </p>
      )}

      {/* Media with click handler */}
      {post.media.length > 0 && (
        <PostMedia media={post.media} onImageClick={(index) => setPreviewIndex(index)} />
      )}

      {/* Tags */}
      {post.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '0 16px 8px' }}>
          {post.tags.map((tag, index) => (
            <span key={index} style={{ color: '#3b82f6', fontSize: '12px', fontWeight: 500 }}>#{tag}</span>
          ))}
        </div>
      )}

      {/* Actions */}
      <PostActions postId={post.id} stats={post.stats} viewer={post.viewer} onLike={onLike} onComment={onComment} onShare={() => setShareOpen(true)} />

      {/* Image Preview Modal */}
      <ImagePreviewModal
        open={previewIndex !== null}
        images={mediaUrls}
        currentIndex={previewIndex || 0}
        onClose={() => setPreviewIndex(null)}
        onNext={() => setPreviewIndex((prev) => Math.min((prev || 0) + 1, mediaUrls.length - 1))}
        onPrev={() => setPreviewIndex((prev) => Math.max((prev || 0) - 1, 0))}
      />

      {/* Sheets */}
      <ReportSheet open={reportOpen} onClose={() => setReportOpen(false)} reporterId={currentUserId} targetType="post" targetId={post.id} reportedUserId={post.author.id} />
      <BlockConfirmSheet open={blockOpen} onClose={() => setBlockOpen(false)} blockerId={currentUserId} targetUserId={post.author.id} targetUserName={post.author.name} onBlocked={() => setBlockOpen(false)} />
      <ShareSheet open={shareOpen} onClose={() => setShareOpen(false)} postUrl={`${window.location.origin}/post/${post.id}`} />
    </article>
  );
};
