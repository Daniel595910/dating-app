import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { searchService } from '../../features/search/services/search.service';
import { SearchResult } from '../../features/search/types/search.types';
import { ArrowLeft, Search, BadgeCheck, MapPin, Heart, UserPlus } from 'lucide-react';
import styles from './SearchPage.module.css';

export const SearchPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }

    const debounceTimer = setTimeout(async () => {
      if (!user) return;
      setLoading(true);
      const searchResults = await searchService.searchPeople(query, user.id);
      setResults(searchResults);
      setSearched(true);
      setLoading(false);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [query, user]);

  const handleProfileClick = (userId: string) => {
    navigate(`/profile/${userId}`);
  };

  return (
    <div className={styles.searchPage}>
      <header className={styles.header}>
        <button className={styles.headerButton} onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <div className={styles.searchInputContainer}>
          <Search size={18} className={styles.searchIcon} />
          <input
            ref={inputRef}
            className={styles.searchInput}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people..."
            maxLength={100}
          />
          {query && (
            <button className={styles.clearButton} onClick={() => setQuery('')} aria-label="Clear">
              ✕
            </button>
          )}
        </div>
      </header>

      <div className={styles.content}>
        {loading ? (
          <div className={styles.loadingState}>
            <p>Searching...</p>
          </div>
        ) : searched && results.length === 0 ? (
          <div className={styles.emptyState}>
            <Search size={40} className={styles.emptyIcon} />
            <p className={styles.emptyTitle}>No people found</p>
            <p className={styles.emptyText}>
              Try a different name or adjust your search
            </p>
          </div>
        ) : query.trim().length < 2 ? (
          <div className={styles.initialState}>
            <Search size={40} className={styles.initialIcon} />
            <p className={styles.initialText}>
              Search for people by name or interests
            </p>
            <div className={styles.suggestedInterests}>
              {['Music', 'Travel', 'Food', 'Fitness', 'Art'].map((interest) => (
                <button
                  key={interest}
                  className={styles.interestChip}
                  onClick={() => setQuery(interest)}
                >
                  {interest}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className={styles.resultsList}>
            {results.map((result) => (
              <button
                key={result.userId}
                className={styles.resultCard}
                onClick={() => handleProfileClick(result.userId)}
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
                    {result.verified && <BadgeCheck size={16} className={styles.verifiedIcon} />}
                  </div>
                  {result.location && (
                    <div className={styles.resultLocation}>
                      <MapPin size={12} />
                      <span>{result.location}</span>
                    </div>
                  )}
                  {result.lookingFor && (
                    <div className={styles.resultLookingFor}>
                      <Heart size={12} />
                      <span>{result.lookingFor.replace(/_/g, ' ')}</span>
                    </div>
                  )}
                </div>
                <UserPlus size={18} className={styles.addIcon} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
