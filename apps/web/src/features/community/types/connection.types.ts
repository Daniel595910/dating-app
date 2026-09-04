export type ConnectionStatus = 
  | 'none' 
  | 'pending' 
  | 'accepted' 
  | 'getting_to_know' 
  | 'mutual_interest' 
  | 'matched' 
  | 'declined' 
  | 'cancelled' 
  | 'blocked';

export interface ConnectionState {
  connectionId: string | null;
  matchId: string | null;
  status: ConnectionStatus;
  progress: number;
  isMutualInterest: boolean;
  isMatched: boolean;
  targetUserId: string | null;
  targetUserName: string | null;
}

export interface ConnectionStage {
  id: string;
  label: string;
  completed: boolean;
  current: boolean;
}
