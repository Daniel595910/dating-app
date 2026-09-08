import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/config/supabase.client';
import { chatService } from '../services/chat.service';
import { messageService } from '../services/message.service';
import { ChatMessage, MessageCursor, MessageReactionSummary } from '../types/chat.types';
import { ChatHeader } from './ChatHeader';
import { MessageBubble } from './MessageBubble';
import { MessageComposer } from './MessageComposer';
import { TypingIndicator } from './TypingIndicator';
import { MessageActionSheet } from './MessageActionSheet';
import { ForwardMessageSheet } from './ForwardMessageSheet';
import { ChatSettingsSheet } from './ChatSettingsSheet';
import { BlockConfirmSheet } from '../../community/components/BlockConfirmSheet';
import { ReportSheet } from '../../community/components/ReportSheet';
import { GiftPicker } from './GiftPicker';
import { VoiceRecorder } from './VoiceRecorder';
import { useCall } from '../../calls/CallProvider';
import styles from '../styles/ChatWindow.module.css';

interface ChatWindowProps {
  conversationId: string;
  targetUserName: string;
  targetUserAvatar: string | null;
  targetUserId: string;
  verified: boolean;
  initialOnline?: boolean;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  conversationId,
  targetUserName,
  targetUserAvatar,
  targetUserId,
  verified,
  initialOnline = false,
}) => {
  const { user } = useAuthStore();
  const { startCall } = useCall();
  const navigate = useNavigate();
  
  // Core state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Presence
  const [targetOnline, setTargetOnline] = useState(initialOnline);
  const [isTyping, setIsTyping] = useState(false);
  
  // UI state
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [actionSheetMessage, setActionSheetMessage] = useState<ChatMessage | null>(null);
  const [forwardMessage, setForwardMessage] = useState<ChatMessage | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [giftPickerOpen, setGiftPickerOpen] = useState(false);
  const [voiceRecorderOpen, setVoiceRecorderOpen] = useState(false);
  const [blockSheetOpen, setBlockSheetOpen] = useState(false);
  const [reportSheetOpen, setReportSheetOpen] = useState(false);
  
  // Data
  const [reactionMap, setReactionMap] = useState<Map<string, MessageReactionSummary[]>>(new Map());
  const [pinnedMessageIds, setPinnedMessageIds] = useState<Set<string>>(new Set());
  const [chatWallpaper, setChatWallpaper] = useState<{ wallpaperUrl: string | null; wallpaperColor: string } | null>(null);
  
  // Disappearing messages state
  const [disappearingEnabled, setDisappearingEnabled] = useState(false);
  const [disappearingDuration, setDisappearingDuration] = useState(24);
  
  // Refs
  const cursorRef = useRef<MessageCursor | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialLoadRef = useRef(true);
  const typingChannelRef = useRef<any>(null);

  // Scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    });
  }, []);

  // Load reactions
  const loadReactions = useCallback(async (msgs: ChatMessage[]) => {
    if (!user || msgs.length === 0) return;
    const messageIds = msgs.map((m) => m.id);
    const reactions = await messageService.getReactions(messageIds, user.id);
    setReactionMap(reactions);
  }, [user]);

  // Load pinned messages
  const loadPinned = useCallback(async () => {
    const pinned = await messageService.getPinnedMessages(conversationId);
    setPinnedMessageIds(new Set(pinned));
  }, [conversationId]);

  // Load wallpaper
  const loadWallpaper = useCallback(async () => {
    if (!user) return;
    const prefs = await messageService.getChatPreferences(conversationId, user.id);
    if (prefs) setChatWallpaper(prefs);
  }, [conversationId, user]);

  // Load disappearing messages settings
  const loadDisappearingSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('disappearing_enabled, disappearing_duration_hours')
        .eq('id', conversationId)
        .single();

      if (error) {
        console.error('Failed to load disappearing settings:', error);
        return;
      }

      if (data) {
        setDisappearingEnabled(data.disappearing_enabled || false);
        setDisappearingDuration(data.disappearing_duration_hours || 24);
      }
    } catch (err) {
      console.error('Failed to load disappearing settings:', err);
    }
  }, [conversationId]);

  // Mark messages as read
  const markMessagesAsRead = useCallback(async (msgs: ChatMessage[]) => {
    if (!user) return;
    
    // Get messages from other users that are not already read
    const unreadMessages = msgs.filter(
      (m) => m.senderId !== user.id && m.status !== 'read'
    );

    if (unreadMessages.length === 0) return;

    // Update each unread message to 'read'
    for (const msg of unreadMessages) {
      try {
        await chatService.updateMessageStatus(msg.id, 'read');
      } catch (err) {
        console.error('Failed to mark message as read:', err);
      }
    }

    // Update local state
    setMessages((prev) =>
      prev.map((m) =>
        unreadMessages.some((unread) => unread.id === m.id)
          ? { ...m, status: 'read' as const }
          : m
      )
    );
  }, [user]);

  // Load messages
  const loadMessages = useCallback(async (reset: boolean, showLoading: boolean = true) => {
    if (!user) return;
    
    if (reset && showLoading) {
      setLoading(true);
      cursorRef.current = null;
    } else if (!reset) {
      setLoadingMore(true);
    }

    try {
      const result = await chatService.getMessages(conversationId, 50, reset ? null : cursorRef.current);
      
      if (reset) {
        setMessages(result.messages);
        if (showLoading) {
          scrollToBottom(false);
        }
        await loadReactions(result.messages);
        
        // Mark messages as read
        await markMessagesAsRead(result.messages);
      } else {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          return [...result.messages.filter((m) => !existingIds.has(m.id)), ...prev];
        });
      }
      
      cursorRef.current = result.nextCursor;
      setHasMore(result.hasMore);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [conversationId, user, scrollToBottom, loadReactions, markMessagesAsRead]);

  // Initial load only - no polling
  useEffect(() => {
    loadMessages(true, true);
    loadPinned();
    loadWallpaper();
    loadDisappearingSettings();
    
    // Mark as read
    supabase.rpc('mark_conversation_read', { p_conversation_id: conversationId }).then(() => {}).catch(() => {});
  }, [conversationId, loadMessages, loadPinned, loadWallpaper, loadDisappearingSettings]);

  // Subscribe to typing events
  useEffect(() => {
    if (!user || !targetUserId) return;

    // Clean up previous channel
    if (typingChannelRef.current) {
      supabase.removeChannel(typingChannelRef.current);
      typingChannelRef.current = null;
    }

    // Create typing channel
    const typingChannel = supabase.channel(`typing:${conversationId}`);
    
    typingChannel
      .on('broadcast', { event: 'typing' }, (payload) => {
        // Only show typing indicator if the other user is typing
        if (payload.payload?.userId !== user.id) {
          setIsTyping(true);
          
          // Auto-hide after 3 seconds if no stop_typing event received
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
          }, 3000);
        }
      })
      .on('broadcast', { event: 'stop_typing' }, (payload) => {
        if (payload.payload?.userId !== user.id) {
          setIsTyping(false);
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
          }
        }
      })
      .subscribe();

    typingChannelRef.current = typingChannel;

    return () => {
      if (typingChannelRef.current) {
        supabase.removeChannel(typingChannelRef.current);
        typingChannelRef.current = null;
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };
  }, [conversationId, user, targetUserId]);

  // Presence check
  useEffect(() => {
    if (!targetUserId) return;

    const checkPresence = async () => {
      const { data } = await supabase
        .from('presence')
        .select('is_online')
        .eq('user_id', targetUserId)
        .maybeSingle();
      
      if (data) setTargetOnline(data.is_online);
    };

    checkPresence();
    const interval = setInterval(checkPresence, 3000);

    return () => {
      clearInterval(interval);
    };
  }, [targetUserId]);

  // Message actions
  const handleSend = async (content: string) => {
    if (!user || !content.trim()) return;
    const trimmed = content.trim();
    const tempId = `temp-${Date.now()}`;

    // Build metadata with reply info if replying
    const metadata = replyingTo ? {
      replyToId: replyingTo.id,
      replyToSenderName: replyingTo.senderName,
      replyToContent: replyingTo.content.substring(0, 100),
      replyToType: replyingTo.type,
    } : undefined;

    setMessages((prev) => [...prev, {
      id: tempId,
      conversationId,
      senderId: user.id,
      senderName: 'You',
      senderAvatar: null,
      type: 'text',
      content: trimmed,
      metadata,
      status: 'sending',
      createdAt: new Date().toISOString(),
    }]);
    scrollToBottom();

    // Clear reply state
    setReplyingTo(null);

    try {
      const newMessage = await chatService.sendMessage(conversationId, user.id, trimmed, 'text', metadata);
      if (newMessage) {
        setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...newMessage, metadata } : m)));
      }
    } catch {
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' as const } : m)));
    }
  };

  const handleReact = async (message: ChatMessage, reaction: string) => {
    await messageService.addReaction(message.id, reaction);
    if (user) {
      const reactions = await messageService.getReactions([message.id], user.id);
      setReactionMap((prev) => new Map(prev).set(message.id, reactions.get(message.id) || []));
    }
  };

  const handleEdit = (message: ChatMessage) => setEditingMessage(message);

  const handleEditSubmit = async (messageId: string, content: string) => {
    await messageService.editMessage(messageId, content);
    setEditingMessage(null);
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, content, edited_at: new Date().toISOString() } : m)));
  };

  const handleDelete = async (message: ChatMessage) => {
    await messageService.deleteForEveryone(message.id);
    setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, deleted_for_everyone: true, content: '' } : m)));
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
    const success = await messageService.setDisappearingMessages(conversationId, enabled, durationHours);
    if (success) {
      setDisappearingEnabled(enabled);
      setDisappearingDuration(durationHours);
    }
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
      </div>
    );
  }

  return (
    <div className={styles.chatWindow} style={chatWallpaper?.wallpaperColor ? { backgroundColor: chatWallpaper.wallpaperColor } : undefined}>
      <ChatHeader
        userName={targetUserName}
        userAvatar={targetUserAvatar}
        verified={verified}
        isOnline={targetOnline}
        onBack={() => navigate('/chats')}
        onProfileClick={() => navigate(`/profile/${targetUserId}`)}
        onMoreClick={() => setSettingsOpen(true)}
        onCallClick={async () => {
          try {
            await startCall(targetUserId);
          } catch (err: any) {
            alert(err.message || 'Failed to start call');
          }
        }}
      />

      <div className={styles.messagesContainer} ref={containerRef}>
        {hasMore && (
          <button className={styles.loadMore} onClick={() => loadMessages(false)} disabled={loadingMore}>
            {loadingMore ? 'Loading...' : 'Load older'}
          </button>
        )}

        {messages.length === 0 ? (
          <div className={styles.emptyState}>
            <p>Say hello to {targetUserName}!</p>
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

      {editingMessage && (
        <div className={styles.editBar}>
          <span className={styles.editBarLabel}>✏️</span>
          <input
            autoFocus
            defaultValue={editingMessage.content}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleEditSubmit(editingMessage.id, e.currentTarget.value);
              }
              if (e.key === 'Escape') setEditingMessage(null);
            }}
            placeholder="Edit message..."
            maxLength={10000}
          />
          <button onClick={() => setEditingMessage(null)}>Cancel</button>
          <button 
            className={styles.editBarSave}
            onClick={() => handleEditSubmit(editingMessage.id, (document.querySelector('.' + styles.editBar + ' input') as HTMLInputElement)?.value || editingMessage.content)}
          >
            Save
          </button>
        </div>
      )}

      {!editingMessage && (
        <MessageComposer
          conversationId={conversationId}
          userId={user?.id || ''}
          onSend={handleSend}
          onSendImage={(file) => {}}
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

      <GiftPicker open={giftPickerOpen} onClose={() => setGiftPickerOpen(false)} onSelectGift={() => {}} />
      <VoiceRecorder open={voiceRecorderOpen} onClose={() => setVoiceRecorderOpen(false)} onSend={() => {}} />

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



