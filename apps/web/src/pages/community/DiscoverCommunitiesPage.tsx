import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/config/supabase.client';
import { ArrowLeft, Search, Users, MapPin, Star, Lock, Globe, Compass, Check, TrendingUp, Filter, X, ChevronRight } from 'lucide-react';
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
  isJoined: boolean;
  isAdmin: boolean;
  rules: string[];
  createdAt: string;
}

type SortOption = 'popular' | 'newest' | 'sponsored' | 'nearest';
type FilterType = 'all' | 'featured' | 'city' | 'state' | 'country' | 'private' | 'public';

export const DiscoverCommunitiesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [communities, setCommunities] = useState<DiscoverCommunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortOption>('popular');
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [userLocation, setUserLocation] = useState<string>('');

  const loadCommunities = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      // Get user location
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('location')
        .eq('user_id', user.id)
        .maybeSingle();

      const userCountry = userProfile?.location?.country || 'Nigeria';
      const userState = userProfile?.location?.state || null;
      const userCity = userProfile?.location?.city || null;

      setUserLocation([userCity, userState, userCountry].filter(Boolean).join(', '));

      // Get all communities in user's country
      const { data: communityData, error: communityError } = await supabase
        .from('communities')
        .select('*')
        .eq('country', userCountry)
        .eq('status', 'active')
        .order('member_count', { ascending: false });

      if (communityError) throw communityError;

      // Get user's memberships
      const { data: memberships } = await supabase
        .from('community_members')
        .select('community_id, role')
        .eq('user_id', user.id);

      const membershipMap = new Map((memberships || []).map((m: any) => [m.community_id, m.role]));

      // Get sponsorships
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
          isJoined: membershipMap.has(c.id),
          isAdmin: membershipMap.get(c.id) === 'admin',
          rules: c.rules || [],
          createdAt: c.created_at,
        }))
      );
    } catch (err: any) {
      console.error('Failed to load communities:', err);
      setError('Failed to load communities. Please try again.');
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadCommunities();
  }, [loadCommunities]);

  const handleJoin = async (communityId: string) => {
    if (!user) return;
    setJoiningId(communityId);
    setError(null);

    try {
      const { error: joinError } = await supabase
        .from('community_members')
        .insert({
          community_id: communityId,
          user_id: user.id,
          role: 'member',
        });

      if (joinError && joinError.code !== '23505') throw joinError;

      // Update local state
      setCommunities((prev) =>
        prev.map((c) =>
          c.id === communityId
            ? { ...c, isJoined: true, memberCount: c.memberCount + 1 }
            : c
        )
      );
    } catch (err: any) {
      console.error('Failed to join:', err);
      setError('Failed to join community. Please try again.');
    } finally {
      setJoiningId(null);
    }
  };

  const handleEnter = (communityId: string, communityName: string) => {
    // Store selected community in localStorage
    localStorage.setItem('selectedCommunityId', communityId);
    localStorage.setItem('selectedCommunityName', communityName);
    navigate('/community');
  };

  const getSortedAndFiltered = () => {
    let result = [...communities];

    // Filter
    if (filterType === 'city') result = result.filter((c) => c.city !== null);
    if (filterType === 'state') result = result.filter((c) => c.state !== null);
    if (filterType === 'country') result = result.filter((c) => c.type === 'country');
    if (filterType === 'private') result = result.filter((c) => c.isPrivate);
    if (filterType === 'public') result = result.filter((c) => !c.isPrivate);

    // Search
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          (c.city && c.city.toLowerCase().includes(term)) ||
          (c.state && c.state.toLowerCase().includes(term)) ||
          c.country.toLowerCase().includes(term) ||
          (c.description && c.description.toLowerCase().includes(term))
      );
    }

    // Sort
    if (sortBy === 'popular') {
      result.sort((a, b) => b.memberCount - a.memberCount);
    } else if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortBy === 'sponsored') {
      result.sort((a, b) => Number(b.isSponsored) - Number(a.isSponsored));
    } else if (sortBy === 'nearest') {
      // Sort by whether city matches user's city
      result.sort((a, b) => {
        const aNear = a.city === userLocation.split(', ')[0] ? 1 : 0;
        const bNear = b.city === userLocation.split(', ')[0] ? 1 : 0;
        return bNear - aNear;
      });
    }

    return result;
  };

  const displayedCommunities = getSortedAndFiltered();

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
          {searchTerm && (
            <button className={styles.clearSearch} onClick={() => setSearchTerm('')} aria-label="Clear search">
              <X size={16} />
            </button>
          )}
        </div>
        <button
          className={`${styles.headerButton} ${showFilters ? styles.headerButtonActive : ''}`}
          onClick={() => setShowFilters((prev) => !prev)}
          aria-label="Filters"
        >
          <Filter size={20} />
        </button>
      </header>

      <div className={styles.content}>
        <div className={styles.titleRow}>
          <div>
            <h1 className={styles.title}>Discover Communities</h1>
            <p className={styles.subtitle}>
              <MapPin size={12} />
              {userLocation || 'Your location'}
            </p>
          </div>
          <span className={styles.communityCount}>
            {communities.length} communities
          </span>
        </div>

        {/* Sort options */}
        <div className={styles.sortRow}>
          {(['popular', 'newest', 'sponsored', 'nearest'] as SortOption[]).map((sort) => (
            <button
              key={sort}
              onClick={() => setSortBy(sort)}
              className={`${styles.sortChip} ${sortBy === sort ? styles.sortChipActive : ''}`}
            >
              {sort === 'popular' ? <TrendingUp size={12} /> : sort === 'sponsored' ? <Star size={12} /> : null}
              {sort.charAt(0).toUpperCase() + sort.slice(1)}
            </button>
          ))}
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className={styles.filterPanel}>
            <div className={styles.filterPanelHeader}>
              <h3 className={styles.filterPanelTitle}>Filter by</h3>
              <button className={styles.clearFilters} onClick={() => setFilterType('all')}>
                Clear
              </button>
            </div>
            <div className={styles.filterGrid}>
              {(['all', 'featured', 'city', 'state', 'country', 'private', 'public'] as FilterType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`${styles.filterOption} ${filterType === type ? styles.filterOptionActive : ''}`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className={styles.errorBanner}>
            <p>{error}</p>
            <button onClick={loadCommunities} className={styles.retryButton}>
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className={styles.loadingState}>
            <div className={styles.loadingSpinner} />
            <p>Loading communities...</p>
          </div>
        ) : displayedCommunities.length === 0 ? (
          <div className={styles.emptyState}>
            <Compass size={40} className={styles.emptyIcon} />
            <p className={styles.emptyTitle}>No communities found</p>
            <p className={styles.emptyText}>
              {searchTerm
                ? `No results for "${searchTerm}"`
                : 'Try adjusting your filters'}
            </p>
            {searchTerm && (
              <button className={styles.clearSearchButton} onClick={() => setSearchTerm('')}>
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <div className={styles.communitiesList}>
            {displayedCommunities.map((community) => (
              <CommunityCard
                key={community.id}
                community={community}
                isJoining={joiningId === community.id}
                onJoin={() => handleJoin(community.id)}
                onEnter={() => handleEnter(community.id, community.name)}
                onViewRules={() => navigate('/community-guidelines')}
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
  isJoining: boolean;
  onJoin: () => void;
  onEnter: () => void;
  onViewRules: () => void;
}

const CommunityCard: React.FC<CommunityCardProps> = ({ community, isJoining, onJoin, onEnter, onViewRules }) => {
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
        <div className={styles.cardBadges}>
          {community.isAdmin && (
            <span className={styles.adminBadge}>Admin</span>
          )}
          {community.isPrivate ? (
            <Lock size={14} className={styles.privateIcon} />
          ) : (
            <Globe size={14} className={styles.publicIcon} />
          )}
        </div>
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
        <span className={styles.metaItem}>
          <TrendingUp size={12} />
          {community.postCount} posts
        </span>
      </div>

      {community.rules.length > 0 && (
        <button className={styles.rulesLink} onClick={onViewRules}>
          View Guidelines
          <ChevronRight size={12} />
        </button>
      )}

      {community.isJoined ? (
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
