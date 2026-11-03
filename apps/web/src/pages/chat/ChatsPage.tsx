import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/config/supabase.client';
import { useStoryRings } from '../../features/community/hooks/useStoryRings';
import { chatService } from '../../features/chat/services/chat.service';
import { usePresence } from '../../features/chat/hooks/usePresence';
import { Conversation } from '../../features/chat/types/chat.types';
import { MessageCircle, ArrowRight, ArrowLeft, Search, X, Pin } from 'lucide-react';
import styles from './ChatsPage.module.css';

export const ChatsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { ringState } = useStoryRings(Boolean(user?.id));
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Swipe state (Commit 4)
  const [openRowId, setOpenRowId] = useState<string | null>(null);
  const swipeStateRef = useRef<{ id: string | null; startX: number; startY: number; dx: number; dy: number; active: boolean; axis: 'h' | 'v' | null }>({ id: null, startX: 0, startY: 0, dx: 0, dy: 0, active: false, axis: null });
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  };

  const handleTogglePin = async (conversationId: string, nextPinned: boolean) => {
    const prev = conversations;
    const flipped = prev.map((c) =>
      c.id === conversationId
        ? { ...c, isPinned: nextPinned, pinnedAt: nextPinned ? new Date().toISOString() : null }
        : c
    );
    const sorted = [...flipped].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      if (a.isPinned && b.isPinned) {
        const at = a.pinnedAt ? new Date(a.pinnedAt).getTime() : 0;
        const bt = b.pinnedAt ? new Date(b.pinnedAt).getTime() : 0;
        return bt - at;
      }
      const at = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bt = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return bt - at;
    });
    setConversations(sorted);
    try {
      if (nextPinned) await chatService.pinChat(conversationId);
      else await chatService.unpinChat(conversationId);
    } catch (err: any) {
      setConversations(prev);
      const msg = String(err?.message || '');
      if (msg.includes('Maximum 3')) showToast('You can pin at most 3 chats. Unpin one to add another.');
      else showToast('Could not update pin. Please try again.');
    }
  };
  const handleArchive = async (conversationId: string) => {
    const prev = conversations;
    setConversations((cs) => cs.filter((c) => c.id !== conversationId));
    setOpenRowId(null);
    try {
      await chatService.archiveChat(conversationId);
      showToast('Chat archived');
    } catch (err: any) {
      setConversations(prev);
      showToast('Could not archive. Please try again.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteId) return;
    const targetId = pendingDeleteId;
    const prev = conversations;
    setConversations((cs) => cs.filter((c) => c.id !== targetId));
    setPendingDeleteId(null);
    setOpenRowId(null);
    try {
      await chatService.deleteChat(targetId);
      showToast('Chat deleted');
    } catch (err: any) {
      setConversations(prev);
      showToast('Could not delete. Please try again.');
    }
  };

  const onRowPointerDown = (id: string) => (e: React.PointerEvent) => {
    if (openRowId && openRowId !== id) { setOpenRowId(null); return; }
    swipeStateRef.current = { id, startX: e.clientX, startY: e.clientY, dx: 0, dy: 0, active: true, axis: null };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onRowPointerMove = (e: React.PointerEvent) => {
    const s = swipeStateRef.current;
    if (!s.active || !s.id) return;
    const dx = e.clientX - s.startX;
    const dy = e.clientY - s.startY;
    s.dx = dx; s.dy = dy;
    if (s.axis === null) {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        s.axis = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
      }
    }
    if (s.axis !== 'h') return;
    const offset = Math.max(0, Math.min(160, -dx));
    const surface = (e.currentTarget as HTMLElement);
    surface.style.transition = 'none';
    surface.style.transform = 'translateX(' + (-offset) + 'px)';
  };

  const onRowPointerUp = (id: string) => (e: React.PointerEvent) => {
    const s = swipeStateRef.current;
    if (!s.active) return;
    s.active = false;
    const surface = (e.currentTarget as HTMLElement);
    surface.style.transition = 'transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)';
    if (s.axis !== 'h') {
      surface.style.transform = openRowId === id ? 'translateX(-160px)' : 'translateX(0)';
      return;
    }
    const offset = Math.max(0, Math.min(160, -s.dx));
    if (offset >= 80) {
      surface.style.transform = 'translateX(-160px)';
      setOpenRowId(id);
    } else {
      surface.style.transform = 'translateX(0)';
      if (openRowId === id) setOpenRowId(null);
    }
  };

  const onRowClick = (id: string) => {
    if (openRowId === id) { setOpenRowId(null); return; }
    if (openRowId) { setOpenRowId(null); return; }
    handleSelectConversation(id);
  };

  const { isUserOnline, onlineUsers } = usePresence(user?.id || null);

  // Typing state per conversation
  const [typingConvIds, setTypingConvIds] = useState<Set<string>>(new Set());
  const typingTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const hasLoadedRef = useRef(false);
  const refetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);


  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    let typingChannel: any = null;

    const loadConversations = async (showSpinner: boolean) => {
      if (!user || cancelled) return;
      if (showSpinner) setLoading(true);
      try {
        const convs = await chatService.getUserConversations(user.id);
        if (!cancelled) {
          setConversations(convs);
          hasLoadedRef.current = true;
        }
      } finally {
        if (!cancelled && showSpinner) setLoading(false);
      }
    };

    // Initial load with spinner
    loadConversations(true);

    // Debounced silent refetch on conversations UPDATE
    const scheduleRefetch = () => {
      if (!hasLoadedRef.current) return;
      if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current);
      refetchTimerRef.current = setTimeout(() => loadConversations(false), 300);
    };

    const convsChannel = supabase
      .channel('chats_page_updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversations' }, () => scheduleRefetch())
      .subscribe();

    const stateChannel = supabase
      .channel(`chats_page_state:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversation_user_state', filter: `user_id=eq.${user.id}` },
        () => scheduleRefetch()
      )
      .subscribe();

    // Typing indicator subscription
    (async () => {
      typingChannel = supabase
        .channel(`typing-user:${user.id}`)
        .on(
          'broadcast',
          { event: 'typing' },
          (payload) => {
            const convId = payload.payload?.conversationId;
            if (!convId || payload.payload?.userId === user.id) return;
            setTypingConvIds((prev) => new Set(prev).add(convId));
            const existing = typingTimeoutsRef.current.get(convId);
            if (existing) clearTimeout(existing);
            typingTimeoutsRef.current.set(
              convId,
              setTimeout(() => {
                setTypingConvIds((prev) => {
                  const next = new Set(prev);
                  next.delete(convId);
                  return next;
                });
              }, 3000)
            );
          }
        )
        .on(
          'broadcast',
          { event: 'stop_typing' },
          (payload) => {
            const convId = payload.payload?.conversationId;
            if (!convId) return;
            setTypingConvIds((prev) => {
              const next = new Set(prev);
              next.delete(convId);
              return next;
            });
          }
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current);
      supabase.removeChannel(convsChannel);
      supabase.removeChannel(stateChannel);
      if (typingChannel) supabase.removeChannel(typingChannel);
      typingTimeoutsRef.current.forEach((t) => clearTimeout(t));
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      typingTimeoutsRef.current.clear();
    };
  }, [user]);

  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery.trim()) return true;
    const otherUserId = conv.participantIds.find((id) => id !== user?.id);
    const otherUserName = otherUserId ? conv.participantNames[otherUserId] : 'User';
    return otherUserName.toLowerCase().includes(searchQuery.toLowerCase()) ||
           (conv.lastMessage && conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  const handleSelectConversation = (conversationId: string) => {
    navigate(`/chats/${conversationId}`);
  };

  const handleSelectOnlineUser = (userId: string) => {
    navigate(`/profile/${userId}`);
  };

  const timeAgo = (dateString: string | null): string => {
    if (!dateString) return '';
    const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + 'm';
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + 'h';
    const days = Math.floor(hours / 24);
    if (days < 7) return days + 'd';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <button className={styles.backButton} onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <h1 className={styles.title}>Chats</h1>
      </div>

      <div className={styles.searchContainer}>
        <div className={styles.searchBar}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className={styles.clearSearch} onClick={() => setSearchQuery('')} aria-label="Clear search">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className={styles.conversationList}>
        {toast && <div className={styles.toast}>{toast}</div>}
        {filteredConversations.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <MessageCircle size={40} />
            </div>
            <h2 className={styles.emptyTitle}>
              {searchQuery ? `No results for "${searchQuery}"` : 'No conversations yet'}
            </h2>
            <p className={styles.emptyText}>
              {searchQuery ? 'Try searching for a different name or message.' : 'Matches and connections you start talking to will appear here.'}
            </p>
            {!searchQuery && (
              <button className={styles.exploreButton} onClick={() => navigate('/community')}>
                Explore Community
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        ) : (
          filteredConversations.map((conv, index) => {
            const prev = index > 0 ? filteredConversations[index - 1] : null;
            const showPinnedDivider = prev !== null && prev.isPinned && !conv.isPinned;
            const otherUserId = conv.participantIds.find((id) => id !== user?.id);
            const otherUserName = otherUserId ? conv.participantNames[otherUserId] : 'User';
            const otherUserAvatar = otherUserId ? conv.participantAvatars[otherUserId] : null;
            const isOnline = otherUserId ? isUserOnline(otherUserId) : false;

            return (
              <React.Fragment key={conv.id}>
              {showPinnedDivider && (
                <div className={styles.pinnedDivider} aria-hidden="true">
                  <span>Pinned</span>
                </div>
              )}
              <div className={styles.rowContainer}>
                <div className={styles.actionsRight}>
                  <button className={styles.archiveBtn} onClick={() => handleArchive(conv.id)} aria-label="Archive chat">Archive</button>
                  <button className={styles.deleteBtn} onClick={() => setPendingDeleteId(conv.id)} aria-label="Delete chat">Delete</button>
                </div>
                <div
                role="button"
                tabIndex={0}
                key={conv.id}
                className={`${styles.conversationItem} ${conv.unreadCount > 0 ? styles.unreadItem : ''}`}
                onClick={() => onRowClick(conv.id)}
                onPointerDown={onRowPointerDown(conv.id)}
                onPointerMove={onRowPointerMove}
                onPointerUp={onRowPointerUp(conv.id)}
                onPointerCancel={onRowPointerUp(conv.id)}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter' || ev.key === ' ') {
                    ev.preventDefault();
                    handleSelectConversation(conv.id);
                  }
                }}
              >
                <div className={styles.avatarWrapper}>
                  {otherUserId && ringState[otherUserId] ? (
                    <div className={`${styles.storyRing} ${ringState[otherUserId] === 'unseen' ? styles.storyRingUnseen : styles.storyRingSeen}`}>
                      <div className={styles.storyRingInner}>
                        <div className={styles.avatar}>
                          {otherUserAvatar ? (
                            <img src={otherUserAvatar} alt={otherUserName} />
                          ) : (
                            otherUserName?.charAt(0).toUpperCase() || '?'
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.avatar}>
                      {otherUserAvatar ? (
                        <img src={otherUserAvatar} alt={otherUserName} />
                      ) : (
                        otherUserName?.charAt(0).toUpperCase() || '?'
                      )}
                    </div>
                  )}
                  {isOnline && <span className={styles.onlineDot} />}
                </div>
                <div className={styles.conversationInfo}>
                  <div className={styles.conversationHeader}>
                    <span className={styles.conversationName}>{otherUserName}</span>
                    <span className={styles.pinSlot}>
                      <button
                        className={styles.pinButton + (conv.isPinned ? ' ' + styles.pinButtonActive : '')}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTogglePin(conv.id, !conv.isPinned);
                        }}
                        aria-label={conv.isPinned ? 'Unpin chat' : 'Pin chat'}
                      >
                        <Pin size={14} fill={conv.isPinned ? 'currentColor' : 'none'} />
                      </button>
                    </span>
                    {conv.lastMessageAt && (
                      <span className={styles.timestamp}>{timeAgo(conv.lastMessageAt)}</span>
                    )}
                  </div>
                  <div className={styles.lastMessageRow}>
                    {typingConvIds.has(conv.id) ? (
                      <p className={`${styles.lastMessage} ${styles.typingPreview}`}>
                        typing...
                      </p>
                    ) : conv.lastMessage && (
                      <p className={`${styles.lastMessage} ${conv.unreadCount > 0 ? styles.unreadMessage : ''}`}>
                        {conv.lastMessage}
                      </p>
                    )}
                    {conv.unreadCount > 0 && (
                      <span className={styles.unreadBadge}>
                        {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              </div>
              </React.Fragment>
            );
          })
        )}
      </div>

      {pendingDeleteId && (
        <div className={styles.confirmOverlay} onClick={() => setPendingDeleteId(null)}>
          <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.confirmTitle}>Delete chat?</h3>
            <p className={styles.confirmText}>This chat will be removed from your list. The other person will still see it.</p>
            <div className={styles.confirmActions}>
              <button className={styles.confirmCancel} onClick={() => setPendingDeleteId(null)}>Cancel</button>
              <button className={styles.confirmDelete} onClick={handleConfirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
