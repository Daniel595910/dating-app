/**
 * ProfileEdit Component
 * Profile editing form
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '@/config/supabase.client';
import { APP_LIMITS } from '@/config/constants';
import { Button, Input } from '@dating-app/ui';
import { Profile } from '@dating-app/types';
import styles from './ProfileEdit.module.css';

interface ProfileEditProps {
  profile: Profile;
  onSave: (updatedProfile: Profile) => void;
  onCancel: () => void;
}

export const ProfileEdit: React.FC < ProfileEditProps > = ({
  profile,
  onSave,
  onCancel,
}) => {
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [bio, setBio] = useState(profile.bio || '');
  const [interests, setInterests] = useState(profile.interests.join(', '));
  const [languages, setLanguages] = useState(profile.languages.join(', '));
  const [occupation, setOccupation] = useState(profile.occupation || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState < string | null > (null);
  
  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const interestArray = interests
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
      
      const languageArray = languages
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
      
      const { data, error: updateError } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim(),
          bio: bio.trim() || null,
          interests: interestArray,
          languages: languageArray,
          occupation: occupation.trim() || null,
        })
        .eq('user_id', profile.user_id)
        .select()
        .single();
      
      if (updateError) throw updateError;
      onSave(data as Profile);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className={styles.form}>
      <Input
        label="Display Name"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        required
        minLength={APP_LIMITS.PROFILE_DISPLAY_NAME_MIN_LENGTH}
        maxLength={APP_LIMITS.PROFILE_DISPLAY_NAME_MAX_LENGTH}
      />

      <Input
        textarea
        label="Bio"
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        maxLength={APP_LIMITS.PROFILE_BIO_MAX_LENGTH}
        helperText={`${bio.length}/${APP_LIMITS.PROFILE_BIO_MAX_LENGTH}`}
        placeholder="Tell people about yourself"
      />

      <Input
        label="Interests (comma-separated)"
        value={interests}
        onChange={(e) => setInterests(e.target.value)}
        placeholder="music, travel, food"
      />

      <Input
        label="Languages (comma-separated)"
        value={languages}
        onChange={(e) => setLanguages(e.target.value)}
        placeholder="English, Spanish, French"
      />

      <Input
        label="Occupation"
        value={occupation}
        onChange={(e) => setOccupation(e.target.value)}
        placeholder="Your occupation"
      />

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.actions}>
        <Button variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} loading={loading}>
          Save
        </Button>
      </div>
    </div>
  );
};