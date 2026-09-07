import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/config/supabase.client';
import { chatService } from '../services/chat.service';
import { messageService } from '../services/message.service';
import { ChatMessage, MessageCursor, MessageReactionSummary } from '../types/chat.types';
import { ChatHeader } from './ChatHeader';
import { MessageBubble } from './MessageBubble';
import { MessageComposer } from './MessageComposer';
import { DateSeparator } from './DateSeparator';
import { TypingIndicator } from './TypingIndicator';
import { ChatActionMenu } from './ChatActionMenu';
import { MessageActionSheet } from './MessageActionSheet';
import { ForwardMessageSheet } from './ForwardMessageSheet';
import { ChatSettingsSheet } from './ChatSettingsSheet';
import { BlockConfirmSheet } from '../../community/components/BlockConfirmSheet';
import { ReportSheet } from '../../community/components/ReportSheet';
import { OfflineBanner } from '../../community/components/OfflineBanner';
import { generateUUID } from '../utils/uuid';
import { VoiceRecorder } from './VoiceRecorder';
import { GiftPicker } from './GiftPicker';
import { safetyService } from '../services/safety.service';
import { ScamWarning } from './ScamWarning';
import { SearchInConversation } from './SearchInConversation';
import { chatNotificationService } from '../services/chat-notification.service';
import { useCall } from '../../calls/CallProvider';
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
  const { startCall } = useCall();
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
  const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [actionSheetMessage, setActionSheetMessage] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [reactionMap, setReactionMap] = useState<Map<string, MessageReactionSummary[]>>(new Map());
  const [pinnedMessageIds, setPinnedMessageIds] = useState<Set<string>>(new Set());
  const [chatWallpaper, setChatWallpaper] = useState<{ wallpaperUrl: string | null; wallpaperColor: string } | null>(null);
  const [forwardMessage, setForwardMessage] = useState<ChatMessage | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [disappearingEnabled, setDisappearingEnabled] = useState(false);
  const [disappearingDuration, setDisappearingDuration] = useState(24);
  const cursorRef = useRef<MessageCursor | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToBottom = useCallback((smooth = true) => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }, 100);
  }, []);

  const loadReactions = useCallback(async (msgs: ChatMessage[]) => {
    if (!user) return;
    const messageIds = msgs.map((m) => m.id);
    const reactions = await messageService.getReactions(messageIds, user.id);
    setReactionMap(reactions);
  }, [user]);

  const loadPinned = useCallback(async () => {
    const pinned = await messageService.getPinnedMessages(conversationId);
    setPinnedMessageIds(new Set(pinned));
  }, [conversationId]);

  const loadWallpaper = useCallback(async () => {
    if (!user) return;
    const prefs = await messageService.getChatPreferences(conversationId, user.id);
    if (prefs) setChatWallpaper(prefs);
  }, [conversationId, user]);

  const markConversationAsRead = useCallback(async () => {
    if (!user) return;
    try {
      await supabase.rpc('mark_conversation_read', { p_conversation_id: conversationId });
    } catch {}
  }, [conversationId, user]);

  const loadMessages = useCallback(async (reset: boolean) => {
    if (!user) return;
    if (reset) { setLoading(true); cursorRef.current = null; } else { setLoadingMore(true); }

    try {
      const result = await chatService.getMessages(conversationId, 50, reset ? null : cursorRef.current);
      if (reset) {
        setMessages(result.messages);
        scrollToBottom(false);
        loadReactions(result.messages);
      } else {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const newMessages = result.messages.filter((m) => !existingIds.has(m.id));
          return [...newMessages, ...prev];
        });
      }
      cursorRef.current = result.nextCursor;
      setHasMore(result.hasMore);
    } catch {
      setError('Failed to load messages');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [conversationId, user, scrollToBottom, loadReactions]);

  useEffect(() => {
    chatNotificationService.setActiveConversation(conversationId);
    loadMessages(true);
    loadPinned();
    loadWallpaper();

    const unsubscribe = chatService.subscribeToMessages(conversationId, (newMessage) => {
      if (newMessage.sender_id !== user?.id && newMessage.content) {
        const safetyResult = safetyService.analyzeMessage(newMessage.content);
        if (safetyResult.shouldShowWarning) {
          setSafetyWarning({ message: safetyService.getSafetyWarning(safetyResult.riskLevel), riskLevel: safetyResult.riskLevel });
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

    return () => {
      unsubscribe();
      chatNotificationService.setActiveConversation(null);
    };
  }, [conversationId, user, loadMessages, scrollToBottom, loadPinned, loadWallpaper]);

  // Handle message actions
  const handleReact = async (message: ChatMessage, reaction: string) => {
    await messageService.addReaction(message.id, reaction);
    if (user) {
      const messageIds = [message.id];
      const reactions = await messageService.getReactions(messageIds, user.id);
      setReactionMap((prev) => new Map(prev).set(message.id, reactions.get(message.id) || []));
    }
  };

  const handleEdit = async (message: ChatMessage) => {
    setEditingMessage(message);
  };

  const handleEditSubmit = async (messageId: string, content: string) => {
    await messageService.editMessage(messageId, content);
    setEditingMessage(null);
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, content, edited_at: new Date().toISOString() } : m)));
  };

  const handleDelete = async (message: ChatMessage) => {
    // Show delete options - for now delete for everyone if own
    await messageService.deleteForEveryone(message.id);
    setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, deleted_for_everyone: true, content: '' } : m)));
  };

  const handleForward = (message: ChatMessage) => {
    setActionSheetMessage(null);
    setForwardMessage(message);
  };

  const handleForwardToConversation = async (targetConversationId: string) => {
    if (!user || !forwardMessage) return;
    await messageService.forwardMessage(forwardMessage.id, targetConversationId, user.id);
    setForwardMessage(null);
  };

  const handleSetWallpaper = async (color: string) => {
    await messageService.setWallpaper(conversationId, null, color);
    setChatWallpaper({ wallpaperUrl: null, wallpaperColor: color });
  };

  const handleClearWallpaper = async () => {
    await messageService.setWallpaper(conversationId, null, '#f0f2f5');
    setChatWallpaper(null);
  };

  const handleSetDisappearing = async (enabled: boolean, durationHours: number) => {
    await messageService.setDisappearingMessages(conversationId, enabled, durationHours);
    setDisappearingEnabled(enabled);
    setDisappearingDuration(durationHours);
  };

  const handlePin = async (message: ChatMessage) => {
    if (pinnedMessageIds.has(message.id)) {
      await messageService.unpinMessage(message.id, conversationId);
      setPinnedMessageIds((prev) => { const next = new Set(prev); next.delete(message.id); return next; });
    } else {
      await messageService.pinMessage(message.id, conversationId);
      setPinnedMessageIds((prev) => new Set(prev).add(message.id));
    }
  };

  const handleReply = (message: ChatMessage) => {
    setReplyingTo(message);
  };

  const handleSend = async (content: string) => {
    if (!user || !content.trim() || isOffline) return;
    const trimmedContent = content.trim();
    const tempId = 'temp-' + Date.now();
    
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
      }
    } catch (err: any) {
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' as const } : m)));
    }
  };

  const handleSendImage = async (file: File) => {
    if (!user || isOffline) return;
    const tempId = 'temp-' + Date.now();
    try {
      const tempMessage: ChatMessage = {
        id: tempId, conversationId, senderId: user.id, senderName: 'You', senderAvatar: null,
        type: 'image', content: '', metadata: { imageUrl: URL.createObjectURL(file), thumbnailUrl: URL.createObjectURL(file) },
        status: 'sending', createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempMessage]);
      scrollToBottom();

      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop() || 'jpg';
      const filePath = 'chat/' + conversationId + '/' + timestamp + '.' + fileExtension;
      const { error: uploadError } = await supabase.storage.from('media').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: publicUrlData } = supabase.storage.from('media').getPublicUrl(filePath);
      const clientMessageId = generateUUID();
      await supabase.rpc('send_chat_message', {
        p_conversation_id: conversationId, p_client_message_id: clientMessageId,
        p_content: '', p_type: 'image', p_metadata: { imageUrl: publicUrlData.publicUrl, thumbnailUrl: publicUrlData.publicUrl },
      });
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } catch {
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' as const } : m)));
    }
  };

  const handleSendVoice = async (audioBlob: Blob, duration: number) => {
    if (!user || isOffline) return;
    const tempId = 'temp-' + Date.now();
    try {
      const tempMessage: ChatMessage = {
        id: tempId, conversationId, senderId: user.id, senderName: 'You', senderAvatar: null,
        type: 'voice', content: '', metadata: { durationMs: duration * 1000 },
        status: 'sending', createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempMessage]);
      scrollToBottom();
      const timestamp = Date.now();
      const filePath = 'voice/' + conversationId + '/' + timestamp + '.webm';
      await supabase.storage.from('media').upload(filePath, audioBlob, { contentType: 'audio/webm' });
      const { data: publicUrlData } = supabase.storage.from('media').getPublicUrl(filePath);
      const clientMessageId = generateUUID();
      await supabase.rpc('send_chat_message', {
        p_conversation_id: conversationId, p_client_message_id: clientMessageId,
        p_content: '', p_type: 'voice', p_metadata: { audioUrl: publicUrlData.publicUrl, durationMs: duration * 1000 },
      });
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } catch {
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' as const } : m)));
    }
  };

  const handleSendGift = async (gift: { id: string; name: string; icon: string }) => {
    if (!user || isOffline) return;
    const clientMessageId = generateUUID();
    await supabase.rpc('send_chat_message', {
      p_conversation_id: conversationId, p_client_message_id: clientMessageId,
      p_content: gift.name, p_type: 'gift', p_metadata: { giftId: gift.id, giftName: gift.name, giftIcon: gift.icon },
    });
  };

  if (loading) {
    return <div className={styles.loading}>Loading messages...</div>;
  }

  return (
    <div className={styles.chatWindow} style={chatWallpaper?.wallpaperColor ? { backgroundColor: chatWallpaper.wallpaperColor } : undefined}>
      <OfflineBanner isOffline={isOffline} hasCachedFeed={messages.length > 0} />
      <ChatHeader
        userName={targetUserName}
        userAvatar={targetUserAvatar}
        verified={verified}
        isOnline={targetOnline}
        onBack={() => navigate('/chats')}
        onProfileClick={() => navigate(`/profile/${targetUserId}`)}
        onMoreClick={() => setActionMenuOpen(true)}
        onCallClick={async () => {
          if (targetUserId) {
            try {
              await startCall(targetUserId);
            } catch (err: any) {
              console.error('Call failed:', err);
              alert(err.message || 'Failed to start call');
            }
          }
        }}
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
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={message.senderId === user?.id}
              showSenderName={message.senderId !== user?.id}
              onReply={handleReply}
              onReact={handleReact}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onForward={handleForward}
              onPin={handlePin}
              reactions={reactionMap.get(message.id) || []}
              isPinned={pinnedMessageIds.has(message.id)}
              onOpenActionSheet={setActionSheetMessage}
            />
          ))
        )}

        {isTyping && <TypingIndicator userName={targetUserName} />}
        <div ref={bottomRef} />
      </div>

      {/* Edit message inline */}
      {editingMessage && (
        <div className={styles.editMessageBar}>
          <span>Editing message</span>
          <input
            autoFocus
            defaultValue={editingMessage.content}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleEditSubmit(editingMessage.id, e.currentTarget.value);
              }
              if (e.key === 'Escape') setEditingMessage(null);
            }}
          />
          <button onClick={() => setEditingMessage(null)}>Cancel</button>
        </div>
      )}

      {!editingMessage && (
        <MessageComposer
          conversationId={conversationId}
          userId={user?.id || ''}
          onSend={handleSend}
          onSendImage={handleSendImage}
          onSendAudio={(file) => {}}
          onTypingChange={() => {}}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
          onOpenVoice={() => setVoiceRecorderOpen(true)}
          onOpenGift={() => setGiftPickerOpen(true)}
        />
      )}

      <MessageActionSheet
        open={Boolean(actionSheetMessage)}
        onClose={() => setActionSheetMessage(null)}
        message={actionSheetMessage}
        isOwn={actionSheetMessage?.senderId === user?.id}
        onReply={handleReply}
        onForward={handleForward}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onPin={handlePin}
        onReact={handleReact}
        onReport={() => setReportSheetOpen(true)}
      />

      <GiftPicker open={giftPickerOpen} onClose={() => setGiftPickerOpen(false)} onSelectGift={handleSendGift} />
      <VoiceRecorder open={voiceRecorderOpen} onClose={() => setVoiceRecorderOpen(false)} onSend={handleSendVoice} />
      <SearchInConversation open={searchOpen} onClose={() => setSearchOpen(false)} messages={messages} onJumpToMessage={() => {}} />
      <ChatActionMenu
        open={actionMenuOpen}
        onClose={() => setActionMenuOpen(false)}
        onViewProfile={() => navigate(`/profile/${targetUserId}`)}
        onMute={() => {}}
        onSearch={() => setSearchOpen(true)}
        onSettings={() => setSettingsOpen(true)}
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
      <ForwardMessageSheet
        open={Boolean(forwardMessage)}
        onClose={() => setForwardMessage(null)}
        message={forwardMessage}
        currentUserId={user?.id || ''}
        onForward={handleForwardToConversation}
      />

      <ChatSettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSetWallpaper={handleSetWallpaper}
        onClearWallpaper={handleClearWallpaper}
        onSetDisappearing={handleSetDisappearing}
        currentWallpaper={chatWallpaper?.wallpaperColor || null}
        disappearingEnabled={disappearingEnabled}
        disappearingDuration={disappearingDuration}
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








