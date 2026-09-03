/**
 * EditProfile Page
 * Profile editing page
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/config/supabase.client';
import { ROUTES } from '@/config/constants';
import { Profile } from '@dating-app/types';
import { ProfileEdit } from '@/components/profile/ProfileEdit';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import styles from './EditProfile.module.css';

export const EditProfile: React.FC = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState < Profile | null > (null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState < string | null > (null);
  
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        
        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (fetchError) throw fetchError;
        setProfile(data as Profile);
      } catch (err: any) {
        setError(err.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, []);
  
  if (loading) {
    return <LoadingScreen message="Loading profile..." />;
  }
  
  if (error || !profile) {
    return (
      <div className={styles.errorContainer}>
        <p className={styles.error}>{error || 'Profile not found'}</p>
        <button className={styles.backButton} onClick={() => navigate(ROUTES.PROFILE)}>
          Go Back
        </button>
      </div>
    );
  }
  
  const handleSave = (updatedProfile: Profile) => {
    navigate(ROUTES.PROFILE);
  };
  
  const handleCancel = () => {
    navigate(ROUTES.PROFILE);
  };
  
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Edit Profile</h1>
      <ProfileEdit
        profile={profile}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </div>
  );
};