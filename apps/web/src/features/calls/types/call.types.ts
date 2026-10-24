export type CallStatus = 'calling' | 'ringing' | 'connecting' | 'connected' | 'ended' | 'declined' | 'missed' | 'cancelled' | 'failed' | 'busy';

export interface CallSession {
  id: string;
  conversationId: string | null;
  callerId: string;
  calleeId: string;
  callType: 'voice';
  status: CallStatus;
  createdAt: string;
  answeredAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
  endedBy: string | null;
  endReason: string | null;
  expiresAt: string | null;
}

export interface CallSignal {
  type: 'callee_ready' | 'call_offer' | 'call_answer' | 'ice_candidate' | 'call_cancelled' | 'call_declined' | 'call_ended';
  callId: string;
  senderId: string;
  payload?: unknown;
}

export interface OtherUserProfile {
  displayName: string;
  avatarUrl: string | null;
}

export interface CallContext {
  activeCall: CallSession | null;
  incomingCall: CallSession | null;
  otherUserProfile: OtherUserProfile | null;
  remoteStream: MediaStream | null;
  callState: CallStatus;
  isMuted: boolean;
  startCall: (targetUserId: string) => Promise<void>;
  acceptCall: (callId: string) => Promise<void>;
  declineCall: (callId: string) => Promise<void>;
  endCall: () => Promise<void>;
  toggleMute: () => void;
}

