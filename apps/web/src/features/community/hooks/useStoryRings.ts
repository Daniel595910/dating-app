import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/config/supabase.client';

export interface StoryAuthorSummary {
  author_id: string;
  author_name: string;
  author_avatar: string | null;
  is_self: boolean;
  has_unseen: boolean;
  latest_at: string;
  stories: Array<{
    id: string;
    media_url: string;
    media_type: 'image' | 'video';
    text_overlay: string | null;
    duration_seconds: number | null;
    created_at: string;
    viewed: boolean;
  }>;
}

interface UseStoryRingsResult {
  ringState: Record<string, 'unseen' | 'seen'>;
  authors: StoryAuthorSummary[];
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useStoryRings(enabled: boolean): UseStoryRingsResult {
  const [ringState, setRingState] = useState<Record<string, 'unseen' | 'seen'>>({});
  const [authors, setAuthors] = useState<StoryAuthorSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const debounceTimer = useRef<number | null>(null);

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_viewable_stories');
      if (error) throw error;
      const raw = data as unknown;
      const list: StoryAuthorSummary[] =
        typeof raw === 'string' ? JSON.parse(raw) : ((raw as StoryAuthorSummary[]) || []);

      const next: Record<string, 'unseen' | 'seen'> = {};
      for (const a of list) {
        if (a.stories.length > 0) {
          next[a.author_id] = a.has_unseen ? 'unseen' : 'seen';
        }
      }
      setAuthors(list);
      setRingState(next);
    } catch (err: any) {
      console.warn('useStoryRings load failed:', err?.message || err);
      setAuthors([]);
      setRingState({});
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  // Initial load
  useEffect(() => {
    if (!enabled) return;
    load();
  }, [enabled, load]);

  // Realtime: debounced refresh on new stories or new views
  useEffect(() => {
    if (!enabled) return;
    const channelName = `story-rings-${Math.random().toString(36).slice(2, 10)}`;
    const channel = supabase.channel(channelName);

    const scheduleReload = () => {
      if (debounceTimer.current !== null) {
        window.clearTimeout(debounceTimer.current);
      }
      debounceTimer.current = window.setTimeout(() => {
        debounceTimer.current = null;
        load();
      }, 300);
    };

    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'stories' },
      scheduleReload
    );
    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'story_views' },
      scheduleReload
    );

    channel.subscribe();
    return () => {
      if (debounceTimer.current !== null) {
        window.clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
      channel.unsubscribe();
    };
  }, [enabled, load]);

  return { ringState, authors, loading, refresh: load };
}