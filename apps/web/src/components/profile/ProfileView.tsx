/**
 * ProfileView Component
 * Displays user profile information
 */

import React from 'react';
import { Profile } from '@dating-app/types';
import { UserAvatar } from '../common/UserAvatar';
import { Badge } from '@dating-app/ui';
import styles from './ProfileView.module.css';

interface ProfileViewProps {
  profile: Profile;
  isOwnProfile ? : boolean;
  onEdit ? : () => void;
}

export const ProfileView: React.FC < ProfileViewProps > = ({
  profile,
  isOwnProfile = false,
  onEdit,
}) => {
  return (
    <div className={styles.profile}>
      <div className={styles.header}>
        <UserAvatar
          src={profile.avatar_url}
          name={profile.display_name}
          size="xl"
          verified={profile.is_verified}
        />
        <h1 className={styles.displayName}>{profile.display_name}</h1>
        {profile.verification_badge && profile.verification_badge !== 'none' && (
          <Badge variant="success">{profile.verification_badge}</Badge>
        )}
        {isOwnProfile && onEdit && (
          <button className={styles.editButton} onClick={onEdit}>
            Edit Profile
          </button>
        )}
      </div>

      {profile.bio && <p className={styles.bio}>{profile.bio}</p>}

      {profile.location && (
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Location:</span>
          <span className={styles.infoValue}>
            {[
              profile.location.city,
              profile.location.state,
              profile.location.country,
            ]
              .filter(Boolean)
              .join(', ')}
          </span>
        </div>
      )}

      {profile.relationship_intent && (
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Looking for:</span>
          <span className={styles.infoValue}>
            {profile.relationship_intent.replace(/_/g, ' ')}
          </span>
        </div>
      )}

      {profile.occupation && (
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Occupation:</span>
          <span className={styles.infoValue}>{profile.occupation}</span>
        </div>
      )}

      {profile.interests && profile.interests.length > 0 && (
        <div className={styles.interestsSection}>
          <h2 className={styles.sectionTitle}>Interests</h2>
          <div className={styles.interests}>
            {profile.interests.map((interest, index) => (
              <span key={index} className={styles.interest}>
                {interest}
              </span>
            ))}
          </div>
        </div>
      )}

      {profile.languages && profile.languages.length > 0 && (
        <div className={styles.languagesSection}>
          <h2 className={styles.sectionTitle}>Languages</h2>
          <div className={styles.languages}>
            {profile.languages.map((language, index) => (
              <span key={index} className={styles.language}>
                {language}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};