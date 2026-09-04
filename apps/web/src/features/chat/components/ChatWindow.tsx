import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/config/supabase.client';
import { chatService } from '../services/chat.service';
import { ChatMessage, MessageCursor } from '../types/chat.types';
import { ChatHeader } from './ChatHeader';
import { MessageBubble } from './MessageBubble';
import { MessageComposer } from './MessageComposer';
import { DateSeparator } from './DateSeparator';
import { TypingIndicator } from './TypingIndicator';
import { ChatActionMenu } from './ChatActionMenu';
import { BlockConfirmSheet } from '../../community/components/BlockConfirmSheet';
import { ReportSheet } from '../../community/components/ReportSheet';
import { OfflineBanner } from '../../community/components/OfflineBanner';
import styles from '../styles/ChatWindow.module.css';

interface ChatWindowProps {
  conversationId: string;
  targetUserName: string;
  targetUserAvatar: string | null;
  targetUserId: string;
  verified: boolean;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  conversationId,
  targetUserName,
  targetUserAvatar,
  targetUserId,
  verified,
}) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [targetOnline, setTargetOnline] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [blockSheetOpen, setBlockSheetOpen] = useState(false);
  const [reportSheetOpen, setReportSheetOpen] = useState(false);
  const cursorRef = useRef<MessageCursor | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousScrollHeightRef = useRef<number>(0);
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const scrollToBottom = useCallback((smooth = true) => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }, 100);
  }, []);

  const markConversationAsRead = useCallback(async () => {
    if (!user || messages.length === 0) return;
    const lastMessageId = messages[messages.length - 1]?.id;
    if (!lastMessageId) return;

    try {
      await supabase.rpc('mark_conversation_read', {
        p_conversation_id: conversationId,
        p_last_read_message_id: lastMessageId,
      });
    } catch {
      // Ignore read receipt errors
    }
  }, [conversationId, user, messages]);

  const loadMessages = useCallback(async (reset: boolean) => {
    if (!user) return;

    if (reset) {
      setLoading(true);
      cursorRef.current = null;
    } else {
      setLoadingMore(true);
      if (messagesContainerRef.current) {
        previousScrollHeightRef.current = messagesContainerRef.current.scrollHeight;
      }
    }

    try {
      const result = await chatService.getMessages(conversationId, 50, reset ? null : cursorRef.current);

      if (reset) {
        setMessages(result.messages);
        scrollToBottom(false);
      } else {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const newMessages = result.messages.filter((m) => !existingIds.has(m.id));
          return [...newMessages, ...prev];
        });

        setTimeout(() => {
          if (messagesContainerRef.current) {
            const newScrollHeight = messagesContainerRef.current.scrollHeight;
            messagesContainerRef.current.scrollTop = newScrollHeight - previousScrollHeightRef.current;
          }
        }, 50);
      }

      cursorRef.current = result.nextCursor;
      setHasMore(result.hasMore);
    } catch (err) {
      setError('Failed to load messages');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [conversationId, user, scrollToBottom]);

  // Initial load
  useEffect(() => {
    loadMessages(true);

    const unsubscribe = chatService.subscribeToMessages(conversationId, (newMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMessage.id)) return prev;
        return [...prev, newMessage];
      });
      scrollToBottom();
    });

    return () => unsubscribe();
  }, [conversationId, user, loadMessages, scrollToBottom]);

  // Mark as read when messages change
  useEffect(() => {
    markConversationAsRead();
  }, [markConversationAsRead]);

  // Presence: Set current user as online
  useEffect(() => {
    if (!user) return;

    chatService.updatePresence(true);

    const interval = setInterval(() => {
      chatService.updatePresence(true);
    }, 30000); // Heartbeat every 30s

    return () => {
      clearInterval(interval);
      chatService.updatePresence(false);
    };
  }, [user]);

  // Presence: Check target user's online status
  useEffect(() => {
    if (!targetUserId) return;

    const checkTargetPresence = async () => {
      const { data } = await supabase
        .from('presence')
        .select('is_online')
        .eq('user_id', targetUserId)
        .single();

      if (data) {
        setTargetOnline(data.is_online);
      }
    };

    checkTargetPresence();

    // Check every 10 seconds
    const interval = setInterval(checkTargetPresence, 10000);

    // Subscribe to presence changes
    const channel = supabase
      .channel(`presence:${targetUserId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'presence',
        filter: `user_id=eq.${targetUserId}`,
      }, (payload) => {
        setTargetOnline(payload.new.is_online);
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      channel.unsubscribe();
    };
  }, [targetUserId]);

  // Typing broadcast subscription
  useEffect(() => {
    const channel = supabase.channel(`typing:${conversationId}`);
    channel
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.payload.userId !== user?.id) {
          setIsTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000);
        }
      })
      .on('broadcast', { event: 'stop_typing' }, (payload) => {
        if (payload.payload.userId !== user?.id) {
          setIsTyping(false);
        }
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [conversationId, user]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      chatService.updatePresence(true);
    };
    const handleOffline = () => {
      setIsOffline(true);
      chatService.updatePresence(false);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSend = async (content: string) => {
    if (!user || !content.trim() || isOffline) return;
    const newMessage = await chatService.sendMessage(conversationId, user.id, content.trim());
    if (newMessage) {
      setMessages((prev) => [...prev, newMessage]);
      scrollToBottom();
    }
  };

  const groupedMessages = messages.reduce<{
    date: string;
    senderId: string | null;
    showSenderName: boolean;
    messages: ChatMessage[];
  }[]>((acc, message) => {
    const date = new Date(message.createdAt).toDateString();
    const lastGroup = acc[acc.length - 1];

    if (!lastGroup || lastGroup.date !== date || lastGroup.senderId !== message.senderId) {
      acc.push({
        date,
        senderId: message.senderId,
        showSenderName: message.senderId !== user?.id,
        messages: [message],
      });
    } else {
      lastGroup.messages.push(message);
    }
    return acc;
  }, []);

  if (loading) {
    return <div className={styles.loading}>Loading messages...</div>;
  }

  if (error && messages.length === 0) {
    return (
      <div className={styles.error}>
        <p>{error}</p>
        <button onClick={() => loadMessages(true)}>Retry</button>
      </div>
    );
  }

  return (
    <div className={styles.chatWindow}>
      <OfflineBanner isOffline={isOffline} hasCachedFeed={messages.length > 0} />

      <ChatHeader
        userName={targetUserName}
        userAvatar={targetUserAvatar}
        verified={verified}
        isOnline={targetOnline}
        onBack={() => navigate('/chats')}
        onProfileClick={() => navigate(`/profile/${targetUserId}`)}
        onMoreClick={() => setActionMenuOpen(true)}
      />

      <div className={styles.messagesContainer} ref={messagesContainerRef}>
        {hasMore && (
          <button className={styles.loadMore} onClick={() => loadMessages(false)} disabled={loadingMore}>
            {loadingMore ? 'Loading...' : 'Load older messages'}
          </button>
        )}

        {messages.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>Say hello to {targetUserName}!</p>
            <p className={styles.emptyText}>Start the conversation and get to know each other.</p>
          </div>
        ) : (
          groupedMessages.map((group, groupIndex) => (
            <React.Fragment key={`${group.date}-${groupIndex}`}>
              {groupIndex === 0 || groupedMessages[groupIndex - 1]!.date !== group.date ? (
                <DateSeparator date={group.date} />
              ) : null}
              {group.messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isOwn={message.senderId === user?.id}
                  showSenderName={group.showSenderName && groupIndex === 0}
                />
              ))}
            </React.Fragment>
          ))
        )}

        {isTyping && <TypingIndicator userName={targetUserName} />}
        <div ref={bottomRef} />
      </div>

      <MessageComposer
        conversationId={conversationId}
        userId={user?.id || ''}
        onSend={handleSend}
        onTypingChange={() => {}}
      />

      <ChatActionMenu
        open={actionMenuOpen}
        onClose={() => setActionMenuOpen(false)}
        onViewProfile={() => navigate(`/profile/${targetUserId}`)}
        onMute={() => {}}
        onBlock={() => setBlockSheetOpen(true)}
        onReport={() => setReportSheetOpen(true)}
      />

      <BlockConfirmSheet
        open={blockSheetOpen}
        onClose={() => setBlockSheetOpen(false)}
        blockerId={user?.id || ''}
        targetUserId={targetUserId}
        targetUserName={targetUserName}
        onBlocked={() => navigate('/chats')}
      />

      <ReportSheet
        open={reportSheetOpen}
        onClose={() => setReportSheetOpen(false)}
        reporterId={user?.id || ''}
        targetType="user"
        targetId={targetUserId}
        reportedUserId={targetUserId}
      />
    </div>
  );
};
