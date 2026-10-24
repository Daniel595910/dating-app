import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { supabase } from '@/config/supabase.client';
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
  const [showMicPrompt, setShowMicPrompt] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentCallId = activeCall?.id || incomingCall?.id || null;
  const webRTC = useWebRTCVoice(currentCallId || '', user?.id || '');

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
        callService.updateCallStatus(call.id, 'missed');
      }, 30000);
    });

    return () => {
      unsubscribeRef.current?.();
      if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
    };
  }, [user]);

  useEffect(() => {
    if (!currentCallId || !user) return;

    let unsubscribe: (() => void) | null = null;
    let cancelled = false;

    callService
      .subscribeToCallSignals(currentCallId, (signal: CallSignal) => {
        if (signal.senderId === user.id) return;

        switch (signal.type) {
          case 'call_offer':
            webRTC.createPeerConnection();
            webRTC.handleOffer(signal.payload as RTCSessionDescriptionInit);
            break;
          case 'call_answer':
            webRTC.handleAnswer(signal.payload as RTCSessionDescriptionInit);
            setCallState('connecting');
            break;
          case 'ice_candidate':
            webRTC.handleIceCandidate(signal.payload as RTCIceCandidateInit);
            break;
          case 'call_declined':
            setActiveCall(null);
            setCallState('declined');
            webRTC.cleanup();
            break;
          case 'call_cancelled':
            setIncomingCall(null);
            setCallState('idle');
            break;
          case 'call_ended':
            setActiveCall(null);
            setCallState('ended');
            webRTC.cleanup();
            break;
        }
      })
      .then((fn) => {
        if (cancelled) {
          fn();
        } else {
          unsubscribe = fn;
        }
      })
      .catch((err) => console.error('Failed to subscribe to call signals:', err));

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [currentCallId, user, webRTC]);

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
      setActiveCall(call);
      setCallState('calling');
      await webRTC.getMicrophone();
      webRTC.createPeerConnection();
      await webRTC.createOffer();
    } catch (err: any) {
      setCallState('failed');
      if (err.message?.includes('icrophone') || err.message?.includes('Microphone') || err.message?.includes('not supported')) {
        setShowMicPrompt(true);
      }
      throw err;
    }
  }, [webRTC]);

  const acceptCall = useCallback(async () => {
    if (!incomingCall) return;
    if (ringTimeoutRef.current) { clearTimeout(ringTimeoutRef.current); ringTimeoutRef.current = null; }

    try {
      await webRTC.getMicrophone();
      webRTC.createPeerConnection();
      setActiveCall(incomingCall);
      setIncomingCall(null);
      setCallState('connecting');
      await callService.updateCallStatus(incomingCall.id, 'connecting');
    } catch (err: any) {
      console.error('Accept call error:', err);
      setCallState('failed');
      await callService.updateCallStatus(incomingCall.id, 'failed');
      alert(err.message || 'Failed to accept call. Please check microphone permissions.');
    }
  }, [incomingCall, webRTC]);

  const declineCall = useCallback(async () => {
    if (!incomingCall) return;
    if (ringTimeoutRef.current) { clearTimeout(ringTimeoutRef.current); ringTimeoutRef.current = null; }
    await callService.updateCallStatus(incomingCall.id, 'declined');
    webRTC.cleanup();
    callService.releaseCallChannel(incomingCall.id);
    setIncomingCall(null);
    setCallState('idle');
  }, [incomingCall, webRTC]);

  const endCall = useCallback(async () => {
    if (!activeCall) return;

    if (callState === 'calling') {
      callService.sendCallSignal(activeCall.id, {
        type: 'call_cancelled',
        callId: activeCall.id,
        senderId: user?.id || '',
      }).catch((err) => console.error('Failed to send call_cancelled signal:', err));
    }

    await callService.endCall(activeCall.id, 'caller_ended');
    webRTC.cleanup();
    callService.releaseCallChannel(activeCall.id);
    setActiveCall(null);
    setCallState('ended');
  }, [activeCall, webRTC, callState, user]);

  const toggleMute = useCallback(() => {
    webRTC.toggleMute();
    setIsMuted((prev) => !prev);
  }, [webRTC]);

  return (
    <CallContext.Provider
      value={{
        activeCall,
        callState,
        isMuted,
        incomingCall,
        startCall,
        acceptCall,
        declineCall,
        endCall,
        toggleMute,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within CallProvider');
  }
  return context;
};


