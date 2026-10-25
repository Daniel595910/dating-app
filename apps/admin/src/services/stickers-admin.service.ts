import { supabase } from '@/config/supabase.client';
import { auditService } from './audit.service';

export interface Sticker {
  id: string;
  pack_id: string;
  name: string | null;
  image_url: string;
  thumbnail_url: string | null;
  mime_type: string;
  width: number | null;
  height: number | null;
  is_animated: boolean;
  is_active: boolean;
  is_premium: boolean;
  sort_order: number;
  created_at: string;
  pack?: { name: string } | null;
}

export interface StickerPack {
  id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Gif {
  id: string;
  provider: string;
  provider_id: string;
  title: string | null;
  preview_url: string | null;
  gif_url: string;
  width: number | null;
  height: number | null;
  is_active: boolean;
  is_premium: boolean;
  created_at: string;
}

export interface GiphyResult {
  id: string;
  title: string;
  preview_url: string;
  gif_url: string;
  full_url: string;
  width: number;
  height: number;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

class StickersAdminService {
  // ---------- Sticker packs ----------

  async listPacks(): Promise<StickerPack[]> {
    const { data, error } = await supabase
      .from('sticker_packs')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });
    if (error) throw new Error(error.message);
    return (data || []) as StickerPack[];
  }

  async createPack(name: string, description?: string): Promise<StickerPack> {
    const { data, error } = await supabase
      .from('sticker_packs')
      .insert({ name, description: description || null })
      .select()
      .single();
    if (error) throw new Error(error.message);
    await auditService.logAction({
      action: 'sticker_pack.create',
      resourceType: 'sticker_pack',
      resourceId: (data as StickerPack).id,
      changes: { name },
    }).catch(() => {});
    return data as StickerPack;
  }

  // ---------- Stickers ----------

  async listStickers(): Promise<Sticker[]> {
    const { data, error } = await supabase
      .from('stickers')
      .select('*, pack:sticker_packs(name)')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []) as Sticker[];
  }

  async uploadSticker(file: File, packId: string, name: string): Promise<Sticker> {
    const ext = file.name.split('.').pop() || 'png';
    const safeName = (name || 'sticker').replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
    const path = 'stickers/' + safeName + '-' + Date.now() + '.' + ext;

    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(path, file, { cacheControl: '31536000', upsert: false });
    if (uploadError) throw new Error(uploadError.message);

    const { data: urlData } = supabase.storage.from('media').getPublicUrl(path);
    const imageUrl = urlData.publicUrl;

    const { data, error } = await supabase
      .from('stickers')
      .insert({
        pack_id: packId,
        name,
        image_url: imageUrl,
        mime_type: file.type || 'image/png',
        is_animated: file.type === 'image/gif' || file.type === 'image/webp',
        is_active: true,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    await auditService.logAction({
      action: 'sticker.upload',
      resourceType: 'sticker',
      resourceId: (data as Sticker).id,
      changes: { name, pack_id: packId, image_url: imageUrl },
    }).catch(() => {});
    return data as Sticker;
  }

  async toggleStickerActive(id: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('stickers')
      .update({ is_active: isActive })
      .eq('id', id);
    if (error) throw new Error(error.message);
  }

  async toggleStickerPremium(id: string, isPremium: boolean): Promise<void> {
    const { error } = await supabase
      .from('stickers')
      .update({ is_premium: isPremium })
      .eq('id', id);
    if (error) throw new Error(error.message);
  }

  async toggleGifPremium(id: string, isPremium: boolean): Promise<void> {
    const { error } = await supabase
      .from('gifs')
      .update({ is_premium: isPremium })
      .eq('id', id);
    if (error) throw new Error(error.message);
  }

  async deleteSticker(id: string): Promise<void> {
    const { error } = await supabase.from('stickers').delete().eq('id', id);
    if (error) throw new Error(error.message);
    await auditService.logAction({
      action: 'sticker.delete',
      resourceType: 'sticker',
      resourceId: id,
      changes: {},
    }).catch(() => {});
  }

  // ---------- Gifs (from Giphy) ----------

  async listGifs(): Promise<Gif[]> {
    const { data, error } = await supabase
      .from('gifs')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []) as Gif[];
  }

  async importGif(g: GiphyResult): Promise<Gif> {
    // Dedupe: check if provider_id already exists
    const { data: existing } = await supabase
      .from('gifs')
      .select('*')
      .eq('provider', 'giphy')
      .eq('provider_id', g.id)
      .maybeSingle();
    if (existing) return existing as Gif;

    const { data, error } = await supabase
      .from('gifs')
      .insert({
        provider: 'giphy',
        provider_id: g.id,
        title: g.title,
        preview_url: g.preview_url,
        gif_url: g.gif_url,
        width: g.width,
        height: g.height,
        is_active: true,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as Gif;
  }

  async toggleGifActive(id: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('gifs')
      .update({ is_active: isActive })
      .eq('id', id);
    if (error) throw new Error(error.message);
  }

  async deleteGif(id: string): Promise<void> {
    const { error } = await supabase.from('gifs').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  // ---------- Giphy search (via Edge Function) ----------

  private async callGiphy(params: string): Promise<GiphyResult[]> {
    const url = SUPABASE_URL + '/functions/v1/search-giphy?' + params;
    const resp = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
      },
    });
    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error('Giphy search failed (' + resp.status + '): ' + errText);
    }
    const json = await resp.json();
    return (json.results || []) as GiphyResult[];
  }

  async searchGiphy(query: string, limit = 24, offset = 0): Promise<GiphyResult[]> {
    return this.callGiphy('q=' + encodeURIComponent(query) + '&limit=' + limit + '&offset=' + offset);
  }

  async trendingGiphy(limit = 24, offset = 0): Promise<GiphyResult[]> {
    return this.callGiphy('endpoint=trending&limit=' + limit + '&offset=' + offset);
  }
}

export const stickersAdminService = new StickersAdminService();
