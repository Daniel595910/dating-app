/**
 * useRealtime Hook
 * Generic realtime subscription management
 */

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/config/supabase.client';

interface RealtimeOptions {
  event ? : 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  schema ? : string;
  table: string;
  filter ? : string;
}

export function useRealtime < T = any > (
  options: RealtimeOptions,
  callback: (payload: T) => void
): () => void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  
  const subscribe = useCallback(() => {
    const {
      event = '*',
        schema = 'public',
        table,
        filter,
    } = options;
    
    let channel = supabase.channel(`${table}-${event}-${Date.now()}`);
    
    if (filter) {
      channel = channel.on('postgres_changes', {
        event,
        schema,
        table,
        filter,
      }, (payload) => {
        callbackRef.current(payload as T);
      });
    } else {
      channel = channel.on('postgres_changes', {
        event,
        schema,
        table,
      }, (payload) => {
        callbackRef.current(payload as T);
      });
    }
    
    channel.subscribe();
    
    return () => {
      channel.unsubscribe();
    };
  }, [options.event, options.schema, options.table, options.filter]);
  
  useEffect(() => {
    const unsubscribe = subscribe();
    return unsubscribe;
  }, [subscribe]);
  
  return subscribe;
}