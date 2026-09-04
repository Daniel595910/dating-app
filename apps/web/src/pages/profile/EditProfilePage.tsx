import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/config/supabase.client';
import { ArrowLeft, Camera, Save, X } from 'lucide-react';
import { AvatarCropper } from '../../features/profile/components/AvatarCropper';
import { ProfileData } from '../../features/profile/types/profile.types';
import styles from './EditProfilePage.module.css';

export const EditProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [interests, setInterests] = useState('');
  const [occupation, setOccupation] = useState('');
  const [location, setLocation] = useState('');
  const [lookingFor, setLookingFor] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [cropperImage, setCropperImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setDisplayName(data.display_name || '');
        setBio(data.bio || '');
        setInterests((data.interests || []).join(', '));
        setOccupation(data.occupation || '');
        setLocation(data.location?.city || '');
        setLookingFor(data.relationship_intent || '');
        setAvatarUrl(data.avatar_url || null);
      }

      setLoading(false);
    };

    loadProfile();
  }, [user]);

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCropperImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCroppedImage = async (croppedBlob: Blob) => {
    if (!user) return;
    setCropperImage(null);
    setUploading(true);

    try {
      const timestamp = Date.now();
      const filePath = `avatar/${user.id}/${timestamp}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, croppedBlob, {
          cacheControl: '3600',
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      // Update profile avatar
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrlData.publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrlData.publicUrl);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const interestArray = interests
        .split(',')
        .map((i) => i.trim())
        .filter((i) => i.length > 0);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim(),
          bio: bio.trim(),
          interests: interestArray,
          occupation: occupation.trim() || null,
          relationship_intent: lookingFor || null,
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        navigate('/profile');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className={styles.editPage}>
      {cropperImage && (
        <AvatarCropper
          imageSrc={cropperImage}
          onCropComplete={handleCroppedImage}
          onCancel={() => setCropperImage(null)}
        />
      )}

      <header className={styles.header}>
        <button className={styles.headerButton} onClick={() => navigate('/profile')} aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <h1 className={styles.headerTitle}>Edit Profile</h1>
        <button className={styles.saveButton} onClick={handleSave} disabled={saving || uploading}>
          {saving ? 'Saving...' : <Save size={20} />}
        </button>
      </header>

      <div className={styles.form}>
        {success && (
          <div className={styles.successBanner}>
            Profile saved successfully!
          </div>
        )}

        {error && (
          <div className={styles.errorBanner}>
            {error}
          </div>
        )}

        {/* Avatar Section with Crop */}
        <div className={styles.avatarSection}>
          <div className={styles.avatarPreview}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className={styles.avatarImage} />
            ) : (
              <span className={styles.avatarFallback}>
                {(displayName || 'U').charAt(0).toUpperCase()}
              </span>
            )}
            {uploading && (
              <div className={styles.uploadOverlay}>
                <span className={styles.uploadSpinner} />
              </div>
            )}
          </div>
          <button
            className={styles.changePhotoButton}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Camera size={16} />
            {avatarUrl ? 'Change Photo' : 'Add Photo'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => handleFileSelect(e.target.files)}
            style={{ display: 'none' }}
          />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Display Name</label>
          <input
            className={styles.fieldInput}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            maxLength={100}
          />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Bio</label>
          <textarea
            className={styles.fieldTextarea}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell people about yourself..."
            rows={4}
            maxLength={500}
          />
          <span className={styles.charCount}>{bio.length}/500</span>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Interests (comma-separated)</label>
          <input
            className={styles.fieldInput}
            value={interests}
            onChange={(e) => setInterests(e.target.value)}
            placeholder="music, travel, food"
          />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Occupation</label>
          <input
            className={styles.fieldInput}
            value={occupation}
            onChange={(e) => setOccupation(e.target.value)}
            placeholder="Your occupation"
            maxLength={200}
          />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Location</label>
          <input
            className={styles.fieldInput}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="City"
          />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Looking For</label>
          <select
            className={styles.fieldSelect}
            value={lookingFor}
            onChange={(e) => setLookingFor(e.target.value)}
          >
            <option value="">Select...</option>
            <option value="serious_relationship">Serious Relationship</option>
            <option value="marriage">Marriage</option>
            <option value="casual_dating">Casual Dating</option>
            <option value="friendship">Friendship</option>
            <option value="long_term">Long Term</option>
            <option value="unsure">Not Sure</option>
          </select>
        </div>
      </div>
    </div>
  );
};
