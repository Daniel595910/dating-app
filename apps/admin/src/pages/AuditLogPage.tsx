import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollText,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,

  Clock,
  Activity,

  Eye,
  X,
} from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useToast } from '@/components/ui/Toast';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import { Loader } from '@/components/ui/Loader';
import { EmptyState } from '@/components/ui/EmptyState';
import { auditService, AuditLogEntry } from '@/services/audit.service';
import styles from './AuditLogPage.module.css';

const PAGE_SIZE = 50;

const ACTION_LABELS: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info' | 'primary' }> = {
  login: { label: 'Login', variant: 'success' },
  logout: { label: 'Logout', variant: 'default' },
  update_user: { label: 'Update User', variant: 'info' },
  verify_user: { label: 'Verify User', variant: 'success' },
  unverify_user: { label: 'Unverify User', variant: 'warning' },
  ban_user: { label: 'Ban User', variant: 'error' },
  unban_user: { label: 'Unban User', variant: 'success' },
  delete_user: { label: 'Delete User', variant: 'error' },
  update_user_role: { label: 'Update Role', variant: 'warning' },
  hide_post: { label: 'Hide Post', variant: 'warning' },
  unhide_post: { label: 'Unhide Post', variant: 'info' },
  delete_post: { label: 'Delete Post', variant: 'error' },
  assign_report: { label: 'Assign Report', variant: 'info' },
  resolve_report: { label: 'Resolve Report', variant: 'success' },
  resolve_report_none: { label: 'Dismiss Report', variant: 'default' },
  resolve_report_hide_content: { label: 'Hide Content', variant: 'warning' },
  resolve_report_delete_content: { label: 'Delete Content', variant: 'error' },
  resolve_report_ban_user: { label: 'Ban User', variant: 'error' },
  grant_admin_role: { label: 'Grant Admin', variant: 'error' },
};

export const AuditLogPage: React.FC = () => {
  useAdminAuth();
  const toast = useToast();

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [stats, setStats] = useState({ total: 0, today: 0, week: 0 });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [resourceFilter, setResourceFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [actionTypes, setActionTypes] = useState<string[]>([]);
  const [resourceTypes, setResourceTypes] = useState<string[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const loadLogs = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);

      const result = await auditService.getLogs({
        action: actionFilter,
        resourceType: resourceFilter,
        search: debouncedSearch,
        dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
        dateTo: dateTo ? new Date(dateTo + 'T23:59:59').toISOString() : undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });

      setLogs(result.logs);
      setTotal(result.total);
    } catch (err: any) {
      toast.error('Failed to load audit log', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [actionFilter, resourceFilter, debouncedSearch, dateFrom, dateTo, page, toast]);

  const loadStats = async () => {
    try {
      const s = await auditService.getStats();
      setStats(s);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const loadFilterOptions = async () => {
    try {
      const [actions, resources] = await Promise.all([
        auditService.getActionTypes(),
        auditService.getResourceTypes(),
      ]);
      setActionTypes(actions);
      setResourceTypes(resources);
    } catch (err) {
      console.error('Failed to load filter options:', err);
    }
  };

  useEffect(() => {
    loadLogs();
    loadStats();
    loadFilterOptions();
  }, [loadLogs]);

  useEffect(() => {
    setPage(0);
  }, [actionFilter, resourceFilter, debouncedSearch, dateFrom, dateTo]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadLogs(false), loadStats()]);
    toast.success('Audit log refreshed');
  };

  const handleExport = () => {
    const csv = [
      ['Timestamp', 'Admin', 'Action', 'Resource Type', 'Resource ID', 'IP Address'].join(','),
      ...logs.map((log) =>
        [
          new Date(log.created_at).toISOString(),
          log.admin?.display_name || log.user_id,
          log.action,
          log.resource_type,
          log.resource_id || '',
          log.ip_address || '',
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Audit log exported');
  };

  const clearFilters = () => {
    setSearch('');
    setActionFilter('all');
    setResourceFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  const hasActiveFilters =
    search || actionFilter !== 'all' || resourceFilter !== 'all' || dateFrom || dateTo;

  const timeAgo = (dateString: string): string => {
    const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateString).toLocaleDateString();
  };

  const getActionConfig = (action: string) => {
    return ACTION_LABELS[action] || { label: action, variant: 'default' as const };
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Audit Log</h1>
          <p className={styles.subtitle}>
            Complete history of all admin actions
          </p>
        </div>
        <div className={styles.headerActions}>
          <button
            className={styles.filterButton}
            onClick={() => setShowFilters((s) => !s)}
            data-active={hasActiveFilters}
          >
            <Filter size={16} />
            Filters
            {hasActiveFilters && <span className={styles.filterDot} />}
          </button>
          <button
            className={styles.iconButton}
            onClick={handleExport}
            title="Export CSV"
            disabled={logs.length === 0}
          >
            <Download size={16} />
          </button>
          <button
            className={styles.iconButton}
            onClick={handleRefresh}
            disabled={refreshing}
            title="Refresh"
          >
            <RefreshCw size={16} className={refreshing ? styles.spinning : ''} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <Activity size={18} />
          </div>
          <div>
            <p className={styles.statLabel}>Total Actions</p>
            <p className={styles.statValue}>{stats.total.toLocaleString()}</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <Clock size={18} />
          </div>
          <div>
            <p className={styles.statLabel}>Today</p>
            <p className={styles.statValue}>{stats.today.toLocaleString()}</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <ScrollText size={18} />
          </div>
          <div>
            <p className={styles.statLabel}>This Week</p>
            <p className={styles.statValue}>{stats.week.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className={styles.filtersPanel}>
          <div className={styles.filterRow}>
            <div className={styles.searchWrapper}>
              <Search size={16} className={styles.searchIcon} />
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search action, admin, resource..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              className={styles.select}
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            >
              <option value="all">All actions</option>
              {actionTypes.map((a) => (
                <option key={a} value={a}>
                  {ACTION_LABELS[a]?.label || a}
                </option>
              ))}
            </select>

            <select
              className={styles.select}
              value={resourceFilter}
              onChange={(e) => setResourceFilter(e.target.value)}
            >
              <option value="all">All resources</option>
              {resourceTypes.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterRow}>
            <div className={styles.dateWrapper}>
              <label className={styles.dateLabel}>From</label>
              <input
                type="date"
                className={styles.dateInput}
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div className={styles.dateWrapper}>
              <label className={styles.dateLabel}>To</label>
              <input
                type="date"
                className={styles.dateInput}
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>

            {hasActiveFilters && (
              <button className={styles.clearButton} onClick={clearFilters}>
                <X size={14} /> Clear filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Logs */}
      {loading ? (
        <Loader fullScreen text="Loading audit log..." />
      ) : logs.length === 0 ? (
        <div className={styles.emptyWrapper}>
          <EmptyState
            icon={<ScrollText size={32} />}
            title={hasActiveFilters ? 'No matching entries' : 'No audit log entries'}
            description={
              hasActiveFilters
                ? 'Try adjusting your filters.'
                : 'Admin actions will appear here as they happen.'
            }
          />
        </div>
      ) : (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Admin</th>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>IP</th>
                  <th>Time</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const actionConfig = getActionConfig(log.action);
                  return (
                    <tr key={log.id} className={styles.row}>
                      <td>
                        <div className={styles.adminCell}>
                          <Avatar
                            src={log.admin?.avatar_url}
                            name={log.admin?.display_name || 'Unknown'}
                            size="sm"
                          />
                          <div>
                            <span className={styles.adminName}>
                              {log.admin?.display_name || 'Unknown'}
                            </span>
                            {log.admin?.role && (
                              <span className={styles.adminRole}>
                                {log.admin.role.replace('_', ' ')}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <Badge variant={actionConfig.variant} size="sm">
                          {actionConfig.label}
                        </Badge>
                      </td>
                      <td>
                        <div className={styles.resourceCell}>
                          <span className={styles.resourceType}>
                            {log.resource_type}
                          </span>
                          {log.resource_id && (
                            <span className={styles.resourceId}>
                              {log.resource_id.substring(0, 8)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={styles.ipCell}>
                        {log.ip_address || '—'}
                      </td>
                      <td className={styles.timeCell}>
                        {timeAgo(log.created_at)}
                      </td>
                      <td className={styles.actionsCell}>
                        <button
                          className={styles.viewButton}
                          onClick={() => setSelectedLog(log)}
                          title="View details"
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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

      {/* Detail Modal */}
      <Modal
        open={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Audit Log Details"
        size="lg"
      >
        {selectedLog && (
          <div className={styles.detailModal}>
            <div className={styles.detailHeader}>
              <Avatar
                src={selectedLog.admin?.avatar_url}
                name={selectedLog.admin?.display_name || 'Unknown'}
                size="lg"
              />
              <div>
                <h3 className={styles.detailName}>
                  {selectedLog.admin?.display_name || 'Unknown Admin'}
                </h3>
                <p className={styles.detailRole}>
                  {selectedLog.admin?.role?.replace('_', ' ') || 'Admin'}
                </p>
              </div>
              <Badge variant={getActionConfig(selectedLog.action).variant}>
                {getActionConfig(selectedLog.action).label}
              </Badge>
            </div>

            <div className={styles.detailGrid}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Timestamp</span>
                <span className={styles.detailValue}>
                  {new Date(selectedLog.created_at).toLocaleString()}
                </span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Resource Type</span>
                <span className={styles.detailValue}>{selectedLog.resource_type}</span>
              </div>
              {selectedLog.resource_id && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Resource ID</span>
                  <span className={`${styles.detailValue} ${styles.mono}`}>
                    {selectedLog.resource_id}
                  </span>
                </div>
              )}
              {selectedLog.ip_address && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>IP Address</span>
                  <span className={`${styles.detailValue} ${styles.mono}`}>
                    {selectedLog.ip_address}
                  </span>
                </div>
              )}
              {selectedLog.user_agent && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>User Agent</span>
                  <span className={styles.detailValue}>{selectedLog.user_agent}</span>
                </div>
              )}
            </div>

            {selectedLog.changes && Object.keys(selectedLog.changes).length > 0 && (
              <div className={styles.changesSection}>
                <h4 className={styles.changesTitle}>Changes</h4>
                <pre className={styles.changesCode}>
                  {JSON.stringify(selectedLog.changes, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
