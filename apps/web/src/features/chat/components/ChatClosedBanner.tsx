import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Clock, Check, X, Handshake } from 'lucide-react';
import { supabase } from '@/config/supabase.client';
import { useAuthStore } from '@/store/auth.store';

interface ChatClosedBannerProps {
  conversationId: string;
  otherUserId: string;
  otherUserName: string;
  onReopened: () => void;
}

type RematchState =
  | 'none'                // nobody requested — show "Request Rematch"
  | 'sent'                // I sent, waiting for them
  | 'received'            // they sent, I need to accept/decline
  | 'accepted'            // accepted (banner should disappear)
  | 'checking';

export const ChatClosedBanner: React.FC<ChatClosedBannerProps> = ({
  conversationId,
  otherUserId,
  otherUserName,
  onReopened,
}) => {
  const { user } = useAuthStore();
  const [state, setState] = useState<RematchState>('checking');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);

  const loadState = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('match_requests')
        .select('id, requester_id, target_id, status')
        .or(
          `and(requester_id.eq.${user.id},target_id.eq.${otherUserId}),` +
          `and(requester_id.eq.${otherUserId},target_id.eq.${user.id})`
        )
        .in('status', ['pending', 'accepted'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!data) {
        setState('none');
        return;
      }

      setPendingRequestId(data.id);

      if (data.status === 'accepted') {
        setState('accepted');
        // Chat should be reopened by now — notify parent
        onReopened();
        return;
      }

      // status === 'pending'
      if (data.requester_id === user.id) {
        setState('sent');
      } else {
        setState('received');
      }
    } catch {
      setState('none');
    }
  }, [user, otherUserId, onReopened]);

  useEffect(() => {
    loadState();
  }, [loadState]);

  // Refresh when the tab regains focus
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') loadState();
    };
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [loadState]);

  const handleRequestRematch = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      // Clear any old cancelled/declined rows so send_connection_request doesn't block
      await supabase
        .from('match_requests')
        .delete()
        .or(
          `and(requester_id.eq.${user.id},target_id.eq.${otherUserId}),` +
          `and(requester_id.eq.${otherUserId},target_id.eq.${user.id})`
        )
        .in('status', ['cancelled', 'declined']);

      const { error: rpcError } = await supabase.rpc('send_connection_request', {
        p_target_id: otherUserId,
        p_message: null,
      });

      if (rpcError) throw rpcError;

      setState('sent');
    } catch (err: any) {
      setError(err?.message || 'Failed to send request');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!pendingRequestId) return;
    setLoading(true);
    setError(null);

    try {
      const { error: rpcError } = await supabase.rpc('accept_connection_request', {
        p_request_id: pendingRequestId,
      });

      if (rpcError) throw rpcError;

      setState('accepted');
      onReopened();
    } catch (err: any) {
      setError(err?.message || 'Failed to accept');
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!pendingRequestId) return;
    setLoading(true);
    setError(null);

    try {
      await supabase
        .from('match_requests')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', pendingRequestId);

      setState('none');
      setPendingRequestId(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to decline');
    } finally {
      setLoading(false);
    }
  };

  // If accepted → parent should have removed the banner. Return null to be safe.
  if (state === 'accepted') return null;

  return (
    <div
      style={{
        padding: '12px 16px',
        background: '#fef2f2',
        borderTop: '1px solid #fecaca',
        color: '#991b1b',
      }}
    >
      {/* Row 1: icon + message */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          fontSize: 13,
          fontWeight: 500,
          marginBottom: state === 'none' || state === 'received' ? 10 : 0,
          textAlign: 'center',
        }}
      >
        {state === 'none' && (
          <>
            <AlertTriangle size={16} />
            This connection has ended.
          </>
        )}
        {state === 'sent' && (
          <>
            <Clock size={16} />
            Rematch request sent. Waiting for {otherUserName} to accept.
          </>
        )}
        {state === 'received' && (
          <>
            <Handshake size={16} />
            {otherUserName} wants to reconnect.
          </>
        )}
        {state === 'checking' && (
          <>
            <AlertTriangle size={16} />
            This connection has ended.
          </>
        )}
      </div>

      {/* Row 2: actions */}
      {state === 'none' && (
        <button
          onClick={handleRequestRematch}
          disabled={loading}
          style={{
            width: '100%',
            padding: '10px 16px',
            background: loading ? '#fca5a5' : '#ef4444',
            color: '#ffffff',
            border: 'none',
            borderRadius: '9999px',
            fontSize: 13,
            fontWeight: 700,
            cursor: loading ? 'wait' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <Handshake size={14} />
          {loading ? 'Sending…' : 'Request Rematch'}
        </button>
      )}

      {state === 'received' && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleAccept}
            disabled={loading}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: loading ? '#86efac' : '#10b981',
              color: '#ffffff',
              border: 'none',
              borderRadius: '9999px',
              fontSize: 13,
              fontWeight: 700,
              cursor: loading ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <Check size={14} />
            {loading ? 'Accepting…' : 'Accept'}
          </button>
          <button
            onClick={handleDecline}
            disabled={loading}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: 'none',
              color: '#991b1b',
              border: '1px solid #fecaca',
              borderRadius: '9999px',
              fontSize: 13,
              fontWeight: 600,
              cursor: loading ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <X size={14} />
            Decline
          </button>
        </div>
      )}

      {error && (
        <p
          style={{
            margin: '8px 0 0',
            fontSize: 12,
            color: '#b91c1c',
            textAlign: 'center',
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
};