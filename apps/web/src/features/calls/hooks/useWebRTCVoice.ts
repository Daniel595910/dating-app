import { useRef, useCallback, useState } from 'react';
import { callService } from '../services/call.service';

const TURN_USERNAME = '';
const TURN_CREDENTIAL = '';

const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.relay.metered.ca:80' },
    {
      urls: [
        'turn:global.relay.metered.ca:80',
        'turn:global.relay.metered.ca:443',
        'turns:global.relay.metered.ca:443?transport=tcp',
      ],
      username: TURN_USERNAME,
      credential: TURN_CREDENTIAL,
    },
  ],
  iceCandidatePoolSize: 10,
};

export function useWebRTCVoice(callId: string, userId: string) {
  const [connectionState, setConnectionState] = useState<string>('new');
  const [isMuted, setIsMuted] = useState(false);
  const [micPermission, setMicPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingIceCandidatesRef = useRef<RTCIceCandidate[]>([]);
  const callIdRef = useRef<string>(callId);
  const userIdRef = useRef<string>(userId);
  callIdRef.current = callId;
  userIdRef.current = userId;

  const getMicrophone = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMicPermission('denied');
      throw new Error('Microphone access requires HTTPS or localhost.');
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      setMicPermission('granted');
      return stream;
    } catch (err: any) {
      setMicPermission('denied');
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        throw new Error('Microphone access was denied. Please allow microphone access in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        throw new Error('No microphone found. Please connect a microphone and try again.');
      }
      throw new Error('Failed to access microphone. Please check your browser settings.');
    }
  }, []);

  const ensurePeerConnection = useCallback(() => {
    if (peerConnectionRef.current) return peerConnectionRef.current;
    const pc = new RTCPeerConnection(ICE_CONFIG);
    peerConnectionRef.current = pc;

    pc.onconnectionstatechange = () => {
      setConnectionState(pc.connectionState);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && callIdRef.current && userIdRef.current) {
        callService.sendCallSignal(callIdRef.current, {
          type: 'ice_candidate',
          callId: callIdRef.current,
          senderId: userIdRef.current,
          payload: event.candidate,
        }).catch((err) => console.error('sendCallSignal ice failed:', err));
      }
    };

    pc.ontrack = (event) => {
      if (!remoteStreamRef.current) remoteStreamRef.current = new MediaStream();
      remoteStreamRef.current.addTrack(event.track);
      setRemoteStream(remoteStreamRef.current);
    };

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    return pc;
  }, []);

  const createOffer = useCallback(async () => {
    const pc = ensurePeerConnection();
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await callService.sendCallSignal(callIdRef.current, {
      type: 'call_offer',
      callId: callIdRef.current,
      senderId: userIdRef.current,
      payload: offer,
    });
  }, [ensurePeerConnection]);

  const handleOffer = useCallback(async (offer: RTCSessionDescriptionInit) => {
    const pc = ensurePeerConnection();
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    for (const candidate of pendingIceCandidatesRef.current) {
      try { await pc.addIceCandidate(candidate); } catch (e) { console.error(e); }
    }
    pendingIceCandidatesRef.current = [];
    await callService.sendCallSignal(callIdRef.current, {
      type: 'call_answer',
      callId: callIdRef.current,
      senderId: userIdRef.current,
      payload: answer,
    });
  }, [ensurePeerConnection]);

  const handleAnswer = useCallback(async (answer: RTCSessionDescriptionInit) => {
    const pc = peerConnectionRef.current;
    if (!pc) return;
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
    for (const candidate of pendingIceCandidatesRef.current) {
      try { await pc.addIceCandidate(candidate); } catch (e) { console.error(e); }
    }
    pendingIceCandidatesRef.current = [];
  }, []);

  const handleIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    const pc = peerConnectionRef.current;
    if (!pc) { pendingIceCandidatesRef.current.push(new RTCIceCandidate(candidate)); return; }
    if (pc.remoteDescription) {
      try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) { console.error(e); }
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
    remoteStreamRef.current = null;
    setRemoteStream(null);
    setConnectionState('closed');
    setIsMuted(false);
  }, []);

  return {
    connectionState,
    isMuted,
    micPermission,
    remoteStream,
    getMicrophone,
    ensurePeerConnection,
    createOffer,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    toggleMute,
    cleanup,
  };
}

