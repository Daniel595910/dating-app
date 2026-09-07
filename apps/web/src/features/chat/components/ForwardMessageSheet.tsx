import React, { useState, useEffect } from 'react';
import { X, Send, Search } from 'lucide-react';
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

export const ForwardMessageSheet: React.FC<ForwardMessageSheetProps> = ({
  open,
  onClose,
  message,
  currentUserId,
  onForward,
}) => {
  const [conversations, setConversations] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

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
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', otherUserIds);

        const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

        setConversations(convs.map((c: any) => {
          const otherId = c.participant_ids.find((id: string) => id !== currentUserId);
          const profile = profileMap.get(otherId);
          return {
            id: c.id,
            name: profile?.display_name || 'User',
            avatar: profile?.avatar_url || null,
          };
        }));
      }
      setLoading(false);
    };

    loadConversations();
  }, [open, currentUserId]);

  const filteredConversations = conversations.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!open || !message) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={20} />
          </button>
          <h2 className={styles.title}>Forward Message</h2>
          <button 
            className={styles.sendButton}
            onClick={() => { onClose(); }}
          >
            <Send size={18} />
          </button>
        </div>

        <div className={styles.messagePreview}>
          <p className={styles.previewLabel}>Message:</p>
          <p className={styles.previewContent}>
            {message.content.substring(0, 80)}
            {message.content.length > 80 ? '...' : ''}
          </p>
        </div>

        <div className={styles.searchBar}>
          <Search size={16} />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.conversationList}>
          {loading ? (
            <p className={styles.loading}>Loading...</p>
          ) : filteredConversations.length === 0 ? (
            <p className={styles.empty}>No conversations found</p>
          ) : (
            filteredConversations.map((conv) => (
              <button
                key={conv.id}
                className={styles.conversationItem}
                onClick={() => {
                  onForward(conv.id);
                  onClose();
                }}
              >
                <div className={styles.avatar}>
                  {conv.avatar ? (
                    <img src={conv.avatar} alt={conv.name} />
                  ) : (
                    conv.name.charAt(0).toUpperCase()
                  )}
                </div>
                <span className={styles.conversationName}>{conv.name}</span>
                <Send size={14} className={styles.forwardIcon} />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
