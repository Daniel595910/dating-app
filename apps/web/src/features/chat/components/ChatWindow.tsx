import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useNavigate } from 'react-router-dom';
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
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [blockSheetOpen, setBlockSheetOpen] = useState(false);
  const [reportSheetOpen, setReportSheetOpen] = useState(false);
  const cursorRef = useRef<MessageCursor | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const broadcastChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const scrollToBottom = useCallback((smooth = true) => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }, 100);
  }, []);

  const loadMessages = useCallback(async (reset: boolean) => {
    if (!user) return;

    if (reset) {
      setLoading(true);
      cursorRef.current = null;
    } else {
      setLoadingMore(true);
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

  useEffect(() => {
    loadMessages(true);
    chatService.markMessagesAsRead(conversationId, user?.id || '');

    const unsubscribe = chatService.subscribeToMessages(conversationId, (newMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMessage.id)) return prev;
        return [...prev, newMessage];
      });
      scrollToBottom();
      chatService.markMessagesAsRead(conversationId, user?.id || '');
    });

    return () => unsubscribe();
  }, [conversationId, user, loadMessages, scrollToBottom]);

  const handleSend = async (content: string) => {
    if (!user || !content.trim()) return;

    const newMessage = await chatService.sendMessage(conversationId, user.id, content.trim());
    if (newMessage) {
      setMessages((prev) => [...prev, newMessage]);
      scrollToBottom();
    }
  };

  const handleTyping = (typing: boolean) => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (typing) {
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
      }, 3000);
    }
    setIsTyping(typing);
  };

  // Group messages by date
  const groupedMessages = messages.reduce<{ date: string; messages: ChatMessage[] }[]>((acc, message) => {
    const date = new Date(message.createdAt).toDateString();
    const lastGroup = acc[acc.length - 1];
    if (lastGroup && lastGroup.date === date) {
      lastGroup.messages.push(message);
    } else {
      acc.push({ date, messages: [message] });
    }
    return acc;
  }, []);

  if (loading) {
    return <div className={styles.loading}>Loading messages...</div>;
  }

  if (error && messages.length === 0) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div className={styles.chatWindow}>
      <ChatHeader
        userName={targetUserName}
        userAvatar={targetUserAvatar}
        verified={verified}
        isOnline={false}
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

        {groupedMessages.map((group) => (
          <React.Fragment key={group.date}>
            <DateSeparator date={group.date} />
            {group.messages.map((message) => (
              <MessageBubble key={message.id} message={message} isOwn={message.senderId === user?.id} />
            ))}
          </React.Fragment>
        ))}

        {isTyping && <TypingIndicator userName={targetUserName} />}
        <div ref={bottomRef} />
      </div>

      <MessageComposer onSend={handleSend} onTyping={handleTyping} />

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
