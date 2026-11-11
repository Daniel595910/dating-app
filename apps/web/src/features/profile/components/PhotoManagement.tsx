import React, { useState, useRef } from 'react';
import { Camera, Trash2, X, Star } from 'lucide-react';
import { supabase } from '@/config/supabase.client';
import styles from './PhotoManagement.module.css';

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
  const [settingPrimary, setSettingPrimary] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);

    try {
      const { data: profileRecord } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!profileRecord) throw new Error('Profile not found');

      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue;

        const timestamp = Date.now();
        const fileExtension = file.name.split('.').pop() || 'jpg';
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        const filePath = 'profile/' + userId + '/' + timestamp + '-' + randomSuffix + '.' + fileExtension;

        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(filePath, file, { cacheControl: '3600' });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('media')
          .getPublicUrl(filePath);

        const isFirstPhoto = photos.length === 0;

        await supabase.from('profile_photos').insert({
          profile_id: profileRecord.id,
          url: publicUrlData.publicUrl,
          thumbnail_url: publicUrlData.publicUrl,
          order: photos.length,
          is_primary: isFirstPhoto,
        });

        // If first photo, set as avatar
        if (isFirstPhoto) {
          await supabase
            .from('profiles')
            .update({ avatar_url: publicUrlData.publicUrl })
            .eq('user_id', userId);
        }
      }

      onPhotosChanged();
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (photoId: string) => {
    const photo = photos.find((p) => p.id === photoId);
    if (!photo) return;
    const confirmMsg = photo.isPrimary
      ? 'This is your primary photo. Deleting it will pick a new primary automatically. Continue?'
      : 'Delete this photo?';
    if (!window.confirm(confirmMsg)) return;

    setError(null);
    const { error } = await supabase
      .from('profile_photos')
      .delete()
      .eq('id', photoId);

    if (error) {
      setError('Failed to delete photo');
      return;
    }

    // If we just deleted the primary, promote the next photo
    if (photo.isPrimary) {
      const remaining = photos.filter((p) => p.id !== photoId);
      if (remaining.length > 0) {
        const nextPrimary = remaining[0];
        const { data: profileRecord } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', userId)
          .single();
        if (profileRecord) {
          await supabase
            .from('profile_photos')
            .update({ is_primary: true })
            .eq('id', nextPrimary.id);
          await supabase
            .from('profiles')
            .update({ avatar_url: nextPrimary.url })
            .eq('user_id', userId);
        }
      } else {
        // No photos left — clear avatar
        await supabase
          .from('profiles')
          .update({ avatar_url: null })
          .eq('user_id', userId);
      }
    }

    onPhotosChanged();
  };

  const handleSetPrimary = async (photoId: string) => {
    setSettingPrimary(photoId);
    setError(null);

    try {
      // Get profile record ID
      const { data: profileRecord } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!profileRecord) throw new Error('Profile not found');

      // Unset all primary
      await supabase
        .from('profile_photos')
        .update({ is_primary: false })
        .eq('profile_id', profileRecord.id);

      // Set new primary
      const { error: updateError } = await supabase
        .from('profile_photos')
        .update({ is_primary: true })
        .eq('id', photoId);

      if (updateError) throw updateError;

      // Find the photo URL and update avatar
      const photo = photos.find((p) => p.id === photoId);
      if (photo) {
        await supabase
          .from('profiles')
          .update({ avatar_url: photo.url })
          .eq('user_id', userId);
      }

      onPhotosChanged();
    } catch (err: any) {
      console.error('Set primary error:', err);
      setError(err.message || 'Failed to set primary photo');
    } finally {
      setSettingPrimary(null);
    }
  };

  if (!open) return null;
  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.dragHandle} />

        <div className={styles.header}>
          <h3 className={styles.title}>Profile Photos</h3>
          <button onClick={onClose} aria-label="Close" className={styles.closeButton}>
            <X size={20} />
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={(e) => handleUpload(e.target.files)}
          className={styles.hiddenInput}
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className={styles.uploadZone}
        >
          <Camera size={28} className={styles.uploadZoneIcon} />
          <p className={styles.uploadZoneText}>{uploading ? 'Uploading...' : 'Add Photos'}</p>
          <p className={styles.uploadZoneHint}>JPG, PNG, or WEBP · Up to 5 photos</p>
        </button>

        {uploading && (
          <div className={styles.uploadingBanner}>
            <div className={styles.spinner} />
            Uploading photos...
          </div>
        )}

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.photoGrid}>
          {photos.length === 0 ? (
            <div className={styles.emptyPhotos}>
              No photos yet — add your first photo above
            </div>
          ) : (
            photos.map((photo) => (
              <div
                key={photo.id}
                className={`${styles.photoItem} ${photo.isPrimary ? styles.photoItemPrimary : ''}`}
              >
                <img src={photo.url} alt="" className={styles.photoImage} />
                {photo.isPrimary && (
                  <span className={styles.primaryBadge}>Main</span>
                )}
                <div className={styles.photoActions}>
                  {!photo.isPrimary && (
                    <button
                      onClick={() => handleSetPrimary(photo.id)}
                      disabled={settingPrimary === photo.id}
                      aria-label="Set as main photo"
                      title="Set as main photo"
                      className={styles.photoActionBtn}
                    >
                      {settingPrimary === photo.id ? (
                        <div className={styles.spinner} style={{ width: 14, height: 14 }} />
                      ) : (
                        <Star size={14} />
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(photo.id)}
                    aria-label="Delete photo"
                    title="Delete photo"
                    className={`${styles.photoActionBtn} ${styles.photoActionBtnDanger}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
