/**
 * Report Types
 * User reports and moderation
 */

export type ReportType = 'user' | 'post' | 'comment' | 'message' | 'photo';

export type ReportReason = |
  'harassment' |
  'spam' |
  'inappropriate_content' |
  'fake_profile' |
  'scam' |
  'underage' |
  'violence' |
  'hate_speech' |
  'other';

export type ReportStatus = 'pending' | 'under_review' | 'resolved' | 'dismissed' | 'escalated';

export type ReportSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface Report {
  id: string;
  reporterId: string;
  reportedUserId ? : string | null;
  type: ReportType;
  reason: ReportReason;
  description: string;
  status: ReportStatus;
  severity: ReportSeverity;
  targetId: string;
  evidenceUrls ? : string[] | null;
  assignedTo ? : string | null;
  resolution ? : string | null;
  resolvedAt ? : string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReportInput {
  reporterId: string;
  type: ReportType;
  reason: ReportReason;
  description: string;
  targetId: string;
  reportedUserId ? : string;
  evidenceUrls ? : string[];
}

export interface UpdateReportInput {
  status ? : ReportStatus;
  severity ? : ReportSeverity;
  assignedTo ? : string;
  resolution ? : string;
  resolvedAt ? : string;
}

export interface ModerationAction {
  id: string;
  moderatorId: string;
  targetType: ReportType;
  targetId: string;
  action: 'warn' | 'hide' | 'delete' | 'suspend' | 'ban' | 'restore';
  reason: string;
  duration ? : number | null;
  createdAt: string;
}