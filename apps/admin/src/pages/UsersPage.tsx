import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,

  Users as UsersIcon,
  Shield,

  Crown,
  BadgeCheck,
  MoreVertical,

  ChevronLeft,
  ChevronRight,
  RefreshCw,

  Eye,
  Ban,
  CheckCircle,
  Mail,
  Send,
} from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useToast } from '@/components/ui/Toast';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { Loader } from '@/components/ui/Loader';
import { userService, AdminUserRecord, UserFilters } from '@/services/user.service';
import styles from './UsersPage.module.css';

const PAGE_SIZE = 20;

export const UsersPage: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAdminAuth();
  const toast = useToast();

  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<UserFilters['status']>('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'display_name'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [emailStatuses, setEmailStatuses] = useState<Record<string, { email: string | null; email_confirmed_at: string | null; last_sign_in_at: string | null }>>({});
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const loadUsers = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);

      const result = await userService.getUsers({
        search: debouncedSearch,
        status: statusFilter,
        sortBy,
        sortOrder,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });

      setUsers(result.users);
      setTotal(result.total);


      if (result.users.length > 0) {
        const ids = result.users.map((u) => u.user_id);
        userService
          .getEmailStatuses(ids)
          .then((statuses) => setEmailStatuses(statuses))
          .catch((err) => console.error('getEmailStatuses failed:', err));
      }
    } catch (err: any) {
      toast.error('Failed to load users', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [debouncedSearch, statusFilter, sortBy, sortOrder, page, toast]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, statusFilter]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadUsers(false);
    toast.success('Users refreshed');
  };

  const handleVerify = async (userId: string, current: boolean) => {
    if (!hasPermission('USER_VERIFY')) {
      toast.error('Permission denied', 'You cannot verify users');
      return;
    }

    try {
      await userService.verifyUser(userId, !current);
      setUsers((prev) =>
        prev.map((u) => (u.user_id === userId ? { ...u, is_verified: !current } : u))
      );
      toast.success(current ? 'User unverified' : 'User verified');
    } catch (err: any) {
      toast.error('Action failed', err.message);
    }
    setOpenMenuId(null);
  };

  const handleSendVerificationEmail = async (userId: string) => {
    if (!hasPermission('USER_VERIFY')) {
      toast.error('Permission denied', 'You cannot send verification emails');
      return;
    }

    setSendingEmailId(userId);
    try {
      const result = await userService.sendVerificationEmail(userId);
      if (result.success) {
        toast.success('Verification email sent');
      } else {
        toast.error('Failed to send', result.error || 'Unknown error');
      }
    } catch (err: any) {
      toast.error('Action failed', err.message);
    } finally {
      setSendingEmailId(null);
      setOpenMenuId(null);
    }
  };

  const handleSort = (field: 'created_at' | 'display_name') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const startIndex = page * PAGE_SIZE + 1;
  const endIndex = Math.min((page + 1) * PAGE_SIZE, total);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Users</h1>
          <p className={styles.subtitle}>
            {total > 0 ? `Showing ${startIndex}-${endIndex} of ${total.toLocaleString()} users` : 'Manage user accounts'}
          </p>
        </div>
        <div className={styles.headerActions}>
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

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.searchWrapper}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className={styles.filterTabs}>
          {(['all', 'active', 'verified', 'vip', 'admin'] as const).map((status) => (
            <button
              key={status}
              className={`${styles.filterTab} ${statusFilter === status ? styles.filterTabActive : ''}`}
              onClick={() => setStatusFilter(status)}
            >
              {status === 'all' && 'All'}
              {status === 'active' && 'Active'}
              {status === 'verified' && 'Verified'}
              {status === 'vip' && 'VIP'}
              {status === 'admin' && 'Admins'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <Loader fullScreen text="Loading users..." />
      ) : users.length === 0 ? (
        <div className={styles.tableWrapper}>
          <EmptyState
            icon={<UsersIcon size={32} />}
            title={debouncedSearch ? 'No users found' : 'No users yet'}
            description={
              debouncedSearch
                ? `No users match "${debouncedSearch}"`
                : 'Users will appear here once they sign up.'
            }
          />
        </div>
      ) : (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.thUser}>User</th>
                  <th className={styles.thRole}>Role</th>
                  <th className={styles.thStatus}>Status</th>
                  <th
                    className={`${styles.thDate} ${styles.thSortable}`}
                    onClick={() => handleSort('created_at')}
                  >
                    Joined {sortBy === 'created_at' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className={styles.thActions}></th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className={styles.row}>
                    <td className={styles.tdUser}>
                      <div className={styles.userCell}>
                        <Avatar
                          src={user.avatar_url}
                          name={user.display_name || 'User'}
                          size="md"
                        />
                        <div className={styles.userInfo}>
                          <span className={styles.userName}>
                            {user.display_name || 'Unnamed User'}
                            {emailStatuses[user.user_id]?.email_confirmed_at === null && (
                              <span title="Email not confirmed" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginLeft: 6, padding: '1px 6px', fontSize: 10, fontWeight: 700, color: '#b45309', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 9999, verticalAlign: 'middle', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                <Mail size={10} /> Email unverified
                              </span>
                            )}
                          </span>
                          <span className={styles.userId}>
                            ID: {user.user_id.substring(0, 8)}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className={styles.tdRole}>
                      {user.is_admin ? (
                        <Badge variant="error" size="sm">
                          <Shield size={10} /> {user.role?.replace('_', ' ') || 'Admin'}
                        </Badge>
                      ) : (
                        <span className={styles.roleText}>User</span>
                      )}
                    </td>
                    <td className={styles.tdStatus}>
                      <div className={styles.statusBadges}>
                        {user.is_verified && (
                          <Badge variant="success" size="sm">
                            <BadgeCheck size={10} /> Verified
                          </Badge>
                        )}
                        {user.is_vip && (
                          <Badge variant="warning" size="sm">
                            <Crown size={10} /> VIP
                          </Badge>
                        )}
                        {!user.is_verified && !user.is_vip && (
                          <span className={styles.statusDefault}>Standard</span>
                        )}
                      </div>
                    </td>
                    <td className={styles.tdDate}>
                      {new Date(user.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className={styles.tdActions}>
                      <div className={styles.menuWrapper}>
                        <button
                          className={styles.menuButton}
                          onClick={() => setOpenMenuId(openMenuId === user.id ? null : user.id)}
                          aria-label="Actions"
                        >
                          <MoreVertical size={16} />
                        </button>

                        {openMenuId === user.id && (
                          <>
                            <div
                              className={styles.menuOverlay}
                              onClick={() => setOpenMenuId(null)}
                            />
                            <div className={styles.menu}>
                              <button
                                className={styles.menuItem}
                                onClick={() => {
                                  navigate(`/users/${user.user_id}`);
                                  setOpenMenuId(null);
                                }}
                              >
                                <Eye size={14} />
                                View details
                              </button>
                              {hasPermission('USER_VERIFY') && (
                                <button
                                  className={styles.menuItem}
                                  onClick={() => handleVerify(user.user_id, user.is_verified)}
                                >
                                  <CheckCircle size={14} />
                                  {user.is_verified ? 'Unverify' : 'Verify user'}
                                </button>
                              )}
                              {hasPermission('USER_VERIFY') && emailStatuses[user.user_id]?.email_confirmed_at === null && (
                                <button
                                  className={styles.menuItem}
                                  disabled={sendingEmailId === user.user_id}
                                  onClick={() => handleSendVerificationEmail(user.user_id)}
                                >
                                  {sendingEmailId === user.user_id ? (<><RefreshCw size={14} className={styles.spinning} /> Sending…</>) : (<><Send size={14} /> Send verification email</>)}
                                </button>
                              )}
                              {hasPermission('USER_BAN') && (
                                <button
                                  className={`${styles.menuItem} ${styles.menuItemDanger}`}
                                  onClick={() => {
                                    toast.info('Ban feature', 'Coming soon');
                                    setOpenMenuId(null);
                                  }}
                                >
                                  <Ban size={14} />
                                  Ban user
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                className={styles.pageButton}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft size={16} />
                Previous
              </button>

              <span className={styles.pageInfo}>
                Page {page + 1} of {totalPages}
              </span>

              <button
                className={styles.pageButton}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
