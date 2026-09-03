/**
 * CommunityAssign Page
 * Automatic community assignment after registration
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/config/supabase.client';
import { ROUTES } from '@/config/constants';
import { Community } from '@dating-app/types';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import styles from './CommunityAssign.module.css';

export const CommunityAssign: React.FC = () => {
  const navigate = useNavigate();
  const [community, setCommunity] = useState < Community | null > (null);
  const [error, setError] = useState < string | null > (null);
  
  useEffect(() => {
    const assignCommunity = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        
        // Get user profile with location
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('location')
          .eq('user_id', user.id)
          .single();
        
        if (profileError) throw profileError;
        
        const country = profile?.location?.country || 'Nigeria';
        
        // Find matching community
        const { data: communities, error: communityError } = await supabase
          .from('communities')
          .select('*')
          .eq('country', country)
          .eq('type', 'country')
          .eq('status', 'active')
          .limit(1);
        
        if (communityError) throw communityError;
        
        if (communities && communities.length > 0) {
          const assignedCommunity = communities[0] as Community;
          setCommunity(assignedCommunity);
          
          // Add user to community
          await supabase.from('community_members').insert({
            community_id: assignedCommunity.id,
            user_id: user.id,
            role: 'member',
          });
          
          // Redirect after short delay
          setTimeout(() => {
            navigate(ROUTES.COMMUNITY);
          }, 2000);
        } else {
          throw new Error('No community found for your location');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to assign community');
        setTimeout(() => {
          navigate(ROUTES.COMMUNITY);
        }, 3000);
      }
    };
    
    assignCommunity();
  }, [navigate]);
  
  if (error) {
    return (
      <div className={styles.container}>
        <p className={styles.error}>{error}</p>
        <p className={styles.redirect}>Redirecting to community...</p>
      </div>
    );
  }
  
  return (
    <div className={styles.container}>
      <LoadingScreen message="Assigning you to your community..." />
      {community && (
        <div className={styles.communityInfo}>
          <h2 className={styles.communityName}>{community.name}</h2>
          <p className={styles.communityDescription}>{community.description}</p>
        </div>
      )}
    </div>
  );
};