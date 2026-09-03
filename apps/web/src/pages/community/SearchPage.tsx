/**
 * SearchPage Component
 * Search within community
 */

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/config/supabase.client';
import { TIMING, PAGINATION } from '@/config/constants';
import { Profile } from '@dating-app/types';
import { Input } from '@dating-app/ui';
import { UserAvatar } from '@/components/common/UserAvatar';
import styles from './SearchPage.module.css';

export const SearchPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState < Profile[] > ([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState < string | null > (null);
  
  const debouncedSearch = useCallback(
    async (term: string) => {
        if (term.length < 2) {
          setResults([]);
          return;
        }
        
        setLoading(true);
        setError(null);
        
        try {
          const { data, error: searchError } = await supabase
            .from('profiles')
            .select('*')
            .or(`display_name.ilike.%${term}%,bio.ilike.%${term}%`)
            .limit(PAGINATION.SEARCH_RESULTS_PAGE_SIZE);
          
          if (searchError) throw searchError;
          setResults(data || []);
        } catch (err: any) {
          setError(err.message || 'Search failed');
        } finally {
          setLoading(false);
        }
      },
      []
  );
  
  useEffect(() => {
    const timer = setTimeout(() => {
      debouncedSearch(searchTerm);
    }, TIMING.DEBOUNCE_SEARCH_MS);
    
    return () => clearTimeout(timer);
  }, [searchTerm, debouncedSearch]);
  
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Search</h1>

      <Input
        type="search"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search for people..."
      />

      {loading && <p className={styles.loading}>Searching...</p>}

      {error && <p className={styles.error}>{error}</p>}

      {!loading && !error && searchTerm.length >= 2 && results.length === 0 && (
        <p className={styles.noResults}>No results found for "{searchTerm}"</p>
      )}

      <div className={styles.results}>
        {results.map((profile) => (
          <div key={profile.id} className={styles.resultItem}>
            <UserAvatar
              src={profile.avatar_url}
              name={profile.display_name}
              size="md"
              verified={profile.is_verified}
            />
            <div className={styles.resultInfo}>
              <span className={styles.resultName}>{profile.display_name}</span>
              {profile.bio && (
                <span className={styles.resultBio}>{profile.bio}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};