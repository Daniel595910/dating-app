import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/config/supabase.client';
import {
  ArrowLeft, Search, Users, MapPin, Star, Lock, Globe, Compass,
  Check, TrendingUp, Filter, X, ChevronRight, BookOpen,
} from 'lucide-react';
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
  isFeatured: boolean;
  isJoined: boolean;
  isAdmin: boolean;
  rules: string[];
  createdAt: string;
  coverImageUrl: string | null;
}

type SortOption = 'popular' | 'newest' | 'sponsored' | 'nearest';
type FilterType = 'all' | 'featured' | 'city' | 'state' | 'country' | 'private' | 'public';

const COUNTRY_GRADIENTS: Record<string, string> = {
  NG: 'linear-gradient(135deg, #10b981, #059669)',
  US: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
  GB: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
  GH: 'linear-gradient(135deg, #f59e0b, #d97706)',
  ZA: 'linear-gradient(135deg, #06b6d4, #0891b2)',
  KE: 'linear-gradient(135deg, #dc2626, #991b1b)',
  CA: 'linear-gradient(135deg, #ef4444, #b91c1c)',
  AU: 'linear-gradient(135deg, #f59e0b, #dc2626)',
  IN: 'linear-gradient(135deg, #f97316, #ea580c)',
  FR: 'linear-gradient(135deg, #3b82f6, #1e40af)',
  DE: 'linear-gradient(135deg, #eab308, #ca8a04)',
  BR: 'linear-gradient(135deg, #10b981, #047857)',
  JP: 'linear-gradient(135deg, #ef4444, #b91c1c)',
  CN: 'linear-gradient(135deg, #f43f5e, #be123c)',
  DEFAULT: 'linear-gradient(135deg, #6b7280, #4b5563)',
};

function getCountryGradient(code: string | null | undefined): string {
  if (!code) return COUNTRY_GRADIENTS.DEFAULT;
  return COUNTRY_GRADIENTS[code.toUpperCase()] || COUNTRY_GRADIENTS.DEFAULT;
}

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
  const [includeWorldwide, setIncludeWorldwide] = useState(false);

  const loadCommunities = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('location')
        .eq('user_id', user.id)
        .maybeSingle();

      const userCountry = userProfile?.location?.country || 'Nigeria';
      const userState = userProfile?.location?.state || null;
      const userCity = userProfile?.location?.city || null;

      setUserLocation([userCity, userState, userCountry].filter(Boolean).join(', '));

      let communityQuery = supabase
        .from('communities')
        .select('*')
        .eq('status', 'active');

      if (!includeWorldwide) {
        communityQuery = communityQuery.eq('country', userCountry);
      }

      const { data: communityData, error: communityError } = await communityQuery
        .order('member_count', { ascending: false });

      if (communityError) throw communityError;

      const { data: memberships } = await supabase
        .from('community_members')
        .select('community_id, role')
        .eq('user_id', user.id);

      const membershipMap = new Map((memberships || []).map((m: any) => [m.community_id, m.role]));

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
          description: c.description || '',
          type: c.type,
          country: c.country,
          countryCode: c.country_code,
          state: c.state,
          city: c.city,
          memberCount: c.member_count || 0,
          postCount: c.post_count || 0,
          isPrivate: c.status === 'locked',
          isSponsored: sponsoredIds.has(c.id),
          isFeatured: c.is_featured || false,
          isJoined: membershipMap.has(c.id),
          isAdmin: membershipMap.get(c.id) === 'admin',
          rules: c.rules || [],
          createdAt: c.created_at,
          coverImageUrl: c.cover_image_url || null,
        }))
      );
    } catch (err: any) {
      console.error('Failed to load communities:', err);
      setError('Failed to load communities. Please try again.');
    }

    setLoading(false);
  }, [user, includeWorldwide]);

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
          status: 'active',
        });

      if (joinError && joinError.code !== '23505') throw joinError;

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
    localStorage.setItem('selectedCommunityId', communityId);
    localStorage.setItem('selectedCommunityName', communityName);
    navigate('/community');
  };

  const getSortedAndFiltered = () => {
    let result = [...communities];

    if (filterType === 'city') result = result.filter((c) => c.city !== null);
    if (filterType === 'state') result = result.filter((c) => c.state !== null);
    if (filterType === 'country') result = result.filter((c) => c.type === 'country');
    if (filterType === 'private') result = result.filter((c) => c.isPrivate);
    if (filterType === 'public') result = result.filter((c) => !c.isPrivate);
    if (filterType === 'featured') result = result.filter((c) => c.isFeatured);

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

    if (sortBy === 'popular') {
      result.sort((a, b) => {
        if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
        return b.memberCount - a.memberCount;
      });
    } else if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortBy === 'sponsored') {
      result.sort((a, b) => Number(b.isSponsored) - Number(a.isSponsored));
    } else if (sortBy === 'nearest') {
      result.sort((a, b) => {
        const aNear = a.city === userLocation.split(', ')[0] ? 1 : 0;
        const bNear = b.city === userLocation.split(', ')[0] ? 1 : 0;
        return bNear - aNear;
      });
    }

    return result;
  };

  const displayedCommunities = getSortedAndFiltered();
  const featuredCommunities = displayedCommunities.filter((c) => c.isFeatured);
  const regularCommunities = displayedCommunities.filter((c) => !c.isFeatured);
  const showFeaturedRow = featuredCommunities.length > 0 && filterType === 'all';

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
            <h1 className={styles.title}>Discover</h1>
            <p className={styles.subtitle}>
              <MapPin size={12} />
              {userLocation || 'Your location'}
            </p>
          </div>
          <span className={styles.communityCount}>
            {displayedCommunities.length} {displayedCommunities.length === 1 ? 'community' : 'communities'}
          </span>
        </div>

        {/* Worldwide toggle */}
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.75rem',
            color: '#6b7280',
            cursor: 'pointer',
            marginBottom: '0.75rem',
            userSelect: 'none',
          }}
        >
          <input
            type="checkbox"
            checked={includeWorldwide}
            onChange={(e) => setIncludeWorldwide(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: '#ef4444', cursor: 'pointer' }}
          />
          Include communities from other countries
        </label>

        {/* Sort chips */}
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

        {/* Filter panel */}
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
            <p style={{ margin: 0 }}>{error}</p>
            <button onClick={loadCommunities} className={styles.retryButton}>
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className={styles.skeletonList}>
            {[1, 2, 3].map((i) => (
              <div key={i} className={styles.skeletonCard}>
                <div className={styles.skeletonCover} />
                <div className={styles.skeletonBody}>
                  <div className={`${styles.skeletonLine} ${styles.skeletonLineMed}`} />
                  <div className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
                  <div className={styles.skeletonLine} />
                </div>
              </div>
            ))}
          </div>
        ) : displayedCommunities.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIconWrap}>
              <Compass size={32} className={styles.emptyIcon} />
            </div>
            <p className={styles.emptyTitle}>
              {searchTerm ? `No results for "${searchTerm}"` : 'No communities found'}
            </p>
            <p className={styles.emptyText}>
              {searchTerm
                ? 'Try a different search term.'
                : includeWorldwide
                ? 'Try adjusting your filters.'
                : 'Turn on worldwide to see communities from other countries.'}
            </p>
            {searchTerm ? (
              <div className={styles.emptyActions}>
                <button className={styles.emptyPrimaryBtn} onClick={() => setSearchTerm('')}>
                  Clear Search
                </button>
              </div>
            ) : !includeWorldwide ? (
              <div className={styles.emptyActions}>
                <button
                  className={styles.emptyPrimaryBtn}
                  onClick={() => setIncludeWorldwide(true)}
                >
                  <Globe size={16} style={{ marginRight: '0.375rem', verticalAlign: '-3px' }} />
                  Show worldwide
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <>
            {/* Featured carousel */}
            {showFeaturedRow && (
              <div className={styles.featuredSection}>
                <div className={styles.featuredHeader}>
                  <Star size={16} className={styles.featuredIcon} />
                  <h2 className={styles.featuredTitle}>Featured</h2>
                </div>
                <div className={styles.featuredScroll}>
                  {featuredCommunities.map((c) => (
                    <button
                      key={c.id}
                      className={styles.featuredCard}
                      onClick={() => handleEnter(c.id, c.name)}
                    >
                      <div className={styles.featuredCoverWrap}>
                        {c.coverImageUrl ? (
                          <img src={c.coverImageUrl} alt="" className={styles.coverImage} />
                        ) : (
                          <div
                            className={styles.coverFallback}
                            style={{ background: getCountryGradient(c.countryCode) }}
                          >
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className={styles.featuredBadgeOverlay}>
                          <Star size={9} fill="currentColor" /> Featured
                        </span>
                      </div>
                      <div className={styles.featuredBody}>
                        <h3 className={styles.featuredName}>{c.name}</h3>
                        <div className={styles.featuredMeta}>
                          <Users size={11} />
                          <span>{c.memberCount.toLocaleString()} members</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* All communities */}
            {regularCommunities.length > 0 || featuredCommunities.length === 0 ? (
              <>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>
                    {showFeaturedRow ? 'All Communities' : 'Communities'}
                  </h2>
                  <span className={styles.sectionCount}>
                    {(showFeaturedRow ? regularCommunities : displayedCommunities).length}
                  </span>
                </div>
                <div className={styles.communitiesList}>
                  {(showFeaturedRow ? regularCommunities : displayedCommunities).map((community) => (
                    <CommunityCard
                      key={community.id}
                      community={community}
                      isJoining={joiningId === community.id}
                      onJoin={() => handleJoin(community.id)}
                      onEnter={() => handleEnter(community.id, community.name)}
                      onViewRules={() => navigate('/community-guidelines')}
                      gradient={getCountryGradient(community.countryCode)}
                    />
                  ))}
                </div>
              </>
            ) : null}
          </>
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
  gradient: string;
}

const CommunityCard: React.FC<CommunityCardProps> = ({
  community, isJoining, onJoin, onEnter, onViewRules, gradient,
}) => {
  return (
    <div className={`${styles.card} ${community.isSponsored ? styles.cardSponsored : ''}`}>
      <div className={styles.cardCoverWrap}>
        {community.coverImageUrl ? (
          <img src={community.coverImageUrl} alt="" className={styles.coverImage} />
        ) : (
          <div className={styles.coverFallback} style={{ background: gradient }}>
            {community.name.charAt(0).toUpperCase()}
          </div>
        )}

        <div className={styles.cardBadgeRow}>
          <div className={styles.cardBadgeGroup}>
            {community.isFeatured && (
              <span className={`${styles.badgePill} ${styles.badgeFeatured}`}>
                <Star size={9} fill="currentColor" /> Featured
              </span>
            )}
            {community.isSponsored && (
              <span className={`${styles.badgePill} ${styles.badgeSponsored}`}>
                <Star size={9} /> Sponsored
              </span>
            )}
            {community.isAdmin && (
              <span className={`${styles.badgePill} ${styles.badgeAdmin}`}>
                Admin
              </span>
            )}
          </div>
          <div className={styles.cardBadgeGroup}>
            {community.isPrivate ? (
              <span className={`${styles.badgePill} ${styles.badgePrivate}`}>
                <Lock size={9} /> Private
              </span>
            ) : (
              <span className={`${styles.badgePill} ${styles.badgePublic}`}>
                <Globe size={9} /> Public
              </span>
            )}
          </div>
        </div>
      </div>

      <div className={styles.cardBody}>
        <h3 className={styles.cardName}>{community.name}</h3>

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
            {community.memberCount.toLocaleString()}
          </span>
          <span className={styles.metaItem}>
            <TrendingUp size={12} />
            {community.postCount}
          </span>
        </div>

        <div className={styles.cardActions}>
          {community.isJoined ? (
            <button className={styles.enterButton} onClick={onEnter}>
              <Check size={14} />
              Enter
            </button>
          ) : (
            <button
              className={styles.joinButton}
              onClick={onJoin}
              disabled={isJoining}
            >
              {isJoining ? 'Joining...' : 'Join'}
            </button>
          )}
          {community.rules.length > 0 && (
            <button
              className={styles.rulesButton}
              onClick={onViewRules}
              aria-label="View rules"
              title="View rules"
            >
              <BookOpen size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};