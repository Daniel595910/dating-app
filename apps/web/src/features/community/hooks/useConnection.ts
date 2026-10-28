import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/config/supabase.client';
import { ConnectionState, ConnectionStatus } from '../types/connection.types';

interface PendingRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  requesterAvatarUrl?: string | null;
  message?: string;
}

interface ActiveConnection {
  matchId: string;
  targetUserId: string;
  targetUserName: string;
  myInterest: boolean;
  otherInterest: boolean;
  targetAvatarUrl: string | null;
}

interface UseConnectionResult {
  connection: ConnectionState | null;
  pendingRequests: PendingRequest[];
  activeConnections: ActiveConnection[];
  matchedConnections: ActiveConnection[];
  likesReceived: ActiveConnection[];
  loading: boolean;
  error: string | null;
  sendRequest: (targetId: string, message?: string) => Promise<boolean>;
  acceptRequest: (requestId: string) => Promise<boolean>;
  declineRequest: (requestId: string) => Promise<boolean>;
  cancelRequest: (requestId: string) => Promise<boolean>;
  expressInterest: (matchId: string) => Promise<ConnectionState | null>;
  getConnectionStatus: (targetUserId: string) => Promise<ConnectionStatus>;
  getOrCreateConversation: (matchId: string) => Promise<string | null>;
  unmatch: (matchId: string, otherUserId: string) => Promise<boolean>;
  likeBack: (matchId: string) => Promise<boolean>;
  skipLike: (matchId: string) => Promise<boolean>;
}

export function useConnection(userId: string | null): UseConnectionResult {
  const [connection, setConnection] = useState<ConnectionState | null>(null);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [activeConnections, setActiveConnections] = useState<ActiveConnection[]>([]);
  const [matchedConnections, setMatchedConnections] = useState<ActiveConnection[]>([]);
  const [likesReceived, setLikesReceived] = useState<ActiveConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadActiveConnections = useCallback(async () => {
    if (!userId) return;

    const { data: matches } = await supabase
      .from('matches')
      .select('*')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .eq('status', 'active')
      .eq('stage', 'getting_to_know');

    if (matches && matches.length > 0) {
      const otherUserIds = matches.map((m: any) =>
        m.user1_id === userId ? m.user2_id : m.user1_id
      );

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', otherUserIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      const connections: ActiveConnection[] = matches.map((m: any) => {
        const isUser1 = m.user1_id === userId;
        const otherUserId = isUser1 ? m.user2_id : m.user1_id;

        return {
          matchId: m.id,
          targetUserId: otherUserId,
          targetUserName: profileMap.get(otherUserId)?.display_name || 'User',
          targetAvatarUrl: profileMap.get(otherUserId)?.avatar_url || null,
          myInterest: isUser1 ? m.user1_interest : m.user2_interest,
          otherInterest: isUser1 ? m.user2_interest : m.user1_interest,
        };
      });

      setActiveConnections(connections);
    }
  }, [userId]);

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
        .select('user_id, display_name, avatar_url')
        .in('user_id', requesterIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      setPendingRequests(
        requests.map((r: any) => ({
          id: r.id,
          requesterId: r.requester_id,
          requesterName: profileMap.get(r.requester_id)?.display_name || 'Someone',
          requesterAvatarUrl: profileMap.get(r.requester_id)?.avatar_url || null,
          message: r.message,
        }))
      );
    }
  }, [userId]);

  const loadMatchedConnections = useCallback(async () => {
    if (!userId) return;

    const { data: matches } = await supabase
      .from('matches')
      .select('*')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .eq('stage', 'matched')
      .in('status', ['active', 'completed']);

    if (!matches || matches.length === 0) {
      setMatchedConnections([]);
      return;
    }

    const otherUserIds = matches.map((m: any) =>
      m.user1_id === userId ? m.user2_id : m.user1_id
    );

    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url')
      .in('user_id', otherUserIds);

    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

    const connections: ActiveConnection[] = matches.map((m: any) => {
      const isUser1 = m.user1_id === userId;
      const otherUserId = isUser1 ? m.user2_id : m.user1_id;
      const profile = profileMap.get(otherUserId);

      return {
        matchId: m.id,
        targetUserId: otherUserId,
        targetUserName: profile?.display_name || 'User',
        targetAvatarUrl: profile?.avatar_url || null,
        myInterest: isUser1 ? m.user1_interest : m.user2_interest,
        otherInterest: isUser1 ? m.user2_interest : m.user1_interest,
      };
    });

    setMatchedConnections(connections);
  }, [userId]);

  const loadLikesReceived = useCallback(async () => {
    if (!userId) return;

    // One-way interest: the OTHER user expressed interest, I have not
    const { data: matches } = await supabase
      .from('matches')
      .select('*')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .in('stage', ['getting_to_know', 'compatibility_check'])
      .eq('status', 'active');

    if (!matches || matches.length === 0) {
      setLikesReceived([]);
      return;
    }

    // Filter to one-way interest (they liked me, I have not liked back)
    const oneWay = matches.filter((m: any) => {
      const isUser1 = m.user1_id === userId;
      const myInterest = isUser1 ? m.user1_interest : m.user2_interest;
      const theirInterest = isUser1 ? m.user2_interest : m.user1_interest;
      return theirInterest === true && myInterest === false;
    });

    if (oneWay.length === 0) {
      setLikesReceived([]);
      return;
    }

    const otherUserIds = oneWay.map((m: any) =>
      m.user1_id === userId ? m.user2_id : m.user1_id
    );

    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url')
      .in('user_id', otherUserIds);

    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

    const connections: ActiveConnection[] = oneWay.map((m: any) => {
      const isUser1 = m.user1_id === userId;
      const otherUserId = isUser1 ? m.user2_id : m.user1_id;
      const profile = profileMap.get(otherUserId);

  const unmatch = useCallback(async (matchId: string, otherUserId: string) => {
    setLoading(true);
    setError(null);

    // Optimistic remove from matched list
    const backup = matchedConnections;
    setMatchedConnections((prev) => prev.filter((c) => c.targetUserId !== otherUserId));

    try {
      const { error: matchErr } = await supabase
        .from('matches')
        .update({
          stage: 'rejected',
          status: 'cancelled',
          rejected_at: new Date().toISOString(),
        })
        .eq('id', matchId);

      if (matchErr) throw matchErr;

      // Close the conversation so neither user can message
      await supabase
        .from('conversations')
        .update({ closed_at: new Date().toISOString() })
        .eq('match_id', matchId);

      // Cancel any pending requests so they can rematch later
      await supabase
        .from('match_requests')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .or(
          `and(requester_id.eq.${otherUserId},target_id.eq.${userId}),` +
          `and(requester_id.eq.${userId},target_id.eq.${otherUserId})`
        )
        .in('status', ['pending', 'accepted']);

      return true;
    } catch (err: any) {
      setMatchedConnections(backup);
      setError(err.message || 'Failed to unmatch');
      return false;
    } finally {
      setLoading(false);
    }
  }, [matchedConnections, userId]);

  const likeBack = useCallback(async (matchId: string) => {
    setLoading(true);
    setError(null);

    // Optimistic remove from likes list
    const backup = likesReceived;
    setLikesReceived((prev) => prev.filter((c) => c.matchId !== matchId));

    try {
      const { error: rpcErr } = await supabase.rpc('express_interest', {
        p_match_id: matchId,
      });

      if (rpcErr) throw rpcErr;

      await loadActiveConnections();
      await loadMatchedConnections();
      return true;
    } catch (err: any) {
      setLikesReceived(backup);
      setError(err.message || 'Failed to like back');
      return false;
    } finally {
      setLoading(false);
    }
  }, [likesReceived, loadActiveConnections, loadMatchedConnections]);

  const skipLike = useCallback(async (matchId: string) => {
    setLoading(true);
    setError(null);

    const backup = likesReceived;
    setLikesReceived((prev) => prev.filter((c) => c.matchId !== matchId));

    try {
      const { error: updateErr } = await supabase
        .from('matches')
        .update({ stage: 'rejected', status: 'cancelled', rejected_at: new Date().toISOString() })
        .eq('id', matchId);

      if (updateErr) throw updateErr;
      return true;
    } catch (err: any) {
      setLikesReceived(backup);
      setError(err.message || 'Failed to skip');
      return false;
    } finally {
      setLoading(false);
    }
  }, [likesReceived]);

      return {
        matchId: m.id,
        targetUserId: otherUserId,
        targetUserName: profile?.display_name || 'User',
        targetAvatarUrl: profile?.avatar_url || null,
        myInterest: false,
        otherInterest: true,
      };
    });

    setLikesReceived(connections);
  }, [userId]);

  useEffect(() => {
    loadPendingRequests();
    loadActiveConnections();
    loadMatchedConnections();
    loadLikesReceived();
  }, [loadPendingRequests, loadActiveConnections, loadMatchedConnections, loadLikesReceived]);

  const sendRequest = useCallback(async (targetId: string, message?: string) => {
    setLoading(true);
    setError(null);
    try {
      const { error: rpcError } = await supabase.rpc('send_connection_request', {
        p_target_id: targetId,
        p_message: message || null,
      });

      if (rpcError) throw rpcError;
      return true;
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
      const { error: rpcError } = await supabase.rpc('accept_connection_request', {
        p_request_id: requestId,
      });

      if (rpcError) throw rpcError;

      setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
      await loadActiveConnections();
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to accept request');
      return false;
    } finally {
      setLoading(false);
      loadPendingRequests();
    }
  }, [loadActiveConnections, loadPendingRequests]);

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

      await loadActiveConnections();

      if (data) {
        const result = data as any;
  const unmatch = useCallback(async (matchId: string, otherUserId: string) => {
    setLoading(true);
    setError(null);

    // Optimistic remove from matched list
    const backup = matchedConnections;
    setMatchedConnections((prev) => prev.filter((c) => c.targetUserId !== otherUserId));

    try {
      const { error: matchErr } = await supabase
        .from('matches')
        .update({
          stage: 'rejected',
          status: 'cancelled',
          rejected_at: new Date().toISOString(),
        })
        .eq('id', matchId);

      if (matchErr) throw matchErr;

      // Close the conversation so neither user can message
      await supabase
        .from('conversations')
        .update({ closed_at: new Date().toISOString() })
        .eq('match_id', matchId);

      // Cancel any pending requests so they can rematch later
      await supabase
        .from('match_requests')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .or(
          `and(requester_id.eq.${otherUserId},target_id.eq.${userId}),` +
          `and(requester_id.eq.${userId},target_id.eq.${otherUserId})`
        )
        .in('status', ['pending', 'accepted']);

      return true;
    } catch (err: any) {
      setMatchedConnections(backup);
      setError(err.message || 'Failed to unmatch');
      return false;
    } finally {
      setLoading(false);
    }
  }, [matchedConnections, userId]);

  const likeBack = useCallback(async (matchId: string) => {
    setLoading(true);
    setError(null);

    // Optimistic remove from likes list
    const backup = likesReceived;
    setLikesReceived((prev) => prev.filter((c) => c.matchId !== matchId));

    try {
      const { error: rpcErr } = await supabase.rpc('express_interest', {
        p_match_id: matchId,
      });

      if (rpcErr) throw rpcErr;

      await loadActiveConnections();
      await loadMatchedConnections();
      return true;
    } catch (err: any) {
      setLikesReceived(backup);
      setError(err.message || 'Failed to like back');
      return false;
    } finally {
      setLoading(false);
    }
  }, [likesReceived, loadActiveConnections, loadMatchedConnections]);

  const skipLike = useCallback(async (matchId: string) => {
    setLoading(true);
    setError(null);

    const backup = likesReceived;
    setLikesReceived((prev) => prev.filter((c) => c.matchId !== matchId));

    try {
      const { error: updateErr } = await supabase
        .from('matches')
        .update({ stage: 'rejected', status: 'cancelled', rejected_at: new Date().toISOString() })
        .eq('id', matchId);

      if (updateErr) throw updateErr;
      return true;
    } catch (err: any) {
      setLikesReceived(backup);
      setError(err.message || 'Failed to skip');
      return false;
    } finally {
      setLoading(false);
    }
  }, [likesReceived]);

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
  }, [loadActiveConnections]);

  const getConnectionStatus = useCallback(async (targetUserId: string): Promise<ConnectionStatus> => {
    const { data: match } = await supabase
      .from('matches')
      .select('*')
      .or(`and(user1_id.eq.${userId},user2_id.eq.${targetUserId}),and(user1_id.eq.${targetUserId},user2_id.eq.${userId})`)
      .maybeSingle();

    if (match) {
      // Treat rejected/expired/cancelled matches as ''none'' so users can rematch
      if (match.stage === 'rejected' || match.stage === 'expired' || match.status === 'cancelled') {
        // Fall through to check match_requests — an active pending/accepted request may still exist
      } else {
        if (match.stage === 'matched') return 'matched';
        if (match.user1_interest && match.user2_interest) return 'mutual_interest';
        return 'accepted';
      }
    }

    const { data: request } = await supabase
      .from('match_requests')
      .select('*')
      .or(`and(requester_id.eq.${userId},target_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},target_id.eq.${userId})`)
      .maybeSingle();

    if (request) {
      if (request.status === 'pending') return 'pending';
      if (request.status === 'accepted') {
        // Accepted request on a rejected match — likely stale; treat as ''none'' to allow rematch
        return 'none';
      }
      if (request.status === 'declined') return 'none';
      if (request.status === 'cancelled') return 'none';
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

  const unmatch = useCallback(async (matchId: string, otherUserId: string) => {
    setLoading(true);
    setError(null);

    // Optimistic remove from matched list
    const backup = matchedConnections;
    setMatchedConnections((prev) => prev.filter((c) => c.targetUserId !== otherUserId));

    try {
      const { error: matchErr } = await supabase
        .from('matches')
        .update({
          stage: 'rejected',
          status: 'cancelled',
          rejected_at: new Date().toISOString(),
        })
        .eq('id', matchId);

      if (matchErr) throw matchErr;

      // Close the conversation so neither user can message
      await supabase
        .from('conversations')
        .update({ closed_at: new Date().toISOString() })
        .eq('match_id', matchId);

      // Cancel any pending requests so they can rematch later
      await supabase
        .from('match_requests')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .or(
          `and(requester_id.eq.${otherUserId},target_id.eq.${userId}),` +
          `and(requester_id.eq.${userId},target_id.eq.${otherUserId})`
        )
        .in('status', ['pending', 'accepted']);

      return true;
    } catch (err: any) {
      setMatchedConnections(backup);
      setError(err.message || 'Failed to unmatch');
      return false;
    } finally {
      setLoading(false);
    }
  }, [matchedConnections, userId]);

  const likeBack = useCallback(async (matchId: string) => {
    setLoading(true);
    setError(null);

    // Optimistic remove from likes list
    const backup = likesReceived;
    setLikesReceived((prev) => prev.filter((c) => c.matchId !== matchId));

    try {
      const { error: rpcErr } = await supabase.rpc('express_interest', {
        p_match_id: matchId,
      });

      if (rpcErr) throw rpcErr;

      await loadActiveConnections();
      await loadMatchedConnections();
      return true;
    } catch (err: any) {
      setLikesReceived(backup);
      setError(err.message || 'Failed to like back');
      return false;
    } finally {
      setLoading(false);
    }
  }, [likesReceived, loadActiveConnections, loadMatchedConnections]);

  const skipLike = useCallback(async (matchId: string) => {
    setLoading(true);
    setError(null);

    const backup = likesReceived;
    setLikesReceived((prev) => prev.filter((c) => c.matchId !== matchId));

    try {
      const { error: updateErr } = await supabase
        .from('matches')
        .update({ stage: 'rejected', status: 'cancelled', rejected_at: new Date().toISOString() })
        .eq('id', matchId);

      if (updateErr) throw updateErr;
      return true;
    } catch (err: any) {
      setLikesReceived(backup);
      setError(err.message || 'Failed to skip');
      return false;
    } finally {
      setLoading(false);
    }
  }, [likesReceived]);

  return {
    connection,
    pendingRequests,
    matchedConnections,
    likesReceived,
    activeConnections,
    loading,
    error,
    sendRequest,
    acceptRequest,
    declineRequest,
    cancelRequest,
    expressInterest,
    getConnectionStatus,
    getOrCreateConversation,
    unmatch,
    likeBack,
    skipLike,
  };
}
