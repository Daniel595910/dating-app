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

import { useCall } from '../../calls/CallProvider';
import { uploadService } from '@/services/upload.service';


import { Pin, X, ChevronDown } from 'lucide-react';
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

  const [blockSheetOpen, setBlockSheetOpen] = useState(false);
  const [reportSheetOpen, setReportSheetOpen] = useState(false);
  
  // Data
  const [reactionMap, setReactionMap] = useState<Map<string, MessageReactionSummary[]>>(new Map());
  const [pinnedMessageIds, setPinnedMessageIds] = useState<Set<string>>(new Set());
  const [pinnedMessages, setPinnedMessages] = useState<ChatMessage[]>([]);
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

  // Scroll state
  const [showScrollDown, setShowScrollDown] = useState(false);

  // Scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
      setShowScrollDown(false);
    });
  }, []);

  // Handle scroll events to show/hide scroll down button
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    setShowScrollDown(!isNearBottom);
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

  // Scroll to bottom when messages are first loaded
  useEffect(() => {
    if (!loading && messages.length > 0) {
      // Use setTimeout to ensure DOM is rendered
      const timer = setTimeout(() => {
        scrollToBottom(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loading, messages.length, scrollToBottom]);

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
      try {
        const { data, error } = await supabase
          .from('presence')
          .select('is_online')
          .eq('user_id', targetUserId)
          .maybeSingle();
        
        if (error) {
          // Silently ignore network errors
          return;
        }
        
        if (data) setTargetOnline(data.is_online);
      } catch (err) {
        // Silently ignore network errors
        console.debug('Presence check failed:', err);
      }
    };

    checkPresence();
    const interval = setInterval(checkPresence, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [targetUserId]);

  // Message actions
  const handleSend = async (content: string) => {
    if (!user || !content.trim()) return;
    const trimmed = content.trim();
    const tempId = `temp-${Date.now()}`;

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

  const handleSendVoiceMessage = async (audioBlob: Blob, duration: number) => {
    if (!user) {
      console.error('No user found');
      return;
    }
    
    console.log('Starting voice message send:', { blobSize: audioBlob.size, duration, userId: user.id });
    
    const tempId = `temp-${Date.now()}`;
    const metadata = {
      durationMs: duration * 1000,
      audioUrl: '',
    };

    setMessages((prev) => [...prev, {
      id: tempId,
      conversationId,
      senderId: user.id,
      senderName: 'You',
      senderAvatar: null,
      type: 'audio',
      content: 'Voice message',
      metadata,
      status: 'sending',
      createdAt: new Date().toISOString(),
    }]);
    scrollToBottom();
    setVoiceRecorderOpen(false);

    try {
      // Upload audio to storage
      console.log('Uploading audio to storage...');
      const uploadResult = await mediaService.uploadAudio(audioBlob, user.id, 'chat_audio');
      console.log('Upload result:', uploadResult);
      
      if (!uploadResult.success || !uploadResult.media) {
        throw new Error(uploadResult.error || 'Failed to upload audio');
      }

      const audioUrl = uploadResult.media.url;
      console.log('Audio uploaded successfully:', audioUrl);
      
      // Send message with audio URL
      console.log('Sending message with audio...');
      const newMessage = await chatService.sendMessage(
        conversationId, 
        user.id, 
        'Voice message', 
        'audio', 
        { durationMs: duration * 1000, audioUrl }
      );
      console.log('Message sent:', newMessage);

      if (newMessage) {
        setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...newMessage, metadata: { durationMs: duration * 1000, audioUrl } } : m)));
      } else {
        throw new Error('No message returned from sendMessage');
      }
    } catch (err) {
      console.error('Failed to send voice message:', err);
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' as const } : m)));
    }
  };




  const handleSendImage = async (file: File) => {
    if (!user) return;
    
    const tempId = `temp-${Date.now()}`;

    setMessages((prev) => [...prev, {
      id: tempId,
      conversationId,
      senderId: user.id,
      senderName: 'You',
      senderAvatar: null,
      type: 'image',
      content: 'Photo',
      metadata: { imageUrl: '' },
      status: 'sending',
      createdAt: new Date().toISOString(),
    }]);
    scrollToBottom();

    try {
      const uploadResult = await uploadService.uploadFile(file, 'message_media', user.id);
      
      if (!uploadResult.success || !uploadResult.url) {
        throw new Error(uploadResult.error || 'Failed to upload image');
      }

      const imageUrl = uploadResult.url;
      const newMessage = await chatService.sendMessage(
        conversationId, user.id, 'Photo', 'text', { imageUrl, actualType: 'image' }
      );

      if (newMessage) {
        setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...newMessage, metadata: { imageUrl } } : m)));
      }
    } catch (err) {
      console.error('Failed to send image:', err);
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' as const } : m)));
    }
  };

  const handleSendVideo = async (file: File) => {
    if (!user) return;
    
    const tempId = `temp-${Date.now()}`;

    setMessages((prev) => [...prev, {
      id: tempId,
      conversationId,
      senderId: user.id,
      senderName: 'You',
      senderAvatar: null,
      type: 'video',
      content: 'Video',
      metadata: { videoUrl: '' },
      status: 'sending',
      createdAt: new Date().toISOString(),
    }]);
    scrollToBottom();

    try {
      const uploadResult = await uploadService.uploadFile(file, 'message_media', user.id);
      
      if (!uploadResult.success || !uploadResult.url) {
        throw new Error(uploadResult.error || 'Failed to upload video');
      }

      const videoUrl = uploadResult.url;
      const newMessage = await chatService.sendMessage(
        conversationId, user.id, 'Video', 'text', { videoUrl, actualType: 'video' }
      );

      if (newMessage) {
        setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...newMessage, metadata: { videoUrl } } : m)));
      }
    } catch (err) {
      console.error('Failed to send video:', err);
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' as const } : m)));
    }
  };

  const handleSendGift = async (gift: { id: string; name: string; icon: string }) => {
    if (!user) return;
    
    const tempId = `temp-${Date.now()}`;

    setMessages((prev) => [...prev, {
      id: tempId,
      conversationId,
      senderId: user.id,
      senderName: 'You',
      senderAvatar: null,
      type: 'gift',
      content: gift.name,
      metadata: {
        giftId: gift.id,
        giftName: gift.name,
        giftIcon: gift.icon,
      },
      status: 'sending',
      createdAt: new Date().toISOString(),
    }]);
    scrollToBottom();

    try {
      const newMessage = await chatService.sendMessage(
        conversationId, 
        user.id, 
        gift.name, 
        'gift', 
        { giftId: gift.id, giftName: gift.name, giftIcon: gift.icon }
      );

      if (newMessage) {
        setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...newMessage, metadata: { giftId: gift.id, giftName: gift.name, giftIcon: gift.icon } } : m)));
      }
    } catch (err) {
      console.error('Failed to send gift:', err);
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

  const scrollToPinnedMessage = (messageId: string) => {
    const element = document.getElementById(`message-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add(styles.highlightMessage);
      setTimeout(() => {
        element.classList.remove(styles.highlightMessage);
      }, 2000);
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

      {pinnedMessageIds.size > 0 && messages.some(m => pinnedMessageIds.has(m.id)) && (
        <div className={styles.pinnedBanner}>
          <div className={styles.pinnedBannerContent}>
            <Pin size={14} className={styles.pinnedBannerIcon} />
            <div className={styles.pinnedBannerText}>
              <span className={styles.pinnedBannerLabel}>Pinned Message</span>
              <span className={styles.pinnedBannerPreview}>
                {(() => {
                  const lastPinned = [...messages].reverse().find(m => pinnedMessageIds.has(m.id));
                  return lastPinned?.content?.substring(0, 50) || 'Message';
                })()}
              </span>
            </div>
          </div>
          <div className={styles.pinnedBannerActions}>
            {pinnedMessageIds.size > 1 && (
              <span className={styles.pinnedCount}>{pinnedMessageIds.size}</span>
            )}
            <button 
              className={styles.pinnedBannerButton}
              onClick={() => {
                const lastPinned = [...messages].reverse().find(m => pinnedMessageIds.has(m.id));
                if (lastPinned) scrollToPinnedMessage(lastPinned.id);
              }}
            >
              View
            </button>
            <button 
              className={styles.pinnedBannerClose}
              onClick={() => {
                const lastPinned = [...messages].reverse().find(m => pinnedMessageIds.has(m.id));
                if (lastPinned) handlePin(lastPinned);
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <div className={styles.messagesContainer} ref={containerRef} onScroll={handleScroll}>
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
              id={`message-${message.id}`}
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

      {showScrollDown && (
        <button 
          className={styles.scrollDownButton}
          onClick={() => scrollToBottom(true)}
          aria-label="Scroll to bottom"
        >
          <ChevronDown size={20} />
        </button>
      )}

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
          onSendImage={handleSendImage}
          onSendVideo={handleSendVideo}
          onTypingChange={() => {}}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
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
        onBlockUser={() => {
          setSettingsOpen(false);
          setBlockSheetOpen(true);
        }}
        onReportUser={() => {
          setSettingsOpen(false);
          setReportSheetOpen(true);
        }}
        onViewProfile={() => {
          setSettingsOpen(false);
          navigate(`/profile/${targetUserId}`);
        }}
        currentWallpaper={chatWallpaper?.wallpaperColor || null}
        disappearingEnabled={disappearingEnabled}
        disappearingDuration={disappearingDuration}
      />

      <GiftPicker open={giftPickerOpen} onClose={() => setGiftPickerOpen(false)} onSelectGift={handleSendGift} />


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






















