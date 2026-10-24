import { supabase } from '@/config/supabase.client';
import { CallSession, CallSignal } from '../types/call.types';
import type { RealtimeChannel } from '@supabase/supabase-js';

type SignalCallback = (signal: CallSignal) => void;

class CallService {
  /** Fully subscribed channels by name. */
  private channels = new Map<string, RealtimeChannel>();
  /** In-flight subscription promises by name — dedupes concurrent subscribes. */
  private pending = new Map<string, Promise<RealtimeChannel>>();
  /** Signal subscribers per channel name. */
  private signalCallbacks = new Map<string, Set<SignalCallback>>();

  private channelName(callId: string): string {
    return `call:session:${callId}`;
  }

  /**
   * Returns a channel that is FULLY subscribed (state === 'joined').
   * Registers the call_signal handler BEFORE subscribe() so no messages are missed.
   * Dedupes concurrent subscribe attempts via pending map.
   */
  private async getOrCreateChannel(callId: string): Promise<RealtimeChannel> {
    const name = this.channelName(callId);

    const existing = this.channels.get(name);
    if (existing && (existing.state === 'joined' || existing.state === 'joining')) {
      return existing;
    }

    const inflight = this.pending.get(name);
    if (inflight) return inflight;

    const promise = (async () => {
      const ch = supabase.channel(name);

      // Register handler BEFORE subscribe
      ch.on('broadcast', { event: 'call_signal' }, (payload: any) => {
        const cbs = this.signalCallbacks.get(name);
        if (cbs) cbs.forEach((cb) => { try { cb(payload.payload as CallSignal); } catch (e) { console.error(e); } });
      });

      await new Promise<void>((resolve, reject) => {
        ch.subscribe((status, err) => {
          if (status === 'SUBSCRIBED') resolve();
          else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            reject(new Error('call channel subscribe failed: ' + status + ' ' + (err ? err.message : '')));
          }
        });
      });

      this.channels.set(name, ch);
      this.pending.delete(name);
      return ch;
    })().catch((err) => {
      this.pending.delete(name);
      throw err;
    });

    this.pending.set(name, promise);
    return promise;
  }

  async startCall(targetUserId: string): Promise<CallSession | null> {
    const { data, error } = await supabase.rpc('start_voice_call', {
      p_target_user_id: targetUserId,
    });

    if (error) {
      if (error.message.includes('busy')) throw new Error('User is currently on another call');
      if (error.message.includes('block')) throw new Error('You cannot call this user');
      if (error.message.includes('already')) throw new Error('You are already in a call');
      throw error;
    }
    if (data && data.error === 'busy') throw new Error('User is currently on another call');
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
    const ch = supabase
      .channel(`call:user:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'call_sessions',
        filter: `callee_id=eq.${userId}`,
      }, (payload) => { callback(payload.new as CallSession); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }

  async subscribeToCallSignals(callId: string, callback: SignalCallback): Promise<() => void> {
    const name = this.channelName(callId);
    await this.getOrCreateChannel(callId);
    if (!this.signalCallbacks.has(name)) this.signalCallbacks.set(name, new Set());
    this.signalCallbacks.get(name)!.add(callback);
    return () => { this.signalCallbacks.get(name)?.delete(callback); };
  }

  async sendCallSignal(callId: string, signal: CallSignal): Promise<void> {
    const ch = await this.getOrCreateChannel(callId);
    await ch.send({
      type: 'broadcast',
      event: 'call_signal',
      payload: signal,
    });
  }

  releaseCallChannel(callId: string): void {
    const name = this.channelName(callId);
    const ch = this.channels.get(name);
    if (ch) {
      supabase.removeChannel(ch);
      this.channels.delete(name);
    }
    this.signalCallbacks.delete(name);
    this.pending.delete(name);
  }
}

export const callService = new CallService();
