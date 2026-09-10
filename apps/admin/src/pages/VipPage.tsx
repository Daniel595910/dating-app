import React, { useState, useEffect, useCallback } from 'react';
import {
  Crown,
  DollarSign,
  Users,
  TrendingUp,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Gift,
  Plus,
  Minus,
  Check,
  X,
  MoreVertical,
  Star,
  Award,
  Gem,
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
  vipService,
  VIPPlan,
  PointTransaction,
  VIPAccount,
  VIPLevel,
} from '@/services/vip.service';
import styles from './VipPage.module.css';

const PAGE_SIZE = 20;

type Tab = 'overview' | 'users' | 'transactions' | 'plans';

const LEVEL_INFO: Record<VIPLevel, { label: string; color: string; icon: React.ReactNode }> = {
  free: { label: 'Free', color: '#94a3b8', icon: <Star size={14} /> },
  basic: { label: 'Basic', color: '#10b981', icon: <Star size={14} /> },
  premium: { label: 'Premium', color: '#3b82f6', icon: <Award size={14} /> },
  vip: { label: 'VIP', color: '#ec4899', icon: <Crown size={14} /> },
};

export const VipPage: React.FC = () => {
  const { hasPermission } = useAdminAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);

  // Data
  const [stats, setStats] = useState({
    totalVIPUsers: 0,
    activeVIPUsers: 0,
    pendingTransactions: 0,
    completedToday: 0,
    completedWeek: 0,
    completedMonth: 0,
    revenueToday: 0,
    revenueWeek: 0,
    revenueMonth: 0,
  });
  const [levelDistribution, setLevelDistribution] = useState<Record<string, number>>({});
  const [plans, setPlans] = useState<VIPPlan[]>([]);
  const [users, setUsers] = useState<VIPAccount[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [transactionsTotal, setTransactionsTotal] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<VIPLevel | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<PointTransactionStatus | 'all'>('all');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Actions
  const [selectedUser, setSelectedUser] = useState<VIPAccount | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<PointTransaction | null>(null);
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form state
  const [grantPlanId, setGrantPlanId] = useState('');
  const [grantDays, setGrantDays] = useState(30);
  const [pointsAmount, setPointsAmount] = useState('');
  const [pointsReason, setPointsReason] = useState('');
  const [confirmAction, setConfirmAction] = useState<{
    type: 'revoke' | 'refund';
    id: string;
  } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const loadData = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);

      const [statsData, tierData, plansData] = await Promise.all([
        vipService.getStats(),
        vipService.getLevelDistribution(),
        vipService.getPlans(),
      ]);

      setStats(statsData);
      setLevelDistribution(tierData);
      setPlans(plansData);

      if (activeTab === 'users') {
        const result = await vipService.getVIPUsers({
          search: debouncedSearch,
          tier: levelFilter,
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        });
        setUsers(result.items);
        setUsersTotal(result.total);
      } else if (activeTab === 'transactions') {
        const result = await vipService.getTransactions({
          search: debouncedSearch,
          status: statusFilter,
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        });
        setTransactions(result.items);
        setTransactionsTotal(result.total);
      }
    } catch (err: any) {
      toast.error('Failed to load', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, debouncedSearch, levelFilter, statusFilter, page, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setPage(0);
  }, [activeTab, debouncedSearch, levelFilter, statusFilter]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData(false);
    toast.success('Refreshed');
  };

  const handleGrantVIP = async () => {
    if (!selectedUser || !grantPlanId) {
      toast.warning('Please select a plan');
      return;
    }

    setActionLoading(true);
    try {
      await vipService.grantVIP(selectedUser.user_id, grantPlanId, grantDays);
      toast.success('VIP granted successfully');
      setShowGrantModal(false);
      setGrantPlanId('');
      setGrantDays(30);
      loadData(false);
    } catch (err: any) {
      toast.error('Grant failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdjustPoints = async () => {
    if (!selectedUser || !pointsAmount || !pointsReason) {
      toast.warning('Fill in all fields');
      return;
    }

    const amount = parseInt(pointsAmount);
    if (isNaN(amount) || amount === 0) {
      toast.warning('Enter a valid amount');
      return;
    }

    setActionLoading(true);
    try {
      await vipService.adjustPoints(selectedUser.user_id, amount, pointsReason);
      toast.success(`Points ${amount > 0 ? 'credited' : 'debited'}`);
      setShowPointsModal(false);
      setPointsAmount('');
      setPointsReason('');
      loadData(false);
    } catch (err: any) {
      toast.error('Adjustment failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeVIP = async (userId: string) => {
    setActionLoading(true);
    try {
      await vipService.revokeVIP(userId, 'Revoked by admin');
      toast.success('VIP revoked');
      setConfirmAction(null);
      loadData(false);
    } catch (err: any) {
      toast.error('Revoke failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefundTransaction = async (transactionId: string) => {
    setActionLoading(true);
    try {
      await vipService.refundTransaction(transactionId, 'Refunded by admin');
      toast.success('Transaction refunded');
      setConfirmAction(null);
      loadData(false);
    } catch (err: any) {
      toast.error('Refund failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTogglePlan = async (plan: VIPPlan) => {
    try {
      await vipService.togglePlanActive(plan.id, !plan.is_active);
      setPlans((prev) =>
        prev.map((p) => (p.id === plan.id ? { ...p, is_active: !p.is_active } : p))
      );
      toast.success(plan.is_active ? 'Plan deactivated' : 'Plan activated');
    } catch (err: any) {
      toast.error('Action failed', err.message);
    }
    setOpenMenuId(null);
  };

  const formatNaira = (amount: number): string => {
    return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
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

  const getStatusVariant = (status: PointTransactionStatus) => {
    switch (status) {
      case 'completed': return 'success';
      case 'pending': return 'warning';
      case 'failed': return 'error';
      case 'refunded': return 'default';
      default: return 'default';
    }
  };

  const getTierBadge = (tier: VIPLevel | null) => {
    if (!tier || !LEVEL_INFO[tier]) return null;
    const info = LEVEL_INFO[tier];
    return (
      <Badge variant="default" size="sm">
        <span style={{ color: info.color, display: 'inline-flex' }}>{info.icon}</span>
        {info.label}
      </Badge>
    );
  };

  const usersTotalPages = Math.ceil(usersTotal / PAGE_SIZE);
  const transactionsTotalPages = Math.ceil(transactionsTotal / PAGE_SIZE);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>VIP Management</h1>
          <p className={styles.subtitle}>Manage VIP subscriptions, points, and revenue</p>
        </div>
        <button className={styles.refreshButton} onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw size={16} className={refreshing ? styles.spinning : ''} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {(['overview', 'users', 'transactions', 'plans'] as Tab[]).map((tab) => (
          <button
            key={tab}
            className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <Loader fullScreen text="Loading VIP data..." />
      ) : (
        <>
          {/* Overview tab */}
          {activeTab === 'overview' && (
            <>
              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <div className={styles.statIcon} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                    <DollarSign size={20} />
                  </div>
                  <p className={styles.statLabel}>Revenue (30d)</p>
                  <p className={styles.statValue}>{formatNaira(stats.revenueMonth)}</p>
                  <p className={styles.statChange}>Today: {formatNaira(stats.revenueToday)}</p>
                </div>

                <div className={styles.statCard}>
                  <div className={styles.statIcon} style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                    <Crown size={20} />
                  </div>
                  <p className={styles.statLabel}>Active VIP Users</p>
                  <p className={styles.statValue}>{stats.activeVIPUsers.toLocaleString()}</p>
                  <p className={styles.statChange}>Total: {stats.totalVIPUsers.toLocaleString()}</p>
                </div>

                <div className={styles.statCard}>
                  <div className={styles.statIcon} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                    <TrendingUp size={20} />
                  </div>
                  <p className={styles.statLabel}>Transactions (30d)</p>
                  <p className={styles.statValue}>{stats.completedMonth.toLocaleString()}</p>
                  <p className={styles.statChange}>Today: {stats.completedToday}</p>
                </div>

                <div className={styles.statCard}>
                  <div className={styles.statIcon} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                    <Sparkles size={20} />
                  </div>
                  <p className={styles.statLabel}>Pending</p>
                  <p className={styles.statValue}>{stats.pendingTransactions.toLocaleString()}</p>
                  <p className={styles.statChange}>Awaiting completion</p>
                </div>
              </div>

              <div className={styles.overviewGrid}>
                <div className={styles.overviewCard}>
                  <h3 className={styles.overviewTitle}>Tier Distribution</h3>
                  <div className={styles.levelList}>
                    {Object.entries(LEVEL_INFO).map(([tier, info]) => {
                      const count = levelDistribution[tier] || 0;
                      const total = Object.values(levelDistribution).reduce((a, b) => a + b, 0) || 1;
                      const percent = (count / total) * 100;

                      return (
                        <div key={tier} className={styles.levelItem}>
                          <div className={styles.levelHeader}>
                            <span className={styles.levelLabel} style={{ color: info.color }}>
                              {info.icon}
                              <span>{info.label}</span>
                            </span>
                            <span className={styles.levelCount}>{count}</span>
                          </div>
                          <div className={styles.levelTrack}>
                            <div
                              className={styles.levelFill}
                              style={{ width: `${percent}%`, background: info.color }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className={styles.overviewCard}>
                  <h3 className={styles.overviewTitle}>Revenue Breakdown</h3>
                  <div className={styles.revenueList}>
                    <div className={styles.revenueRow}>
                      <span className={styles.revenueLabel}>Today</span>
                      <span className={styles.revenueValue}>{formatNaira(stats.revenueToday)}</span>
                    </div>
                    <div className={styles.revenueRow}>
                      <span className={styles.revenueLabel}>This Week</span>
                      <span className={styles.revenueValue}>{formatNaira(stats.revenueWeek)}</span>
                    </div>
                    <div className={styles.revenueRow}>
                      <span className={styles.revenueLabel}>This Month</span>
                      <span className={styles.revenueValue}>{formatNaira(stats.revenueMonth)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Users tab */}
          {activeTab === 'users' && (
            <>
              <div className={styles.filters}>
                <div className={styles.searchWrapper}>
                  <Search size={16} className={styles.searchIcon} />
                  <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="Search VIP users..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className={styles.filterTabs}>
                  <button
                    className={`${styles.filterTab} ${levelFilter === 'all' ? styles.filterTabActive : ''}`}
                    onClick={() => setLevelFilter('all')}
                  >
                    All
                  </button>
                  {(Object.keys(LEVEL_INFO) as VIPLevel[]).map((tier) => (
                    <button
                      key={tier}
                      className={`${styles.filterTab} ${levelFilter === tier ? styles.filterTabActive : ''}`}
                      onClick={() => setLevelFilter(tier)}
                    >
                      {LEVEL_INFO[tier].label}
                    </button>
                  ))}
                </div>
              </div>

              {users.length === 0 ? (
                <div className={styles.emptyWrapper}>
                  <EmptyState
                    icon={<Crown size={32} />}
                    title="No VIP users"
                    description="No users match your filters."
                  />
                </div>
              ) : (
                <>
                  <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>User</th>
                          <th>Tier</th>
                          <th>Points</th>
                          <th>Total Spent</th>
                          <th>Expires</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((u) => {
                          const isExpired = u.expires_at && new Date(u.expires_at) < new Date();
                          return (
                            <tr key={u.id} className={styles.row}>
                              <td>
                                <div className={styles.userCell}>
                                  <Avatar
                                    src={u.user?.avatar_url}
                                    name={u.user?.display_name || 'User'}
                                    size="sm"
                                  />
                                  <span className={styles.userName}>
                                    {u.user?.display_name || 'Unknown'}
                                  </span>
                                </div>
                              </td>
                              <td>{getTierBadge(u.tier)}</td>
                              <td>
                                <span className={styles.pointsValue}>
                                  {(u.points_balance || 0).toLocaleString()}
                                </span>
                              </td>
                              <td>{formatNaira(u.total_spent_ngn || 0)}</td>
                              <td>
                                {u.expires_at ? (
                                  <span className={isExpired ? styles.expiredText : styles.activeText}>
                                    {isExpired ? 'Expired' : timeAgo(u.expires_at).replace(' ago', '')}
                                  </span>
                                ) : (
                                  '—'
                                )}
                              </td>
                              <td className={styles.actionsCell}>
                                <div className={styles.menuWrapper}>
                                  <button
                                    className={styles.menuButton}
                                    onClick={() => setOpenMenuId(openMenuId === u.id ? null : u.id)}
                                  >
                                    <MoreVertical size={16} />
                                  </button>
                                  {openMenuId === u.id && (
                                    <>
                                      <div className={styles.menuOverlay} onClick={() => setOpenMenuId(null)} />
                                      <div className={styles.menu}>
                                        <button
                                          className={styles.menuItem}
                                          onClick={() => {
                                            setSelectedUser(u);
                                            setShowGrantModal(true);
                                            setOpenMenuId(null);
                                          }}
                                        >
                                          <Crown size={14} /> Change plan
                                        </button>
                                        <button
                                          className={styles.menuItem}
                                          onClick={() => {
                                            setSelectedUser(u);
                                            setShowPointsModal(true);
                                            setOpenMenuId(null);
                                          }}
                                        >
                                          <Sparkles size={14} /> Adjust points
                                        </button>
                                        <button
                                          className={`${styles.menuItem} ${styles.menuItemDanger}`}
                                          onClick={() => {
                                            setConfirmAction({ type: 'revoke', id: u.user_id });
                                            setOpenMenuId(null);
                                          }}
                                        >
                                          <X size={14} /> Revoke VIP
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {usersTotalPages > 1 && (
                    <div className={styles.pagination}>
                      <button
                        className={styles.pageButton}
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        disabled={page === 0}
                      >
                        <ChevronLeft size={16} /> Previous
                      </button>
                      <span className={styles.pageInfo}>
                        Page {page + 1} of {usersTotalPages}
                      </span>
                      <button
                        className={styles.pageButton}
                        onClick={() => setPage((p) => Math.min(usersTotalPages - 1, p + 1))}
                        disabled={page >= usersTotalPages - 1}
                      >
                        Next <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Transactions tab */}
          {activeTab === 'transactions' && (
            <>
              <div className={styles.filters}>
                <div className={styles.searchWrapper}>
                  <Search size={16} className={styles.searchIcon} />
                  <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="Search transactions..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className={styles.filterTabs}>
                  {(['all', 'completed', 'pending', 'failed'] as const).map((status) => (
                    <button
                      key={status}
                      className={`${styles.filterTab} ${statusFilter === status ? styles.filterTabActive : ''}`}
                      onClick={() => setStatusFilter(status as any)}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {transactions.length === 0 ? (
                <div className={styles.emptyWrapper}>
                  <EmptyState
                    icon={<DollarSign size={32} />}
                    title="No transactions"
                    description="No transactions match your filters."
                  />
                </div>
              ) : (
                <>
                  <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>User</th>
                          <th>Type</th>
                          <th>Points</th>
                          <th>Description</th>
                          <th>Date</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map((t) => (
                          <tr key={t.id} className={styles.row}>
                            <td>
                              <div className={styles.userCell}>
                                <Avatar
                                  src={t.user?.avatar_url}
                                  name={t.user?.display_name || 'User'}
                                  size="sm"
                                />
                                <span className={styles.userName}>
                                  {t.user?.display_name || 'Unknown'}
                                </span>
                              </div>
                            </td>
                            <td>
                              <Badge variant={t.amount > 0 ? 'success' : 'warning'} size="sm">
                                {t.amount > 0 ? 'Credit' : 'Debit'}
                              </Badge>
                            </td>
                            <td className={styles.amountCell}>
                              {t.amount > 0 ? '+' : ''}{t.amount.toLocaleString()}
                            </td>
                            <td>{t.description || '—'}</td>
                            <td className={styles.timeCell}>{timeAgo(t.created_at)}</td>
                            <td></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {transactionsTotalPages > 1 && (
                    <div className={styles.pagination}>
                      <button
                        className={styles.pageButton}
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        disabled={page === 0}
                      >
                        <ChevronLeft size={16} /> Previous
                      </button>
                      <span className={styles.pageInfo}>
                        Page {page + 1} of {transactionsTotalPages}
                      </span>
                      <button
                        className={styles.pageButton}
                        onClick={() => setPage((p) => Math.min(transactionsTotalPages - 1, p + 1))}
                        disabled={page >= transactionsTotalPages - 1}
                      >
                        Next <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Plans tab */}
          {activeTab === 'plans' && (
            <div className={styles.plansGrid}>
              {plans.map((plan) => {
                const levelInfo = LEVEL_INFO[plan.level];
                return (
                  <div key={plan.id} className={styles.planCard}>
                    <div className={styles.planHeader} style={{ borderColor: levelInfo?.color }}>
                      <div
                        className={styles.planIcon}
                        style={{ background: `${levelInfo?.color}20`, color: levelInfo?.color }}
                      >
                        {levelInfo?.icon}
                      </div>
                      <div className={styles.planInfo}>
                        <h3 className={styles.planName}>{plan.name}</h3>
                        <p className={styles.planLevel}>{levelInfo?.label}</p>
                      </div>
                      {!plan.is_active && (
                        <Badge variant="default" size="sm">Inactive</Badge>
                      )}
                    </div>

                    <p className={styles.planDescription}>{plan.description}</p>

                    <div className={styles.planPrice}>
                      <span className={styles.planPriceValue}>{formatNaira(plan.price_ngn)}</span>
                      <span className={styles.planPricePeriod}>/ {plan.duration_days} days</span>
                    </div>

                    {plan.points_included > 0 && (
                      <div className={styles.planPoints}>
                        <Sparkles size={12} /> {plan.points_included.toLocaleString()} points
                      </div>
                    )}

                    <ul className={styles.planFeatures}>
                      {(plan.features || []).slice(0, 4).map((feature, i) => (
                        <li key={i} className={styles.planFeature}>
                          <Check size={12} /> {feature}
                        </li>
                      ))}
                    </ul>

                    <div className={styles.planActions}>
                      <Button
                        size="sm"
                        variant={plan.is_active ? 'secondary' : 'primary'}
                        onClick={() => handleTogglePlan(plan)}
                        fullWidth
                      >
                        {plan.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Grant VIP modal */}
      <Modal
        open={showGrantModal}
        onClose={() => {
          setShowGrantModal(false);
          setGrantPlanId('');
          setGrantDays(30);
        }}
        title="Grant VIP"
        description={selectedUser ? `Grant VIP to ${selectedUser.user?.display_name}` : ''}
      >
        <div className={styles.modalForm}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Plan</label>
            <select
              className={styles.select}
              value={grantPlanId}
              onChange={(e) => {
                setGrantPlanId(e.target.value);
                const plan = plans.find((p) => p.id === e.target.value);
                if (plan) setGrantDays(plan.duration_days);
              }}
            >
              <option value="">Select a plan</option>
              {plans.filter((p) => p.is_active).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {formatNaira(p.price_ngn)}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Duration (days)</label>
            <input
              type="number"
              className={styles.input}
              value={grantDays}
              onChange={(e) => setGrantDays(parseInt(e.target.value) || 0)}
              min="1"
            />
          </div>
        </div>

        <div className={styles.modalActions}>
          <Button
            variant="secondary"
            onClick={() => setShowGrantModal(false)}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleGrantVIP}
            loading={actionLoading}
            disabled={!grantPlanId}
          >
            Grant VIP
          </Button>
        </div>
      </Modal>

      {/* Adjust points modal */}
      <Modal
        open={showPointsModal}
        onClose={() => {
          setShowPointsModal(false);
          setPointsAmount('');
          setPointsReason('');
        }}
        title="Adjust Points"
        description={selectedUser ? `Adjust points for ${selectedUser.user?.display_name} (current: ${selectedUser.points_balance || 0})` : ''}
      >
        <div className={styles.modalForm}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Amount (positive to credit, negative to debit)</label>
            <input
              type="number"
              className={styles.input}
              value={pointsAmount}
              onChange={(e) => setPointsAmount(e.target.value)}
              placeholder="e.g. 500 or -200"
              autoFocus
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Reason</label>
            <input
              type="text"
              className={styles.input}
              value={pointsReason}
              onChange={(e) => setPointsReason(e.target.value)}
              placeholder="e.g. Purchase bonus, refund, adjustment"
            />
          </div>
        </div>

        <div className={styles.modalActions}>
          <Button variant="secondary" onClick={() => setShowPointsModal(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleAdjustPoints}
            loading={actionLoading}
            disabled={!pointsAmount || !pointsReason}
          >
            Apply
          </Button>
        </div>
      </Modal>

      {/* Revoke VIP confirmation */}
      <ConfirmDialog
        open={confirmAction?.type === 'revoke'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => confirmAction && handleRevokeVIP(confirmAction.id)}
        title="Revoke VIP?"
        description="The user will lose their VIP benefits immediately."
        confirmText="Revoke VIP"
        variant="danger"
        loading={actionLoading}
      />

      {/* Refund confirmation */}
      <ConfirmDialog
        open={confirmAction?.type === 'refund'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => confirmAction && handleRefundTransaction(confirmAction.id)}
        title="Refund this transaction?"
        description={`Refund ${selectedTransaction ? formatNaira(selectedTransaction.amount_ngn) : ''} to the user?`}
        confirmText="Refund"
        variant="warning"
        loading={actionLoading}
      />
    </div>
  );
};







