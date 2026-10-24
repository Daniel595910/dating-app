import React, { useState, useEffect, useRef } from 'react';
import {
  Smile,
  Sparkles,
  Upload as UploadIcon,
  Search,
  Trash2,
  Eye,
  EyeOff,
  Plus,
  Loader2,
} from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useToast } from '@/components/ui/Toast';
import {
  stickersAdminService,
  Sticker,
  StickerPack,
  Gif,
  GiphyResult,
} from '@/services/stickers-admin.service';
import styles from './StickersPage.module.css';

type Tab = 'upload' | 'import' | 'manage';

export const StickersPage: React.FC = () => {
  const { hasPermission } = useAdminAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('upload');

  // Shared state
  const [packs, setPacks] = useState<StickerPack[]>([]);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [gifs, setGifs] = useState<Gif[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload state
  const [uploadPackId, setUploadPackId] = useState<string>('');
  const [uploading, setUploading] = useState(false)
  const [newPackName, setNewPackName] = useState('');
  const [creatingPack, setCreatingPack] = useState(false);
  const [showCreatePack, setShowCreatePack] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Giphy search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<GiphyResult[]>([]);
  const [importing, setImporting] = useState<string | null>(null);
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());

  const canManage = hasPermission('CONTENT_VIEW');

  // ---------- Load data ----------
  const loadAll = async () => {
    try {
      setLoading(true);
      const [packsData, stickersData, gifsData] = await Promise.all([
        stickersAdminService.listPacks(),
        stickersAdminService.listStickers(),
        stickersAdminService.listGifs(),
      ]);
      setPacks(packsData);
      setStickers(stickersData);
      setGifs(gifsData);
      if (packsData.length > 0 && !uploadPackId) {
        setUploadPackId(packsData[0].id);
      }
    } catch (err: any) {
      toast.error('Failed to load', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  // ---------- Create pack ----------
  const handleCreatePack = async () => {
    if (!newPackName.trim()) {
      toast.warning('Pack name required');
      return;
    }
    setCreatingPack(true);
    try {
      const pack = await stickersAdminService.createPack(newPackName.trim());
      setPacks((prev) => [...prev, pack]);
      setUploadPackId(pack.id);
      setNewPackName('');
      setShowCreatePack(false);
      toast.success('Pack created');
    } catch (err: any) {
      toast.error('Failed to create pack', err.message);
    } finally {
      setCreatingPack(false);
    }
  };

  // ---------- Upload sticker ----------
  const handleUploadFile = async (file: File) => {
    if (!uploadPackId) {
      toast.warning('Select a pack first');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.warning('File too large (max 2 MB)');
      return;
    }
    setUploading(true);
    try {
      const name = file.name.replace(/\.[^.]+$/, '');
      const sticker = await stickersAdminService.uploadSticker(file, uploadPackId, name);
      setStickers((prev) => [sticker, ...prev]);
      toast.success('Sticker uploaded');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      toast.error('Upload failed', err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      handleUploadFile(files[i]);
    }
  };

  // ---------- Giphy search ----------
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const results = await stickersAdminService.searchGiphy(searchQuery.trim(), 24);
      setSearchResults(results);
      if (results.length === 0) {
        toast.info('No GIFs found');
      }
    } catch (err: any) {
      toast.error('Search failed', err.message);
    } finally {
      setSearching(false);
    }
  };

  const handleTrending = async () => {
    setSearching(true);
    try {
      const results = await stickersAdminService.trendingGiphy(24);
      setSearchResults(results);
    } catch (err: any) {
      toast.error('Trending failed', err.message);
    } finally {
      setSearching(false);
    }
  };

  const handleImport = async (g: GiphyResult) => {
    setImporting(g.id);
    try {
      await stickersAdminService.importGif(g);
      setImportedIds((prev) => new Set(prev).add(g.id));
      const updated = await stickersAdminService.listGifs();
      setGifs(updated);
      toast.success('Imported');
    } catch (err: any) {
      toast.error('Import failed', err.message);
    } finally {
      setImporting(null);
    }
  };

  // ---------- Toggle active / delete ----------
  const handleToggleSticker = async (s: Sticker) => {
    try {
      await stickersAdminService.toggleStickerActive(s.id, !s.is_active);
      setStickers((prev) => prev.map((x) => (x.id === s.id ? { ...x, is_active: !x.is_active } : x)));
    } catch (err: any) {
      toast.error('Toggle failed', err.message);
    }
  };

  const handleDeleteSticker = async (s: Sticker) => {
    if (!confirm('Delete this sticker?')) return;
    try {
      await stickersAdminService.deleteSticker(s.id);
      setStickers((prev) => prev.filter((x) => x.id !== s.id));
      toast.success('Deleted');
    } catch (err: any) {
      toast.error('Delete failed', err.message);
    }
  };

  const handleToggleGif = async (g: Gif) => {
    try {
      await stickersAdminService.toggleGifActive(g.id, !g.is_active);
      setGifs((prev) => prev.map((x) => (x.id === g.id ? { ...x, is_active: !x.is_active } : x)));
    } catch (err: any) {
      toast.error('Toggle failed', err.message);
    }
  };

  const handleDeleteGif = async (g: Gif) => {
    if (!confirm('Delete this GIF?')) return;
    try {
      await stickersAdminService.deleteGif(g.id);
      setGifs((prev) => prev.filter((x) => x.id !== g.id));
      toast.success('Deleted');
    } catch (err: any) {
      toast.error('Delete failed', err.message);
    }
  };

  if (!canManage) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>You don't have permission to manage stickers.</div>
      </div>
    );
  }

  // ---------- Render ----------
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Stickers & GIFs</h1>
          <p className={styles.subtitle}>
            Upload custom stickers or import animated GIFs from Giphy for use in chat.
          </p>
        </div>
      </div>

      <div className={styles.tabs}>
        <button
          className={styles.tab + ' ' + (activeTab === 'upload' ? styles.tabActive : '')}
          onClick={() => setActiveTab('upload')}
        >
          <UploadIcon size={16} />
          Upload Stickers
        </button>
        <button
          className={styles.tab + ' ' + (activeTab === 'import' ? styles.tabActive : '')}
          onClick={() => setActiveTab('import')}
        >
          <Sparkles size={16} />
          Import GIFs
        </button>
        <button
          className={styles.tab + ' ' + (activeTab === 'manage' ? styles.tabActive : '')}
          onClick={() => setActiveTab('manage')}
        >
          <Smile size={16} />
          Manage ({stickers.length + gifs.length})
        </button>
      </div>

      {loading && <div className={styles.loading}>Loading...</div>}

      {/* UPLOAD TAB */}
      {!loading && activeTab === 'upload' && (
        <>
          <div className={styles.packSelector}>
            <label className={styles.packLabel}>Sticker Pack</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <select
                className={styles.packSelect}
                value={uploadPackId}
                onChange={(e) => setUploadPackId(e.target.value)}
              >
                {packs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button
                className={styles.uploadButton}
                onClick={() => setShowCreatePack(!showCreatePack)}
                type='button'
              >
                <Plus size={14} /> New Pack
              </button>
            </div>
            {showCreatePack && (
              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <input
                  className={styles.searchInput}
                  placeholder='Pack name, e.g. Spensive Reactions'
                  value={newPackName}
                  onChange={(e) => setNewPackName(e.target.value)}
                />
                <button
                  className={styles.searchButton}
                  onClick={handleCreatePack}
                  disabled={creatingPack}
                >
                  {creatingPack ? 'Creating...' : 'Create'}
                </button>
              </div>
            )}
          </div>

          <div className={styles.uploadArea}>
            <UploadIcon size={40} className={styles.uploadIcon} />
            <p className={styles.uploadTitle}>Upload stickers</p>
            <p className={styles.uploadHint}>PNG, WebP, or GIF — max 2 MB each. Multiple files supported.</p>
            <label className={styles.uploadButton}>
              {uploading ? 'Uploading...' : 'Choose Files'}
              <input
                ref={fileInputRef}
                type='file'
                accept='image/png,image/webp,image/gif,image/jpeg'
                onChange={handleFileInput}
                disabled={uploading || !uploadPackId}
                multiple
                style={{ display: 'none' }}
              />
            </label>
          </div>
        </>
      )}

      {/* IMPORT TAB */}
      {!loading && activeTab === 'import' && (
        <>
          <div className={styles.searchBar}>
            <input
              className={styles.searchInput}
              placeholder='Search Giphy... (e.g. happy, love, laugh)'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button
              className={styles.searchButton}
              onClick={handleSearch}
              disabled={searching}
            >
              {searching ? <Loader2 size={16} className='spin' /> : <Search size={16} />}
              {' '}Search
            </button>
            <button
              className={styles.searchButton}
              onClick={handleTrending}
              disabled={searching}
              style={{ background: 'var(--color-text-secondary)' }}
            >
              Trending
            </button>
          </div>

          {searchResults.length === 0 && !searching && (
            <div className={styles.empty}>
              Search for GIFs above, or click Trending to see popular ones.
            </div>
          )}

          {searchResults.length > 0 && (
            <div className={styles.grid}>
              {searchResults.map((g) => {
                const alreadyImported = importedIds.has(g.id) || gifs.some((x) => x.provider_id === g.id);
                return (
                  <div key={g.id} className={styles.gridItem}>
                    <img src={g.preview_url} alt={g.title} className={styles.gridImage} loading='lazy' />
                    <div className={styles.gridOverlay}>
                      <div className={styles.gridName}>{g.title || 'GIF'}</div>
                      <div className={styles.gridActions}>
                        <button
                          className={styles.gridAction + ' ' + (alreadyImported ? '' : styles.gridActionDanger)}
                          onClick={() => !alreadyImported && handleImport(g)}
                          disabled={alreadyImported || importing === g.id}
                        >
                          {alreadyImported ? '✓ Added' : importing === g.id ? '...' : 'Add'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* MANAGE TAB */}
      {!loading && activeTab === 'manage' && (
        <>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)', margin: '12px 0 8px' }}>
            Stickers ({stickers.length})
          </h3>
          {stickers.length === 0 ? (
            <div className={styles.empty}>No stickers uploaded yet.</div>
          ) : (
            <div className={styles.grid}>
              {stickers.map((s) => (
                <div key={s.id} className={styles.gridItem + ' ' + (s.is_active ? '' : styles.gridItemInactive)}>
                  <img src={s.image_url} alt={s.name || 'sticker'} className={styles.gridImage} loading='lazy' />
                  {!s.is_active && <div className={styles.gridBadge}>DISABLED</div>}
                  <div className={styles.gridOverlay}>
                    <div className={styles.gridName}>{s.name || 'Unnamed'}</div>
                    <div className={styles.gridActions}>
                      <button
                        className={styles.gridAction}
                        onClick={() => handleToggleSticker(s)}
                        title={s.is_active ? 'Disable' : 'Enable'}
                      >
                        {s.is_active ? <EyeOff size={12} /> : <Eye size={12} />}
                      </button>
                      <button
                        className={styles.gridAction + ' ' + styles.gridActionDanger}
                        onClick={() => handleDeleteSticker(s)}
                        title='Delete'
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)', margin: '24px 0 8px' }}>
            GIFs ({gifs.length})
          </h3>
          {gifs.length === 0 ? (
            <div className={styles.empty}>No GIFs imported yet.</div>
          ) : (
            <div className={styles.grid}>
              {gifs.map((g) => (
                <div key={g.id} className={styles.gridItem + ' ' + (g.is_active ? '' : styles.gridItemInactive)}>
                  <img src={g.preview_url || g.gif_url} alt={g.title || 'gif'} className={styles.gridImage} loading='lazy' />
                  {!g.is_active && <div className={styles.gridBadge}>DISABLED</div>}
                  {g.provider === 'giphy' && <div className={styles.gridBadge + ' ' + styles.gridBadgeImport} style={{ top: 'auto', bottom: 6, right: 6 }}>GIPHY</div>}
                  <div className={styles.gridOverlay}>
                    <div className={styles.gridName}>{g.title || 'GIF'}</div>
                    <div className={styles.gridActions}>
                      <button
                        className={styles.gridAction}
                        onClick={() => handleToggleGif(g)}
                        title={g.is_active ? 'Disable' : 'Enable'}
                      >
                        {g.is_active ? <EyeOff size={12} /> : <Eye size={12} />}
                      </button>
                      <button
                        className={styles.gridAction + ' ' + styles.gridActionDanger}
                        onClick={() => handleDeleteGif(g)}
                        title='Delete'
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
