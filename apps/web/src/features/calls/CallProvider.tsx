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
  const webRTC = useWebRTCVoice(activeCall?.id || '', user?.id || '');

  // Subscribe to incoming calls
  useEffect(() => {
    if (!user) return;

    unsubscribeRef.current = callService.subscribeToIncomingCalls(user.id, (call) => {
      setIncomingCall(call);
      setCallState('ringing');
      
      // Vibration
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }

      // Auto-dismiss after 30 seconds
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

  // Subscribe to call signals when active call exists
  useEffect(() => {
    if (!activeCall?.id || !user) return;

    const unsubscribe = callService.subscribeToCallSignals(activeCall.id, (signal: CallSignal) => {
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
    });

    return () => unsubscribe();
  }, [activeCall?.id, user, webRTC]);

  // Monitor connection state
  useEffect(() => {
    if (webRTC.connectionState === 'connected') {
      setCallState('connected');
    } else if (webRTC.connectionState === 'failed') {
      setCallState('failed');
      endCall();
    }
  }, [webRTC.connectionState]);

  const startCall = useCallback(async (targetUserId: string) => {
    try {
      const call = await callService.startCall(targetUserId);
      setActiveCall(call);
      setCallState('calling');

      // Setup WebRTC
      await webRTC.getMicrophone();
      webRTC.createPeerConnection();
      await webRTC.createOffer();
    } catch (err: any) {
      setCallState('failed');
      throw err;
    }
  }, [webRTC]);

  const acceptCall = useCallback(async () => {
    if (!incomingCall) return;

    try {
      await webRTC.getMicrophone();
      webRTC.createPeerConnection();
      setActiveCall(incomingCall);
      setIncomingCall(null);
      setCallState('connecting');
      await callService.updateCallStatus(incomingCall.id, 'connecting');
    } catch (err) {
      setCallState('failed');
      await callService.updateCallStatus(incomingCall.id, 'failed');
    }
  }, [incomingCall, webRTC]);

  const declineCall = useCallback(async () => {
    if (!incomingCall) return;
    await callService.updateCallStatus(incomingCall.id, 'declined');
    setIncomingCall(null);
    setCallState('idle');
  }, [incomingCall]);

  const endCall = useCallback(async () => {
    if (!activeCall) return;
    await callService.endCall(activeCall.id, 'caller_ended');
    webRTC.cleanup();
    setActiveCall(null);
    setCallState('ended');
  }, [activeCall, webRTC]);

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

