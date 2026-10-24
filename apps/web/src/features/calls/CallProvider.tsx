import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { callService } from './services/call.service';
import { CallSession, CallStatus, CallSignal } from './types/call.types';
import { useWebRTCVoice } from './hooks/useWebRTCVoice';

interface CallContextType {
  activeCall: CallSession | null;
  callState: CallStatus;
  isMuted: boolean;
  incomingCall: CallSession | null;
  startCall: (targetUserId: string) => Promise<void>;
  acceptCall: () => Promise<void>;
  declineCall: () => Promise<void>;
  endCall: () => Promise<void>;
  toggleMute: () => void;
}

const CallContext = createContext<CallContextType | null>(null);

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthStore();
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallSession | null>(null);
  const [callState, setCallState] = useState<CallStatus>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentCallId = activeCall?.id || incomingCall?.id || null;
  const webRTC = useWebRTCVoice(currentCallId || '', user?.id || '');

  // Subscribe to incoming call notifications (postgres_changes on call_sessions)
  useEffect(() => {
    if (!user) return;
    unsubscribeRef.current = callService.subscribeToIncomingCalls(user.id, (call) => {
      setIncomingCall(call);
      setCallState('ringing');
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = setTimeout(() => {
        setIncomingCall(null);
        setCallState('idle');
        callService.updateCallStatus(call.id, 'missed').catch(console.error);
      }, 30000);
    });
    return () => {
      unsubscribeRef.current?.();
      if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
    };
  }, [user]);

  // Subscribe to per-call signals (broadcast channel). Runs for BOTH caller and callee.
  useEffect(() => {
    if (!currentCallId || !user) return;
    let unsubscribe: (() => void) | null = null;
    let cancelled = false;
    const myUserId = user.id;

    callService
      .subscribeToCallSignals(currentCallId, (signal: CallSignal) => {
        if (signal.senderId === myUserId) return;
        switch (signal.type) {
          case 'callee_ready':
            webRTC.createOffer().catch((err) => {
              console.error('createOffer failed:', err);
              setCallState('failed');
            });
            break;
          case 'call_offer':
            webRTC.handleOffer(signal.payload as RTCSessionDescriptionInit).catch((err) => {
              console.error('handleOffer failed:', err);
              setCallState('failed');
            });
            break;
          case 'call_answer':
            webRTC.handleAnswer(signal.payload as RTCSessionDescriptionInit).catch((err) => {
              console.error('handleAnswer failed:', err);
            });
            setCallState('connecting');
            break;
          case 'ice_candidate':
            webRTC.handleIceCandidate(signal.payload as RTCIceCandidateInit).catch(console.error);
            break;
          case 'call_declined':
            if (ringTimeoutRef.current) { clearTimeout(ringTimeoutRef.current); ringTimeoutRef.current = null; }
            setActiveCall(null);
            setCallState('declined');
            webRTC.cleanup();
            break;
          case 'call_cancelled':
            if (ringTimeoutRef.current) { clearTimeout(ringTimeoutRef.current); ringTimeoutRef.current = null; }
            setIncomingCall(null);
            setCallState('idle');
            break;
          case 'call_ended':
            if (ringTimeoutRef.current) { clearTimeout(ringTimeoutRef.current); ringTimeoutRef.current = null; }
            setActiveCall(null);
            setCallState('ended');
            webRTC.cleanup();
            break;
        }
      })
      .then((fn) => {
        if (cancelled) fn();
        else unsubscribe = fn;
      })
      .catch((err) => console.error('Failed to subscribe to call signals:', err));

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [currentCallId, user, webRTC]);

  // Mirror WebRTC connection state into DB + UI
  useEffect(() => {
    if (!activeCall?.id) return;
    if (webRTC.connectionState === 'connected') {
      setCallState('connected');
      callService.updateCallStatus(activeCall.id, 'connected').catch(console.error);
    } else if (webRTC.connectionState === 'failed') {
      setCallState('failed');
      callService.updateCallStatus(activeCall.id, 'failed').catch(console.error);
    }
  }, [webRTC.connectionState, activeCall?.id]);

  const startCall = useCallback(async (targetUserId: string) => {
    try {
      const call = await callService.startCall(targetUserId);
      if (!call || !call.id) throw new Error('Failed to create call session');
      setActiveCall(call);
      setCallState('calling');
      await webRTC.getMicrophone();
      webRTC.ensurePeerConnection();
      // NOTE: do NOT create offer here. Wait for 'callee_ready' signal.
    } catch (err: any) {
      setCallState('failed');
      if (err.message?.includes('icrophone') || err.message?.includes('Microphone') || err.message?.includes('not supported')) {
      }
      throw err;
    }
  }, [webRTC]);

  const acceptCall = useCallback(async () => {
    if (!incomingCall) return;
    if (ringTimeoutRef.current) { clearTimeout(ringTimeoutRef.current); ringTimeoutRef.current = null; }
    const callToAccept = incomingCall;
    try {
      await webRTC.getMicrophone();
      webRTC.ensurePeerConnection();
      setActiveCall(callToAccept);
      setIncomingCall(null);
      setCallState('connecting');
      await callService.updateCallStatus(callToAccept.id, 'connecting');
      await callService.sendCallSignal(callToAccept.id, {
        type: 'callee_ready',
        callId: callToAccept.id,
        senderId: user?.id || '',
      });
    } catch (err: any) {
      console.error('Accept call error:', err);
      setCallState('failed');
      callService.updateCallStatus(callToAccept.id, 'failed').catch(console.error);
      alert(err.message || 'Failed to accept call. Please check microphone permissions.');
    }
  }, [incomingCall, webRTC, user]);

  const declineCall = useCallback(async () => {
    if (!incomingCall) return;
    if (ringTimeoutRef.current) { clearTimeout(ringTimeoutRef.current); ringTimeoutRef.current = null; }
    const callId = incomingCall.id;
    try {
      await callService.sendCallSignal(callId, {
        type: 'call_declined',
        callId,
        senderId: user?.id || '',
      });
    } catch (e) { console.error(e); }
    await callService.updateCallStatus(callId, 'declined');
    webRTC.cleanup();
    callService.releaseCallChannel(callId);
    setIncomingCall(null);
    setCallState('idle');
  }, [incomingCall, webRTC, user]);

  const endCall = useCallback(async () => {
    if (!activeCall) return;
    const callId = activeCall.id;
    const wasRinging = callState === 'calling';
    try {
      await callService.sendCallSignal(callId, {
        type: wasRinging ? 'call_cancelled' : 'call_ended',
        callId,
        senderId: user?.id || '',
      });
    } catch (e) { console.error(e); }
    await callService.endCall(callId, wasRinging ? 'caller_cancelled' : 'caller_ended');
    webRTC.cleanup();
    callService.releaseCallChannel(callId);
    setActiveCall(null);
    setCallState('ended');
  }, [activeCall, webRTC, callState, user]);

  const toggleMute = useCallback(() => {
    webRTC.toggleMute();
    setIsMuted((prev) => !prev);
  }, [webRTC]);

  return (
    <CallContext.Provider value={{ activeCall, callState, isMuted, incomingCall, startCall, acceptCall, declineCall, endCall, toggleMute }}>
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) throw new Error('useCall must be used within CallProvider');
  return context;
};

