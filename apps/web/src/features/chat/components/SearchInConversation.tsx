import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import { ChatMessage } from '../../types/chat.types';

interface SearchInConversationProps {
  open: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onJumpToMessage: (messageId: string) => void;
}

export const SearchInConversation: React.FC<SearchInConversationProps> = ({
  open,
  onClose,
  messages,
  onJumpToMessage,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<ChatMessage[]>([]);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (term.trim().length < 2) {
      setResults([]);
      return;
    }

    const filtered = messages.filter((m) =>
      m.type === 'text' && m.content.toLowerCase().includes(term.toLowerCase())
    );
    setResults(filtered);
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: '#ffffff',
        zIndex: 20,
        padding: '0.75rem 1rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        maxHeight: '300px',
        overflowY: 'auto',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Search size={18} style={{ color: '#9ca3af' }} />
        <input
          autoFocus
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search in conversation..."
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            fontSize: '0.9375rem',
            fontFamily: 'inherit',
          }}
        />
        <button
          onClick={onClose}
          aria-label="Close search"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#6b7280',
            padding: '0.375rem',
            borderRadius: '9999px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={18} />
        </button>
      </div>

      {results.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {results.map((message) => (
            <button
              key={message.id}
              onClick={() => {
                onJumpToMessage(message.id);
                onClose();
              }}
              style={{
                padding: '0.5rem',
                background: 'none',
                border: 'none',
                borderBottom: '1px solid #f9fafb',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '0.8125rem',
                color: '#374151',
                borderRadius: '0.5rem',
              }}
            >
              {message.content.substring(0, 80)}
              {message.content.length > 80 ? '...' : ''}
            </button>
          ))}
        </div>
      ) : searchTerm.length >= 2 ? (
        <p style={{ fontSize: '0.8125rem', color: '#9ca3af', textAlign: 'center', margin: 0 }}>
          No messages found
        </p>
      ) : null}
    </div>
  );
};
