import React from 'react';
import { Plus, X, Camera, Heart, MessageCircle, Sparkles } from 'lucide-react';

interface CreatePostSheetProps {
  open: boolean;
  onClose: () => void;
  onSelectType: (type: 'photo' | 'looking' | 'discussion' | 'introduction') => void;
}

export const CreatePostSheet: React.FC<CreatePostSheetProps> = ({ open, onClose, onSelectType }) => {
  if (!open) return null;

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: '#ffffff', borderRadius: '1.5rem 1.5rem 0 0', padding: '1.5rem 1rem calc(1.5rem + env(safe-area-inset-bottom))', width: '100%', maxWidth: 480, margin: '0 auto' }}>
        <div style={{ width: 40, height: 4, backgroundColor: '#e5e7eb', borderRadius: '9999px', margin: '0 auto 1rem' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: '#111827' }}>What do you want to share?</h2>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '0.25rem' }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <button onClick={() => onSelectType('photo')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '1rem', backgroundColor: '#f9fafb', border: '1px solid #f3f4f6', borderRadius: '1rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}>
            <Camera size={24} style={{ color: '#3b82f6' }} />
            Photo
          </button>
          <button onClick={() => onSelectType('looking')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '1rem', backgroundColor: '#f9fafb', border: '1px solid #f3f4f6', borderRadius: '1rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}>
            <Heart size={24} style={{ color: '#ef4444' }} />
            Looking for...
          </button>
          <button onClick={() => onSelectType('discussion')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '1rem', backgroundColor: '#f9fafb', border: '1px solid #f3f4f6', borderRadius: '1rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}>
            <MessageCircle size={24} style={{ color: '#10b981' }} />
            Start conversation
          </button>
          <button onClick={() => onSelectType('introduction')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '1rem', backgroundColor: '#f9fafb', border: '1px solid #f3f4f6', borderRadius: '1rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}>
            <Sparkles size={24} style={{ color: '#f59e0b' }} />
            Introduce myself
          </button>
        </div>
      </div>
    </div>
  );
};

export const CreatePostButton: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  return (
    <button onClick={onClick} aria-label="Create post" style={{ position: 'fixed', bottom: 'calc(5.5rem + env(safe-area-inset-bottom))', right: '1rem', width: 56, height: 56, borderRadius: '50%', backgroundColor: '#ef4444', color: '#ffffff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(239,68,68,0.4)', zIndex: 50 }}>
      <Plus size={28} />
    </button>
  );
};
