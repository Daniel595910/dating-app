import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Heart, Play, MapPin } from 'lucide-react';
import { discoverService } from '../services/discover.service';
import styles from './DiscoverSearchModal.module.css';

interface SearchResult {
  video_id: string;
  video_url: string;
  thumbnail_url: string | null;
  caption: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  is_verified: boolean;
  like_count: number;
  hashtags: string[];
  location_text: string | null;
}

interface DiscoverSearchModalProps {
  open: boolean;
  onClose: () => void;
  onVideoSelect: (videoId: string) => void;
}

const formatCount = (n: number): string => {
  if (n < 1000) return n.toString();
  if (n < 1000000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
};

export const DiscoverSearchModal: React.FC<DiscoverSearchModalProps> = ({
  open,
  onClose,
  onVideoSelect,
}) => {
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [hashtag, setHashtag] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
    if (!open) {
      setQuery('');
      setLocation('');
      setHashtag('');
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      performSearch();
    }, 300);
    return () => clearTimeout(timer);
  }, [query, location, hashtag, open]);

  const performSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await discoverService.searchVideos(
        query,
        30,
        0,
        location || null,
        hashtag || null
      );
      setResults(data as SearchResult[]);
    } catch (err: any) {
      setError('Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className={styles.overlay}
      onClick={onClose}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      <div className={styles.container} onClick={(e) => e.stopPropagation()}>
        
        {/* Header / Search Bar */}
        <div className={styles.header}>
          <div className={styles.searchWrapper}>
            <Search size={18} className={styles.searchIcon} />
            <input
              ref={inputRef}
              type="text"
              className={styles.searchInput}
              placeholder="Search videos..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query.length > 0 && (
              <button className={styles.clearButton} onClick={() => setQuery('')}>
                <X size={16} />
              </button>
            )}
          </div>
          <button className={styles.cancelButton} onClick={onClose}>
            Cancel
          </button>
        </div>

        {/* Filter Row */}
        <div className={styles.filterRow}>
          <div className={styles.filterPill}>
            <MapPin size={14} className={styles.filterIcon} />
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="">Any Location</option>
              <option value="Nigeria">Nigeria</option>
              <option value="Ghana">Ghana</option>
              <option value="South Africa">South Africa</option>
              <option value="United Kingdom">United Kingdom</option>
              <option value="United States">United States</option>
            </select>
          </div>
          
          <div className={styles.filterPill}>
            <span className={styles.hashSymbol}>#</span>
            <input
              type="text"
              placeholder="Hashtag"
              value={hashtag}
              onChange={(e) => setHashtag(e.target.value.replace(/^#/, ''))}
              className={styles.filterInput}
            />
          </div>
        </div>

        {/* Results Grid */}
        <div className={styles.scrollArea}>
          {error && <div className={styles.error}>{error}</div>}
          
          {loading && results.length === 0 ? (
            <div className={styles.loadingSpinner}>
              <div className={styles.spinner} />
            </div>
          ) : results.length === 0 ? (
            <div className={styles.emptyState}>
              <Search size={48} className={styles.emptyIcon} />
              <p>No videos found</p>
              <span>Try adjusting your search or filters</span>
            </div>
          ) : (
            <div className={styles.grid}>
              {results.map((item) => (
                <div 
                  key={item.video_id} 
                  className={styles.card}
                  onClick={() => {
                    onVideoSelect(item.video_id);
                    onClose();
                  }}
                >
                  <div className={styles.thumbnailWrapper}>
                    {item.thumbnail_url ? (
                      <img 
                        src={item.thumbnail_url} 
                        alt="" 
                        className={styles.thumbnail} 
                        loading="lazy" 
                      />
                    ) : (
                      <video 
                        src={item.video_url + "#t=0.1"} 
                        className={styles.thumbnail} 
                        preload="metadata" 
                        playsInline 
                        muted 
                      />
                    )}
                    <div className={styles.playBadge}>
                      <Play size={10} fill="#fff" />
                    </div>
                  </div>

                  <div className={styles.info}>
                    <p className={styles.caption}>{item.caption || 'Untitled video'}</p>
                    
                    <div className={styles.authorRow}>
                      <div className={styles.authorAvatar}>
                        {item.avatar_url ? (
                          <img src={item.avatar_url} alt="" />
                        ) : (
                          <span>{item.display_name.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <span className={styles.authorName}>{item.display_name}</span>
                    </div>

                    <div className={styles.statsRow}>
                      <Heart size={12} fill="currentColor" />
                      <span>{formatCount(item.like_count)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
