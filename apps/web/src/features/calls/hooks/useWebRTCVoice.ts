import { useRef, useCallback, useState } from 'react';
import { callService } from '../services/call.service';

const ICE_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function useWebRTCVoice(callId: string, userId: string) {
  const [connectionState, setConnectionState] = useState<string>('new');
  const [isMuted, setIsMuted] = useState(false);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingIceCandidatesRef = useRef<RTCIceCandidate[]>([]);

  const getMicrophone = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    localStreamRef.current = stream;
    return stream;
  }, []);

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(ICE_CONFIG);
    peerConnectionRef.current = pc;

    pc.onconnectionstatechange = () => {
      setConnectionState(pc.connectionState);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        callService.sendCallSignal(callId, {
          type: 'ice_candidate',
          callId,
          senderId: userId,
          payload: event.candidate,
        });
      }
    };

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    return pc;
  }, [callId, userId]);

  const createOffer = useCallback(async () => {
    const pc = peerConnectionRef.current;
    if (!pc) return;

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    callService.sendCallSignal(callId, {
      type: 'call_offer',
      callId,
      senderId: userId,
      payload: offer,
    });
  }, [callId, userId]);

  const handleOffer = useCallback(async (offer: RTCSessionDescriptionInit) => {
    const pc = peerConnectionRef.current;
    if (!pc) return;

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    // Flush pending ICE candidates
    pendingIceCandidatesRef.current.forEach((candidate) => {
      pc.addIceCandidate(candidate);
    });
    pendingIceCandidatesRef.current = [];

    callService.sendCallSignal(callId, {
      type: 'call_answer',
      callId,
      senderId: userId,
      payload: answer,
    });
  }, [callId, userId]);

  const handleAnswer = useCallback(async (answer: RTCSessionDescriptionInit) => {
    const pc = peerConnectionRef.current;
    if (!pc) return;
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
  }, []);

  const handleIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    const pc = peerConnectionRef.current;
    if (!pc) return;

    if (pc.remoteDescription) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } else {
      pendingIceCandidatesRef.current.push(new RTCIceCandidate(candidate));
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted((prev) => !prev);
    }
  }, []);

  const cleanup = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    pendingIceCandidatesRef.current = [];
    setConnectionState('closed');
    setIsMuted(false);
  }, []);

  return {
    connectionState,
    isMuted,
    getMicrophone,
    createPeerConnection,
    createOffer,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    toggleMute,
    cleanup,
  };
}

