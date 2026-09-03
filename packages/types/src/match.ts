/**
 * Match Types
 * Matching system and relationship journey types
 */

export type MatchStage = 'getting_to_know' | 'compatibility_check' | 'matched' | 'rejected' | 'expired';

export type MatchStatus = 'active' | 'completed' | 'cancelled' | 'expired';

export interface Match {
  id: string;
  user1Id: string;
  user2Id: string;
  stage: MatchStage;
  status: MatchStatus;
  matchScore ? : number | null;
  compatibilityAnswers ? : CompatibilityAnswers | null;
  matchedAt ? : string | null;
  rejectedAt ? : string | null;
  expiredAt ? : string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CompatibilityAnswers {
  relationshipGoals: string[];
  familyPlans: string[];
  lifestyle: string[];
  values: string[];
  communicationStyle: string[];
  dealBreakers: string[];
}

export interface MatchRequest {
  id: string;
  requesterId: string;
  targetId: string;
  message ? : string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface MatchPreferences {
  userId: string;
  ageRange: {
    min: number;
    max: number;
  };
  distanceRadius: number;
  relationshipIntent: string[];
  dealBreakers: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateMatchInput {
  user1Id: string;
  user2Id: string;
}

export interface UpdateMatchInput {
  stage ? : MatchStage;
  status ? : MatchStatus;
  matchScore ? : number;
  compatibilityAnswers ? : CompatibilityAnswers;
}