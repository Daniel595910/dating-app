import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/config/supabase.client';
import { chatService } from '../../features/chat/services/chat.service';
import { Conversation } from '../../features/chat/types/chat.types';
import { MessageCircle, ArrowRight, ArrowLeft, Search, X } from 'lucide-react';
import styles from './ChatsPage.module.css';

interface OnlineUser {
  userId: string;
  name: string;
  avatarUrl: string | null;
}

export const ChatsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadConversations = async () => {
      if (!user) return;
      setLoading(true);
      const convs = await chatService.getUserConversations(user.id);
      setConversations(convs);
      setLoading(false);
    };

    const loadOnlineUsers = async () => {
      if (!user) return;
      const { data: presenceData } = await supabase
        .from('presence')
        .select('user_id, is_online')
        .eq('is_online', true)
        .neq('user_id', user.id)
        .limit(10);

      if (presenceData && presenceData.length > 0) {
        const onlineIds = presenceData.map((p: any) => p.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', onlineIds);

        const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
        setOnlineUsers(
          presenceData.map((p: any) => {
            const profile = profileMap.get(p.user_id);
            return {
              userId: p.user_id,
              name: profile?.display_name || 'User',
              avatarUrl: profile?.avatar_url || null,
            };
          })
        );
      } else {
        setOnlineUsers([]);
      }
    };

    loadConversations();
    loadOnlineUsers();

    const channel = supabase
      .channel('chats_page_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => loadConversations())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presence' }, () => loadOnlineUsers())
      .subscribe();

    return () => channel.unsubscribe();
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
        <button className={styles.backButton} onClick={() => navigate('/community')} aria-label="Back">
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

      {onlineUsers.length > 0 && (
        <div className={styles.onlineSection}>
          <div className={styles.onlineScroll}>
            {onlineUsers.map((onlineUser) => (
              <button
                key={onlineUser.userId}
                className={styles.onlineUserItem}
                onClick={() => handleSelectOnlineUser(onlineUser.userId)}
                title={onlineUser.name}
              >
                <div className={styles.onlineAvatarWrapper}>
                  <div className={styles.onlineAvatar}>
                    {onlineUser.avatarUrl ? (
                      <img src={onlineUser.avatarUrl} alt={onlineUser.name} />
                    ) : (
                      onlineUser.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <span className={styles.onlineDot} />
                </div>
                <span className={styles.onlineName}>
                  {onlineUser.name.split(' ')[0]}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={styles.conversationList}>
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
          filteredConversations.map((conv) => {
            const otherUserId = conv.participantIds.find((id) => id !== user?.id);
            const otherUserName = otherUserId ? conv.participantNames[otherUserId] : 'User';
            const otherUserAvatar = otherUserId ? conv.participantAvatars[otherUserId] : null;

            return (
              <button
                key={conv.id}
                className={`${styles.conversationItem} ${conv.unreadCount > 0 ? styles.unreadItem : ''}`}
                onClick={() => handleSelectConversation(conv.id)}
              >
                <div className={styles.avatarWrapper}>
                  <div className={styles.avatar}>
                    {otherUserAvatar ? (
                      <img src={otherUserAvatar} alt={otherUserName} />
                    ) : (
                      otherUserName?.charAt(0).toUpperCase() || '?'
                    )}
                  </div>
                  {conv.isOnline && <span className={styles.onlineDot} />}
                </div>
                <div className={styles.conversationInfo}>
                  <div className={styles.conversationHeader}>
                    <span className={styles.conversationName}>{otherUserName}</span>
                    {conv.lastMessageAt && (
                      <span className={styles.timestamp}>{timeAgo(conv.lastMessageAt)}</span>
                    )}
                  </div>
                  <div className={styles.lastMessageRow}>
                    {conv.lastMessage && (
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
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
