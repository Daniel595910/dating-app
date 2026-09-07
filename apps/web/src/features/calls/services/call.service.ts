import { supabase } from '@/config/supabase.client';
import { CallSession, CallSignal } from '../types/call.types';

class CallService {
  async startCall(targetUserId: string): Promise<CallSession | null> {
    const { data, error } = await supabase.rpc('start_voice_call', {
      p_target_user_id: targetUserId,
    });

    if (error) {
      if (error.message.includes('busy')) {
        throw new Error('User is currently on another call');
      }
      if (error.message.includes('block')) {
        throw new Error('You cannot call this user');
      }
      if (error.message.includes('already')) {
        throw new Error('You are already in a call');
      }
      throw error;
    }

    if (data?.error === 'busy') {
      throw new Error('User is currently on another call');
    }

    return data as CallSession;
  }

  async updateCallStatus(callId: string, status: string): Promise<void> {
    await supabase.rpc('update_call_status', {
      p_call_id: callId,
      p_status: status,
    });
  }

  async endCall(callId: string, reason: string): Promise<void> {
    await supabase.rpc('end_voice_call', {
      p_call_id: callId,
      p_end_reason: reason,
    });
  }

  subscribeToIncomingCalls(userId: string, callback: (call: CallSession) => void): () => void {
    const channel = supabase
      .channel(`call:user:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'call_sessions',
        filter: `callee_id=eq.${userId}`,
      }, (payload) => {
        callback(payload.new as CallSession);
      })
      .subscribe();

    return () => channel.unsubscribe();
  }

  subscribeToCallSignals(callId: string, callback: (signal: CallSignal) => void): () => void {
    const channel = supabase
      .channel(`call:session:${callId}`)
      .on('broadcast', { event: 'call_signal' }, (payload) => {
        callback(payload.payload as CallSignal);
      })
      .subscribe();

    return () => channel.unsubscribe();
  }

  sendCallSignal(callId: string, signal: CallSignal): void {
    supabase.channel(`call:session:${callId}`).send({
      type: 'broadcast',
      event: 'call_signal',
      payload: signal,
    });
  }
}

export const callService = new CallService();
