import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/config/supabase.client';
import { ArrowLeft, Search, Users, MapPin, Star, Lock, Globe, Compass, Check } from 'lucide-react';
import styles from './DiscoverCommunitiesPage.module.css';

interface DiscoverCommunity {
  id: string;
  name: string;
  slug: string;
  description: string;
  type: string;
  country: string;
  countryCode: string;
  state: string | null;
  city: string | null;
  memberCount: number;
  postCount: number;
  isPrivate: boolean;
  isSponsored: boolean;
  rules: string[];
}

export const DiscoverCommunitiesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [communities, setCommunities] = useState<DiscoverCommunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'city' | 'state' | 'country'>('all');
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const [joiningId, setJoiningId] = useState<string | null>(null);

  useEffect(() => {
    loadCommunities();
  }, [user]);

  const loadCommunities = async () => {
    if (!user) return;

    try {
      // Get user's location
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('location')
        .eq('user_id', user.id)
        .maybeSingle();

      const userCountry = userProfile?.location?.country || 'Nigeria';
      const userState = userProfile?.location?.state || null;
      const userCity = userProfile?.location?.city || null;

      // Get all communities in user's country
      const { data: communityData } = await supabase
        .from('communities')
        .select('*')
        .eq('country', userCountry)
        .eq('status', 'active')
        .order('member_count', { ascending: false });

      // Get user's joined communities
      const { data: memberships } = await supabase
        .from('community_members')
        .select('community_id')
        .eq('user_id', user.id);

      setJoinedIds(new Set((memberships || []).map((m: any) => m.community_id)));

      // Mark sponsored communities (check sponsorships)
      const { data: sponsorships } = await supabase
        .from('community_sponsorships')
        .select('community_id')
        .eq('is_active', true);

      const sponsoredIds = new Set((sponsorships || []).map((s: any) => s.community_id));

      setCommunities(
        (communityData || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          description: c.description,
          type: c.type,
          country: c.country,
          countryCode: c.country_code,
          state: c.state,
          city: c.city,
          memberCount: c.member_count || 0,
          postCount: c.post_count || 0,
          isPrivate: c.status === 'locked',
          isSponsored: sponsoredIds.has(c.id),
          rules: c.rules || [],
        }))
      );
    } catch (err) {
      console.error('Failed to load communities:', err);
    }

    setLoading(false);
  };

  const handleJoin = async (communityId: string) => {
    if (!user) return;
    setJoiningId(communityId);

    try {
      await supabase.from('community_members').insert({
        community_id: communityId,
        user_id: user.id,
        role: 'member',
      });

      setJoinedIds((prev) => new Set([...prev, communityId]));
    } catch (err) {
      console.error('Failed to join:', err);
    } finally {
      setJoiningId(null);
    }
  };

  const handleEnter = (communityId: string) => {
    navigate('/community/' + communityId);
  };

  const filteredCommunities = communities
    .filter((c) => {
      if (filterType === 'city') return c.city !== null;
      if (filterType === 'state') return c.state !== null;
      if (filterType === 'country') return c.type === 'country';
      return true;
    })
    .filter((c) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        c.name.toLowerCase().includes(term) ||
        (c.city && c.city.toLowerCase().includes(term)) ||
        (c.state && c.state.toLowerCase().includes(term)) ||
        c.country.toLowerCase().includes(term)
      );
    });

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.headerButton} onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <div className={styles.searchContainer}>
          <Search size={18} className={styles.searchIcon} />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search communities..."
            className={styles.searchInput}
          />
        </div>
      </header>

      <div className={styles.content}>
        <div className={styles.titleRow}>
          <Compass size={20} className={styles.titleIcon} />
          <h1 className={styles.title}>Discover Communities</h1>
        </div>

        {/* Filter chips */}
        <div className={styles.filterRow}>
          {(['all', 'city', 'state', 'country'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`${styles.filterChip} ${filterType === type ? styles.filterChipActive : ''}`}
            >
              {type === 'all' ? 'All' : type === 'city' ? 'City' : type === 'state' ? 'State' : 'Country'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className={styles.loadingState}>
            <p>Loading communities...</p>
          </div>
        ) : filteredCommunities.length === 0 ? (
          <div className={styles.emptyState}>
            <Compass size={40} className={styles.emptyIcon} />
            <p className={styles.emptyTitle}>No communities found</p>
            <p className={styles.emptyText}>
              Try a different search or filter
            </p>
          </div>
        ) : (
          <div className={styles.communitiesList}>
            {/* Sponsored first */}
            {filteredCommunities
              .filter((c) => c.isSponsored)
              .map((community) => (
                <CommunityCard
                  key={community.id}
                  community={community}
                  isJoined={joinedIds.has(community.id)}
                  isJoining={joiningId === community.id}
                  onJoin={() => handleJoin(community.id)}
                  onEnter={() => handleEnter(community.id)}
                />
              ))}

            {/* Non-sponsored */}
            {filteredCommunities
              .filter((c) => !c.isSponsored)
              .map((community) => (
                <CommunityCard
                  key={community.id}
                  community={community}
                  isJoined={joinedIds.has(community.id)}
                  isJoining={joiningId === community.id}
                  onJoin={() => handleJoin(community.id)}
                  onEnter={() => handleEnter(community.id)}
                />
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface CommunityCardProps {
  community: DiscoverCommunity;
  isJoined: boolean;
  isJoining: boolean;
  onJoin: () => void;
  onEnter: () => void;
}

const CommunityCard: React.FC<CommunityCardProps> = ({ community, isJoined, isJoining, onJoin, onEnter }) => {
  return (
    <div className={`${styles.card} ${community.isSponsored ? styles.cardSponsored : ''}`}>
      {community.isSponsored && (
        <div className={styles.sponsoredBadge}>
          <Star size={12} />
          Sponsored
        </div>
      )}

      <div className={styles.cardHeader}>
        <h3 className={styles.cardName}>{community.name}</h3>
        {community.isPrivate ? (
          <Lock size={14} className={styles.privateIcon} />
        ) : (
          <Globe size={14} className={styles.publicIcon} />
        )}
      </div>

      {community.description && (
        <p className={styles.cardDescription}>{community.description}</p>
      )}

      <div className={styles.cardMeta}>
        <span className={styles.metaItem}>
          <MapPin size={12} />
          {[community.city, community.state, community.country].filter(Boolean).join(', ')}
        </span>
        <span className={styles.metaItem}>
          <Users size={12} />
          {community.memberCount.toLocaleString()} members
        </span>
      </div>

      {isJoined ? (
        <button className={styles.enterButton} onClick={onEnter}>
          <Check size={14} />
          Enter Community
        </button>
      ) : (
        <button
          className={styles.joinButton}
          onClick={onJoin}
          disabled={isJoining}
        >
          {isJoining ? 'Joining...' : 'Join Community'}
        </button>
      )}
    </div>
  );
};
