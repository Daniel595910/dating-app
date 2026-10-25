import React, { useState, useEffect, useMemo } from 'react';
import { X, Smile, Sparkles, Search, Crown } from 'lucide-react';
import { supabase } from '@/config/supabase.client';
import styles from '../styles/StickerPicker.module.css';

interface StickerPickerProps {
  open: boolean;
  onClose: () => void;
  onSelectSticker: (url: string, name: string, isPremium: boolean) => void;
  userIsVip?: boolean;
}

interface Sticker {
  id: string;
  name: string | null;
  image_url: string;
  is_animated: boolean;
  is_premium: boolean;
  pack_id: string;
  pack?: { name: string; is_premium: boolean } | null;
}

interface Gif {
  id: string;
  title: string | null;
  preview_url: string | null;
  gif_url: string;
  is_premium: boolean;
}

type Tab = 'stickers' | 'gifs';

export const StickerPicker: React.FC<StickerPickerProps> = ({
  open,
  onClose,
  onSelectSticker,
  userIsVip = false,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('stickers');
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [gifs, setGifs] = useState<Gif[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const [stickersRes, gifsRes] = await Promise.all([
          supabase
            .from('stickers')
            .select('id, name, image_url, is_animated, is_premium, pack_id, pack:sticker_packs(name, is_premium)')
            .eq('is_active', true)
            .order('sort_order', { ascending: true }),
          supabase
            .from('gifs')
            .select('id, title, preview_url, gif_url, is_premium')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(100),
        ]);
        if (cancelled) return;
        setStickers((stickersRes.data || []) as unknown as Sticker[]);
        setGifs((gifsRes.data || []) as unknown as Gif[]);
      } catch (err) {
        console.error('Failed to load stickers:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [open]);

  useEffect(() => { setSearchQuery(''); }, [activeTab]);

  const filteredStickers = useMemo(() => {
    if (!searchQuery.trim()) return stickers;
    const q = searchQuery.toLowerCase();
    return stickers.filter((s) => (s.name || '').toLowerCase().includes(q));
  }, [stickers, searchQuery]);

  const filteredGifs = useMemo(() => {
    if (!searchQuery.trim()) return gifs;
    const q = searchQuery.toLowerCase();
    return gifs.filter((g) => (g.title || '').toLowerCase().includes(q));
  }, [gifs, searchQuery]);

  if (!open) return null;

  const handleStickerClick = (s: Sticker) => {
    const isPremium = s.is_premium || Boolean(s.pack?.is_premium);
    if (isPremium && !userIsVip) {
      alert('This sticker is premium. Upgrade to VIP to use it.');
      return;
    }
    onSelectSticker(s.image_url, s.name || 'Sticker', isPremium);
    onClose();
  };

  const handleGifClick = (g: Gif) => {
    if (g.is_premium && !userIsVip) {
      alert('This GIF is premium. Upgrade to VIP to use it.');
      return;
    }
    onSelectSticker(g.gif_url, g.title || 'GIF', g.is_premium);
    onClose();
  };

  const currentItems = activeTab === 'stickers' ? filteredStickers : filteredGifs;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.dragHandle} />

        <div className={styles.header}>
          <h3 className={styles.title}>Stickers & GIFs</h3>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className={styles.tabs}>
          <button
            className={styles.tab + ' ' + (activeTab === 'stickers' ? styles.tabActive : '')}
            onClick={() => setActiveTab('stickers')}
          >
            <Smile size={16} /> Stickers
          </button>
          <button
            className={styles.tab + ' ' + (activeTab === 'gifs' ? styles.tabActive : '')}
            onClick={() => setActiveTab('gifs')}
          >
            <Sparkles size={16} /> GIFs
          </button>
        </div>

        <div className={styles.searchBar}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type='text'
            className={styles.searchInput}
            placeholder={activeTab === 'stickers' ? 'Search stickers...' : 'Search GIFs...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className={styles.content}>
          {loading ? (
            <div className={styles.loading}>Loading...</div>
          ) : currentItems.length === 0 ? (
            <div className={styles.empty}>
              {searchQuery ? 'No results' : 'Nothing here yet'}
            </div>
          ) : activeTab === 'stickers' ? (
            <div className={styles.grid}>
              {filteredStickers.map((s) => {
                const isPremium = s.is_premium || Boolean(s.pack?.is_premium);
                return (
                  <button
                    key={s.id}
                    className={styles.gridItem}
                    onClick={() => handleStickerClick(s)}
                    title={s.name || 'Sticker'}
                  >
                    <img src={s.image_url} alt={s.name || 'sticker'} loading='lazy' className={styles.gridImage} />
                    {isPremium && (
                      <span className={styles.premiumBadge}><Crown size={10} /></span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className={styles.grid}>
              {filteredGifs.map((g) => (
                <button
                  key={g.id}
                  className={styles.gridItem}
                  onClick={() => handleGifClick(g)}
                  title={g.title || 'GIF'}
                >
                  <img src={g.preview_url || g.gif_url} alt={g.title || 'gif'} loading='lazy' className={styles.gridImage} />
                  {g.is_premium && (
                    <span className={styles.premiumBadge}><Crown size={10} /></span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
