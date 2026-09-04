import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/config/supabase.client';
import { ConnectionState, ConnectionStatus } from '../types/connection.types';

interface PendingRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  message?: string;
}

interface UseConnectionResult {
  connection: ConnectionState | null;
  pendingRequests: PendingRequest[];
  loading: boolean;
  error: string | null;
  sendRequest: (targetId: string, message?: string) => Promise<boolean>;
  acceptRequest: (requestId: string) => Promise<boolean>;
  declineRequest: (requestId: string) => Promise<boolean>;
  cancelRequest: (requestId: string) => Promise<boolean>;
  expressInterest: (matchId: string) => Promise<ConnectionState | null>;
  getConnectionStatus: (targetUserId: string) => Promise<ConnectionStatus>;
  getOrCreateConversation: (matchId: string) => Promise<string | null>;
}

export function useConnection(userId: string | null): UseConnectionResult {
  const [connection, setConnection] = useState<ConnectionState | null>(null);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('send_connection_request', {
        p_target_id: targetId,
        p_message: message || null,
      });

      if (rpcError) throw rpcError;
      return Boolean(data);
    } catch (err: any) {
      setError(err.message || 'Failed to send request');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const acceptRequest = useCallback(async (requestId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('accept_connection_request', {
        p_request_id: requestId,
      });

      if (rpcError) throw rpcError;

      // Remove from pending requests
      setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));

      return Boolean(data);
    } catch (err: any) {
      setError(err.message || 'Failed to accept request');
      return false;
    } finally {
      setLoading(false);
      loadPendingRequests();
    }
  }, [loadPendingRequests]);

  const declineRequest = useCallback(async (requestId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { error: rpcError } = await supabase.rpc('decline_connection_request', {
        p_request_id: requestId,
      });

      if (rpcError) throw rpcError;

      setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to decline request');
      return false;
    } finally {
      setLoading(false);
      loadPendingRequests();
    }
  }, [loadPendingRequests]);

  const cancelRequest = useCallback(async (requestId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { error: rpcError } = await supabase.rpc('cancel_connection_request', {
        p_request_id: requestId,
      });

      if (rpcError) throw rpcError;
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to cancel request');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const expressInterest = useCallback(async (matchId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('express_interest', {
        p_match_id: matchId,
      });

      if (rpcError) throw rpcError;

      if (data) {
        const result = data as any;
        return {
          connectionId: null,
          matchId: result.match_id,
          status: result.matched ? 'matched' : result.mutual_interest ? 'mutual_interest' : 'getting_to_know',
          progress: result.matched ? 100 : result.mutual_interest ? 75 : 50,
          isMutualInterest: result.mutual_interest,
          isMatched: result.matched,
          targetUserId: null,
          targetUserName: null,
        };
      }
      return null;
    } catch (err: any) {
      setError(err.message || 'Failed to express interest');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getConnectionStatus = useCallback(async (targetUserId: string): Promise<ConnectionStatus> => {
    // Check for match first
    const { data: match } = await supabase
      .from('matches')
      .select('*')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .or(`user1_id.eq.${targetUserId},user2_id.eq.${targetUserId}`)
      .single();

    if (match) {
      if (match.stage === 'matched') return 'matched';
      if (match.user1_interest && match.user2_interest) return 'mutual_interest';
      if (match.user1_interest || match.user2_interest) return 'getting_to_know';
      return 'accepted';
    }

    // Check for pending request
    const { data: request } = await supabase
      .from('match_requests')
      .select('*')
      .or(`and(requester_id.eq.${userId},target_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},target_id.eq.${userId})`)
      .single();

    if (request) {
      if (request.status === 'pending') return 'pending';
      if (request.status === 'declined') return 'declined';
      if (request.status === 'cancelled') return 'cancelled';
    }

    return 'none';
  }, [userId]);

  const getOrCreateConversation = useCallback(async (matchId: string) => {
    try {
      const { data, error: rpcError } = await supabase.rpc('get_or_create_conversation', {
        p_match_id: matchId,
      });

      if (rpcError) throw rpcError;
      return data as string;
    } catch (err: any) {
      setError(err.message || 'Failed to create conversation');
      return null;
    }
  }, []);

  return {
    connection,
    pendingRequests,
    loading,
    error,
    sendRequest,
    acceptRequest,
    declineRequest,
    cancelRequest,
    expressInterest,
    getConnectionStatus,
    getOrCreateConversation,
  };
}
