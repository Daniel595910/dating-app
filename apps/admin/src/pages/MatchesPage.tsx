import React, { useState, useEffect, useCallback } from 'react';
import {
  Heart,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Activity,

  Flag,
  Trash2,
  ExternalLink,

  MoreVertical,
  Calendar,
  Award,

} from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useToast } from '@/components/ui/Toast';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Loader } from '@/components/ui/Loader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { LineChart } from '@/components/ui/LineChart';
import { matchService, Match } from '@/services/match.service';
import styles from './MatchesPage.module.css';

const PAGE_SIZE = 20;

type Tab = 'recent' | 'all' | 'top';

export const MatchesPage: React.FC = () => {
  const { hasPermission } = useAdminAuth();
  const toast = useToast();

  const [matches, setMatches] = useState<Match[]>([]);
  const [topMatches, setTopMatches] = useState<Match[]>([]);
  const [stats, setStats] = useState({ total: 0, today: 0, week: 0, month: 0, avgScore: 0 });
  const [series, setSeries] = useState<{ date: string; value: number }[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [activeTab, setActiveTab] = useState<Tab>('recent');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'delete' | 'flag';
    match: Match;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const loadData = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);

      const [statsData, seriesData] = await Promise.all([
        matchService.getStats(),
        matchService.getDailyMatchSeries(30),
      ]);

      setStats(statsData);
      setSeries(seriesData);

      if (activeTab === 'top') {
        const top = await matchService.getTopMatchesByScore(20);
        setTopMatches(top);
        setMatches([]);
      } else {
        const result = await matchService.getMatches({
          status: activeTab === 'recent' ? 'recent' : 'all',
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        });
        setMatches(result.items);
        setTotal(result.total);
      }
    } catch (err: any) {
      toast.error('Failed to load', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, page, toast]);

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

  const handleDelete = async (match: Match) => {
    setActionLoading(true);
    try {
      await matchService.deleteMatch(match.id);
      setMatches((prev) => prev.filter((m) => m.id !== match.id));
      setTopMatches((prev) => prev.filter((m) => m.id !== match.id));
      toast.success('Match deleted');
      setConfirmAction(null);
      loadData(false);
    } catch (err: any) {
      toast.error('Delete failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleFlag = async (match: Match) => {
    setActionLoading(true);
    try {
      await matchService.flagMatch(match.id, 'Flagged by admin');
      toast.success('Match flagged for review');
      setConfirmAction(null);
    } catch (err: any) {
      toast.error('Flag failed', err.message);
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

  const getScoreColor = (score: number | null | undefined): string => {
    if (!score) return 'var(--color-text-tertiary)';
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#3b82f6';
    if (score >= 40) return '#f59e0b';
    return '#ef4444';
  };

  const renderMatchCard = (match: Match, showMenu = true) => (
    <div key={match.id} className={styles.matchCard}>
      <div className={styles.matchUsers}>
        <div className={styles.matchUser}>
          <Avatar
            src={match.user1?.avatar_url}
            name={match.user1?.display_name || 'User 1'}
            size="md"
          />
          <div className={styles.matchUserInfo}>
            <span className={styles.matchUserName}>
              {match.user1?.display_name || 'Unknown'}
            </span>
            {match.user1?.is_verified && (
              <span className={styles.verified}>✓</span>
            )}
          </div>
        </div>

        <div className={styles.matchConnector}>
          <Heart size={20} className={styles.matchHeart} />
        </div>

        <div className={`${styles.matchUser} ${styles.matchUserRight}`}>
          <div className={styles.matchUserInfo}>
            <span className={styles.matchUserName}>
              {match.user2?.display_name || 'Unknown'}
            </span>
            {match.user2?.is_verified && (
              <span className={styles.verified}>✓</span>
            )}
          </div>
          <Avatar
            src={match.user2?.avatar_url}
            name={match.user2?.display_name || 'User 2'}
            size="md"
          />
        </div>
      </div>

      <div className={styles.matchMeta}>
        {match.match_score !== null && match.match_score !== undefined && (
          <div
            className={styles.matchScore}
            style={{ borderColor: getScoreColor(match.match_score) }}
          >
            <Award size={12} style={{ color: getScoreColor(match.match_score) }} />
            <span style={{ color: getScoreColor(match.match_score) }}>
              {match.match_score}%
            </span>
          </div>
        )}
        <span className={styles.matchTime}>
          <Calendar size={11} /> {timeAgo(match.created_at)}
        </span>
      </div>

      {showMenu && hasPermission('USER_BAN') && (
        <div className={styles.menuWrapper}>
          <button
            className={styles.menuButton}
            onClick={() => setOpenMenuId(openMenuId === match.id ? null : match.id)}
          >
            <MoreVertical size={16} />
          </button>
          {openMenuId === match.id && (
            <>
              <div className={styles.menuOverlay} onClick={() => setOpenMenuId(null)} />
              <div className={styles.menu}>
                <button
                  className={styles.menuItem}
                  onClick={() => {
                    setSelectedMatch(match);
                    setOpenMenuId(null);
                  }}
                >
                  <ExternalLink size={14} /> View details
                </button>
                <button
                  className={`${styles.menuItem} ${styles.menuItemWarning}`}
                  onClick={() => {
                    setConfirmAction({ type: 'flag', match });
                    setOpenMenuId(null);
                  }}
                >
                  <Flag size={14} /> Flag for review
                </button>
                <button
                  className={`${styles.menuItem} ${styles.menuItemDanger}`}
                  onClick={() => {
                    setConfirmAction({ type: 'delete', match });
                    setOpenMenuId(null);
                  }}
                >
                  <Trash2 size={14} /> Delete match
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Match Monitoring</h1>
          <p className={styles.subtitle}>
            Monitor user matches and detect suspicious activity
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
          <div className={styles.statIcon} style={{ background: 'rgba(236, 72, 153, 0.1)', color: '#ec4899' }}>
            <Heart size={20} />
          </div>
          <div>
            <p className={styles.statLabel}>Total Matches</p>
            <p className={styles.statValue}>{stats.total.toLocaleString()}</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <TrendingUp size={20} />
          </div>
          <div>
            <p className={styles.statLabel}>Today</p>
            <p className={styles.statValue}>{stats.today.toLocaleString()}</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <Calendar size={20} />
          </div>
          <div>
            <p className={styles.statLabel}>This Week</p>
            <p className={styles.statValue}>{stats.week.toLocaleString()}</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <Award size={20} />
          </div>
          <div>
            <p className={styles.statLabel}>Avg Score</p>
            <p className={styles.statValue}>{stats.avgScore}%</p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <Card title="Match Activity" subtitle="Daily matches over the last 30 days" padding="lg">
        <LineChart
          data={series}
          color="#ec4899"
          height={220}
          showArea
          formatValue={(v) => v.toLocaleString()}
        />
      </Card>

      {/* Tabs */}
      <div className={styles.tabs}>
        {[
          { id: 'recent', label: 'Recent', icon: <Activity size={14} /> },
          { id: 'all', label: 'All Matches', icon: <Heart size={14} /> },
          { id: 'top', label: 'Top Scored', icon: <Award size={14} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab.id as Tab)}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      {activeTab !== 'top' && (
        <div className={styles.searchWrapper}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search matches..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {/* Content */}
      {loading ? (
        <Loader fullScreen text="Loading matches..." />
      ) : activeTab === 'top' ? (
        // Top matches view
        topMatches.length === 0 ? (
          <div className={styles.emptyWrapper}>
            <EmptyState
              icon={<Award size={32} />}
              title="No scored matches"
              description="Matches with scores will appear here."
            />
          </div>
        ) : (
          <div className={styles.topGrid}>
            {topMatches.map((match, i) => (
              <div key={match.id} className={styles.topCard}>
                <div className={styles.topRank}>#{i + 1}</div>
                {renderMatchCard(match)}
              </div>
            ))}
          </div>
        )
      ) : matches.length === 0 ? (
        <div className={styles.emptyWrapper}>
          <EmptyState
            icon={<Heart size={32} />}
            title={activeTab === 'recent' ? 'No recent matches' : 'No matches yet'}
            description={
              activeTab === 'recent'
                ? 'New matches will appear here as they happen.'
                : 'Matches will appear here as users connect.'
            }
          />
        </div>
      ) : (
        <>
          <div className={styles.matchesGrid}>
            {matches.map((match) => renderMatchCard(match))}
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

      {/* Match Detail Modal */}
      <Modal
        open={!!selectedMatch}
        onClose={() => setSelectedMatch(null)}
        title="Match Details"
        size="lg"
      >
        {selectedMatch && (
          <div className={styles.detailModal}>
            <div className={styles.detailUsers}>
              <div className={styles.detailUser}>
                <Avatar
                  src={selectedMatch.user1?.avatar_url}
                  name={selectedMatch.user1?.display_name || 'User'}
                  size="xl"
                />
                <span className={styles.detailUserName}>
                  {selectedMatch.user1?.display_name || 'Unknown'}
                </span>
              </div>

              <div className={styles.detailConnector}>
                <Heart size={28} className={styles.detailHeart} />
                {selectedMatch.match_score && (
                  <span className={styles.detailScore}>
                    {selectedMatch.match_score}% match
                  </span>
                )}
              </div>

              <div className={styles.detailUser}>
                <Avatar
                  src={selectedMatch.user2?.avatar_url}
                  name={selectedMatch.user2?.display_name || 'User'}
                  size="xl"
                />
                <span className={styles.detailUserName}>
                  {selectedMatch.user2?.display_name || 'Unknown'}
                </span>
              </div>
            </div>

            <div className={styles.detailGrid}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Match ID</span>
                <span className={`${styles.detailValue} ${styles.mono}`}>
                  {selectedMatch.id}
                </span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Matched</span>
                <span className={styles.detailValue}>
                  {new Date(selectedMatch.created_at).toLocaleString()}
                </span>
              </div>
              {selectedMatch.match_score !== null && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Match Score</span>
                  <span className={styles.detailValue}>
                    {selectedMatch.match_score}%
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Flag confirm */}
      <ConfirmDialog
        open={confirmAction?.type === 'flag'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => { if (confirmAction) void handleFlag(confirmAction.match); }}
        title="Flag this match?"
        description="This match will be marked for review by the moderation team."
        confirmText="Flag Match"
        variant="warning"
        loading={actionLoading}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={confirmAction?.type === 'delete'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => { if (confirmAction) void handleDelete(confirmAction.match); }}
        title="Delete this match?"
        description="This will remove the match and any associated conversation. This cannot be undone."
        confirmText="Delete Match"
        variant="danger"
        requireTyping="DELETE"
        loading={actionLoading}
      />
    </div>
  );
};
