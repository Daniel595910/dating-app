import { supabase } from '@/config/supabase.client';
import { auditService } from './audit.service';

export type ReportStatus = 'pending' | 'under_review' | 'resolved' | 'dismissed' | 'escalated';
export type ReportTargetType = 'post' | 'comment' | 'user' | 'message' | 'photo';
export type ModerationAction = 'none' | 'warn' | 'hide_content' | 'delete_content' | 'ban_user' | 'suspend_user';

export interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string | null;
  type: string;
  reason: string;
  description: string;
  severity: string;
  target_id: string;
  target_type: string | null;
  evidence_urls: string[];
  status: ReportStatus;
  assigned_to: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution: string | null;
  action_taken: string | null;
  created_at: string;
  updated_at: string;
}

export interface EnrichedReport extends Report {
  reporter?: {
    display_name: string;
    avatar_url: string | null;
  };
  reportedUser?: {
    display_name: string;
    avatar_url: string | null;
  };
  targetPreview?: {
    content?: string;
    image_url?: string | null;
  };
}

export interface ReportFilters {
  status?: ReportStatus | 'all';
  targetType?: ReportTargetType | 'all';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface ReportsResult {
  reports: EnrichedReport[];
  total: number;
  hasMore: boolean;
}

class ModerationService {
  async getReports(filters: ReportFilters = {}): Promise<ReportsResult> {
    const {
      status = 'pending',
      targetType = 'all',
      sortOrder = 'desc',
      limit = 20,
      offset = 0,
    } = filters;

    let query = supabase.from('reports').select('*', { count: 'exact' });

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    if (targetType !== 'all') {
      query = query.eq('type', targetType);
    }

    query = query
      .order('created_at', { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Failed to fetch reports:', error);
      throw new Error(error.message);
    }

    const reports = (data || []) as Report[];
    const enriched = await this.enrichReports(reports);

    return {
      reports: enriched,
      total: count || 0,
      hasMore: (count || 0) > offset + limit,
    };
  }

  private async enrichReports(reports: Report[]): Promise<EnrichedReport[]> {
    if (reports.length === 0) return [];

    const userIds = new Set<string>();
    reports.forEach((r) => {
      if (r.reporter_id) userIds.add(r.reporter_id);
      if (r.reported_user_id) userIds.add(r.reported_user_id);
    });

    // Fetch profiles - silently fail if it errors
    let profileMap = new Map<string, any>();
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', Array.from(userIds));

      if (!error && profiles) {
        profileMap = new Map(profiles.map((p: any) => [p.user_id, p]));
      }
    } catch (err) {
      console.warn('Failed to fetch profiles for enrichment:', err);
    }

    // Fetch post previews - try to detect the correct columns
    const postIds = reports
      .filter((r) => r.type === 'post' && r.target_id)
      .map((r) => r.target_id);

    let postMap = new Map<string, any>();
    if (postIds.length > 0) {
      try {
        // Try with media column first
        const { data: posts, error } = await supabase
          .from('posts')
          .select('id, content')
          .in('id', postIds);

        if (!error && posts) {
          postMap = new Map(posts.map((p: any) => [p.id, p]));
        }
      } catch (err) {
        console.warn('Failed to fetch posts for enrichment:', err);
      }
    }

    return reports.map((r) => {
      const reporter = profileMap.get(r.reporter_id);
      const reportedUser = r.reported_user_id ? profileMap.get(r.reported_user_id) : null;
      const post = postMap.get(r.target_id);

      return {
        ...r,
        reporter: reporter
          ? { display_name: reporter.display_name, avatar_url: reporter.avatar_url }
          : undefined,
        reportedUser: reportedUser
          ? { display_name: reportedUser.display_name, avatar_url: reportedUser.avatar_url }
          : undefined,
        targetPreview: post
          ? {
              content: post.content,
            }
          : undefined,
      };
    });
  }

  async assignToMe(reportId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('reports')
      .update({
        assigned_to: user.id,
        status: 'under_review',
        updated_at: new Date().toISOString(),
      })
      .eq('id', reportId);

    if (error) throw new Error(error.message);

    await auditService.logAction({
      action: 'assign_report',
      resourceType: 'report',
      resourceId: reportId,
    });

    return true;
  }

  async resolveReport(
    reportId: string,
    action: ModerationAction,
    notes?: string
  ): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: report } = await supabase
      .from('reports')
      .select('target_id, type, target_type, reported_user_id')
      .eq('id', reportId)
      .single();

    if (!report) throw new Error('Report not found');

    const targetType = report.type || report.target_type;

    // Apply moderation action
    if (action === 'hide_content' || action === 'delete_content') {
      if (targetType === 'post' && report.target_id) {
        try {
          const updates = action === 'delete_content'
            ? { is_deleted: true, deleted_at: new Date().toISOString() }
            : { is_hidden: true, hidden_at: new Date().toISOString() };

          await supabase.from('posts').update(updates).eq('id', report.target_id);
        } catch (err) {
          console.warn('Failed to update post:', err);
        }
      } else if (targetType === 'comment' && report.target_id) {
        try {
          const updates = action === 'delete_content'
            ? { is_deleted: true, deleted_at: new Date().toISOString() }
            : { is_hidden: true, hidden_at: new Date().toISOString() };

          await supabase.from('comments').update(updates).eq('id', report.target_id);
        } catch (err) {
          console.warn('Failed to update comment:', err);
        }
      }
    }

    if (action === 'ban_user' && report.reported_user_id) {
      try {
        await supabase
          .from('profiles')
          .update({
            is_banned: true,
            ban_reason: notes || 'Violation of community guidelines',
            banned_at: new Date().toISOString(),
          })
          .eq('user_id', report.reported_user_id);
      } catch (err) {
        console.warn('Failed to ban user:', err);
      }
    }

    // Update report
    const { error } = await supabase
      .from('reports')
      .update({
        status: action === 'none' ? 'dismissed' : 'resolved',
        resolved_by: user.id,
        resolved_at: new Date().toISOString(),
        action_taken: action,
        resolution: notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reportId);

    if (error) throw new Error(error.message);

    // Log moderation action (don't fail if this errors)
    try {
      await supabase.from('moderation_actions').insert({
        report_id: reportId,
        moderator_id: user.id,
        action,
        notes: notes || null,
      });
    } catch (err) {
      console.warn('Failed to log moderation action:', err);
    }

    await auditService.logAction({
      action: `resolve_report_${action}`,
      resourceType: 'report',
      resourceId: reportId,
      changes: { action, notes },
    });

    return true;
  }

  async getReportStats() {
    const results = await Promise.allSettled([
      supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'under_review'),
      supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'resolved'),
      supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'dismissed'),
    ]);

    const getCount = (result: any) => {
      if (result.status === 'fulfilled' && result.value && !result.value.error) {
        return result.value.count || 0;
      }
      return 0;
    };

    return {
      pending: getCount(results[0]),
      underReview: getCount(results[1]),
      resolved: getCount(results[2]),
      dismissed: getCount(results[3]),
    };
  }
}

export const moderationService = new ModerationService();
