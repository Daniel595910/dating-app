import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  UserX,
  AlertTriangle,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Clock,
  Unlock,
  Ban,
  Activity,
  Eye,
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
  safetyService,
  Block,
  SafetyEvent,
  SafetyAuditLog,
} from '@/services/safety.service';
import styles from './SafetyPage.module.css';

const PAGE_SIZE = 20;

type Tab = 'blocks' | 'events' | 'audit';

const SEVERITY_COLORS: Record<string, 'error' | 'warning' | 'info' | 'default'> = {
  critical: 'error',
  high: 'error',
  medium: 'warning',
  low: 'info',
};

export const SafetyPage: React.FC = () => {
  const { hasPermission } = useAdminAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<Tab>('blocks');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [blocksTotal, setBlocksTotal] = useState(0);

  const [events, setEvents] = useState<SafetyEvent[]>([]);
  const [eventsTotal, setEventsTotal] = useState(0);

  const [auditLog, setAuditLog] = useState<SafetyAuditLog[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);

  const [stats, setStats] = useState({
    totalBlocks: 0,
    blocksToday: 0,
    totalEvents: 0,
    eventsWeek: 0,
  });

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const [blockToUnblock, setBlockToUnblock] = useState<Block | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const loadData = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);

      const statsData = await safetyService.getStats();
      setStats(statsData);

      if (activeTab === 'blocks') {
        const result = await safetyService.getBlocks({
          search: debouncedSearch,
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        });
        setBlocks(result.items);
        setBlocksTotal(result.total);
      } else if (activeTab === 'events') {
        const result = await safetyService.getSafetyEvents({
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        });
        setEvents(result.items);
        setEventsTotal(result.total);
      } else if (activeTab === 'audit') {
        const result = await safetyService.getSafetyAuditLog({
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        });
        setAuditLog(result.items);
        setAuditTotal(result.total);
      }
    } catch (err: any) {
      toast.error('Failed to load', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, debouncedSearch, page, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setPage(0);
  }, [activeTab, debouncedSearch]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData(false);
    toast.success('Refreshed');
  };

  const handleUnblock = async (block: Block) => {
    setActionLoading(true);
    try {
      await safetyService.unblockUser(block.id);
      setBlocks((prev) => prev.filter((b) => b.id !== block.id));
      toast.success('User unblocked');
      setBlockToUnblock(null);
      loadData(false);
    } catch (err: any) {
      toast.error('Unblock failed', err.message);
    } finally {
      setActionLoading(false);
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

  const totalPages =
    activeTab === 'blocks'
      ? Math.ceil(blocksTotal / PAGE_SIZE)
      : activeTab === 'events'
      ? Math.ceil(eventsTotal / PAGE_SIZE)
      : Math.ceil(auditTotal / PAGE_SIZE);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Safety & Blocks</h1>
          <p className={styles.subtitle}>
            Monitor user blocks and safety events
          </p>
        </div>
        <button
          className={styles.refreshButton}
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw size={16} className={refreshing ? styles.spinning : ''} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
            <UserX size={18} />
          </div>
          <div>
            <p className={styles.statLabel}>Total Blocks</p>
            <p className={styles.statValue}>{stats.totalBlocks.toLocaleString()}</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <Clock size={18} />
          </div>
          <div>
            <p className={styles.statLabel}>Blocks Today</p>
            <p className={styles.statValue}>{stats.blocksToday.toLocaleString()}</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
            <AlertTriangle size={18} />
          </div>
          <div>
            <p className={styles.statLabel}>Safety Events</p>
            <p className={styles.statValue}>{stats.totalEvents.toLocaleString()}</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <Activity size={18} />
          </div>
          <div>
            <p className={styles.statLabel}>Events This Week</p>
            <p className={styles.statValue}>{stats.eventsWeek.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'blocks' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('blocks')}
        >
          <UserX size={14} /> Blocks
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'events' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('events')}
        >
          <AlertTriangle size={14} /> Safety Events
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'audit' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          <Activity size={14} /> Audit Log
        </button>
      </div>

      {/* Search (only for blocks) */}
      {activeTab === 'blocks' && (
        <div className={styles.searchWrapper}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by user name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {/* Content */}
      {loading ? (
        <Loader fullScreen text="Loading..." />
      ) : activeTab === 'blocks' ? (
        blocks.length === 0 ? (
          <div className={styles.emptyWrapper}>
            <EmptyState
              icon={<UserX size={32} />}
              title="No blocks recorded"
              description="User blocks will appear here as they happen."
            />
          </div>
        ) : (
          <>
            <div className={styles.blocksList}>
              {blocks.map((block) => (
                <div key={block.id} className={styles.blockCard}>
                  <div className={styles.blockUsers}>
                    <div className={styles.blockUser}>
                      <Avatar
                        src={block.blocker?.avatar_url}
                        name={block.blocker?.display_name || 'User'}
                        size="md"
                      />
                      <div className={styles.blockUserInfo}>
                        <span className={styles.blockUserName}>
                          {block.blocker?.display_name || 'Unknown'}
                        </span>
                        <span className={styles.blockUserLabel}>Blocker</span>
                      </div>
                    </div>

                    <div className={styles.blockArrow}>
                      <Ban size={18} className={styles.blockIcon} />
                    </div>

                    <div className={`${styles.blockUser} ${styles.blockUserRight}`}>
                      <div className={styles.blockUserInfo}>
                        <span className={styles.blockUserName}>
                          {block.blocked?.display_name || 'Unknown'}
                        </span>
                        <span className={styles.blockUserLabel}>Blocked</span>
                      </div>
                      <Avatar
                        src={block.blocked?.avatar_url}
                        name={block.blocked?.display_name || 'User'}
                        size="md"
                      />
                    </div>
                  </div>

                  <div className={styles.blockFooter}>
                    <span className={styles.blockTime}>
                      <Clock size={11} /> {timeAgo(block.created_at)}
                    </span>

                    <div className={styles.blockActions}>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<Eye size={14} />}
                        onClick={() => setSelectedBlock(block)}
                      >
                        Details
                      </Button>
                      {hasPermission('USER_BAN') && (
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={<Unlock size={14} />}
                          onClick={() => setBlockToUnblock(block)}
                        >
                          Unblock
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
        )
      ) : activeTab === 'events' ? (
        events.length === 0 ? (
          <div className={styles.emptyWrapper}>
            <EmptyState
              icon={<AlertTriangle size={32} />}
              title="No safety events"
              description="Safety events will appear here."
            />
          </div>
        ) : (
          <>
            <div className={styles.eventsList}>
              {events.map((event) => (
                <div key={event.id} className={styles.eventCard}>
                  <div className={styles.eventHeader}>
                    <Badge
                      variant={SEVERITY_COLORS[event.severity] || 'default'}
                      size="sm"
                    >
                      {event.severity}
                    </Badge>
                    <span className={styles.eventType}>{event.event_type}</span>
                    <span className={styles.eventTime}>{timeAgo(event.created_at)}</span>
                  </div>

                  {event.user && (
                    <div className={styles.eventUser}>
                      <Avatar
                        src={event.user.avatar_url}
                        name={event.user.display_name}
                        size="xs"
                      />
                      <span className={styles.eventUserName}>{event.user.display_name}</span>
                    </div>
                  )}

                  {event.details && Object.keys(event.details).length > 0 && (
                    <pre className={styles.eventDetails}>
                      {JSON.stringify(event.details, null, 2)}
                    </pre>
                  )}
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
        )
      ) : (
        // Audit tab
        auditLog.length === 0 ? (
          <div className={styles.emptyWrapper}>
            <EmptyState
              icon={<Activity size={32} />}
              title="No safety audit log"
              description="Safety audit entries will appear here."
            />
          </div>
        ) : (
          <>
            <div className={styles.auditList}>
              {auditLog.map((entry) => (
                <div key={entry.id} className={styles.auditCard}>
                  <div className={styles.auditHeader}>
                    <div className={styles.auditIcon}>
                      <Shield size={14} />
                    </div>
                    <div className={styles.auditInfo}>
                      <span className={styles.auditAction}>{entry.action}</span>
                      {entry.user && (
                        <span className={styles.auditUser}>
                          by {entry.user.display_name}
                        </span>
                      )}
                    </div>
                    <span className={styles.auditTime}>{timeAgo(entry.created_at)}</span>
                  </div>

                  {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                    <pre className={styles.auditDetails}>
                      {JSON.stringify(entry.metadata, null, 2)}
                    </pre>
                  )}
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
        )
      )}

      {/* Block details modal */}
      <Modal
        open={!!selectedBlock}
        onClose={() => setSelectedBlock(null)}
        title="Block Details"
      >
        {selectedBlock && (
          <div className={styles.detailModal}>
            <div className={styles.detailUsers}>
              <div className={styles.detailUser}>
                <Avatar
                  src={selectedBlock.blocker?.avatar_url}
                  name={selectedBlock.blocker?.display_name || 'User'}
                  size="lg"
                />
                <span className={styles.detailUserName}>
                  {selectedBlock.blocker?.display_name || 'Unknown'}
                </span>
                <span className={styles.detailLabel}>Blocker</span>
              </div>

              <Ban size={24} className={styles.detailIcon} />

              <div className={styles.detailUser}>
                <Avatar
                  src={selectedBlock.blocked?.avatar_url}
                  name={selectedBlock.blocked?.display_name || 'User'}
                  size="lg"
                />
                <span className={styles.detailUserName}>
                  {selectedBlock.blocked?.display_name || 'Unknown'}
                </span>
                <span className={styles.detailLabel}>Blocked</span>
              </div>
            </div>

            <div className={styles.detailInfo}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Block ID</span>
                <span className={styles.detailValue}>{selectedBlock.id}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Blocked At</span>
                <span className={styles.detailValue}>
                  {new Date(selectedBlock.created_at).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Unblock confirmation */}
      <ConfirmDialog
        open={!!blockToUnblock}
        onClose={() => setBlockToUnblock(null)}
        onConfirm={() => { if (blockToUnblock) void handleUnblock(blockToUnblock); }}
        title="Unblock this user?"
        description={`${blockToUnblock?.blocker?.display_name} will be able to see and interact with ${blockToUnblock?.blocked?.display_name} again.`}
        confirmText="Unblock"
        variant="warning"
        loading={actionLoading}
      />
    </div>
  );
};
