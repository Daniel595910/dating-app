import React, { useState, useEffect } from 'react';
import { X, Check, Users, MapPin, ChevronRight } from 'lucide-react';
import { supabase } from '@/config/supabase.client';
import styles from '../styles/CommunitySwitcher.module.css';

interface CommunitySwitcherProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  currentCommunityId: string;
  onSwitch: (communityId: string) => void;
}

interface JoinedCommunity {
  id: string;
  name: string;
  country: string;
  state: string | null;
  city: string | null;
  memberCount: number;
  isCurrent: boolean;
}

export const CommunitySwitcher: React.FC<CommunitySwitcherProps> = ({
  open,
  onClose,
  userId,
  currentCommunityId,
  onSwitch,
}) => {
  const [communities, setCommunities] = useState<JoinedCommunity[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && userId) {
      loadCommunities();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, userId]);

  const loadCommunities = async () => {
    setLoading(true);

    try {
      const { data: memberships } = await supabase
        .from('community_members')
        .select('community_id')
        .eq('user_id', userId);

      if (!memberships || memberships.length === 0) {
        setCommunities([]);
        setLoading(false);
        return;
      }

      const communityIds = [...new Set(memberships.map((m: any) => m.community_id))];

      const { data: communityData } = await supabase
        .from('communities')
        .select('id, name, country, state, city, member_count')
        .in('id', communityIds)
        .eq('is_active', true)
        .order('member_count', { ascending: false });

      setCommunities(
        (communityData || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          country: c.country,
          state: c.state,
          city: c.city,
          memberCount: c.member_count || 0,
          isCurrent: c.id === currentCommunityId,
        }))
      );
    } catch (err) {
      console.error('Failed to load communities:', err);
      setCommunities([]);
    }

    setLoading(false);
  };

  const handleSelect = (communityId: string) => {
    onSwitch(communityId);
    onClose();
  };

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.dragHandle} />

        <div className={styles.header}>
          <h3 className={styles.title}>Switch Community</h3>
          <button onClick={onClose} aria-label="Close" className={styles.closeButton}>
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <p className={styles.loading}>Loading...</p>
        ) : communities.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyText}>
              You haven&apos;t joined any communities yet.
            </p>
            <button
              className={styles.discoverButton}
              onClick={() => {
                onClose();
                window.location.href = '/discover-communities';
              }}
            >
              Discover Communities
            </button>
          </div>
        ) : (
          <div className={styles.list}>
            {communities.map((community) => (
              <button
                key={community.id}
                onClick={() => handleSelect(community.id)}
                className={`${styles.communityItem} ${community.isCurrent ? styles.communityItemCurrent : ''}`}
              >
                <div className={`${styles.iconWrapper} ${community.isCurrent ? styles.iconWrapperCurrent : ''}`}>
                  {community.isCurrent ? <Check size={20} /> : <Users size={20} />}
                </div>
                <div className={styles.communityInfo}>
                  <p className={styles.communityName}>{community.name}</p>
                  <p className={styles.communityMeta}>
                    <MapPin size={10} />
                    {[community.city, community.state, community.country]
                      .filter(Boolean)
                      .join(', ')}
                    {' · '}
                    {community.memberCount} member{community.memberCount === 1 ? '' : 's'}
                  </p>
                </div>
                <ChevronRight size={16} className={styles.chevron} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};