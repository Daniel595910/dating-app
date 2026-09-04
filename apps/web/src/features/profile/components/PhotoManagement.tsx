import React, { useState, useRef } from 'react';
import { Camera, Trash2, X, Move } from 'lucide-react';
import { supabase } from '@/config/supabase.client';

interface PhotoManagementProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  photos: Array<{ id: string; url: string; order: number; isPrimary: boolean }>;
  onPhotosChanged: () => void;
}

export const PhotoManagement: React.FC<PhotoManagementProps> = ({
  open,
  onClose,
  userId,
  photos,
  onPhotosChanged,
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);

    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue;

        const timestamp = Date.now();
        const fileExtension = file.name.split('.').pop() || 'jpg';
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        const filePath = `profile/${userId}/${timestamp}-${randomSuffix}.${fileExtension}`;

        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(filePath, file, { cacheControl: '3600' });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('media')
          .getPublicUrl(filePath);

        await supabase.from('profile_photos').insert({
          profile_id: userId,
          url: publicUrlData.publicUrl,
          thumbnail_url: publicUrlData.publicUrl,
          order: photos.length,
          is_primary: photos.length === 0,
        });
      }

      onPhotosChanged();
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (photoId: string) => {
    const { error } = await supabase
      .from('profile_photos')
      .delete()
      .eq('id', photoId);

    if (!error) {
      onPhotosChanged();
    }
  };

  const handleSetPrimary = async (photoId: string) => {
    // First unset all primary
    await supabase
      .from('profile_photos')
      .update({ is_primary: false })
      .eq('profile_id', userId);

    // Set new primary
    await supabase
      .from('profile_photos')
      .update({ is_primary: true })
      .eq('id', photoId);

    // Update avatar
    const photo = photos.find((p) => p.id === photoId);
    if (photo) {
      await supabase
        .from('profiles')
        .update({ avatar_url: photo.url })
        .eq('user_id', userId);
    }

    onPhotosChanged();
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 999,
        display: 'flex',
        alignItems: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '1.5rem 1.5rem 0 0',
          width: '100%',
          maxWidth: 480,
          margin: '0 auto',
          maxHeight: '80dvh',
          padding: '0.5rem 1rem calc(1.5rem + env(safe-area-inset-bottom))',
          animation: 'slideUp 0.3s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            width: 40,
            height: 4,
            backgroundColor: '#e5e7eb',
            borderRadius: 9999px,
            margin: '0 auto 0.75rem',
          }}
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem',
          }}
        >
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#111827', margin: 0 }}>
            Profile Photos
          </h3>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '0.5rem',
              borderRadius: '9999px',
              minWidth: 44,
              minHeight: 44,
            }}
          >
            <X size={20} />
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={(e) => handleUpload(e.target.files)}
          style={{ display: 'none' }}
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: '0.75rem',
            background: 'none',
            border: '1px dashed #d1d5db',
            borderRadius: '0.75rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: 500,
            color: '#6b7280',
            marginBottom: '1rem',
            minHeight: 48,
          }}
        >
          <Camera size={18} />
          {uploading ? 'Uploading...' : 'Add Photos'}
        </button>

        {error && (
          <p style={{ color: '#ef4444', fontSize: '0.8125rem', marginBottom: '0.5rem' }}>
            {error}
          </p>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '0.5rem',
            overflowY: 'auto',
            maxHeight: '40dvh',
          }}
        >
          {photos.map((photo) => (
            <div
              key={photo.id}
              style={{
                position: 'relative',
                aspectRatio: '1',
                borderRadius: '0.75rem',
                overflow: 'hidden',
                border: photo.isPrimary ? '2px solid #ef4444' : '1px solid #e5e7eb',
              }}
            >
              <img
                src={photo.url}
                alt=""
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
              {photo.isPrimary && (
                <span
                  style={{
                    position: 'absolute',
                    top: '4px',
                    left: '4px',
                    padding: '0.25rem 0.5rem',
                    backgroundColor: '#ef4444',
                    color: '#ffffff',
                    fontSize: '0.625rem',
                    fontWeight: 600,
                    borderRadius: '9999px',
                  }}
                >
                  Primary
                </span>
              )}
              <div
                style={{
                  position: 'absolute',
                  bottom: '4px',
                  right: '4px',
                  display: 'flex',
                  gap: '4px',
                }}
              >
                {!photo.isPrimary && (
                  <button
                    onClick={() => handleSetPrimary(photo.id)}
                    style={{
                      background: 'rgba(0,0,0,0.6)',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#ffffff',
                      padding: '4px',
                      borderRadius: '4px',
                      fontSize: '0.625rem',
                    }}
                  >
                    Set Main
                  </button>
                )}
                <button
                  onClick={() => handleDelete(photo.id)}
                  aria-label="Delete photo"
                  style={{
                    background: 'rgba(0,0,0,0.6)',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#ffffff',
                    padding: '4px',
                    borderRadius: '4px',
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
    </div>
  );
};
