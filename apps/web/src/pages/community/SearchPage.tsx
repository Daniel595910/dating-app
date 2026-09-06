import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { searchService } from '../../features/search/services/search.service';
import { SearchResult } from '../../features/search/types/search.types';
import { supabase } from '@/config/supabase.client';
import { ArrowLeft, Search, BadgeCheck, MapPin, Heart, UserPlus, X, Clock, TrendingUp, Users, Sparkles, Briefcase, Check, MessageCircle } from 'lucide-react';
import styles from './SearchPage.module.css';

export const SearchPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [communityResults, setCommunityResults] = useState<any[]>([]);
  const [postResults, setPostResults] = useState<any[]>([]);
  const [tagResults, setTagResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [connectionSent, setConnectionSent] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const saved = localStorage.getItem('recentSearches');
    if (saved) setRecentSearches(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (query.trim().length < 1) {
      setResults([]);
      setCommunityResults([]);
      setPostResults([]);
      setTagResults([]);
      setSearched(false);
      return;
    }

    const debounceTimer = setTimeout(async () => {
      if (!user) return;
      setLoading(true);
      const [searchResults, communitySearchResults, postSearchResults, tagSearchResults] = await Promise.all([
        searchService.searchPeople(query, user.id),
        searchService.searchCommunities(query),
        searchService.searchPosts(query, user.id),
        searchService.searchTags(query),
      ]);
      setResults(searchResults);
      setCommunityResults(communitySearchResults);
      setPostResults(postSearchResults);
      setTagResults(tagSearchResults);
      setSearched(true);
      setLoading(false);
    }, 250);

    return () => clearTimeout(debounceTimer);
  }, [query, user]);

  const saveRecentSearch = (term: string) => {
    const updated = [term, ...recentSearches.filter((s) => s !== term)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const handleSearch = (term: string) => {
    setQuery(term);
    saveRecentSearch(term);
  };

  const handleProfileClick = (userId: string) => {
    navigate(`/profile/${userId}`);
  };

  const handleConnect = async (e: React.MouseEvent, targetUserId: string) => {
    e.stopPropagation();
    if (!user) return;

    try {
      const { error } = await supabase.rpc('send_connection_request', {
        p_target_id: targetUserId,
        p_message: null,
      });

      if (!error) {
        setConnectionSent((prev) => {
          const newSet = new Set(prev);
          newSet.add(targetUserId);
          return newSet;
        });
      }
    } catch (err) {
      console.error('Connection request failed:', err);
    }
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  const removeRecentSearch = (term: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = recentSearches.filter((s) => s !== term);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const totalResults = results.length + communityResults.length + postResults.length + tagResults.length;

  return (
    <div className={styles.searchPage}>
      <header className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <div className={styles.searchInputContainer}>
          <Search size={16} className={styles.searchIcon} />
          <input
            ref={inputRef}
            className={styles.searchInput}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && query.trim()) {
                saveRecentSearch(query.trim());
              }
            }}
            placeholder="Search people, communities, posts, tags..."
            maxLength={100}
            enterKeyHint="search"
          />
          {query && (
            <button className={styles.clearButton} onClick={() => setQuery('')} aria-label="Clear">
              <X size={16} />
            </button>
          )}
        </div>
      </header>

      <div className={styles.content}>
        {loading ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <p>Searching...</p>
          </div>
        ) : searched && totalResults === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIconWrapper}>
              <Search size={48} className={styles.emptyIcon} />
            </div>
            <p className={styles.emptyTitle}>No results for "{query}"</p>
            <p className={styles.emptyText}>
              Try searching by name, interest, occupation, or location
            </p>
            <div className={styles.emptySuggestions}>
              <span className={styles.suggestionLabel}>Try:</span>
              {['Music', 'Travel', 'Lagos', 'Engineer'].map((suggestion) => (
                <button
                  key={suggestion}
                  className={styles.suggestionChip}
                  onClick={() => handleSearch(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : query.trim().length < 1 ? (
          <div className={styles.initialState}>
            {recentSearches.length > 0 && (
              <div className={styles.recentSection}>
                <div className={styles.sectionHeader}>
                  <span className={styles.sectionTitle}><Clock size={14} /> Recent Searches</span>
                  <button className={styles.clearAllButton} onClick={clearRecentSearches}>Clear all</button>
                </div>
                <div className={styles.recentChips}>
                  {recentSearches.map((term) => (
                    <button
                      key={term}
                      className={styles.recentChip}
                      onClick={() => handleSearch(term)}
                    >
                      <Clock size={11} />
                      {term}
                      <span
                        className={styles.removeRecent}
                        onClick={(e) => removeRecentSearch(term, e)}
                        role="button"
                        aria-label={`Remove ${term}`}
                      >
                        <X size={12} />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.suggestedSection}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionTitle}><TrendingUp size={14} /> Popular Interests</span>
              </div>
              <div className={styles.suggestedInterests}>
                {['Music', 'Travel', 'Food', 'Fitness', 'Art', 'Photography', 'Dancing', 'Reading', 'Tech', 'Fashion'].map((interest) => (
                  <button
                    key={interest}
                    className={styles.interestChip}
                    onClick={() => handleSearch(interest)}
                  >
                    <Sparkles size={12} />
                    {interest}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.resultsList}>
            {/* PEOPLE FIRST - Facebook style */}
            {results.length > 0 && (
              <div className={styles.peopleSection}>
                <p className={styles.sectionLabel}>People</p>
                {results.map((result) => (
                  <div
                    key={result.userId}
                    className={styles.resultCard}
                    onClick={() => handleProfileClick(result.userId)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleProfileClick(result.userId);
                    }}
                  >
                    <div className={styles.resultAvatar}>
                      {result.avatarUrl ? (
                        <img src={result.avatarUrl} alt={result.displayName} />
                      ) : (
                        result.displayName.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className={styles.resultInfo}>
                      <div className={styles.resultNameRow}>
                        <span className={styles.resultName}>
                          {result.displayName}
                          {result.age ? `, ${result.age}` : ''}
                        </span>
                        {result.verified && <BadgeCheck size={14} className={styles.verifiedIcon} />}
                      </div>

                      {result.occupation && (
                        <div className={styles.resultOccupation}>
                          <Briefcase size={11} />
                          <span>{result.occupation}</span>
                        </div>
                      )}

                      {result.location && (
                        <div className={styles.resultLocation}>
                          <MapPin size={11} />
                          <span>{result.location}</span>
                        </div>
                      )}

                      {result.interests.length > 0 && (
                        <div className={styles.resultInterests}>
                          {result.interests.slice(0, 3).map((interest, index) => (
                            <span key={index} className={styles.resultInterestTag}>
                              {interest}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className={styles.resultActions}>
                      {connectionSent.has(result.userId) ? (
                        <span className={styles.connectionSentBadge}>
                          <Check size={14} /> Sent
                        </span>
                      ) : (
                        <button
                          className={styles.connectButton}
                          onClick={(e) => handleConnect(e, result.userId)}
                          aria-label={`Connect with ${result.displayName}`}
                        >
                          <UserPlus size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* COMMUNITIES */}
            {communityResults.length > 0 && (
              <div className={styles.communityResultsSection}>
                <p className={styles.sectionLabel}>Communities</p>
                {communityResults.map((community) => (
                  <div
                    key={community.id}
                    className={styles.communityCard}
                    onClick={() => navigate('/community')}
                    role="button"
                    tabIndex={0}
                  >
                    <div className={styles.communityIcon}>
                      <Users size={20} />
                    </div>
                    <div className={styles.communityInfo}>
                      <span className={styles.communityName}>{community.name}</span>
                      <span className={styles.communityMeta}>
                        {[community.city, community.state, community.country].filter(Boolean).join(', ')}
                      </span>
                      <span className={styles.communityMembers}>
                        {community.member_count} members
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAGS */}
            {tagResults.length > 0 && (
              <div className={styles.tagResultsSection}>
                <p className={styles.sectionLabel}>Tags</p>
                <div className={styles.tagChips}>
                  {tagResults.map((tag) => (
                    <button
                      key={tag}
                      className={styles.tagChip}
                      onClick={() => handleSearch(tag)}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* POSTS */}
            {postResults.length > 0 && (
              <div className={styles.postResultsSection}>
                <p className={styles.sectionLabel}>Posts</p>
                {postResults.map((post) => (
                  <div
                    key={post.id}
                    className={styles.postResultCard}
                    onClick={() => navigate('/community')}
                    role="button"
                    tabIndex={0}
                  >
                    <div className={styles.postResultHeader}>
                      <div className={styles.postResultAvatar}>
                        {post.authorAvatar ? (
                          <img src={post.authorAvatar} alt={post.authorName} />
                        ) : (
                          post.authorName.charAt(0).toUpperCase()
                        )}
                      </div>
                      <span className={styles.postResultAuthor}>{post.authorName}</span>
                    </div>
                    <p className={styles.postResultContent}>{post.content}</p>
                    <div className={styles.postResultStats}>
                      <span><Heart size={12} /> {post.likeCount}</span>
                      <span><MessageCircle size={12} /> {post.commentCount}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
