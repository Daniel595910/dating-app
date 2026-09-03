/**
 * VIP Types
 * VIP points, plans, and transactions
 */

export type VipLevel = 'free' | 'basic' | 'premium' | 'vip';

export type VipPlanStatus = 'active' | 'inactive' | 'archived';

export type TransactionType = 'purchase' | 'consumption' | 'refund' | 'bonus' | 'adjustment';

export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled';

export interface VipAccount {
  id: string;
  userId: string;
  level: VipLevel;
  pointsBalance: number;
  totalPointsEarned: number;
  totalPointsSpent: number;
  planId?: string | null;
  planExpiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VipPlan {
  id: string;
  name: string;
  level: VipLevel;
  description: string;
  price: number;
  currency: string;
  durationDays: number;
  pointsIncluded: number;
  features: string[];
  status: VipPlanStatus;
  createdAt: string;
  updatedAt: string;
}

export interface VipTransaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  pointsBefore: number;
  pointsAfter: number;
  description: string;
  referenceId?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: string;
}

export interface CreateVipTransactionInput {
  userId: string;
  type: TransactionType;
  amount: number;
  description: string;
  referenceId?: string;
  metadata?: Record<string, any>;
}

export interface VipFeature {
  id: string;
  name: string;
  description: string;
  costPoints: number;
  levelRequired: VipLevel;
  isActive: boolean;
}

export interface VipUsage {
  id: string;
  userId: string;
  featureId: string;
  usedAt: string;
  pointsCost: number;
  metadata?: Record<string, any> | null;
}