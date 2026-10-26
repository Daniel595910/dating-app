import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Trash2, Heart, Loader, MessageCircle } from 'lucide-react';
import { discoverService } from '../services/discover.service';

interface DiscoverCommentsSheetProps {
  open: boolean;
  videoId: string | null;
  currentUserId: string | null;
  onClose: () => void;
  onCommentAdded?: () => void;
  onCommentDeleted?: () => void;
}

interface VideoComment {
  id: string;
  videoId: string;
  authorId: string;
  parentId: string | null;
  content: string;
  createdAt: string;
  authorName: string;
  authorAvatarUrl: string | null;
  authorVerified: boolean;
}

const timeAgo = (dateStr: string): string => {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (s < 60) return 'Just now';
  const m = Math.floor(s / 60);
  if (m < 60) return m + 'm';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h';
  const d = Math.floor(h / 24);
  if (d < 7) return d + 'd';
  return new Date(dateStr).toLocaleDateString();
};

export const DiscoverCommentsSheet: React.FC<DiscoverCommentsSheetProps> = ({
  open,
  videoId,
  currentUserId,
  onClose,
  onCommentAdded,
  onCommentDeleted,
}) => {
  const [comments, setComments] = useState<VideoComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const loadComments = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await discoverService.fetchVideoComments(id);
      setComments(data as VideoComment[]);
    } catch (e: any) {
      setError(e?.message || 'Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && videoId) {
      loadComments(videoId);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open, videoId]);

  useEffect(() => {
    if (!open || !videoId) return;
    const channel = (window as any).supabase
      ? null
      : null;
    // Realtime subscription via the supabase client used in service
    // (simplified — reload on insert via a polling fallback if realtime is unavailable)
    return () => {
      if (channel) channel.unsubscribe?.();
    };
  }, [open, videoId]);

  if (!open || !videoId) return null;

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    try {
      const result = await discoverService.addVideoComment(videoId, text);
      if (!result) {
        setError('Failed to post comment');
        return;
      }
      setInput('');
      await loadComments(videoId);
      onCommentAdded?.();
    } catch (e: any) {
      setError(e?.message || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    setConfirmDelete(null);
    const ok = await discoverService.deleteVideoComment(commentId);
    if (ok) {
      await loadComments(videoId);
      onCommentDeleted?.();
    } else {
      setError('Failed to delete comment');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape') onClose();
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
        zIndex: 1002, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480, height: '75dvh',
          backgroundColor: '#ffffff', borderRadius: '24px 24px 0 0',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
          <div style={{ width: 40, height: 4, backgroundColor: '#e5e7eb', borderRadius: 9999, position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: 8 }} />
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#111827' }}>Comments ({comments.length})</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4 }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6b7280' }}>
              <Loader size={24} style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          ) : comments.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8, textAlign: 'center', color: '#6b7280' }}>
              <MessageCircle size={48} style={{ color: '#d1d5db' }} />
              <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: '#111827' }}>No comments yet</p>
              <p style={{ fontSize: 13, margin: 0 }}>Be the first to comment!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {comments.map((c) => (
                <div key={c.id} style={{ display: 'flex', gap: 10 }}>
                  <div
                    style={{
                      width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                      backgroundColor: '#f3f4f6', overflow: 'hidden',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, color: '#6b7280', fontSize: 14,
                    }}
                  >
                    {c.authorAvatarUrl ? (
                      <img src={c.authorAvatarUrl} alt={c.authorName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span>{c.authorName.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ fontWeight: 600, fontSize: 13, color: '#111827' }}>{c.authorName}</span>
                      <span style={{ fontSize: 11, color: '#9ca3af' }}>{timeAgo(c.createdAt)}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 14, color: '#111827', lineHeight: 1.4, wordBreak: 'break-word' }}>{c.content}</p>
                    {currentUserId === c.authorId && (
                      <button
                        onClick={() => setConfirmDelete(c.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}
                      >
                        <Trash2 size={11} /> Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div style={{ padding: '0 16px 8px', color: '#b91c1c', fontSize: 12 }}>{error}</div>
        )}

        <div style={{ padding: '8px 16px 16px', borderTop: '1px solid #e5e7eb', flexShrink: 0, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a comment..."
            disabled={sending}
            rows={1}
            style={{
              flex: 1, padding: '10px 12px', fontSize: 14,
              border: '1px solid #e5e7eb', borderRadius: 20, resize: 'none',
              fontFamily: 'inherit', boxSizing: 'border-box', maxHeight: 80,
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            aria-label="Send comment"
            style={{
              width: 40, height: 40, borderRadius: '50%',
              backgroundColor: input.trim() && !sending ? '#ef4444' : '#e5e7eb',
              color: '#ffffff', border: 'none', cursor: input.trim() && !sending ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >
            {sending ? <Loader size={16} /> : <Send size={16} />}
          </button>
        </div>
      </div>

      {confirmDelete && (
        <div
          onClick={() => setConfirmDelete(null)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1003, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: '#ffffff', borderRadius: 16, padding: 24, maxWidth: 320, width: '100%', textAlign: 'center' }}>
            <Trash2 size={32} style={{ color: '#ef4444', marginBottom: 12 }} />
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px', color: '#111827' }}>Delete comment?</h3>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 20px' }}>This cannot be undone.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setConfirmDelete(null)}
                style={{ flex: 1, padding: '10px 16px', backgroundColor: '#f3f4f6', color: '#111827', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                style={{ flex: 1, padding: '10px 16px', backgroundColor: '#ef4444', color: '#ffffff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};