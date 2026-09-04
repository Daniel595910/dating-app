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
import { generateUUID } from '../utils/uuid';
import { VoiceRecorder } from './VoiceRecorder';
import { GiftPicker } from './GiftPicker';
import { safetyService } from '../services/safety.service';
import { ScamWarning } from './ScamWarning';
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
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [voiceRecorderOpen, setVoiceRecorderOpen] = useState(false);
  const [giftPickerOpen, setGiftPickerOpen] = useState(false);
  const [safetyWarning, setSafetyWarning] = useState<{ message: string; riskLevel: string } | null>(null);
  const cursorRef = useRef<MessageCursor | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousScrollHeightRef = useRef<number>(0);

  const scrollToBottom = useCallback((smooth = true) => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }, 100);
  }, []);

  const markConversationAsRead = useCallback(async () => {
    if (!user) return;
    try {
      await supabase.rpc('mark_conversation_read', {
        p_conversation_id: conversationId,
      });
    } catch {
      // Ignore
    }
  }, [conversationId, user]);

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

  useEffect(() => {
    loadMessages(true);

    const unsubscribe = chatService.subscribeToMessages(conversationId, (newMessage) => {
      if (newMessage.sender_id !== user?.id && newMessage.content) {
        const safetyResult = safetyService.analyzeMessage(newMessage.content);
        if (safetyResult.shouldShowWarning) {
          setSafetyWarning({
            message: safetyService.getSafetyWarning(safetyResult.riskLevel),
            riskLevel: safetyResult.riskLevel,
          });
        }
      }
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMessage.id)) return prev;
        return [...prev, newMessage];
      });
      scrollToBottom();

      if (newMessage.sender_id !== user?.id) {
        chatService.updateMessageStatus(newMessage.id, 'delivered');
      }
    });

    return () => unsubscribe();
  }, [conversationId, user, loadMessages, scrollToBottom]);

  useEffect(() => {
    markConversationAsRead();
  }, [markConversationAsRead]);

  useEffect(() => {
    if (!user) return;
    chatService.updatePresence(true);
    const interval = setInterval(() => {
      chatService.updatePresence(true);
    }, 30000);
    return () => {
      clearInterval(interval);
      chatService.updatePresence(false);
    };
  }, [user]);

  useEffect(() => {
    if (!targetUserId) return;

    const checkTargetPresence = async () => {
      const { data } = await supabase
        .from('presence')
        .select('is_online')
        .eq('user_id', targetUserId)
        .single();
      if (data) setTargetOnline(data.is_online);
    };

    checkTargetPresence();
    const interval = setInterval(checkTargetPresence, 10000);
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
        if (payload.payload.userId !== user?.id) setIsTyping(false);
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [conversationId, user]);

  useEffect(() => {
    const handleOnline = () => { setIsOffline(false); chatService.updatePresence(true); };
    const handleOffline = () => { setIsOffline(true); chatService.updatePresence(false); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleReply = (message: ChatMessage) => {
    setReplyingTo(message);
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  const handleRetry = async (messageId: string, content: string) => {
    if (!user || isOffline) return;
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    const newMessage = await chatService.sendMessage(conversationId, user.id, content.trim());
    if (newMessage) {
      setMessages((prev) => [...prev, newMessage]);
      scrollToBottom();
    }
  };

  const handleSend = async (content: string) => {
    if (!user || !content.trim() || isOffline) return;

    const safetyResult = safetyService.analyzeMessage(content);
    if (safetyResult.shouldShowWarning) {
      setSafetyWarning({
        message: safetyService.getSafetyWarning(safetyResult.riskLevel),
        riskLevel: safetyResult.riskLevel,
      });
      if (safetyResult.shouldBlockTemporarily) return;
    }

    const trimmedContent = content.trim();
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    const optimisticMessage: ChatMessage = {
      id: tempId,
      conversationId,
      senderId: user.id,
      senderName: 'You',
      senderAvatar: null,
      type: 'text',
      content: trimmedContent,
      status: 'sending',
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    scrollToBottom();

    try {
      const newMessage = await chatService.sendMessage(conversationId, user.id, trimmedContent);
      if (newMessage) {
        setMessages((prev) => prev.map((m) => (m.id === tempId ? newMessage : m)));
        scrollToBottom();
      } else {
        setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' as const } : m)));
      }
    } catch {
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' as const } : m)));
    }
  };

  const handleSendGift = async (gift: { id: string; name: string; icon: string }) => {
    if (!user || isOffline) return;
    try {
      const clientMessageId = generateUUID();
      await supabase.rpc('send_chat_message', {
        p_conversation_id: conversationId,
        p_client_message_id: clientMessageId,
        p_content: gift.name,
        p_type: 'gift',
        p_metadata: { giftId: gift.id, giftName: gift.name, giftIcon: gift.icon },
      });
    } catch (err) {
      console.error('Gift send failed:', err);
    }
  };

  const handleSendVoice = async (audioBlob: Blob, duration: number) => {
    if (!user || isOffline) return;

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    try {
      const tempMessage: ChatMessage = {
        id: tempId,
        conversationId,
        senderId: user.id,
        senderName: 'You',
        senderAvatar: null,
        type: 'voice',
        content: '',
        metadata: { durationMs: duration * 1000 },
        status: 'sending',
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, tempMessage]);
      scrollToBottom();

      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const filePath = `voice/${conversationId}/${timestamp}-${randomSuffix}.webm`;

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, audioBlob, { cacheControl: '3600', contentType: 'audio/webm' });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      const clientMessageId = generateUUID();
      const { error: msgError } = await supabase.rpc('send_chat_message', {
        p_conversation_id: conversationId,
        p_client_message_id: clientMessageId,
        p_content: '',
        p_type: 'voice',
        p_metadata: { audioUrl: publicUrlData.publicUrl, durationMs: duration * 1000 },
      });

      if (msgError) throw msgError;

      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } catch (err) {
      console.error('Voice send failed:', err);
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' as const } : m))
      );
    }
  };

  const handleSendImage = async (file: File) => {
    if (!user || isOffline) return;

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    try {
      const tempMessage: ChatMessage = {
        id: tempId,
        conversationId,
        senderId: user.id,
        senderName: 'You',
        senderAvatar: null,
        type: 'image',
        content: '',
        metadata: {
          imageUrl: URL.createObjectURL(file),
          thumbnailUrl: URL.createObjectURL(file),
        },
        status: 'sending',
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, tempMessage]);
      scrollToBottom();

      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop() || 'jpg';
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const filePath = `chat/${conversationId}/${timestamp}-${randomSuffix}.${fileExtension}`;

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, file, { cacheControl: '3600' });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      const clientMessageId = generateUUID();
      const { error: msgError } = await supabase.rpc('send_chat_message', {
        p_conversation_id: conversationId,
        p_client_message_id: clientMessageId,
        p_content: '',
        p_type: 'image',
        p_metadata: { imageUrl: publicUrlData.publicUrl, thumbnailUrl: publicUrlData.publicUrl },
      });

      if (msgError) throw msgError;

      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } catch (err) {
      console.error('Image send failed:', err);
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' as const } : m))
      );
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
        {safetyWarning && (
          <ScamWarning
            riskLevel={safetyWarning.riskLevel as any}
            message={safetyWarning.message}
            onDismiss={() => setSafetyWarning(null)}
            onReport={() => {
              setSafetyWarning(null);
              setReportSheetOpen(true);
            }}
          />
        )}
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
                  onRetry={handleRetry}
                  onReply={handleReply}
                  onReportMessage={() => setReportSheetOpen(true)}
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
        onSendImage={handleSendImage}
        onTypingChange={() => {}}
        replyingTo={replyingTo}
        onCancelReply={handleCancelReply}
        onOpenVoice={() => setVoiceRecorderOpen(true)}
        onOpenGift={() => setGiftPickerOpen(true)}
      />

      <GiftPicker
        open={giftPickerOpen}
        onClose={() => setGiftPickerOpen(false)}
        onSelectGift={handleSendGift}
      />

      <VoiceRecorder
        open={voiceRecorderOpen}
        onClose={() => setVoiceRecorderOpen(false)}
        onSend={handleSendVoice}
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
