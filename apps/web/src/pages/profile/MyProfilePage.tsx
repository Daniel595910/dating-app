/**
 * MyProfilePage Component
 * User's own profile page
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { profileService } from '@/services/profile.service';
import { Profile } from '@dating-app/types';
import { ProfileView } from '@/components/profile/ProfileView';
import { VipStatus } from '@/components/profile/VipStatus';
import { VerificationBadge } from '@/components/profile/VerificationBadge';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { Button } from '@dating-app/ui';
import { ROUTES } from '@/config/constants';
import styles from './MyProfilePage.module.css';

export const MyProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [profile, setProfile] = useState < Profile | null > (null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      try {
        const userProfile = await profileService.getProfileByUserId(user.id);
        setProfile(userProfile);
      } catch (error) {
        console.error('Failed to load profile:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, [user]);
  
  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.LOGIN);
  };
  
  if (loading) {
    return <LoadingScreen message="Loading profile..." />;
  }
  
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>My Profile</h1>

      {profile ? (
        <>
          <ProfileView
            profile={profile}
            isOwnProfile
            onEdit={() => navigate(ROUTES.PROFILE_EDIT)}
          />
          <Button variant="outline" onClick={() => navigate(ROUTES.PROFILE_VIP)} fullWidth>
            VIP Membership
          </Button>
          <Button variant="outline" onClick={() => navigate(ROUTES.SETTINGS)} fullWidth>
            Settings
          </Button>
          <Button variant="danger" onClick={handleLogout} fullWidth>
            Logout
          </Button>
        </>
      ) : (
        <div className={styles.emptyState}>
          <p className={styles.emptyText}>No profile found.</p>
          <Button onClick={() => navigate(ROUTES.LOCATION)}>
            Complete Registration
          </Button>
        </div>
      )}
    </div>
  );
};