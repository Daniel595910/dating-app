import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/config/supabase.client';
import { ConnectionState, ConnectionStage } from '../types/community.types';

interface UseConnectionOptions {
  userId: string | null;
}

interface UseConnectionResult {
  connections: ConnectionState[];
  pendingRequests: Array<{ id: string; requesterId: string; requesterName: string; message?: string }>;
  loading: boolean;
  sendRequest: (targetId: string, message?: string) => Promise<boolean>;
  acceptRequest: (requestId: string) => Promise<boolean>;
  rejectRequest: (requestId: string) => Promise<boolean>;
  checkMatch: (connectionId: string) => Promise<boolean>;
}

export function useConnection({ userId }: UseConnectionOptions): UseConnectionResult {
  const [connections, setConnections] = useState<ConnectionState[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Array<{ id: string; requesterId: string; requesterName: string; message?: string }>>([]);
  const [loading, setLoading] = useState(false);

  const loadPendingRequests = useCallback(async () => {
    if (!userId) return;

    const { data: requests } = await supabase
      .from('match_requests')
      .select('*')
      .eq('target_id', userId)
      .eq('status', 'pending');

    if (requests) {
      const requesterIds = requests.map((r: any) => r.requester_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', requesterIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p.display_name]));

      setPendingRequests(
        requests.map((r: any) => ({
          id: r.id,
          requesterId: r.requester_id,
          requesterName: profileMap.get(r.requester_id) || 'Someone',
          message: r.message,
        }))
      );
    }
  }, [userId]);

  useEffect(() => {
    loadPendingRequests();
  }, [loadPendingRequests]);

  const sendRequest = useCallback(async (targetId: string, message?: string) => {
    if (!userId) return false;

    const { error } = await supabase.from('match_requests').insert({
      requester_id: userId,
      target_id: targetId,
      message: message || null,
      status: 'pending',
    });

    return !error;
  }, [userId]);

  const acceptRequest = useCallback(async (requestId: string) => {
    const { error } = await supabase
      .from('match_requests')
      .update({ status: 'accepted' })
      .eq('id', requestId);

    if (!error) {
      setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
    }

    return !error;
  }, []);

  const rejectRequest = useCallback(async (requestId: string) => {
    const { error } = await supabase
      .from('match_requests')
      .update({ status: 'rejected' })
      .eq('id', requestId);

    if (!error) {
      setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
    }

    return !error;
  }, []);

  const checkMatch = useCallback(async (connectionId: string) => {
    const { data } = await supabase
      .from('matches')
      .select('id')
      .eq('id', connectionId)
      .eq('status', 'active')
      .single();

    return Boolean(data);
  }, []);

  return {
    connections,
    pendingRequests,
    loading,
    sendRequest,
    acceptRequest,
    rejectRequest,
    checkMatch,
  };
}
