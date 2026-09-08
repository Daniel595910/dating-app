import React, { useState, useEffect } from 'react';
import { X, Send, Search, Check, ArrowRight, Image, Video, Gift, MessageCircle } from 'lucide-react';
import { supabase } from '@/config/supabase.client';
import { ChatMessage } from '../../types/chat.types';
import styles from '../styles/ForwardMessageSheet.module.css';

interface ForwardMessageSheetProps {
  open: boolean;
  onClose: () => void;
  message: ChatMessage | null;
  currentUserId: string;
  onForward: (targetConversationId: string) => void;
}

interface ConversationItem {
  id: string;
  name: string;
  avatar: string | null;
  isOnline: boolean;
}

export const ForwardMessageSheet: React.FC<ForwardMessageSheetProps> = ({
  open,
  onClose,
  message,
  currentUserId,
  onForward,
}) => {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [forwarding, setForwarding] = useState(false);
  const [forwardSuccess, setForwardSuccess] = useState(false);

  useEffect(() => {
    if (!open || !currentUserId) return;

    const loadConversations = async () => {
      setLoading(true);
      const { data: convs } = await supabase
        .from('conversations')
        .select('*')
        .contains('participant_ids', [currentUserId])
        .order('last_message_at', { ascending: false })
        .limit(30);

      if (convs) {
        const otherUserIds = convs.flatMap((c: any) => c.participant_ids).filter((id: string) => id !== currentUserId);
        
        const [profilesResult, presenceResult] = await Promise.all([
          supabase.from('profiles').select('user_id, display_name, avatar_url').in('user_id', otherUserIds),
          supabase.from('presence').select('user_id, is_online').in('user_id', otherUserIds),
        ]);

        const profileMap = new Map((profilesResult.data || []).map((p: any) => [p.user_id, p]));
        const presenceMap = new Map((presenceResult.data || []).map((p: any) => [p.user_id, p.is_online]));

        setConversations(convs.map((c: any) => {
          const otherId = c.participant_ids.find((id: string) => id !== currentUserId);
          const profile = profileMap.get(otherId);
          return {
            id: c.id,
            name: profile?.display_name || 'User',
            avatar: profile?.avatar_url || null,
            isOnline: presenceMap.get(otherId) || false,
          };
        }));
      }
      setLoading(false);
    };

    loadConversations();
    setSelectedIds(new Set());
    setForwardSuccess(false);
  }, [open, currentUserId]);

  const filteredConversations = conversations.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSelection = (conversationId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(conversationId)) {
        next.delete(conversationId);
      } else {
        next.add(conversationId);
      }
      return next;
    });
  };

  const handleForward = async () => {
    if (selectedIds.size === 0 || forwarding) return;
    
    setForwarding(true);
    
    for (const conversationId of selectedIds) {
      await onForward(conversationId);
    }
    
    setForwarding(false);
    setForwardSuccess(true);
    
    setTimeout(() => {
      onClose();
      setForwardSuccess(false);
    }, 800);
  };

  if (!open || !message) return null;

  const getMessageIcon = () => {
    if (message.metadata?.imageUrl) return <Image size={16} />;
    if (message.metadata?.videoUrl) return <Video size={16} />;
    if (message.metadata?.giftIcon) return <Gift size={16} />;
    return <MessageCircle size={16} />;
  };

  const getMessagePreview = () => {
    if (message.metadata?.imageUrl) return 'Photo';
    if (message.metadata?.videoUrl) return 'Video';
    if (message.metadata?.giftIcon) return `Gift: ${message.metadata.giftName || 'Gift'}`;
    return message.content.substring(0, 80) + (message.content.length > 80 ? '...' : '');
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={22} />
          </button>
          <div className={styles.headerTitle}>
            <h2 className={styles.title}>Send to</h2>
            {selectedIds.size > 0 && (
              <span className={styles.selectedCount}>{selectedIds.size}</span>
            )}
          </div>
          <button 
            className={`${styles.sendButton} ${selectedIds.size > 0 ? styles.sendButtonActive : ''}`}
            onClick={handleForward}
            disabled={selectedIds.size === 0 || forwarding}
          >
            {forwardSuccess ? <Check size={20} /> : <Send size={20} />}
          </button>
        </div>

        <div className={styles.messagePreview}>
          <div className={styles.previewIconWrapper}>
            {getMessageIcon()}
          </div>
          <div className={styles.previewContent}>
            <span className={styles.previewText}>{getMessagePreview()}</span>
          </div>
          <ArrowRight size={16} className={styles.previewArrow} />
        </div>

        <div className={styles.searchBar}>
          <Search size={16} />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
            autoFocus
          />
          {searchQuery && (
            <button className={styles.clearSearch} onClick={() => setSearchQuery('')}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className={styles.conversationList}>
          {loading ? (
            <div className={styles.loading}>
              <span className={styles.spinner} />
              <span>Loading...</span>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className={styles.empty}>No chats found</div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = selectedIds.has(conv.id);
              
              return (
                <button
                  key={conv.id}
                  className={`${styles.conversationItem} ${isSelected ? styles.conversationItemSelected : ''}`}
                  onClick={() => toggleSelection(conv.id)}
                >
                  <div className={styles.avatarWrapper}>
                    <div className={styles.avatar}>
                      {conv.avatar ? (
                        <img src={conv.avatar} alt={conv.name} />
                      ) : (
                        conv.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    {conv.isOnline && <span className={styles.onlineDot} />}
                  </div>
                  
                  <div className={styles.conversationInfo}>
                    <span className={styles.conversationName}>{conv.name}</span>
                    {conv.isOnline && (
                      <span className={styles.onlineStatus}>Active now</span>
                    )}
                  </div>
                  
                  <div className={`${styles.checkbox} ${isSelected ? styles.checkboxSelected : ''}`}>
                    {isSelected && <Check size={14} />}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
