import React, { useState, useEffect, useCallback } from 'react';
import {
  Flag,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Eye,
  Trash2,
  Ban,
  Check,
  X,
  User,
  FileText,
  MessageSquare,
  Clock,
  Shield,
  UserCheck,

} from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import { Loader } from '@/components/ui/Loader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  moderationService,
  EnrichedReport,
  ReportStatus,
  ReportTargetType,
  ModerationAction,
} from '@/services/moderation.service';
import styles from './ReportsPage.module.css';

const PAGE_SIZE = 20;

type Tab = 'pending' | 'under_review' | 'resolved' | 'dismissed' | 'all';

const REASON_LABELS: Record<string, string> = {
  harassment: 'Harassment',
  spam: 'Spam',
  inappropriate_content: 'Inappropriate Content',
  fake_profile: 'Fake Profile',
  scam: 'Scam',
  underage: 'Underage User',
  violence: 'Violence',
  hate_speech: 'Hate Speech',
  other: 'Other',
};

const SEVERITY_CONFIG: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info' | 'primary' }> = {
  low: { label: 'Low', variant: 'default' },
  medium: { label: 'Medium', variant: 'info' },
  high: { label: 'High', variant: 'warning' },
  critical: { label: 'Critical', variant: 'error' },
};

export const ReportsPage: React.FC = () => {
  useAdminAuth();
  const toast = useToast();

  const [reports, setReports] = useState<EnrichedReport[]>([]);
  const [stats, setStats] = useState({ pending: 0, underReview: 0, resolved: 0, dismissed: 0 });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [activeTab, setActiveTab] = useState<Tab>('pending');
  const [targetTypeFilter, setTargetTypeFilter] = useState<ReportTargetType | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Action modal
  const [selectedReport, setSelectedReport] = useState<EnrichedReport | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ reportId: string; action: ModerationAction } | null>(null);

  const loadReports = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);

      const result = await moderationService.getReports({
        status: activeTab === 'all' ? 'all' : activeTab,
        targetType: targetTypeFilter,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });

      setReports(result.reports);
      setTotal(result.total);
    } catch (err: any) {
      toast.error('Failed to load reports', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, targetTypeFilter, page, toast]);

  const loadStats = async () => {
    try {
      const s = await moderationService.getReportStats();
      setStats(s);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  useEffect(() => {
    loadReports();
    loadStats();
  }, [loadReports]);

  useEffect(() => {
    setPage(0);
  }, [activeTab, targetTypeFilter, severityFilter]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadReports(false), loadStats()]);
    toast.success('Reports refreshed');
  };

  const handleAssignToMe = async (reportId: string) => {
    try {
      await moderationService.assignToMe(reportId);
      toast.success('Report assigned to you');
      loadReports(false);
      loadStats();
    } catch (err: any) {
      toast.error('Failed to assign', err.message);
    }
  };

  const handleAction = async (action: ModerationAction) => {
    if (!selectedReport) return;
    setActionLoading(true);

    try {
      await moderationService.resolveReport(selectedReport.id, action, actionNotes);
      toast.success(`Report ${action === 'none' ? 'dismissed' : 'resolved'}`);
      setSelectedReport(null);
      setActionNotes('');
      loadReports(false);
      loadStats();
    } catch (err: any) {
      toast.error('Action failed', err.message);
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  const filteredReports = reports.filter((r) => {
    if (severityFilter !== 'all' && r.severity !== severityFilter) return false;
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    const reasonLabel = (REASON_LABELS[r.reason] || r.reason || '').toLowerCase();
    return (
      reasonLabel.includes(term) ||
      r.description?.toLowerCase().includes(term) ||
      r.reporter?.display_name?.toLowerCase().includes(term) ||
      r.reportedUser?.display_name?.toLowerCase().includes(term)
    );
  });

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const getTargetIcon = (type: string) => {
    switch (type) {
      case 'post': return <FileText size={14} />;
      case 'comment': return <MessageSquare size={14} />;
      case 'user': return <User size={14} />;
      default: return <Flag size={14} />;
    }
  };

  const getStatusVariant = (status: ReportStatus): 'default' | 'success' | 'warning' | 'error' | 'info' | 'primary' => {
    switch (status) {
      case 'pending': return 'warning';
      case 'under_review': return 'info';
      case 'resolved': return 'success';
      case 'dismissed': return 'default';
      case 'escalated': return 'error';
      default: return 'default';
    }
  };

  const timeAgo = (dateString: string): string => {
    const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Reports</h1>
          <p className={styles.subtitle}>Review and moderate user reports</p>
        </div>
        <button className={styles.refreshButton} onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw size={16} className={refreshing ? styles.spinning : ''} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        <button
          className={`${styles.statCard} ${activeTab === 'pending' ? styles.statCardActive : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          <div className={styles.statIconWrapper} style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <AlertCircle size={18} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Pending</span>
            <span className={styles.statValue}>{stats.pending}</span>
          </div>
        </button>

        <button
          className={`${styles.statCard} ${activeTab === 'under_review' ? styles.statCardActive : ''}`}
          onClick={() => setActiveTab('under_review')}
        >
          <div className={styles.statIconWrapper} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <Clock size={18} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>In Review</span>
            <span className={styles.statValue}>{stats.underReview}</span>
          </div>
        </button>

        <button
          className={`${styles.statCard} ${activeTab === 'resolved' ? styles.statCardActive : ''}`}
          onClick={() => setActiveTab('resolved')}
        >
          <div className={styles.statIconWrapper} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <Check size={18} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Resolved</span>
            <span className={styles.statValue}>{stats.resolved}</span>
          </div>
        </button>

        <button
          className={`${styles.statCard} ${activeTab === 'dismissed' ? styles.statCardActive : ''}`}
          onClick={() => setActiveTab('dismissed')}
        >
          <div className={styles.statIconWrapper} style={{ background: 'rgba(107, 114, 128, 0.1)', color: '#6b7280' }}>
            <X size={18} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Dismissed</span>
            <span className={styles.statValue}>{stats.dismissed}</span>
          </div>
        </button>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.searchWrapper}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search reports..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className={styles.selectFilter}
          value={targetTypeFilter}
          onChange={(e) => setTargetTypeFilter(e.target.value as any)}
        >
          <option value="all">All types</option>
          <option value="post">Posts</option>
          <option value="comment">Comments</option>
          <option value="user">Users</option>
          <option value="message">Messages</option>
          <option value="photo">Photos</option>
        </select>

        <select
          className={styles.selectFilter}
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
        >
          <option value="all">All severity</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Reports list */}
      {loading ? (
        <Loader fullScreen text="Loading reports..." />
      ) : filteredReports.length === 0 ? (
        <div className={styles.emptyWrapper}>
          <EmptyState
            icon={<Flag size={32} />}
            title={search ? 'No matching reports' : `No ${activeTab === 'all' ? '' : activeTab.replace('_', ' ')} reports`}
            description={
              search
                ? `No reports match "${search}"`
                : activeTab === 'pending'
                ? 'Great job! No pending reports to review.'
                : 'No reports in this category.'
            }
          />
        </div>
      ) : (
        <>
          <div className={styles.reportsList}>
            {filteredReports.map((report) => (
              <div key={report.id} className={styles.reportCard}>
                <div className={styles.reportHeader}>
                  <div className={styles.reportMeta}>
                    <div className={styles.targetBadge}>
                      {getTargetIcon(report.type)}
                      <span>{report.type}</span>
                    </div>
                    <Badge variant={getStatusVariant(report.status)} size="sm">
                      {report.status.replace('_', ' ')}
                    </Badge>
                    {report.severity && SEVERITY_CONFIG[report.severity] && (
                      <Badge variant={(SEVERITY_CONFIG[report.severity] ?? { variant: 'default' as const }).variant} size="sm">
                        {(SEVERITY_CONFIG[report.severity] ?? { label: report.severity }).label}
                      </Badge>
                    )}
                    <span className={styles.reportTime}>
                      <Clock size={12} /> {timeAgo(report.created_at)}
                    </span>
                  </div>
                  <span className={styles.reportReason}>
                    {REASON_LABELS[report.reason] || report.reason}
                  </span>
                </div>

                {report.description && report.description !== 'null' && (
                  <p className={styles.reportDescription}>{report.description}</p>
                )}

                {report.targetPreview?.content && (
                  <div className={styles.targetPreview}>
                    <span className={styles.targetPreviewLabel}>Reported content:</span>
                    <p className={styles.targetPreviewContent}>
                      {report.targetPreview.content.substring(0, 200)}
                      {report.targetPreview.content.length > 200 ? '...' : ''}
                    </p>
                  </div>
                )}

                <div className={styles.reportFooter}>
                  <div className={styles.reportUsers}>
                    <div className={styles.reportUser}>
                      <Avatar
                        src={report.reporter?.avatar_url}
                        name={report.reporter?.display_name || 'Reporter'}
                        size="xs"
                      />
                      <div className={styles.userInfoCompact}>
                        <span className={styles.userLabel}>Reporter</span>
                        <span className={styles.userName}>
                          {report.reporter?.display_name || 'Unknown'}
                        </span>
                      </div>
                    </div>

                    {report.reportedUser && (
                      <div className={styles.reportUser}>
                        <Avatar
                          src={report.reportedUser.avatar_url}
                          name={report.reportedUser.display_name}
                          size="xs"
                        />
                        <div className={styles.userInfoCompact}>
                          <span className={styles.userLabel}>Reported</span>
                          <span className={styles.userName}>{report.reportedUser.display_name}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className={styles.reportActions}>
                    {report.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={<UserCheck size={14} />}
                        onClick={() => handleAssignToMe(report.id)}
                      >
                        Assign to me
                      </Button>
                    )}
                    {report.status !== 'resolved' && report.status !== 'dismissed' && (
                      <Button
                        size="sm"
                        variant="primary"
                        icon={<Shield size={14} />}
                        onClick={() => setSelectedReport(report)}
                      >
                        Take action
                      </Button>
                    )}
                    {(report.status === 'resolved' || report.status === 'dismissed') && (
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<Eye size={14} />}
                        onClick={() => setSelectedReport(report)}
                      >
                        View
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                className={styles.pageButton}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft size={16} /> Previous
              </button>
              <span className={styles.pageInfo}>
                Page {page + 1} of {totalPages}
              </span>
              <button
                className={styles.pageButton}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Action Modal */}
      <Modal
        open={!!selectedReport}
        onClose={() => {
          setSelectedReport(null);
          setActionNotes('');
        }}
        title="Take action"
        description={`Report on ${selectedReport?.type}`}
        size="lg"
      >
        {selectedReport && (
          <div className={styles.actionModal}>
            <div className={styles.actionSection}>
              <h4 className={styles.actionSectionTitle}>Report details</h4>
              <div className={styles.actionDetail}>
                <span className={styles.actionLabel}>Reason:</span>
                <span>{REASON_LABELS[selectedReport.reason] || selectedReport.reason}</span>
              </div>
              {selectedReport.severity && (
                <div className={styles.actionDetail}>
                  <span className={styles.actionLabel}>Severity:</span>
                  <span>{selectedReport.severity}</span>
                </div>
              )}
              {selectedReport.description && selectedReport.description !== 'null' && (
                <div className={styles.actionDetail}>
                  <span className={styles.actionLabel}>Description:</span>
                  <span>{selectedReport.description}</span>
                </div>
              )}
            </div>

            {selectedReport.status !== 'resolved' && selectedReport.status !== 'dismissed' && (
              <>
                <div className={styles.actionSection}>
                  <h4 className={styles.actionSectionTitle}>Notes (optional)</h4>
                  <textarea
                    className={styles.notesInput}
                    placeholder="Add internal notes about your decision..."
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className={styles.actionSection}>
                  <h4 className={styles.actionSectionTitle}>Choose action</h4>
                  <div className={styles.actionButtons}>
                    <button
                      className={styles.actionButton}
                      onClick={() => setConfirmAction({ reportId: selectedReport.id, action: 'none' })}
                    >
                      <X size={18} />
                      <span>Dismiss</span>
                      <p>No action needed</p>
                    </button>

                    <button
                      className={styles.actionButton}
                      onClick={() => setConfirmAction({ reportId: selectedReport.id, action: 'hide_content' })}
                    >
                      <Eye size={18} />
                      <span>Hide content</span>
                      <p>Content hidden from feed</p>
                    </button>

                    <button
                      className={`${styles.actionButton} ${styles.actionButtonWarning}`}
                      onClick={() => setConfirmAction({ reportId: selectedReport.id, action: 'delete_content' })}
                    >
                      <Trash2 size={18} />
                      <span>Delete content</span>
                      <p>Permanently delete</p>
                    </button>

                    <button
                      className={`${styles.actionButton} ${styles.actionButtonDanger}`}
                      onClick={() => setConfirmAction({ reportId: selectedReport.id, action: 'ban_user' })}
                    >
                      <Ban size={18} />
                      <span>Ban user</span>
                      <p>Remove user access</p>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Confirm Action */}
      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => { if (confirmAction) void handleAction(confirmAction.action); }}
        title={
          confirmAction?.action === 'ban_user'
            ? 'Ban this user?'
            : confirmAction?.action === 'delete_content'
            ? 'Delete content?'
            : confirmAction?.action === 'hide_content'
            ? 'Hide content?'
            : 'Dismiss report?'
        }
        description={
          confirmAction?.action === 'ban_user'
            ? 'The user will be blocked from the platform.'
            : confirmAction?.action === 'delete_content'
            ? 'This cannot be undone.'
            : confirmAction?.action === 'hide_content'
            ? 'The content will be hidden from all users.'
            : 'The report will be marked as dismissed.'
        }
        confirmText="Confirm"
        variant={confirmAction?.action === 'none' ? 'info' : 'danger'}
        requireTyping={confirmAction?.action === 'ban_user' ? 'BAN' : undefined}
        loading={actionLoading}
      />
    </div>
  );
};
