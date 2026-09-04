import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/config/supabase.client';
import { ArrowLeft, Camera, Save, X } from 'lucide-react';
import { ProfileData } from '../../features/profile/types/profile.types';
import styles from './EditProfilePage.module.css';

export const EditProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [interests, setInterests] = useState('');
  const [occupation, setOccupation] = useState('');
  const [location, setLocation] = useState('');
  const [lookingFor, setLookingFor] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setProfile(data);
        setDisplayName(data.display_name || '');
        setBio(data.bio || '');
        setInterests((data.interests || []).join(', '));
        setOccupation(data.occupation || '');
        setLocation(data.location?.city || '');
        setLookingFor(data.relationship_intent || '');
      }

      setLoading(false);
    };

    loadProfile();
  }, [user]);

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
      <header className={styles.header}>
        <button className={styles.headerButton} onClick={() => navigate('/profile')} aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <h1 className={styles.headerTitle}>Edit Profile</h1>
        <button className={styles.saveButton} onClick={handleSave} disabled={saving}>
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

        {/* Avatar Section */}
        <div className={styles.avatarSection}>
          <div className={styles.avatarPreview}>
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} alt="" className={styles.avatarImage} />
            ) : (
              <span className={styles.avatarFallback}>
                {(displayName || 'U').charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <button className={styles.changePhotoButton}>
            <Camera size={16} />
            Change Photo
          </button>
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
